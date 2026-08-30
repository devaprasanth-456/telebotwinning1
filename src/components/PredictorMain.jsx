import React, { useState, useEffect, useRef } from 'react';
import {
  Rocket,
  ShieldCheck,
  BarChart2,
  Bot,
  Grid,
  Radio,
  LogOut,
  Download,
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  Eye,
  RefreshCw,
  Sparkles,
  Zap,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import SleekPlane from './SleekPlane';
import TargetGameSimulator from './TargetGameSimulator';
import MorePredictors from './MorePredictors';
import ProvablyFairVerifier from './ProvablyFairVerifier';
import BatchSimulatorAudit from './BatchSimulatorAudit';
import DecisionBotSandbox from './DecisionBotSandbox';
import LiveGatewayConsole from './LiveGatewayConsole';
import { globalTargetEngine, fetchRealCrashHistory } from '../utils/provablyFair';
import { TargetGameEngine } from '../utils/TargetGameEngine';
import { globalExecutionEngine, EXECUTION_MODES } from '../utils/SmartExecutionEngine';

export default function PredictorMain({ onResetKey }) {
  const [activeTab, setActiveTab] = useState('live');
  const [history, setHistory] = useState([2.14, 1.45, 5.82, 1.12, 3.4, 1.88, 12.04]);
  const [showTargetMonitor, setShowTargetMonitor] = useState(false);
  const [targetRound, setTargetRound] = useState(globalTargetEngine.currentRound);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [liveMultiplier, setLiveMultiplier] = useState(null);
  const [engineState, setEngineState] = useState('IDLE');

  // Smart Execution Engine Reactive State
  const [execState, setExecState] = useState(globalExecutionEngine.getSnapshot());

  // Subscribe to SmartExecutionEngine
  useEffect(() => {
    const unsubExec = globalExecutionEngine.subscribe((snapshot) => {
      setExecState({ ...snapshot });
    });
    return () => unsubExec();
  }, []);

  // Load real crash history from server API on mount
  useEffect(() => {
    fetchRealCrashHistory(10).then((realHistory) => {
      if (realHistory && realHistory.length > 0) {
        setHistory(realHistory);
        setApiConnected(true);
      }
    });
  }, []);

  const engineRef = useRef(null);

  // Instantiate and connect TargetGameEngine with SmartExecutionEngine synchronization
  useEffect(() => {
    engineRef.current = new TargetGameEngine();
    const engine = engineRef.current;

    engine.onCrashUpdate = (val, state) => {
      if (val !== null) {
        setLiveMultiplier(val);
        // Feed live multiplier tick to Smart Execution Engine
        if (state === 'RUNNING' || state === 'WAITING' || !state) {
          globalExecutionEngine.onMultiplierTick(val);
        }
      }

      if (state) setEngineState(state);

      if (state === 'WAITING') {
        const pred = engine.getLatestPrediction();
        globalExecutionEngine.startRound(
          targetRound?.roundId,
          targetRound?.serverSeed,
          targetRound?.hash,
          pred
        );
      } else if (state === 'CRASHED') {
        globalExecutionEngine.endRound(val);
        setTimeout(() => {
          setEngineState('IDLE');
          engine.currentRound__future_crash = null;
        }, 3500);
      }
    };
    engine.connect();

    return () => {
      if (engine.ws) engine.ws.close();
      engine._stopHeartbeat();
    };
  }, [targetRound?.roundId, targetRound?.serverSeed, targetRound?.hash]);

  // Subscribe to globalTargetEngine updates
  useEffect(() => {
    const unsubscribe = globalTargetEngine.subscribe((round) => {
      setTargetRound({ ...round });
      setApiConnected(round.connectionMode === 'LIVE_WS');

      // Sync round start
      if (round.status === 'COUNTDOWN' && execState.state !== 'COUNTDOWN') {
        globalExecutionEngine.startRound(round.roundId, round.serverSeed, round.hash, round.crashPoint);
      } else if (round.status === 'RUNNING') {
        globalExecutionEngine.onMultiplierTick(round.currentMultiplier);
      } else if (round.status === 'CRASHED' && execState.state !== 'CRASHED') {
        globalExecutionEngine.endRound(round.crashPoint);
      }
    });
    return () => unsubscribe();
  }, [execState.state]);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const navTabs = [
    { id: 'live', label: 'Live Signal & Execution', icon: Rocket, color: 'text-aviator-lime' },
    { id: 'verifier', label: 'Fair Verifier', icon: ShieldCheck, color: 'text-cyan-400' },
    { id: 'simulator', label: 'Batch Simulator', icon: BarChart2, color: 'text-blue-400' },
    { id: 'bot', label: 'Decision Bot', icon: Bot, color: 'text-emerald-400' },
    { id: 'apps', label: 'Platform Hub', icon: Grid, color: 'text-amber-400' },
    { id: 'gateway', label: 'Gateway Stream', icon: Radio, color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center select-none selection:bg-aviator-red selection:text-white">
      {/* Top Main Navigation Bar */}
      <header className="w-full bg-gradient-to-b from-zinc-900 to-black border-b border-zinc-800/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {/* Logo & Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={onResetKey}
              title="Logout / License Key"
              className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
            >
              <LogOut size={15} />
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black italic tracking-tighter text-white">
                  WE GIVE <span className="text-aviator-red">ANSWER</span>
                </span>
                <span className="text-[9px] font-black bg-aviator-lime/10 text-aviator-lime px-1.5 py-0.5 rounded border border-aviator-lime/20 font-mono">
                  v14.2 PRO
                </span>
              </div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest hidden sm:block">
                Smart Execution & Provably Fair Prediction Engine
              </span>
            </div>
          </div>

          {/* Center Nav Pills (Desktop / Tablet) */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800/80">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  <Icon size={14} className={isActive ? tab.color : 'text-zinc-500'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Header Badges */}
          <div className="flex items-center gap-2">
            {/* Session PnL Pill */}
            <div className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border ${
              execState.sessionStats.totalPnl >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <DollarSign size={12} />
              <span>PnL: {execState.sessionStats.totalPnl >= 0 ? `+$${execState.sessionStats.totalPnl}` : `-$${Math.abs(execState.sessionStats.totalPnl)}`}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded-xl">
              <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-aviator-green animate-ping' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-[10px] font-mono text-zinc-300 font-bold">
                {apiConnected ? 'LIVE' : 'SIM'}
              </span>
            </div>

            {showInstallBtn && (
              <button
                onClick={handleInstallPWA}
                className="flex items-center gap-1 bg-aviator-lime text-black px-2.5 py-1 rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-aviator-lime/20"
              >
                <Download size={12} />
                <span className="hidden sm:inline">Install</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Sub-Navigation */}
        <div className="md:hidden flex items-center gap-1 px-3 py-2 overflow-x-auto no-scrollbar border-t border-zinc-900 bg-black/40">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:bg-zinc-900/50'
                }`}
              >
                <Icon size={13} className={isActive ? tab.color : 'text-zinc-500'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Tab Content View */}
      <main className="w-full max-w-6xl mx-auto px-4 py-6">
        {/* TAB 1: LIVE RADAR & SMART EXECUTION HUD */}
        {activeTab === 'live' && (
          <div className="w-full flex flex-col items-center space-y-6">
            <div className="w-full max-w-[420px] flex flex-col items-center space-y-5">
              
              {/* Telemetry Header Badge Strip */}
              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    Active Round Nonce
                  </span>
                  <span className="text-xs font-mono font-black text-white">
                    #{execState.currentRoundId || 1045}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    Target Exit
                  </span>
                  <span className="text-xs font-mono font-black text-aviator-lime">
                    {execState.targetCashout.toFixed(2)}x
                  </span>
                </div>

                {/* Signal Quality Badge */}
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    Signal Quality
                  </span>
                  <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                    execState.signalQuality === 'OPTIMAL' ? 'text-emerald-400' :
                    execState.signalQuality === 'TRENDING' ? 'text-cyan-400' :
                    'text-red-400 animate-pulse'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      execState.signalQuality === 'OPTIMAL' ? 'bg-emerald-400' :
                      execState.signalQuality === 'TRENDING' ? 'bg-cyan-400' :
                      'bg-red-500'
                    }`} />
                    {execState.signalQuality}
                  </span>
                </div>
              </div>

              {/* Live Target Flight Card */}
              <div
                className={`w-full rounded-3xl border bg-black overflow-hidden relative transition-all duration-300 shadow-2xl ${
                  targetRound?.status === 'CRASHED' || execState.state === 'CRASHED'
                    ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
                    : targetRound?.status === 'RUNNING' || execState.state === 'IN_FLIGHT'
                    ? 'border-[#9dffb0] shadow-[0_0_25px_rgba(157,255,176,0.2)]'
                    : 'border-zinc-800'
                }`}
              >
                <div className="flex flex-col items-center justify-center py-6 px-6 relative h-48">
                  {targetRound?.status === 'COUNTDOWN' || execState.state === 'COUNTDOWN' ? (
                    <div className="flex flex-col items-center justify-center w-full h-full relative">
                      <div className="flex flex-col items-center animate-pulse mb-3">
                        <SleekPlane className="w-16 h-10 opacity-50" />
                      </div>
                      <div className="flex flex-col items-center w-full px-8">
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2 shadow-inner">
                          <div className="h-full bg-aviator-red rounded-full animate-shrink-bar" />
                        </div>
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">
                          Precomputing Nonce Cryptography...
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`relative w-28 h-16 mb-2 flex items-center justify-center transition-all duration-200 ${
                          execState.state === 'CRASHED' ? 'opacity-0 scale-50' : 'opacity-100 animate-hover-fly'
                        }`}
                      >
                        <SleekPlane className="w-28 h-16" />
                      </div>

                      <h2
                        className={`text-[50px] leading-none font-black italic tracking-tight text-center select-none font-mono transition-colors duration-200 ${
                          execState.state === 'CRASHED' ? 'text-red-500 scale-110' :
                          execState.hasCashedOut ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {(execState.currentMultiplier || 1.0).toFixed(2)}x
                      </h2>

                      <div
                        className={`text-xs font-mono font-bold mt-1 ${
                          execState.state === 'CRASHED' ? 'text-red-500' :
                          execState.hasCashedOut ? 'text-emerald-400' : 'text-aviator-lime'
                        }`}
                      >
                        {execState.state === 'IDLE' || execState.state === 'COUNTDOWN'
                          ? 'Synchronizing Live Telemetry...'
                          : execState.state === 'CRASHED'
                          ? `Flew away at ${(execState.currentMultiplier || 1.0).toFixed(2)}x`
                          : execState.hasCashedOut
                          ? `Secured Exit at ${execState.cashedOutMultiplier?.toFixed(2)}x (+$${execState.pnlThisRound})`
                          : `Approaching Target ${execState.targetCashout.toFixed(2)}x`}
                      </div>

                      {execState.state === 'CRASHED' && (
                        <div className="absolute inset-0 bg-red-950/30 flex flex-col items-center justify-center rounded-2xl z-10 animate-fadeIn pointer-events-none">
                          <span className="text-red-500 font-black uppercase text-sm tracking-widest bg-black/90 px-4 py-1.5 rounded-full border border-red-500/40 shadow-lg">
                            Flew Away!
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Top Live Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/80 px-2.5 py-1 rounded-lg border border-zinc-800">
                    <span className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-aviator-green animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                      {apiConnected ? 'Gateway Live' : 'Simulated'}
                    </span>
                  </div>
                </div>

                {/* Integrated Flight & Cashout Progress Bar */}
                <div className="w-full bg-zinc-950 px-5 py-3 border-t border-zinc-900 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400 font-bold">
                    <span>1.00x Start</span>
                    <span className="text-aviator-lime font-black">
                      Target: {execState.targetCashout.toFixed(2)}x ({execState.progressPct}%)
                    </span>
                    <span>Pred: {execState.predictedCrash.toFixed(2)}x</span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-150 ${
                        execState.hasCashedOut ? 'bg-emerald-400' :
                        execState.progressPct >= 90 ? 'bg-aviator-lime shadow-[0_0_10px_#7cff00]' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(3, execState.progressPct))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Execution Profile Selector */}
              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Execution Profile
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    Target: {EXECUTION_MODES[execState.mode]?.margin * 100}% of pred
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {Object.values(EXECUTION_MODES).slice(0, 3).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => globalExecutionEngine.setMode(m.id)}
                      className={`py-2 px-2 rounded-xl text-center border transition-all ${
                        execState.mode === m.id
                          ? `${m.badgeBg} font-black shadow-md`
                          : 'bg-black/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{m.label}</div>
                      <div className="text-[8px] text-zinc-500">{Math.round(m.margin * 100)}% Target</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Smart Cashout Trigger Box */}
              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
                {/* Auto Trigger Toggle & Stake Config */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Auto-Cashout:
                    </span>
                    <button
                      onClick={() => globalExecutionEngine.setAutoTrigger(!execState.autoTrigger)}
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${
                        execState.autoTrigger
                          ? 'bg-aviator-lime text-black shadow-md shadow-aviator-lime/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {execState.autoTrigger ? 'ARMED (AUTO)' : 'MANUAL'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-zinc-500 uppercase">Stake:</span>
                    <input
                      type="number"
                      min="1"
                      value={execState.stakeAmount}
                      onChange={(e) => globalExecutionEngine.setStakeAmount(e.target.value)}
                      className="w-16 bg-black border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:border-aviator-lime"
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                {execState.hasCashedOut ? (
                  <div className="w-full bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-center gap-2 text-emerald-400 animate-scaleUp">
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-black uppercase tracking-wider">
                      Cashed Out at {execState.cashedOutMultiplier?.toFixed(2)}x (+${execState.pnlThisRound})
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => globalExecutionEngine.executeCashout('MANUAL_USER_TRIGGER')}
                    disabled={execState.state !== 'IN_FLIGHT'}
                    className={`w-full py-4 rounded-2xl flex flex-col items-center justify-center transition-all shadow-xl font-black uppercase tracking-wide ${
                      execState.state === 'IN_FLIGHT'
                        ? 'bg-gradient-to-r from-aviator-lime to-emerald-400 text-black hover:brightness-110 active:scale-95 shadow-aviator-lime/25 animate-pulse'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-sm">
                      {execState.state === 'IN_FLIGHT'
                        ? `CASH OUT NOW @ ${(execState.currentMultiplier || 1.0).toFixed(2)}x (+$${((execState.currentMultiplier - 1) * execState.stakeAmount).toFixed(2)})`
                        : execState.state === 'COUNTDOWN'
                        ? 'AUTO-ARMED FOR NEXT ROUND'
                        : 'WAITING FOR TAKEOFF'}
                    </span>
                    <span className="text-[9px] font-mono opacity-80 mt-0.5">
                      Target: {execState.targetCashout.toFixed(2)}x
                    </span>
                  </button>
                )}
              </div>

              {/* Recent Crash History Ribbon */}
              {history.length > 0 && (
                <div className="w-full bg-zinc-950/90 border border-zinc-900 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      Recent Crash Multipliers
                    </span>
                    <span className="text-[9px] font-bold text-aviator-green uppercase tracking-wider flex items-center gap-1">
                      <Activity size={10} /> Active Nonces
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {history.map((val, idx) => {
                      const num = typeof val === 'number' ? val : parseFloat(val) || 1.0;
                      return (
                        <span
                          key={idx}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg font-mono flex-shrink-0 border ${
                            num < 2.0
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : num < 10.0
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {num.toFixed(2)}x
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROVABLY FAIR CRYPTOGRAPHIC VERIFIER */}
        {activeTab === 'verifier' && (
          <ProvablyFairVerifier
            initialServerSeed="sandbox_server_seed_987654321"
            initialClientSeed="sandbox_client_entropy_abc"
            initialNonce={execState.currentRoundId || 1045}
          />
        )}

        {/* TAB 3: BATCH SCENARIO SIMULATOR & AUDIT */}
        {activeTab === 'simulator' && <BatchSimulatorAudit />}

        {/* TAB 4: DECISION BOT & STRATEGY SANDBOX */}
        {activeTab === 'bot' && <DecisionBotSandbox />}

        {/* TAB 5: MULTI-PLATFORM PREDICTOR HUB */}
        {activeTab === 'apps' && (
          <div className="w-full max-w-md mx-auto">
            <MorePredictors />
          </div>
        )}

        {/* TAB 6: LIVE GATEWAY CONSOLE */}
        {activeTab === 'gateway' && <LiveGatewayConsole />}
      </main>

      {/* Target Game Live Feed Modal */}
      <TargetGameSimulator
        isOpen={showTargetMonitor}
        onClose={() => setShowTargetMonitor(false)}
      />
    </div>
  );
}
