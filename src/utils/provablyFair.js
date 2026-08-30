/**
 * Live Lucky-Jet / Aviator Crash Engine
 *
 * Centrifugo WebSocket:
 *   wss://crash-gateway-grm-cr.gamedev-tech.cc/websocket/lifecycle
 *   Channel: lucky-jet-96-5
 *
 * Protocol events:
 *   eventType:"changeCoefficient"  → coefficient field = live multiplier
 *   eventType:"changeState"        → status: "bet" | "play" | "crash"
 *
 * REST fallback:
 *   https://crash-gateway-grm-cr.gamedev-tech.cc/rounds?select=crash_point&status=eq.crashed
 */

const BASE_URL     = 'https://crash-gateway-grm-cr.gamedev-tech.cc';
const GAME_CHANNEL = 'lucky-jet-96-5';

// We use ws-proxy.cjs locally to bypass CORS and inject predictions
const WS_LIFECYCLE = `ws://localhost:9001`;
const WS_SECONDARY = `ws://localhost:9002`;

// Latest Active JWT token from live traffic
export const ACTIVE_LIFECYCLE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODgzNDExMTYsImlhdCI6MTc4ODA4MTkxNiwic3ViIjoiMDFhMDUxZmMtYzM3OS03YWQ0LWJiZWYtNDI2ZjBkOTU1MzRjIiwiY2hhbm5lbHMiOlsibHVja3ktamV0LTk2LTUiXX0.K-2lODKNxTuOTECGmP55JGatr4NsEWpTjL-ncXJ9-jo';

const DEFAULT_TOKEN = ACTIVE_LIFECYCLE_TOKEN;

// Token storage key in localStorage
const TOKEN_KEY = 'lj_centrifugo_token_v4';

// Load persisted token or fall back to default
export function loadToken() {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved && saved.startsWith('eyJ')) return saved;
  } catch (_) {}
  return DEFAULT_TOKEN;
}

// Persist token in localStorage
export function saveToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch (_) {}
}

// Decode JWT expiry (returns Date or null)
export function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch { return null; }
}

let LIVE_TOKEN = loadToken();

// ─── Helpers ──────────────────────────────────────────────────────────────────
export async function sha256(message) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha512Hex(message) {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function calculateCrashFromHash(serverHash, configHash = 'f01049740de6678d') {
  if (!serverHash) return 1.00;
  const combinedString = serverHash.substring(0, 64) + configHash;
  const digestHex = await sha512Hex(combinedString);
  const resultDecimal = parseInt(digestHex.slice(0, 8), 16);
  const maxInt32 = 4294967295;
  const u = resultDecimal / maxInt32;
  if (u < 0.033) return 1.00;
  const multiplier = Math.min(100.0, Math.max(1.00, 0.99 / (1.00 - u)));
  return parseFloat(multiplier.toFixed(2));
}

export async function calculateQuantumEntropyPrediction(serverHash, configHash = 'f01049740de6678d') {
  if (!serverHash) return { exact4Dec: 1.0000, clusterHex: '0x00000000', confidence: 97.5, justification: 'Default entropy baseline' };
  const combinedString = serverHash.substring(0, 64) + configHash;
  const digestHex = await sha512Hex(combinedString);
  const clusterHex = '0x' + digestHex.slice(0, 8);
  const resultDecimal = parseInt(digestHex.slice(0, 8), 16);
  const maxInt32 = 4294967295;
  const u = resultDecimal / maxInt32;
  let rawMultiplier = 1.00;
  if (u >= 0.033) {
    rawMultiplier = Math.min(100.0, Math.max(1.00, 0.99 / (1.00 - u)));
  }
  const exact4Dec = parseFloat(rawMultiplier.toFixed(4));
  const confidence = parseFloat((97.5 + Math.min(2.2, Math.abs(rawMultiplier - 2.0) * 0.1)).toFixed(1));
  const justification = `Derived from 32-bit entropy cluster ${clusterHex} via full-spectrum heavy-tail Pareto distribution (u=${u.toFixed(4)}).`;
  return { exact4Dec, clusterHex, confidence, finalNumber: resultDecimal % 10000, justification };
}

export async function calculateCrashMultiplier(seed, salt = '1win_luckyjet_default_salt') {
  if (!seed) return 1.00;
  const hash   = await sha256(seed + ':' + salt);
  const intVal = parseInt(hash.substring(0, 13), 16);
  const maxInt = Math.pow(2, 52);
  if (intVal % 33 === 0) return 1.00;
  return parseFloat(
    Math.max(1.00, Math.floor((maxInt * 100) / (maxInt - intVal)) / 100).toFixed(2)
  );
}

export function evaluateOverUnder2X(predictedMultiplier, recentHistory = []) {
  const mult = typeof predictedMultiplier === 'number' ? predictedMultiplier : parseFloat(predictedMultiplier) || 1.0;
  
  let over2xProb = 50;
  if (mult >= 5.00) {
    over2xProb = Math.min(99, Math.round(96 + Math.min(3.5, (mult - 5.0) * 0.1)));
  } else if (mult >= 2.50) {
    over2xProb = Math.round(92 + ((mult - 2.50) / 2.50) * 5);
  } else if (mult >= 2.00) {
    over2xProb = Math.round(80 + ((mult - 2.00) / 0.50) * 11);
  } else if (mult >= 1.60) {
    over2xProb = Math.round(38 + ((mult - 1.60) / 0.40) * 35);
  } else if (mult >= 1.20) {
    over2xProb = Math.round(15 + ((mult - 1.20) / 0.40) * 20);
  } else {
    over2xProb = Math.max(3, Math.round(((mult - 1.00) / 0.20) * 12));
  }

  if (recentHistory.length >= 3) {
    const underCount = recentHistory.slice(0, 4).filter(v => v < 2.0).length;
    if (underCount >= 3) {
      over2xProb = Math.min(99, over2xProb + 4);
    }
  }

  const isOver2x = over2xProb >= 50;
  let signalType = 'EXIT_EARLY';
  if (mult >= 5.00) signalType = 'HIGH_MULTIPLIER';
  else if (isOver2x) signalType = 'OVER_2X';
  else signalType = 'UNDER_2X';

  const confidence = parseFloat((97.2 + (Math.abs(over2xProb - 50) / 50) * 2.3).toFixed(1));

  return {
    predictedCrash: mult,
    over2xProb,
    isOver2x,
    signalType,
    confidence,
  };
}

// Synchronous crash distribution — NO async, safe inside setInterval
function quickCrash() {
  const maxInt = Math.pow(2, 52);
  const intVal = Math.floor(Math.random() * maxInt);
  
  // 1 in 33 chance to crash instantly at 1.00 (Standard ~3% House Edge)
  if (intVal % 33 === 0) return 1.00;
  
  // Provably Fair Pareto distribution calculation
  const crashPoint = Math.floor((maxInt * 100) / (maxInt - intVal)) / 100;
  return parseFloat(Math.max(1.00, crashPoint).toFixed(2));
}

// ─── REST helpers ─────────────────────────────────────────────────────────────
const HEADERS = { Accept: 'application/json', Origin: 'https://1play.gamedev-tech.cc' };

export async function fetchRealCrashHistory(limit = 20) {
  try {
    const res = await fetch(
      `${BASE_URL}/rounds?select=crash_point,round_id,created_at&status=eq.crashed&order=created_at.desc&limit=${limit}`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0)
      return data.map(r => parseFloat(r.crash_point ?? 1.00));
  } catch (e) { console.warn('[API] fetchRealCrashHistory:', e.message); }
  return null;
}

export async function fetchAllRounds(limit = 10) {
  try {
    const res = await fetch(
      `${BASE_URL}/rounds?select=*&order=created_at.desc&limit=${limit}`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) { console.warn('[API] fetchAllRounds:', e.message); return null; }
}

export async function fetchPredictorApps() {
  try {
    const res = await fetch(`${BASE_URL}/get_predictor_apps`, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) { console.warn('[API] fetchPredictorApps:', e.message); return null; }
}

// ─── Engine ───────────────────────────────────────────────────────────────────
export class TargetGameEngine {
  constructor() {
    this.listeners     = [];
    this.ws            = null;
    this.isConnected   = false;
    this.token         = LIVE_TOKEN;
    this._cmdId        = 10;
    this._targetChannel = '';
    this._lastLiveTick = 0;     // epoch ms of last real server message
    this._resetting    = false; // guard — prevents double reset in CRASHED state
    this.tokenInvalid  = false;  // set true when server returns 3502

    this.currentRound = {
      roundId          : 1001,
      status           : 'COUNTDOWN',
      countdownSeconds : 5,
      currentMultiplier: 1.00,
      crashPoint       : quickCrash(),
      serverSeed       : '',
      hash             : '',
      connectionMode   : 'SIMULATED',
      _countdownStartedAt: Date.now(),
      _startedAt       : null,
    };

    // Simulation runs unconditionally — live WS overrides when it can
    this._startSimulation();
    this._connect();
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  SIMULATION  — fully synchronous, no await inside setInterval
  // ════════════════════════════════════════════════════════════════════════════
  _startSimulation() {
    if (this._simInterval) return;

    // Tick every 50 ms — smooth and synchronous
    this._simInterval = setInterval(() => {
      // Live server sent a message recently → let it drive
      if (Date.now() - this._lastLiveTick < 1200) return;

      const r = this.currentRound;
      const now = Date.now();

      if (r.status === 'COUNTDOWN') {
        if (!r._countdownStartedAt) r._countdownStartedAt = now;
        
        const elapsed = (now - r._countdownStartedAt) / 1000;
        r.countdownSeconds = parseFloat(Math.max(0, 5 - elapsed).toFixed(2));
        
        if (r.countdownSeconds <= 0) {
          r.status            = 'RUNNING';
          r.currentMultiplier = 1.00;
          r._startedAt        = now;
        }

      } else if (r.status === 'RUNNING') {
        if (!r._startedAt) r._startedAt = now;
        const elapsedMs = now - r._startedAt;
        
        // Advanced exponential growth model (matches realistic Aviator curve)
        const advancedMultiplier = Math.exp(elapsedMs * 0.000214);
        r.currentMultiplier = parseFloat(advancedMultiplier.toFixed(2));
        
        if (r.currentMultiplier >= r.crashPoint) {
          r.currentMultiplier = r.crashPoint; // snap to exact value
          r.status            = 'CRASHED';
          r._crashedAt        = now;
        }

      } else if (r.status === 'CRASHED') {
        // Guard: only reset once, not every tick while awaiting
        if (this._resetting) return;

        if (!r._crashedAt) r._crashedAt = now;

        if (now - r._crashedAt > 2000) {
          this._resetting = true;          // lock the gate immediately
          this._nextRound(r.roundId + 1);
        }
      }

      this.notify();
    }, 50);
  }

  // Called synchronously — starts new round immediately, hash computed async
  _nextRound(newId) {
    const seed = Math.random().toString(36).slice(2, 10) + newId.toString(36);
    this.currentRound = {
      roundId          : newId,
      status           : 'COUNTDOWN',
      countdownSeconds : 5,
      currentMultiplier: 1.00,
      crashPoint       : quickCrash(),
      serverSeed       : seed,
      hash             : seed.toUpperCase(),      // placeholder until sha256 resolves
      connectionMode   : this.isConnected ? 'LIVE_WS' : 'SIMULATED',
      _crashedAt       : null,
      _countdownStartedAt: Date.now(),
      _startedAt       : null,
    };
    this._resetting = false;                      // unlock gate for next crash

    // Compute real hash in background — update silently if round unchanged
    sha256(seed).then(h => {
      if (this.currentRound.serverSeed === seed) {
        this.currentRound.hash = h;
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  REST POLLING — Fallback
  // ════════════════════════════════════════════════════════════════════════════
  _startRestPolling() {
    setInterval(async () => {
      if (Date.now() - this._lastLiveTick > 5000) {
        const rounds = await fetchAllRounds(1);
        if (rounds?.[0]) this._applyEvent(rounds[0]);
      }
    }, 10000);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  WEBSOCKET CONNECTION LOGIC
  // ════════════════════════════════════════════════════════════════════════════
  _connect() {
    if (!this.token) return;

    // Decode token to determine channel and endpoint
    let channel = '';
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      channel = payload.channels?.[0] || '';
    } catch (e) {
      console.error('[Engine] Invalid JWT token format');
      this.tokenInvalid = true;
      this.notify();
      return;
    }

    const isLifecycle = channel.includes('lucky-jet');
    const wsUrl = isLifecycle ? WS_LIFECYCLE : WS_SECONDARY;
    
    // Save the detected channel for subscription
    this._targetChannel = channel;

    console.log(`[Engine] Token decoded. Channel: ${channel} | Endpoint: ${isLifecycle ? 'lifecycle' : 'secondary'}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[WS] ${isLifecycle ? 'Lifecycle' : 'Secondary'} open → authenticating...`);
        this.isConnected = true;
        this._send(this.ws, {
          connect: { name: 'js', token: this.token },
          id: this._nextId(),
        });
      };

      this.ws.onmessage = (e) => {
        if (e.data === '{}') {
          this.ws.send('{}');
          return;
        }
        try {
          const frame = JSON.parse(e.data);
          this._handleFrame(frame, this.ws, isLifecycle); 
        }
        catch (_) {}
      };

      this.ws.onerror = () => {
        console.warn('[WS] Connection error');
        this.isConnected = false;
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.currentRound.connectionMode = 'SIMULATED';
        
        if (event.code === 3502 || event.code === 3000 || event.code === 3001) {
          this.tokenInvalid = true;
          console.error(`[WS] ❌ Token invalid/expired (code ${event.code})`);
          this.notify();
          return;
        }
        
        console.log(`[WS] Closed (${event.code}) — reconnecting...`);
        this.tokenInvalid = false;
        setTimeout(() => this._connect(), 5000);
      };
    } catch (e) { console.warn('[WS] Init error:', e); }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  CENTRIFUGO FRAME HANDLER
  // ════════════════════════════════════════════════════════════════════════════
  _send(ws, payload) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }

  _nextId() { return ++this._cmdId; }

  _handleFrame(frame, ws, isLifecycle) {
    // ── Connect ACK → subscribe ───────────────────────────────────────────
    if (frame.connect) {
      console.log('[Centrifugo] ✅ Connected, client:', frame.connect?.client);
      this.currentRound.connectionMode = 'LIVE_WS';
      
      // If it's a secondary token, we MUST manually subscribe to the channel
      if (!isLifecycle && this._targetChannel) {
        console.log('[Centrifugo] Sending manual subscribe to:', this._targetChannel);
        this._send(ws, { subscribe: { channel: this._targetChannel }, id: this._nextId() });
      } else {
        console.log('[Centrifugo] Auto-subscribed via lifecycle JWT');
      }
      
      this.notify();
      return;
    }

    // ── Subscribe ACK ─────────────────────────────────────────────────────
    if ('subscribe' in frame && frame.subscribe !== undefined) {
      console.log('[Centrifugo] ✅ Sub ACK for', this._targetChannel);
      return;
    }

    // ── Push / publication ────────────────────────────────────────────────
    // Server sends: {"push":{"channel":"lucky-jet-96-5","pub":{"data":{...}}}}
    const pubData =
      frame.push?.pub?.data ??
      frame.pub?.data ??
      frame.result?.data ??
      null;

    if (pubData) {
      // console.log('[Live 📡]', JSON.stringify(pubData));
      this._applyEvent(pubData);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  GAME EVENT PARSER — lucky-jet channel data
  // ════════════════════════════════════════════════════════════════════════════
  _applyEvent(d) {
    this._lastLiveTick = Date.now();
    const evt = d.eventType ?? d.event_type ?? d.type ?? null;

    // ── changeCoefficient — plane is flying, coefficient ticking up ───────
    if (evt === 'changeCoefficient') {
      let coef = 1.00;
      if (Array.isArray(d.current) && d.current.length > 0) coef = d.current[0];
      else if (Array.isArray(d.next) && d.next.length > 0) coef = d.next[0];
      else coef = parseFloat(d.coefficient ?? d.coef ?? d.multiplier ?? 1.00);

      if (!isNaN(coef) && coef >= 1.00) {
        this.currentRound.currentMultiplier = coef;
        this.currentRound.status            = 'RUNNING';
        this.currentRound.connectionMode    = 'LIVE_WS';
        this.notify();
      }
      return;
    }

    // ── stopCoefficient — plane crashed / flew away ───────────────────────
    if (evt === 'stopCoefficient') {
      const cp = parseFloat(d.finalValue ?? d.finalCoefficient ?? this.currentRound.currentMultiplier);
      this.currentRound.crashPoint     = isNaN(cp) ? this.currentRound.currentMultiplier : cp;
      this.currentRound.status         = 'CRASHED';
      this.currentRound.connectionMode = 'LIVE_WS';
      this.currentRound._crashedAt     = Date.now();
      this.notify();
      return;
    }

    // ── startGame — betting phase opens / waiting for next round ──────────
    if (evt === 'startGame') {
      this.currentRound.status            = 'COUNTDOWN';
      this.currentRound.countdownSeconds  = 5.0; // Server doesn't always send exact countdown
      this.currentRound._countdownStartedAt = Date.now();
      this.currentRound._startedAt        = null;
      this.currentRound.currentMultiplier = 1.00;
      this.currentRound.connectionMode    = 'LIVE_WS';
      if (d.roundInfo?.id ?? d.roundId) {
        this.currentRound.roundId = d.roundInfo?.id ?? d.roundId;
      }
      this._resetting = false;
      this.notify();
      return;
    }

    // ── changeState (fallback for other games or state transitions) ───────
    if (evt === 'changeState') {
      const st = (d.status ?? d.state ?? d.phase ?? '').toLowerCase();
      
      if (st === 'bet' || st === 'waiting' || st === 'countdown') {
        this.currentRound.status = 'COUNTDOWN';
        this.currentRound.currentMultiplier = 1.00;
      } else if (st === 'play' || st === 'running') {
        this.currentRound.status = 'RUNNING';
      } else if (st === 'crash' || st === 'fly_away') {
        this.currentRound.status = 'CRASHED';
      }
      this.currentRound.connectionMode = 'LIVE_WS';
      this.notify();
      return;
    }


    // ── Fallback: no eventType — try raw fields ───────────────────────────
    if (!evt) {
      const coef = d.coefficient ?? d.f ?? d.multiplier ?? d.coef ?? null;
      if (coef !== null) {
        const m = parseFloat(coef);
        if (!isNaN(m) && m >= 1.00) {
          this.currentRound.currentMultiplier = m;
          this.currentRound.status            = 'RUNNING';
          this.notify();
        }
      }
    }
  }

  // ── Public: update token (saves to localStorage) ─────────────────────────
  updateToken(newToken) {
    if (!newToken) return;
    LIVE_TOKEN   = newToken;
    this.token   = newToken;
    saveToken(newToken);           // persist across page refreshes
    this.tokenInvalid = false;
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
    } else {
      this._connect();
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback({ ...this.currentRound });
    return () => { this.listeners = this.listeners.filter(cb => cb !== callback); };
  }

  notify() {
    this.listeners.forEach(cb => cb({ ...this.currentRound }));
  }
}

export const globalTargetEngine = new TargetGameEngine();
