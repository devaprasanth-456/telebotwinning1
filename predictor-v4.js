const WebSocket = require('ws');
const crypto = require('crypto');

const CONFIG = {
    base_url_main: 'wss://crash-gateway-grm-cr.gamedev-tech.cc/websocket/lifecycle',
    client_name: "js",
    jwt_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODgzNjA0MjUsImlhdCI6MTc4ODEwMTIyNSwic3ViIjoiMzEyMzI1MyIsImNoYW5uZWxzIjpbImx1Y2t5LWpldC05NCJdfQ.x8XvxDcHvMjJB455Cp0l1qN3hsjEWni6_yJ4zbCnvMs",
    connection_id: 1,
};

let messageId = 1;

function getChannelsFromToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            return payload.channels || [];
        }
    } catch (e) {}
    return ['lucky-jet-94'];
}

function main() {
    console.log("\n🚀 Connecting to Game Lifecycle Gateway...");

    const wsOptions = {
        headers: {
            'Origin': 'https://1play.gamedev-tech.cc',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8'
        }
    };

    const ws = new WebSocket(CONFIG.base_url_main, wsOptions);

    ws.on('open', () => {
        console.log(`✅ Connected to ${CONFIG.base_url_main}`);

        // Centrifugo connect payload
        const connectCommand = {
            id: messageId++,
            connect: {
                token: CONFIG.jwt_token
            }
        };

        try {
            ws.send(JSON.stringify(connectCommand));
            console.log("➡️ Sent 'connect' command.");
        } catch (e) {
            console.error("Send Error:", e.message);
        }
    });

    // 2. Message Handling
    ws.on('message', (data) => {
        try {
            const raw = data.toString();

            // Centrifugo Ping from server -> reply with Pong ({})
            if (raw === '{}' || !raw.trim()) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('{}');
                }
                return;
            }

            // Split by newline in case the server sent multiple JSON packets in a single WS frame
            const lines = raw.split('\n').filter(l => l.trim().length > 0);

            for (const line of lines) {
                if (line === '{}') {
                    if (ws.readyState === WebSocket.OPEN) ws.send('{}');
                    continue;
                }

                let parsed;
                try {
                    parsed = JSON.parse(line);
                } catch (pe) {
                    continue;
                }

                // Handle connection response
                if (parsed.connect) {
                    console.log(`🎉 Authenticated successfully! Client ID: ${parsed.connect.client || 'N/A'}`);
                    const autoSubs = parsed.connect.subs ? Object.keys(parsed.connect.subs) : [];
                    const channels = getChannelsFromToken(CONFIG.jwt_token);

                    channels.forEach((ch) => {
                        if (!autoSubs.includes(ch)) {
                            ws.send(JSON.stringify({
                                id: messageId++,
                                subscribe: { channel: ch }
                            }));
                        }
                    });
                    continue;
                }

                // Extract the inner game data whether it's wrapped in push/pub or top-level
                const pub = parsed.pub || (parsed.push && parsed.push.pub);
                const message = (pub && pub.data) ? pub.data : parsed;

                // Extract ProvablyFair and ConfigHash from all known locations
                const pf = (message.roundInfo && message.roundInfo.provablyFair) || message.provablyFair;
                const serverSeedHash = pf?.hash || message.server_seed_hash || message.f_s || message.hash;
                const configHash = (message.configHashes && message.configHashes.hash) || message.configHash || (pf && pf.configHash) || "f01049740de6678d";

                // 1. When a new round is announced in betting phase (startGame)
                if (message.eventType === 'startGame' || (serverSeedHash && !roundStarted && message.eventType !== 'endGame')) {
                    roundStarted = true;
                    const roundId = message.roundInfo?.id || message.roundId || 'N/A';

                    console.log(`\n==================================================`);
                    console.log(`🌪️ NEW ROUND DETECTED! (Round ID: ${roundId})`);

                    if (serverSeedHash) {
                        try {
                            const crashPoint = calculateCrashPoint(serverSeedHash, configHash);
                            const multiplier = 1 + (crashPoint / 5000.3);
                            console.log(`🔐 Server Seed Hash: ${serverSeedHash.substring(0, 48)}...`);
                            console.log(`💥 PREDICTED CRASH POINT: ~${multiplier.toFixed(2)}x`);
                        } catch (e) {
                            console.error("Calculation Error:", e.message);
                        }
                    } else {
                        console.log(`⚠️ No seed hash present in this start event.`);
                    }
                    console.log(`==================================================\n`);
                }

                // 2. State change (waiting, betting, flying)
                if (message.eventType === 'changeState') {
                    const state = message.state;
                    const nextTime = message.nextStateTime || "N/A";

                    if (state === 'waiting' || state === 'betting') {
                        console.log(`⏳ State: ${state.toUpperCase()} (Next state at: ${nextTime})`);
                    } else if (state === 'flying') {
                        console.log(`✈️  State: FLYING (Round started! Watching live multiplier...)`);
                    }
                }

                // 3. Live multiplier updates
                if (message.eventType === 'changeCoefficient') {
                    const current = message.current ? message.current[0] : null;
                    const next = message.next ? message.next[0] : null;
                    process.stdout.write(`\r✈️  Live Multiplier: ${current || '?'}x  (Next: ${next || '?'}x)   `);
                }

                // 4. Round finished
                if (message.eventType === 'stopCoefficient' || message.eventType === 'endGame' || message.eventType === 'finish' || message.status === 'crashed') {
                    if (roundStarted) {
                        console.log(`\n🛑 Round Finished / Crashed! (Event: ${message.eventType || message.status})`);
                        roundStarted = false;
                    }
                }
            }

        } catch (e) {
            console.error("Parse Error:", e.message);
        }
    });

    ws.on('error', (err) => {
        console.error("\n❌ Connection Error:", err.message);
    });

    ws.on('close', (code, reason) => {
        const reasonStr = reason ? reason.toString() : 'No reason';
        console.log(`\n❌ Connection Closed | Code: ${code} | Reason: "${reasonStr}"`);

        if (code === 3500) {
            console.error("⚠️ Token expired. Copy a new token from DevTools.");
            return;
        }

        setTimeout(() => main(), 3000);
    });
}

// Start first attempt
main();
