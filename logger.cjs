const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // You can use 'crypto.randomUUID' if uuid isn't installed, or just timestamp

// Configuration for the log file
const LOG_FILE_PATH = path.join(__dirname, 'crash_log.csv');

// State to track current round
let currentRoundId = null;
let currentStartTimestamp = null;
let lastCrashedMultiplier = 1.0;

// Check if CSV exists and initialize headers
function initLogFile() {
    let content = '';
    try {
        const data = fs.readFileSync(LOG_FILE_PATH, 'utf8');
        if (!data.includes('timestamp')) {
            // File is new, add headers
            content += `timestamp,round_id,multiplier_at_start,cross_point,duration_ms\n`;
        } else {
            content = data + '\n'; // Append existing rows with a newline in case file ends abruptly? No, just read it back. Actually simpler to append always but check first row logic. Let's keep simple: write new line every crash.
            // Better approach for CSV streaming: Read last line to know where we are or assume append always works fine for most cases unless exact byte match needed. 
            // For robustness:
            const lines = content.split('\n');
            if (lines[lines.length - 1].trim() === '') content += '';
        }
    } catch (err) {
        // File doesn't exist, start fresh with headers
        content = `timestamp,round_id,multiplier_at_start,cross_point,duration_ms\n`;
    }

    fs.writeFileSync(LOG_FILE_PATH, content);
}

// Helper to get current time in ISO format + ms precision suitable for CSV parsing later
function getTimeStr(msOffset = 0) {
    return new Date(Date.now() - msOffset).toISOString().replace('T', ' ').split('.')[0];
}

// Main Callback: This is where your Proxy sends data TO the Logger!
module.exports = function onProxyEvent(payloadFromYourWsProxy) {

    // 1. Detect Round Start (Initialize tracking)
    if (payloadFromYourWsProxy.type === 'ROUND_START') {
        currentRoundId = payloadFromYourWebSocket?.id || `R-${Date.now()}`; // Use server ID or generate one
        lastCrashedMultiplier = 1.0;

        console.log(`[Logger] 🟢 New Round Started: ${currentRoundId}`);

        // If proxy injected a future crash, capture it immediately as "predicted" vs actual later
        if (payloadFromYourWsPayload.__future_crash !== undefined) {
            console.log(`[Logger] 🔮 Prediction Captured: ${payloadFromYourWsPayload.__future_crash}x`);
        }

    }
    // 2. Detect Round End/Crash (Finalize and Save)
    else if (payloadFromYourWsProxy.type === 'ROUND_CRASH' || payloadFromYourWsProxy.finalValue) {

        const finalVal = parseFloat(payloadFromYourWsProxy._finalCrash ?? payloadFromYourWsProxy.multiplier ?? 1.0);

        // Calculate duration (simplified - in real app you'd track start_time vs end_time from server timestamps)
        const durationMs = Math.floor((Date.now() - currentStartTimestamp) / 1000 * 60);

        const logEntry = `${getTimeStr()},${currentRoundId},${lastCrashedMultiplier},${finalVal},~${durationMs}\n`;

        console.log(`[Logger] 🔴 Round Crashed at: ${finalVal}x`);
        console.log(`[Logger] 💾 Saving to CSV...`);

        // Append to file
        fs.appendFileSync(LOG_FILE_PATH, logEntry);
    }
    // 3. Handle Standard Live Updates (Keep track of start time for duration calc later if needed)
    else if (payloadFromYourWsProxy.pub?.data?.eventType === 'changeCoefficient') {
        lastCrashedMultiplier = parseFloat(payloadFromYourWsProxy.pub.data.multiplier);

        // If we haven't started tracking this round yet, mark the start!
        if (!currentStartTimestamp) currentStartTimestamp = Date.now();
    }

};

// Initialize when script loads or on first event
initLogFile(); 
