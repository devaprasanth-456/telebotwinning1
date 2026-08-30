import React, { useState, useEffect, useRef } from 'react';
import { Radio, Terminal, Wifi, WifiOff, Key, RefreshCw, Trash2, ShieldCheck, AlertCircle, Copy, Check, Download, Bot, DollarSign } from 'lucide-react';
import { globalTargetEngine, getTokenExpiry } from '../utils/provablyFair';
import { globalExecutionEngine } from '../utils/SmartExecutionEngine';

export default function LiveGatewayConsole() {
  const [logs, setLogs] = useState([]);
  const [activeConsoleTab, setActiveConsoleTab] = useState('decision'); // 'decision' or 'websocket'
  const [customToken, setCustomToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(globalTargetEngine.tokenInvalid);
  const [engineRound, setEngineRound] = useState(globalTargetEngine.currentRound);
  const [execState, setExecState] = useState(globalExecutionEngine.getSnapshot());
  const logEndRef = useRef(null);

  // Compute token expiry info
  const expiry = getTokenExpiry(globalTargetEngine.token);
  const daysLeft = expiry
    ? Math.max(0, ((expiry - Date.now()) / 86400000)).toFixed(1)
    : null;
  const expiryStr = expiry
    ? expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Unknown';

  useEffect(() => {
    const unsubExec = globalExecutionEngine.subscribe((snapshot) => {
      setExecState({ ...snapshot });
    });
    return () => unsubExec();
  }, []);

  useEffect(() => {
    const unsubscribe = globalTargetEngine.subscribe((state) => {
      setEngineRound({ ...state });
      setTokenInvalid(globalTargetEngine.tokenInvalid);

      if (state.lastEvent) {
        setLogs((prev) => [
          ...prev.slice(-99),
          {
            time: new Date().toLocaleTimeString(),
            type: state.lastEvent.type || 'STATE_UPDATE',
            data: state.lastEvent.data || state,
          },
        ]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateToken = () => {
    const t = customToken.trim();
    if (!t) return;
    globalTargetEngine.tokenInvalid = false;
    setTokenInvalid(false);
    globalTargetEngine.updateToken(t);
    setCustomToken('');
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isLive = engineRound.connectionMode === 'LIVE_WS';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-black uppercase tracking-wider">
              <Radio size={14} />
              Live WebSocket Stream & Decision Telemetry
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Gateway Diagnostics & Telemetry Console
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Real-time Centrifugo stream inspector, sub-millisecond decision telemetry logger, and session export engine.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => globalExecutionEngine.exportSessionLog()}
              className="flex items-center gap-1.5 text-xs font-black bg-aviator-lime text-black hover:brightness-110 px-3.5 py-2 rounded-xl shadow-lg shadow-aviator-lime/20 transition-all uppercase tracking-wider"
            >
              <Download size={14} />
              Export runtime_session.log
            </button>
          </div>
        </div>
      </div>

      {/* Decision Engine Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Rounds Monitored</span>
          <span className="text-xl font-black text-white font-mono">{execState.sessionStats.roundsTracked}</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Successful Cashouts</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{execState.sessionStats.cashoutsExecuted}</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Session Net P&L</span>
          <span className={`text-xl font-black font-mono ${execState.sessionStats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {execState.sessionStats.totalPnl >= 0 ? `+$${execState.sessionStats.totalPnl}` : `-$${Math.abs(execState.sessionStats.totalPnl)}`}
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Gateway Status</span>
          <span className={`text-sm font-black font-mono uppercase flex items-center gap-1.5 mt-1 ${isLive ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-500 animate-pulse'}`} />
            {isLive ? 'Live WebSocket' : 'Simulated'}
          </span>
        </div>
      </div>

      {/* JWT Token Update Box */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Key size={14} className="text-aviator-lime" />
            Active Centrifugo JWT Gateway Token
          </h3>
          <button
            onClick={() => handleCopy(globalTargetEngine.token)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white font-bold transition-colors"
          >
            {copied ? <Check size={12} className="text-aviator-lime" /> : <Copy size={12} />}
            {copied ? 'Copied Active Token' : 'Copy Active Token'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
            placeholder="Paste fresh eyJhbGciOiJIUzI1NiI... token here"
            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-aviator-lime"
          />
          <button
            onClick={handleUpdateToken}
            className="bg-aviator-lime text-black font-black px-6 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-wider shadow-lg shadow-aviator-lime/20"
          >
            Save & Reconnect
          </button>
        </div>
      </div>

      {/* Terminal Inspector Section */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveConsoleTab('decision')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                activeConsoleTab === 'decision'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Bot size={13} className="text-aviator-lime" />
              Smart Decision Log
            </button>

            <button
              onClick={() => setActiveConsoleTab('websocket')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                activeConsoleTab === 'websocket'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Terminal size={13} className="text-purple-400" />
              Raw WebSocket Stream
            </button>
          </div>

          <button
            onClick={() => setLogs([])}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Trash2 size={12} />
            Clear Terminal
          </button>
        </div>

        {/* Console Body */}
        {activeConsoleTab === 'decision' ? (
          <div className="h-64 bg-black/90 rounded-2xl p-4 font-mono text-[11px] overflow-y-auto space-y-2 border border-zinc-900">
            {execState.recentLogs.length === 0 ? (
              <div className="text-zinc-600 flex items-center justify-center h-full">
                Waiting for smart execution decisions...
              </div>
            ) : (
              execState.recentLogs.map((l, idx) => (
                <div key={idx} className="flex items-start gap-2 hover:bg-zinc-900/40 p-1 rounded">
                  <span className="text-zinc-600 select-none">[{l.time}]</span>
                  <span className={`font-bold ${
                    l.type === 'CASHOUT_SUCCESS' ? 'text-emerald-400' :
                    l.type === 'ROUND_BUST' ? 'text-red-400' :
                    l.type === 'ROUND_START' ? 'text-cyan-400' :
                    'text-amber-400'
                  }`}>
                    [{l.type}]
                  </span>
                  <span className="text-zinc-300 break-all">{JSON.stringify(l)}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div className="h-64 bg-black/90 rounded-2xl p-4 font-mono text-[11px] overflow-y-auto space-y-2 border border-zinc-900">
            {logs.length === 0 ? (
              <div className="text-zinc-600 flex items-center justify-center h-full">
                Waiting for raw Centrifugo WebSocket frames...
              </div>
            ) : (
              logs.map((l, idx) => (
                <div key={idx} className="flex items-start gap-2 hover:bg-zinc-900/40 p-1 rounded">
                  <span className="text-zinc-600 select-none">[{l.time}]</span>
                  <span className="text-purple-400 font-bold">[{l.type}]</span>
                  <span className="text-zinc-300 break-all">{JSON.stringify(l.data)}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
