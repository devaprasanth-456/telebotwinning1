const WebSocket = require('ws'); // Ensure ws is installed

// Copy your existing config here...
const CONFIG = {
    base_url_main: 'wss://crash-gateway-grm-cr.gamedev-tech.cc/websocket/lifecycle',
    client_name: "js",
    jwt_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Your JWT from before
    connection_id: 1,
};

let roundStarted = false;

function main() {
    console.log("🚀 Reconnecting attempt...");

    const ws = new WebSocket(CONFIG.base_url_main);

    ws.on('open', () => {
        console.log(`✅ Connected (Round ID: ${CONFIG.connection_id})`);

        // Send the initial packet exactly as observed in your browser
        const connectPayload = { name: CONFIG.client_name, token: CONFIG.jwt_token };
        ws.send(JSON.stringify(connectPayload));
        console.log("➡️ Sent 'connect' payload.");

        // Optional: Try sending a heartbeat to see if server expects it immediately
        setTimeout(() => {
            if (!roundStarted) {
                console.log("📢 Sending ping check...");
                ws.send(JSON.stringify({ type: "ping" }));
            }
        }, 500);

    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());

            // Log EVERY field including nested ones, even if unknown keys exist.
            console.log(`⬅️ Received Event Type: [${message.event || 'unknown'}]`);

            if (!roundStarted) {
                roundStarted = true;

                // Check for seed fields - these are the gold standard in crash games
                if ('server_seed_hash' in message && !('clientSeed' in message)) {
                    console.log(`🌪 Round Start Detected! Server Seed Hash found.`);

                    const hashInput = message.server_seed_hash;
                    const finalHash = crypto.createHash('sha256').update(hashInput).digest('hex');

                    console.log(`   🔐 Server Seed Hash (Preview): ${finalHash.substring(0, 32)}...`);

                    // If you see 'nonce' or similar round ID field here:
                    if (message.nonce) console.log(`   🕒 Nonce/Round ID:`, message.nonce);
                } else if ('multiplier' in message && !roundStarted) {
                    console.log(`📈 Live Multiplier Update: ${message.multiplier}x`);
                }

            } else {
                // Check for crash event
                if ('event' in message && message.event === 'crashed') {
                    console.log(`💥 Round Crashed at:`, message.multiplier || 'unknown');
                    roundStarted = false; // Reset logic for next round
                }

            }

        } catch (e) {
            console.error("Parse Error:", e.message, "Raw Data:", data.toString()); // Log raw too!
        }
    });

    ws.on('error', (err) => {
        console.error("Connection Error:", err.message);

        // If error occurs during open phase immediately, check headers.
        if (!roundStarted) {
            setTimeout(() => main(), 3000);
        } else {
            console.log("Round in progress or reset needed.");
        }
    });

    ws.on('close', () => {
        const isExpectedClose = roundStarted && !ws.readyState === WebSocket.OPEN;
        console.log(isExpectedClose ? "❌ Round Finished/Reset" : "❌ Connection Closed");
        // Only reconnect if we haven't seen the seed yet for this session (simplified logic)
        if (!isExpectedClose || Math.random() > 0.5) {
            setTimeout(() => main(), 2000); // Randomized delay to avoid loop spam
        } else {
            setTimeout(() => main(), 3000);
        }
    });

}

// Start first attempt
main();
