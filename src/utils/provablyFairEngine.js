/**
 * Provably Fair Cryptographic & Statistical Computation Engine
 * -------------------------------------------------------------
 * Browser-native implementation matching Python Prediction pipeline:
 * - Hasher: HMAC-SHA256 outcome derivation (32-bit slice -> Pareto multiplier)
 * - Simulator: High-throughput batch round generation
 * - Distribution Analyzer: Cumulative distribution P(X >= x) = 1/x, percentiles, RTP & House Edge
 * - Decision Bot Sandbox: Automated betting strategy backtesting & risk modeling
 * - Exporters: CSV and JSON formatters
 */

/**
 * Computes deterministic crash multiplier from a 32-bit unsigned integer (0 to 2^32 - 1).
 * Standard crash game formula: floor((0xFFFFFFFF * 100) / (int_val + 1)) / 100
 */
export function computeMultiplierFromInt(intVal) {
  const max32 = 0xFFFFFFFF; // 4,294,967,295
  const raw = (max32 * 100) / (intVal + 1);
  return Math.floor(raw) / 100.0;
}

/**
 * Computes HMAC-SHA256 outcome using browser Web Crypto API.
 * @param {string} serverSeed - Server seed or reveal hash
 * @param {string} clientSeed - Client seed / entropy
 * @param {number} nonce - Round number or nonce
 * @returns {Promise<{nonce: number, multiplier: number, int32: number, hex32: string, hmacDigest: string}>}
 */
export async function computeProvablyFairOutcome(serverSeed, clientSeed, nonce) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(serverSeed || 'sandbox_server_seed');
  const messageData = encoder.encode(`${clientSeed || 'client_seed'}:${nonce}`);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hmacDigest = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Extract first 4 bytes (8 hex characters)
    const hex32 = hmacDigest.substring(0, 8);
    const int32 = parseInt(hex32, 16);
    const multiplier = computeMultiplierFromInt(int32);

    return {
      nonce: Number(nonce),
      multiplier: Number(multiplier.toFixed(2)),
      int32,
      hex32,
      hmacDigest,
    };
  } catch (err) {
    console.error('[ProvablyFair] Crypto error, falling back to JS HMAC:', err);
    return fallbackJsHmac(serverSeed, clientSeed, nonce);
  }
}

/**
 * Pure JavaScript HMAC-SHA256 implementation for synchronous / high-speed batch operations.
 */
function sha256_blocks(msgBytes) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  const l = msgBytes.length;
  const bitLen = l * 8;
  const padLen = (l % 64 < 56) ? 56 - (l % 64) : 120 - (l % 64);
  const totalLen = l + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(msgBytes);
  padded[l] = 0x80;

  const view = new DataView(padded.buffer);
  view.setBigUint64(totalLen - 8, BigInt(bitLen), false);

  const W = new Uint32Array(64);
  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (Math.imul(W[t - 15] >>> 7 | W[t - 15] << 25, 1) ^ (W[t - 15] >>> 18 | W[t - 15] << 14) ^ (W[t - 15] >>> 3)) >>> 0;
      const s1 = (Math.imul(W[t - 2] >>> 17 | W[t - 2] << 15, 1) ^ (W[t - 2] >>> 19 | W[t - 2] << 13) ^ (W[t - 2] >>> 10)) >>> 0;
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) >>> 0;
      const ch = ((e & f) ^ ((~e) & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = ((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, H[i], false);
  }
  return out;
}

function hmacSha256Sync(keyStr, msgStr) {
  const encoder = new TextEncoder();
  let keyBytes = encoder.encode(keyStr);
  const msgBytes = encoder.encode(msgStr);

  if (keyBytes.length > 64) {
    keyBytes = sha256_blocks(keyBytes);
  }
  const kPadKey = new Uint8Array(64);
  kPadKey.set(keyBytes);

  const iPad = new Uint8Array(64 + msgBytes.length);
  const oPad = new Uint8Array(64 + 32);

  for (let i = 0; i < 64; i++) {
    iPad[i] = kPadKey[i] ^ 0x36;
    oPad[i] = kPadKey[i] ^ 0x5c;
  }
  iPad.set(msgBytes, 64);

  const innerHash = sha256_blocks(iPad);
  oPad.set(innerHash, 64);

  return sha256_blocks(oPad);
}

function fallbackJsHmac(serverSeed, clientSeed, nonce) {
  const hashBytes = hmacSha256Sync(serverSeed, `${clientSeed}:${nonce}`);
  const hmacDigest = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const hex32 = hmacDigest.substring(0, 8);
  const int32 = parseInt(hex32, 16);
  const multiplier = computeMultiplierFromInt(int32);
  return {
    nonce: Number(nonce),
    multiplier: Number(multiplier.toFixed(2)),
    int32,
    hex32,
    hmacDigest,
  };
}

/**
 * Fast synchronous derivation for high-throughput batch simulation.
 */
export function computeOutcomeFast(serverSeed, clientSeed, nonce) {
  const hashBytes = hmacSha256Sync(serverSeed, `${clientSeed}:${nonce}`);
  const view = new DataView(hashBytes.buffer, hashBytes.byteOffset, 4);
  const int32 = view.getUint32(0, false);
  const multiplier = computeMultiplierFromInt(int32);
  const hex32 = int32.toString(16).padStart(8, '0');
  return {
    nonce,
    multiplier: Number(multiplier.toFixed(2)),
    int32,
    hex32,
  };
}

/**
 * Batch Scenario Simulator (matching BatchSimulator in Python).
 * @param {string} serverSeed
 * @param {string} clientSeed
 * @param {number} count - Total number of rounds to generate
 * @param {number} startNonce - Starting nonce index (default: 1)
 */
export function simulateBatchScenarios(serverSeed, clientSeed, count = 500, startNonce = 1) {
  const rounds = [];
  const validCount = Math.min(Math.max(1, count), 10000);

  for (let i = 0; i < validCount; i++) {
    const nonce = startNonce + i;
    const item = computeOutcomeFast(serverSeed, clientSeed, nonce);
    rounds.push(item);
  }
  return rounds;
}

/**
 * Performs comprehensive statistical audit on generated multiplier datasets.
 * Matching DistributionAnalyzer in Python.
 */
export function analyzeDistribution(rounds) {
  if (!rounds || rounds.length === 0) return null;

  const n = rounds.length;
  const multipliers = rounds.map(r => r.multiplier);
  const sortedM = [...multipliers].sort((a, b) => a - b);

  const min = sortedM[0];
  const max = sortedM[n - 1];
  const mean = multipliers.reduce((sum, v) => sum + v, 0) / n;
  const median = sortedM[Math.floor(n * 0.5)];
  const p25 = sortedM[Math.floor(n * 0.25)];
  const p75 = sortedM[Math.floor(n * 0.75)];
  const p90 = sortedM[Math.floor(n * 0.90)];
  const p99 = sortedM[Math.floor(n * 0.99)];

  // Threshold cumulative analysis: P(X >= x)
  const thresholds = [1.01, 1.20, 1.50, 2.00, 3.00, 5.00, 10.00, 20.00, 50.00, 100.00];
  const thresholdStats = thresholds.map(th => {
    const hits = multipliers.filter(m => m >= th).length;
    const empiricalProb = (hits / n) * 100;
    const theoreticalProb = (1 / th) * 100;
    const deviation = empiricalProb - theoreticalProb;
    return {
      threshold: th,
      hits,
      empiricalPct: Number(empiricalProb.toFixed(2)),
      theoreticalPct: Number(theoreticalProb.toFixed(2)),
      deviationPct: Number(deviation.toFixed(2)),
    };
  });

  // Multiplier Bins for histogram
  const bins = [
    { label: '< 1.20x', min: 1.00, max: 1.20, count: 0, color: '#ef4444' },
    { label: '1.20x - 2.00x', min: 1.20, max: 2.00, count: 0, color: '#3b82f6' },
    { label: '2.00x - 5.00x', min: 2.00, max: 5.00, count: 0, color: '#8b5cf6' },
    { label: '5.00x - 10.00x', min: 5.00, max: 10.00, count: 0, color: '#10b981' },
    { label: '10.00x - 50.00x', min: 10.00, max: 50.00, count: 0, color: '#f59e0b' },
    { label: '50.00x+', min: 50.00, max: Infinity, count: 0, color: '#ec4899' },
  ];

  multipliers.forEach(m => {
    for (const b of bins) {
      if (m >= b.min && m < b.max) {
        b.count++;
        break;
      }
    }
  });

  // House Edge & Return-To-Player (RTP) estimation at standard 2.00x cashout target
  const targetMult = 2.00;
  const successfulWins = multipliers.filter(m => m >= targetMult).length;
  const empiricalRtp = ((successfulWins * targetMult) / n) * 100;
  const houseEdge = 100 - empiricalRtp;

  // Streak Analysis: Maximum consecutive low crashes (< 2.00x)
  let maxLossStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let currentWinStreak = 0;

  multipliers.forEach(m => {
    if (m < 2.00) {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    } else {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    }
  });

  return {
    sampleSize: n,
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    p25: Number(p25.toFixed(2)),
    p75: Number(p75.toFixed(2)),
    p90: Number(p90.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    under2xPct: Number(((multipliers.filter(m => m < 2.00).length / n) * 100).toFixed(2)),
    thresholdStats,
    bins,
    empiricalRtp: Number(empiricalRtp.toFixed(2)),
    houseEdge: Number(houseEdge.toFixed(2)),
    maxLossStreak,
    maxWinStreak,
  };
}

/**
 * Automated Decision Bot Strategy Backtester (matching ExecutionAgent in Python).
 * @param {Array<{nonce: number, multiplier: number}>} rounds
 * @param {Object} config
 */
export function runStrategyBacktest(rounds, config) {
  const {
    initialBankroll = 1000,
    baseBet = 10,
    targetMultiplier = 2.00,
    strategy = 'MARTINGALE', // 'FIXED', 'MARTINGALE', 'ANTI_MARTINGALE', 'KELLY'
    stopLoss = 0,
    takeProfit = 5000,
    maxBet = 500,
  } = config;

  let balance = initialBankroll;
  let currentBet = baseBet;
  const history = [];
  let wins = 0;
  let losses = 0;
  let peakBalance = initialBankroll;
  let maxDrawdown = 0;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const crashMultiplier = round.multiplier;

    // Boundary check
    if (balance <= 0 || balance <= stopLoss || (takeProfit > 0 && balance >= takeProfit)) {
      break;
    }

    const betAmount = Math.min(currentBet, balance, maxBet);
    const won = crashMultiplier >= targetMultiplier;
    let pnl = 0;

    if (won) {
      pnl = betAmount * (targetMultiplier - 1);
      balance += pnl;
      wins++;

      if (strategy === 'MARTINGALE') {
        currentBet = baseBet; // Reset after win
      } else if (strategy === 'ANTI_MARTINGALE') {
        currentBet = Math.min(currentBet * 2, maxBet); // Double on win
      } else if (strategy === 'KELLY') {
        const p = 1 / targetMultiplier;
        const b = targetMultiplier - 1;
        const f = Math.max(0.01, (b * p - (1 - p)) / b);
        currentBet = Math.max(1, Math.floor(balance * f * 0.5)); // Half Kelly
      } else {
        currentBet = baseBet;
      }
    } else {
      pnl = -betAmount;
      balance += pnl;
      losses++;

      if (strategy === 'MARTINGALE') {
        currentBet = Math.min(currentBet * 2, maxBet); // Double on loss
      } else if (strategy === 'ANTI_MARTINGALE') {
        currentBet = baseBet; // Reset on loss
      } else if (strategy === 'KELLY') {
        const p = 1 / targetMultiplier;
        const b = targetMultiplier - 1;
        const f = Math.max(0.01, (b * p - (1 - p)) / b);
        currentBet = Math.max(1, Math.floor(balance * f * 0.5));
      } else {
        currentBet = baseBet;
      }
    }

    if (balance > peakBalance) peakBalance = balance;
    const drawdown = ((peakBalance - balance) / peakBalance) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    history.push({
      round: round.nonce || (i + 1),
      multiplier: crashMultiplier,
      bet: Number(betAmount.toFixed(2)),
      won,
      pnl: Number(pnl.toFixed(2)),
      balance: Number(balance.toFixed(2)),
    });
  }

  const totalRounds = wins + losses;
  const winRate = totalRounds > 0 ? (wins / totalRounds) * 100 : 0;
  const netProfit = balance - initialBankroll;
  const roi = (netProfit / initialBankroll) * 100;

  return {
    initialBankroll,
    finalBalance: Number(balance.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    roi: Number(roi.toFixed(2)),
    totalRounds,
    wins,
    losses,
    winRate: Number(winRate.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    peakBalance: Number(peakBalance.toFixed(2)),
    history,
  };
}

/**
 * Exports records to CSV format.
 */
export function exportToCsv(records, filename = 'provably_fair_dataset.csv') {
  if (!records || records.length === 0) return;
  const keys = Object.keys(records[0]);
  const header = keys.join(',');
  const rows = records.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','));
  const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports records to JSON format.
 */
export function exportToJson(data, filename = 'provably_fair_dataset.json') {
  const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', jsonStr);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
