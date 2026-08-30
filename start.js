#!/usr/bin/env node
/**
 * start.js - Integrated Single-Command Runner for Lucky Jet Predictor & Darkworld UI
 * Launches:
 *   1. ws-proxy.cjs (WebSocket Proxy on 9001 & Broadcaster on 8080)
 *   2. vite dev (Frontend UI on http://localhost:5173)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`\n=============================================================`);
console.log(`🚀 STARTING INTEGRATED LUCKY JET PREDICTOR SYSTEM`);
console.log(`=============================================================`);
console.log(`▶ Engine: SHA-512 Fixed Predictor & Over/Under 2X AI Model`);
console.log(`▶ Bot:    Aviator Telegram Signal Monitor (Linked to Generated 2X Odds)`);
console.log(`▶ Data:   lucky_jet_verified.csv (4,900+ Verified Rounds)`);
console.log(`▶ UI:     Darkworld Cyber Interface`);
console.log(`=============================================================\n`);

// 1. Start Predictor Engine (WebSocket Server on 9001 & 8080)
const isWin = process.platform === 'win32';
const nodeCmd = 'node';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

const proxyProcess = spawn(nodeCmd, ['predictor-fixed.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

proxyProcess.on('error', (err) => {
  console.error('❌ Failed to start ws-proxy.cjs:', err);
});

// 2. Start Vite Dev Server
const viteProcess = spawn(npxCmd, ['vite'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

viteProcess.on('error', (err) => {
  console.error('❌ Failed to start Vite:', err);
});

function cleanup() {
  console.log('\n🛑 Shutting down servers...');
  try { proxyProcess.kill(); } catch (_) {}
  try { viteProcess.kill(); } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
