import React, { useState, useEffect } from 'react';
import { globalTargetEngine, getTokenExpiry } from '../utils/provablyFair';
import SleekPlane from './SleekPlane';
import { Activity, Hash, AlertTriangle, Key, Radio, RefreshCw, Shield, AlertCircle } from 'lucide-react';

export default function TargetGameSimulator({ isOpen, onClose }) {
  const [roundState, setRoundState]     = useState(globalTargetEngine.currentRound);
  const [customToken, setCustomToken]   = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(globalTargetEngine.tokenInvalid);

  // Compute token expiry info
  const expiry = getTokenExpiry(globalTargetEngine.token);
  const daysLeft = expiry
    ? Math.max(0, ((expiry - Date.now()) / 86400000)).toFixed(1)
    : null;
  const expiryStr = expiry
    ? expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Unknown';

  useEffect(() => {
    const unsubscribe = globalTargetEngine.subscribe((state) => {
      setRoundState({ ...state });
      setTokenInvalid(globalTargetEngine.tokenInvalid);
    });
    return () => unsubscribe();
  }, []);

  // Auto-open token editor when token is invalid
  useEffect(() => {
    if (tokenInvalid) setShowTokenInput(true);
  }, [tokenInvalid]);

  const isLive = roundState.connectionMode === 'LIVE_WS';

  const handleUpdateToken = () => {
    const t = customToken.trim();
    if (!t) return;
    globalTargetEngine.tokenInvalid = false;
    setTokenInvalid(false);
    globalTargetEngine.updateToken(t);
    setShowTokenInput(false);
    setCustomToken('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl animate-scaleUp my-4">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              tokenInvalid ? 'bg-red-500 animate-pulse' :
              isLive ? 'bg-aviator-green animate-ping' : 'bg-amber-500 animate-pulse'
            }`} />
            <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
              <Radio size={16} className="text-aviator-lime" />
              Lucky Jet Live Monitor
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs font-bold bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800"
          >
            Close
          </button>
        </div>

        {/* ── Token Invalid Banner ── */}
        {tokenInvalid && (
          <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span className="text-xs font-black uppercase tracking-wider">JWT Token Expired / Invalid (3502)</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              The server rejected the token. You need a fresh one from the real site.
            </p>
            <div className="bg-black/60 rounded-lg p-3 space-y-1.5 text-[10px] text-zinc-400">
              <p className="font-black text-zinc-200 text-[11px] mb-2">📋 How to get a fresh token:</p>
              <p>1. Open <code className="text-aviator-lime">1play.gamedev-tech.cc</code> in Chrome</p>
              <p>2. Press <kbd className="bg-zinc-800 px-1 rounded">F12</kbd> → Network → WS tab</p>
              <p>3. Click the <code className="text-aviator-lime">lifecycle</code> socket → Messages</p>
              <p>4. Find the first sent message: <code className="text-white">{`{connect:{token:"..."}}`}</code></p>
              <p>5. Copy the <code className="text-yellow-400">token</code> value and paste below</p>
            </div>
          </div>
        )}

        {/* ── Connection Status ── */}
        <div className="flex flex-col gap-1 bg-black/60 border border-zinc-900 px-3 py-2 rounded-xl text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1">
              Channel: <code className="text-aviator-lime font-mono">lucky-jet-94</code>
            </span>
            <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded text-[9px] ${
              tokenInvalid
                ? 'bg-red-900/40 text-red-400 border border-red-500/30'
                : isLive
                ? 'bg-aviator-green/20 text-aviator-green border border-aviator-green/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {tokenInvalid ? '🔴 Token Invalid' : isLive ? '🟢 Live WS' : '🟡 Simulated'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-900 pt-1 mt-0.5">
            <span className="text-zinc-600 font-mono text-[9px]">
              Proxy: ws://localhost:9001 → crash-gateway-grm-cr.gamedev-tech.cc
            </span>
          </div>
        </div>

        {/* ── Live Monitor Canvas ── */}
        <div className="relative w-full h-44 bg-gradient-to-b from-zinc-900 to-black rounded-2xl border border-zinc-800 overflow-hidden flex flex-col items-center justify-center p-4 shadow-inner">
          {roundState.status === 'COUNTDOWN' && (
            <div className="flex flex-col items-center justify-center w-full h-full relative">
              <div className="flex flex-col items-center animate-pulse mb-4">
                <SleekPlane className="w-16 h-10 opacity-50" />
              </div>
              
              <div className="flex flex-col items-center w-full px-12 mt-2">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2 shadow-inner">
                  <div className="h-full bg-aviator-red rounded-full animate-shrink-bar" />
                </div>
                <span className="text-[12px] font-black uppercase tracking-widest text-zinc-500">
                  {isLive ? 'Waiting for Next Round' : 'Countdown'}
                </span>
              </div>
            </div>
          )}

          {roundState.status === 'RUNNING' && (
            <div className="flex flex-col items-center justify-center w-full">
              <SleekPlane className="w-24 h-14 mb-2 animate-bounce-subtle" />
              <span className="text-5xl font-black text-aviator-green tracking-tight font-mono drop-shadow-[0_0_18px_rgba(57,255,20,0.8)]">
                {roundState.currentMultiplier.toFixed(2)}x
              </span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                {isLive ? '🔴 LIVE — Plane Flying' : 'Simulated'}
              </span>
            </div>
          )}

          {roundState.status === 'CRASHED' && (
            <div className="flex flex-col items-center justify-center">
              <div className="text-aviator-red flex items-center gap-1 mb-1 font-bold text-xs">
                <AlertTriangle size={14} /> FLEW AWAY!
              </div>
              <span className="text-5xl font-black text-aviator-red tracking-tight font-mono">
                {roundState.crashPoint.toFixed(2)}x
              </span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                Round Ended
              </span>
            </div>
          )}
        </div>

        {/* ── Round Info ── */}
        <div className="bg-black border border-zinc-900 rounded-xl p-3 space-y-2 text-[11px]">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-1 font-semibold">
              <Hash size={12} className="text-aviator-green" /> Round ID:
            </span>
            <span className="font-mono text-white font-bold">#{roundState.roundId}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-1 font-semibold">
              <Activity size={12} className="text-aviator-lime" /> Crash Point:
            </span>
            <span className="font-mono text-aviator-lime font-bold">{roundState.crashPoint.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-1 font-semibold">
              <Shield size={12} className="text-aviator-red" /> Token expires:
            </span>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[10px] font-bold ${
                parseFloat(daysLeft) < 1 ? 'text-red-400' :
                parseFloat(daysLeft) < 2 ? 'text-amber-400' : 'text-aviator-green'
              }`}>
                {daysLeft !== null ? `${daysLeft}d left` : expiryStr}
              </span>
              <button
                onClick={() => setShowTokenInput(!showTokenInput)}
                className={`text-[10px] font-black flex items-center gap-1 hover:underline ${
                  tokenInvalid ? 'text-red-400 animate-pulse' : 'text-zinc-500 hover:text-aviator-lime'
                }`}
              >
                <Key size={9} />
                {tokenInvalid ? '⚠️ Refresh' : 'Update'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Token Editor ── */}
        {showTokenInput && (
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-700 animate-fadeIn">
            <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block">
              Paste fresh JWT token from DevTools:
            </label>
            <textarea
              rows={4}
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-black border border-zinc-600 rounded-lg p-2 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-aviator-lime placeholder:text-zinc-700"
            />
            <button
              onClick={handleUpdateToken}
              disabled={!customToken.trim()}
              className="w-full bg-aviator-lime text-black font-black py-2.5 rounded-lg text-xs uppercase tracking-wide flex items-center justify-center gap-1 hover:brightness-110 disabled:opacity-40 transition-all"
            >
              <RefreshCw size={12} /> Apply & Reconnect
            </button>
            <p className="text-[9px] text-zinc-600 text-center">
              Also make sure <code className="text-zinc-400">node ws-proxy.cjs</code> is running in a terminal
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
