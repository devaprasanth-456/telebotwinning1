const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });
console.log('🔮 Local Game Proxy Mock Server running on ws://localhost:8080');

wss.on('connection', (ws) => {
    console.log('🔌 Frontend client connected to proxy!');

    ws.on('message', (message) => {
        const msgString = message.toString();

        // Respond to plain PING
        if (msgString === 'PING') {
            ws.send('PONG');
            return;
        }

        // Respond to JSON heartbeat messages
        try {
            const msgObj = JSON.parse(msgString);
            if (msgObj.type === 'HEARTBEAT') {
                ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }));
                return;
            }
        } catch (e) {
            // Not JSON, ignore
        }

        console.log(`📥 Received standard client message: ${msgString}`);
    });

    let nextCrash = 2.5;
    const interval = setInterval(() => {
        if (ws.readyState !== ws.OPEN) return;

        // For testing, cycle through fixed values
        nextCrash = nextCrash >= 15 ? 2.5 : nextCrash + 0.5;

        const gamePayload = {
            type: "ROUND_START",
            timestamp: Date.now(),
            __future_crash: nextCrash
        };
        ws.send(JSON.stringify(gamePayload));
    }, 7000);

    ws.on('close', () => {
        console.log('❌ Client disconnected.');
        clearInterval(interval);
    });
});