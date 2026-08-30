import { ACTIVE_LIFECYCLE_TOKEN, calculateCrashFromHash } from './provablyFair';

export class TargetGameEngine {
    constructor(url = 'ws://localhost:9001') {
        this.url = url;
        this.ws = null;
        this.currentRound__future_crash = null;
        this.onCrashUpdate = null;
        this.onRoundStart = null;
        this.gameState = 'IDLE';
        this.isConnected = false;

        // Reconnection State
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.baseDelay = 1000;

        // Heartbeat State
        this.pingInterval = null;
        this.pongTimeout = null;
    }

    connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;
        console.log(`🔌 Attempting connection to game stream at ${this.url}...`);
        
        try {
            this.ws = new WebSocket(this.url);
        } catch (e) {
            console.warn('WebSocket init failed:', e);
            this.isConnecting = false;
            this._scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            console.log('✅ Connected to Game WebSocket Stream!');
            this.isConnecting = false;
            this.isConnected = true;
            this.reconnectAttempts = 0;
            if (this.onOpen) this.onOpen();
            
            // 1. Authenticate with Centrifugo
            const token = localStorage.getItem('lj_centrifugo_token_v4') || ACTIVE_LIFECYCLE_TOKEN;
            this.ws.send(JSON.stringify({ connect: { name: 'js', token: token }, id: 1 }));
            
            this._startHeartbeat();
        };

        this.ws.onmessage = (e) => {
            if (e.data === 'PONG' || e.data === '{}') {
                this._heartbeatReceived();
                return;
            }

            try {
                const frames = e.data.split('\n').filter(Boolean);
                for (const frameStr of frames) {
                    const data = JSON.parse(frameStr);
                    
                    // Handle Centrifugo connect acknowledgment
                    if (data.id === 1 && !data.error) {
                        const subChannel = 'lucky-jet-94';
                        console.log(`✅ Centrifugo Authenticated! Subscribing to ${subChannel}...`);
                        this.ws.send(JSON.stringify({ subscribe: { channel: subChannel }, id: 2 }));
                        continue;
                    }
                    
                    this._handleFrame(data);
                }
            } catch (err) {
                console.error('❌ Error parsing WebSocket frame:', err);
            }
        };

        this.ws.onerror = (error) => {
            console.warn('❌ WebSocket Stream Error:', error);
        };

        this.ws.onclose = () => {
            console.log('🛑 Stream closed.');
            this.isConnecting = false;
            this.isConnected = false;
            if (this.onClose) this.onClose();
            this._stopHeartbeat();
            this._scheduleReconnect();
        };
    }

    _startHeartbeat() {
        this._stopHeartbeat();
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send('{}');
            }
        }, 15000);
    }

    _heartbeatReceived() {
        clearTimeout(this.pongTimeout);
    }

    _stopHeartbeat() {
        clearInterval(this.pingInterval);
        clearTimeout(this.pongTimeout);
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('⏳ Max reconnection attempts reached. Retrying every 10s...');
            setTimeout(() => {
                this.reconnectAttempts = 0;
                this.connect();
            }, 10000);
            return;
        }
        const delay = Math.min(10000, this.baseDelay * Math.pow(1.5, this.reconnectAttempts));
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    getLatestPrediction() {
        return this.currentRound__future_crash;
    }

    async _handleFrame(frame) {
        let data = frame;
        if (frame?.push?.pub?.data) data = frame.push.pub.data;
        else if (frame?.pub?.data) data = frame.pub.data;
        else if (frame?.result?.data) data = frame.result.data;

        if (!data) return;

        const evt = data.eventType ?? data.event_type ?? data.type;

        // 1. Immediately extract precomputed future crash prediction from server
        if (data.__future_crash !== undefined && !isNaN(parseFloat(data.__future_crash))) {
            this.currentRound__future_crash = parseFloat(data.__future_crash);
            if (this.onRoundStart) {
                this.onRoundStart(this.currentRound__future_crash, data.server_seed_hash || '', data.roundId || data.round_id, data);
            }
        }

        // 2. Provably Fair / Server Seed calculation fallback if not already computed
        if (!this.currentRound__future_crash && (data.provablyFair || data.configHash || data.server_seed_hash || data.serverSeed)) {
            const serverHash = data.provablyFair?.hash || data.server_seed_hash || data.serverSeed || '';
            const configHash = data.provablyFair?.configHash || data.configHash || 'f01049740de6678d';
            if (serverHash) {
                try {
                    const predicted = await calculateCrashFromHash(serverHash, configHash);
                    this.currentRound__future_crash = predicted;
                    if (this.onRoundStart) {
                        this.onRoundStart(predicted, serverHash, data.roundId || data.round_id, data);
                    }
                } catch (e) {
                    console.error('Hash calculation error:', e);
                }
            }
        }

        // 3. Round Start / Waiting Phase
        if (evt === 'startGame' || (evt === 'changeState' && (data.status === 'bet' || data.status === 'waiting' || data.state === 'waiting' || data.state === 'betting'))) {
            this.gameState = 'WAITING';
            if (this.onCrashUpdate) {
                this.onCrashUpdate(this.currentRound__future_crash, 'WAITING', data);
            }
            return;
        }
        
        // 4. Live Flight Multiplier Ticking
        if (evt === 'changeCoefficient' || (evt === 'changeState' && (data.status === 'flying' || data.state === 'flying')) || data.multiplier !== undefined) {
            this.gameState = 'RUNNING';
            let liveVal = null;
            if (Array.isArray(data.current) && data.current.length > 0) {
                liveVal = parseFloat(data.current[0]);
            } else if (Array.isArray(data.next) && data.next.length > 0) {
                liveVal = parseFloat(data.next[0]);
            } else if (data.multiplier !== undefined) {
                liveVal = parseFloat(data.multiplier);
            } else if (data.coefficient !== undefined) {
                liveVal = parseFloat(data.coefficient);
            }

            if (liveVal !== null && !isNaN(liveVal) && liveVal >= 1.0) {
                this.currentMultiplier = liveVal;
                if (this.onCrashUpdate) {
                    this.onCrashUpdate(liveVal, 'RUNNING', data);
                }
            }
            return;
        }

        // 5. Round Finished / Crashed
        if (evt === 'stopCoefficient' || (data.status === 'crashed' && data.finalValue !== undefined) || (data.__crash_value__ !== undefined && evt !== 'startGame')) {
            if (this.gameState === 'CRASHED') return; // Ignore duplicate crash triggers for the same round
            this.gameState = 'CRASHED';
            let finalVal = this.currentMultiplier || 1.00;
            if (data.__crash_value__ !== undefined && !isNaN(parseFloat(data.__crash_value__))) {
                finalVal = parseFloat(data.__crash_value__);
            } else if (data.__final_crash !== undefined && !isNaN(parseFloat(data.__final_crash))) {
                finalVal = parseFloat(data.__final_crash);
            } else if (data.finalValue !== undefined && !isNaN(parseFloat(data.finalValue))) {
                finalVal = parseFloat(data.finalValue);
            } else if (data.finalCoefficient !== undefined) {
                const parsedCoeff = Array.isArray(data.finalCoefficient) ? parseFloat(data.finalCoefficient[0]) : parseFloat(data.finalCoefficient);
                if (!isNaN(parsedCoeff)) finalVal = parsedCoeff;
            } else if (data.multiplier !== undefined && !isNaN(parseFloat(data.multiplier))) {
                finalVal = parseFloat(data.multiplier);
            }

            finalVal = Math.max(1.00, parseFloat(finalVal.toFixed(2)));

            if (this.onCrashUpdate) {
                this.onCrashUpdate(finalVal, 'CRASHED', data);
            }
            return;
        }
    }
}