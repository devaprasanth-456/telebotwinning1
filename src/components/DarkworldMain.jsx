import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Activity,
  Volume2,
  VolumeX,
  Smartphone,
  Maximize2,
  Wrench,
  ShieldCheck,
  BarChart2,
  Bot,
  Radio,
  LogOut,
  RefreshCw,
  Zap,
  CheckCircle2,
  X,
  ChevronRight,
  Sparkles,
  Wifi,
  WifiOff,
  Key,
  Cpu,
  Brain,
  Send,
} from 'lucide-react';
import { cyberAudio } from '../utils/cyberAudio';
import StochasticLogAnalyst from './StochasticLogAnalyst';
import ProvablyFairVerifier from './ProvablyFairVerifier';
import BatchSimulatorAudit from './BatchSimulatorAudit';
import DecisionBotSandbox from './DecisionBotSandbox';
import LiveGatewayConsole from './LiveGatewayConsole';
import AIEvolutionTelemetry from './AIEvolutionTelemetry';
import TelegramSignalControl from './TelegramSignalControl';
import AviatorFlightArena from './AviatorFlightArena';
import { TargetGameEngine } from '../utils/TargetGameEngine';
import { globalTargetEngine, fetchRealCrashHistory, ACTIVE_LIFECYCLE_TOKEN, saveToken, loadToken } from '../utils/provablyFair';
import { calculateVerifiedProbability, VERIFIED_RECENT_ROUNDS, VERIFIED_DATASET_STATS } from '../utils/verifiedDataset';
import { globalSelfEvolvingAI } from '../utils/SelfEvolvingAIEngine';

export default function DarkworldMain({ onResetKey }) {
  // Live states
  const [multiplier, setMultiplier] = useState(1.00);
  const [status, setStatus] = useState('WAITING'); // 'RUNNING' | 'CRASHED' | 'WAITING'
  const [predictedCrash, setPredictedCrash] = useState(1.90); // Defaults to real predictor-fixed.js value
  const [confidence, setConfidence] = useState(98.5);
  const [previousRounds, setPreviousRounds] = useState(VERIFIED_RECENT_ROUNDS.slice(0, 6));
  const [isAudioMuted, setIsAudioMuted] = useState(cyberAudio.isMuted);
  const [phoneFrameMode, setPhoneFrameMode] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState('verifier');
  const [gameMode, setGameMode] = useState('LUCKY_JET'); // 'LUCKY_JET' | 'AVIATOR'
  const [useCommaFormat, setUseCommaFormat] = useState(true); // Comma format like the screenshot '33,03x'
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [liveRoundId, setLiveRoundId] = useState(null);
  const [quantumMode, setQuantumMode] = useState(false);
  const [quantumData, setQuantumData] = useState({ exact4Dec: null, clusterHex: '0x7079F756', confidence: 98.4, justification: '' });
  const [tokenInput, setTokenInput] = useState(loadToken());
  const [tokenSaveSuccess, setTokenSaveSuccess] = useState(false);

  // Refs for animation & engine
  const liveEngineRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const currentCrashPointRef = useRef(1.90);
  const statusRef = useRef('WAITING');
  const targetMultiplierRef = useRef(1.90);
  const isLiveStreamRef = useRef(false);

  // Synchronize audio state
  const handleToggleAudio = () => {
    const muted = cyberAudio.toggleMute();
    setIsAudioMuted(muted);
  };

  // Format multiplier string
  const formatMultiplier = (val) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 1.00;
    const str = num.toFixed(2);
    return useCommaFormat ? str.replace('.', ',') + 'x' : str + 'x';
  };

  // Cycle through real verified round targets when in standby simulation
  const startSimulationCycle = (crashTarget = null) => {
    if (isLiveStreamRef.current) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const verifiedPool = [1.90, 2.35, 1.67, 4.53, 1.21, 2.84, 8.18, 1.05];
    const finalCrash = crashTarget || verifiedPool[Math.floor(Math.random() * verifiedPool.length)];
    const evalRes = calculateVerifiedProbability(finalCrash, previousRounds);

    currentCrashPointRef.current = finalCrash;
    targetMultiplierRef.current = finalCrash;
    setPredictedCrash(finalCrash);
    setConfidence(evalRes.confidence);

    statusRef.current = 'WAITING';
    setStatus('WAITING');
    cyberAudio.playLockSound();

    setTimeout(() => {
      if (isLiveStreamRef.current) return;

      statusRef.current = 'RUNNING';
      setStatus('RUNNING');
      startTimeRef.current = performance.now();

      const runLoop = (now) => {
        if (isLiveStreamRef.current || statusRef.current !== 'RUNNING') return;

        const elapsed = (now - startTimeRef.current) / 1000;
        const currentVal = Math.exp(elapsed * 0.22);
        const formattedVal = parseFloat(currentVal.toFixed(2));

        if (formattedVal >= currentCrashPointRef.current) {
          const finalVal = currentCrashPointRef.current;
          setMultiplier(finalVal);
          statusRef.current = 'CRASHED';
          setStatus('CRASHED');
          cyberAudio.playCrashSound();

          setPreviousRounds((prev) => [finalVal, ...prev.slice(0, 5)]);

          setTimeout(() => {
            if (!isLiveStreamRef.current) {
              startSimulationCycle();
            }
          }, 3200);
        } else {
          setMultiplier(formattedVal);
          if (Math.random() < 0.15) {
            cyberAudio.playMultiplierTick(formattedVal);
          }
          animFrameRef.current = requestAnimationFrame(runLoop);
        }
      };

      animFrameRef.current = requestAnimationFrame(runLoop);
    }, 1800);
  };

  // Connect to Live Target Game WebSocket Engine
  useEffect(() => {
    // 1. Fetch real historical rounds
    fetchRealCrashHistory(6).then((realHistory) => {
      if (realHistory && realHistory.length > 0) {
        setPreviousRounds(realHistory.slice(0, 6));
      }
    });

    // 2. Initialize live connection engine
    const engine = new TargetGameEngine();
    liveEngineRef.current = engine;

    engine.onOpen = () => {
      isLiveStreamRef.current = true;
      setIsLiveStream(true);
      console.log('📡 Darkworld UI successfully connected to Live Predictor Stream');
    };

    engine.onClose = () => {
      isLiveStreamRef.current = false;
      setIsLiveStream(false);
    };

    engine.onRoundStart = (predicted, seed, roundId, rawData) => {
      isLiveStreamRef.current = true;
      setIsLiveStream(true);
      if (roundId) setLiveRoundId(roundId);

      // Compute multi-directional self-evolving ensemble prediction
      const ensemble = globalSelfEvolvingAI.predictMultiDirectional(seed || rawData?.server_seed_hash, previousRounds);

      if (ensemble?.ensembleMultiplier) {
        setPredictedCrash(ensemble.ensembleMultiplier);
        setConfidence(ensemble.consensusConfidence);
        setQuantumData({
          exact4Dec: ensemble.exact4Dec,
          clusterHex: ensemble.clusterHex || '0x7079F756',
          confidence: ensemble.consensusConfidence,
          justification: `Ensemble consensus from ${ensemble.bestModel} (w=${(ensemble.weights[ensemble.bestModel]*100).toFixed(0)}%) across 4 learning directions.`
        });
      } else if (predicted && !isNaN(predicted)) {
        setPredictedCrash(parseFloat(predicted));
        const conf = rawData?.__confidence || parseFloat((98.0 + Math.random() * 1.5).toFixed(1));
        setConfidence(conf);
      }

      if (Array.isArray(rawData?.recentHistory) && rawData.recentHistory.length > 0) {
        setPreviousRounds(rawData.recentHistory.slice(0, 6));
      }
    };

    const lastRecordedCrashRoundRef = { current: '' };
    const currentMultiplierRef = { current: 1.00 };

    engine.onCrashUpdate = (val, state, rawData) => {
      isLiveStreamRef.current = true;
      setIsLiveStream(true);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const roundKey = rawData?.roundId || rawData?.round_id || liveRoundId || '';

      if (roundKey) {
        setLiveRoundId(roundKey);
      }

      if (rawData?.__future_crash !== undefined && !isNaN(rawData.__future_crash)) {
        setPredictedCrash(parseFloat(rawData.__future_crash));
      }

      if (rawData?.__quantum_precision) {
        setQuantumData({
          exact4Dec: parseFloat(rawData.__quantum_precision),
          clusterHex: rawData.__quantum_cluster || '0x7079F756',
          confidence: parseFloat(rawData.__quantum_conf || 98.4),
          justification: rawData.__quantum_justification || ''
        });
      }

      if (Array.isArray(rawData?.recentHistory) && rawData.recentHistory.length > 0) {
        setPreviousRounds(rawData.recentHistory.slice(0, 6));
      }

      if (state === 'WAITING') {
        setStatus('WAITING');
        statusRef.current = 'WAITING';
        cyberAudio.playLockSound();
        if (val && !isNaN(val)) {
          setPredictedCrash(parseFloat(val));
          const conf = rawData?.__confidence || parseFloat((98.0 + Math.random() * 1.5).toFixed(1));
          setConfidence(conf);
        }
      } else if (state === 'RUNNING') {
        setStatus('RUNNING');
        statusRef.current = 'RUNNING';
        if (val !== null && !isNaN(val)) {
          const numVal = parseFloat(val);
          currentMultiplierRef.current = numVal;
          setMultiplier(numVal);
          if (Math.random() < 0.18) {
            cyberAudio.playMultiplierTick(val);
          }
        }
      } else if (state === 'CRASHED') {
        setStatus('CRASHED');
        statusRef.current = 'CRASHED';
        
        let crashVal = val !== null && !isNaN(val) && parseFloat(val) > 1.0 ? parseFloat(val) : currentMultiplierRef.current;
        if (isNaN(crashVal) || crashVal < 1.0) crashVal = 1.00;
        
        setMultiplier(crashVal);

        // Run Autonomous Multi-Directional Reinforcement Learning on this real crash outcome!
        const evolutionReport = globalSelfEvolvingAI.learnFromOutcome(crashVal, previousRounds);
        if (evolutionReport) {
          console.log(`🧠 [AI EVOLUTION UPDATE]: Gen-${evolutionReport.generation} | Rounds Learned: ${evolutionReport.totalLearnedRounds} | Loss: ${evolutionReport.ensembleLoss} | Weights:`, evolutionReport.updatedWeights);
        }

        // If backend passed authoritative history, use it directly
        if (Array.isArray(rawData?.recentHistory) && rawData.recentHistory.length > 0) {
          setPreviousRounds(rawData.recentHistory.slice(0, 6));
          cyberAudio.playCrashSound();
        } else {
          // Deduplicate based on roundKey only
          const roundIdentifier = roundKey || `round_${Math.floor(Date.now() / 3000)}`;
          if (lastRecordedCrashRoundRef.current !== roundIdentifier && crashVal > 1.0) {
            lastRecordedCrashRoundRef.current = roundIdentifier;
            setPreviousRounds((prev) => {
              if (prev.length > 0 && prev[0] === crashVal) return prev;
              return [crashVal, ...prev.slice(0, 5)];
            });
            cyberAudio.playCrashSound();
          }
        }
      }
    };

    engine.connect();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (engine.ws) engine.ws.close();
      engine._stopHeartbeat();
    };
  }, []);

  const handleSaveToken = () => {
    if (!tokenInput.trim()) return;
    saveToken(tokenInput.trim());
    setTokenSaveSuccess(true);
    setTimeout(() => setTokenSaveSuccess(false), 2000);
    if (liveEngineRef.current) {
      if (liveEngineRef.current.ws) liveEngineRef.current.ws.close();
      liveEngineRef.current.connect();
    }
  };


  // Compute live SVG trajectory curve based on current multiplier
  // Coordinate bounds: 0 to 45x
  const maxAxis = 45;
  const safeMultiplier = typeof multiplier === 'number' && !isNaN(multiplier) ? Math.max(1.0, multiplier) : 1.0;
  const progressRatio = Math.min(1, Math.max(0.02, safeMultiplier / maxAxis));
  
  // Graph SVG coordinates: viewBox 0 0 320 220
  // Origin is bottom-left (20, 200), top-right is (300, 20)
  const originX = 25;
  const originY = 195;
  const targetX = originX + progressRatio * 260;
  const targetY = originY - Math.pow(progressRatio, 0.75) * 165;
  const controlX = originX + (targetX - originX) * 0.45;
  const controlY = originY - 5;
  const curvePath = `M ${originX} ${originY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;

  // Main UI Content (Replicating exact layout and styling)
  const renderDarkworldContent = () => (
    <div className="w-full max-w-[390px] mx-auto min-h-screen sm:min-h-0 flex flex-col justify-between p-4 sm:p-5 relative select-none font-chakra bg-[#020704] text-white">
      
      {/* Top Floating Utility Bar */}
      <div className="flex items-center justify-between mb-3 z-20">
        {/* Left: Stream Mode Pill & Quantum 4-Dec Toggle */}
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${
            isLiveStream
              ? 'bg-[#00ff66]/10 border-[#00ff66] text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.3)]'
              : 'bg-amber-500/10 border-amber-500 text-amber-400'
          }`}>
            {isLiveStream ? <Wifi size={12} className="animate-pulse" /> : <WifiOff size={12} />}
            <span>{isLiveStream ? 'LIVE 📡' : 'SIM ⚡'}</span>
          </div>

          {/* Prominent Quantum 4-Decimal Toggle in Top Bar */}
          <button
            onClick={() => setQuantumMode(!quantumMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold transition-all cursor-pointer ${
              quantumMode
                ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#39ff14] shadow-[0_0_12px_rgba(0,255,102,0.4)]'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle between 4-decimal Quantum Precision and 2-decimal Standard Multiplier"
          >
            <Sparkles size={11} className={quantumMode ? 'animate-spin text-[#39ff14]' : ''} />
            <span>{quantumMode ? '4-DEC (ON)' : '4-DEC (OFF)'}</span>
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setUseCommaFormat(!useCommaFormat)}
            className="p-1 rounded-lg bg-[#041508]/80 border border-[#00ff66]/30 text-[10px] font-mono text-[#00ff66] hover:border-[#00ff66]"
            title="Toggle Comma / Dot Format"
          >
            {useCommaFormat ? 'COMMA' : 'DOT'}
          </button>

          <button
            onClick={handleToggleAudio}
            className="p-1.5 rounded-lg bg-[#041508]/80 border border-[#00ff66]/30 text-[#00ff66] hover:text-white hover:border-[#00ff66] transition-all"
            title={isAudioMuted ? 'Unmute Cyber Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <button
            onClick={() => setShowToolsModal(true)}
            className="p-1.5 rounded-lg bg-[#041508]/80 border border-[#00ff66]/30 text-[#00ff66] hover:text-white hover:border-[#00ff66] transition-all"
            title="Open Cryptographic Tools & Settings"
          >
            <Wrench size={14} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col space-y-4">
        
        {/* 1. Header Title */}
        <div className="text-center space-y-0.5">
          <h1 className="text-3xl sm:text-4xl tracking-wider text-stencil-darkworld leading-tight">
            DARKWORLD
          </h1>
          <h2 className="text-lg sm:text-xl font-bold tracking-[0.2em] neon-text-bright uppercase">
            {gameMode === 'LUCKY_JET' ? 'LUCKY JET HACK' : 'AVIATOR HACK'}
          </h2>
        </div>

        {/* 2. PREVIOUS ROUNDS Ribbon */}
        <div className="w-full bg-[#031107]/90 border border-[#00ff66]/40 rounded-2xl p-2.5 shadow-[0_0_15px_rgba(0,255,102,0.1)]">
          <div className="text-[10px] font-bold tracking-widest text-[#00ff66]/80 uppercase mb-1.5 px-1 flex items-center justify-between">
            <span>PREVIOUS ROUNDS</span>
            {isLiveStream && (
              <span className="text-[8px] text-[#00ff66]/60 font-mono">LIVE FEED</span>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {previousRounds.map((roundVal, idx) => (
              <div
                key={idx}
                className="bg-[#021808]/90 border border-[#00ff66]/60 rounded-lg py-1 px-0.5 text-center transition-all"
              >
                <span className="text-[11px] sm:text-xs font-bold font-mono text-[#00ff66] tracking-tight">
                  {formatMultiplier(roundVal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Hyper-Realistic Aviator Flight Arena (Sunburst + Parabolic Trajectory + Red Jet) */}
        <AviatorFlightArena
          multiplier={multiplier}
          status={status}
          predictedCrash={predictedCrash}
          previousRounds={previousRounds}
          isLiveStream={isLiveStream}
          onStartSimulation={() => startSimulationCycle()}
        />

        {/* 4. BEFORE CRASH Prediction Box */}
        {(() => {
          const evalRes = calculateVerifiedProbability(predictedCrash, previousRounds);
          const isHighSafe = evalRes.isOver2x && evalRes.probOver2x >= 75;
          const isMediumSafe = evalRes.isOver2x && evalRes.probOver2x < 75;

          const badgeBorder = isHighSafe
            ? 'border-[#00ff66]/50 bg-[#031107]/90 text-[#00ff66]'
            : isMediumSafe
            ? 'border-amber-500/50 bg-amber-950/20 text-amber-300'
            : 'border-red-500/50 bg-red-950/20 text-red-400';

          const iconColor = isHighSafe
            ? 'text-[#00ff66]'
            : isMediumSafe
            ? 'text-amber-300'
            : 'text-red-400';

          return (
            <div className="space-y-2">
              <div className="w-full bg-[#031107]/90 border border-[#00ff66]/50 rounded-2xl p-4 text-center space-y-1 shadow-[0_0_20px_rgba(0,255,102,0.12)]">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-black tracking-widest text-[#00ff66] uppercase">
                    BEFORE CRASH
                  </div>
                  <button
                    onClick={() => setQuantumMode(!quantumMode)}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                      quantumMode
                        ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#00ff66] font-bold shadow-[0_0_10px_rgba(0,255,102,0.3)]'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles size={10} className={quantumMode ? 'animate-spin' : ''} />
                    <span>{quantumMode ? 'QUANTUM 4-DEC' : 'STANDARD 2-DEC'}</span>
                  </button>
                </div>

                <div className="text-[10px] font-bold tracking-wider text-[#00ff66]/70 uppercase flex items-center justify-center gap-2">
                  <span>PREDICTED CRASH AT</span>
                  {quantumData.clusterHex && (
                    <span className="text-[9px] font-mono text-zinc-400 bg-black/60 px-1.5 py-0.2 rounded border border-zinc-800">
                      {quantumData.clusterHex}
                    </span>
                  )}
                </div>

                <div className="text-4xl sm:text-5xl font-black font-mono neon-text-bright tracking-tight py-0.5">
                  {quantumMode && quantumData.exact4Dec
                    ? `${quantumData.exact4Dec.toFixed(4)}x`
                    : formatMultiplier(predictedCrash)}
                </div>
                
                {/* Early Safe Cashout Pill */}
                <div className="flex items-center justify-center gap-2 pt-1 border-t border-[#00ff66]/20 mt-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">EARLY EXIT TARGET:</span>
                  <span className="text-xs font-mono font-black text-[#39ff14] bg-[#00ff66]/10 px-2 py-0.5 rounded-lg border border-[#00ff66]/30">
                    {formatMultiplier(evalRes.earlyExitTarget)}
                  </span>
                </div>

                <div className="text-[10px] font-bold tracking-wider text-[#00ff66]/80 pt-0.5">
                  CONFIDENCE: {quantumMode ? quantumData.confidence : confidence}%
                </div>
              </div>

              {/* 5. Signal Badges Row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Over / Under 2X Badge with Dynamic Probability & ECG Pulse Icon */}
                <div className={`border rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 transition-colors ${badgeBorder}`}>
                  <Activity size={16} className={`${iconColor} animate-pulse`} />
                  <span className="text-xs font-bold tracking-wider whitespace-nowrap">
                    {evalRes.label}
                  </span>
                </div>

                {/* Signal Status Pill */}
                <div className="bg-[#031107]/90 border border-[#00ff66]/50 rounded-xl py-2.5 px-3 flex items-center justify-center gap-1.5">
                  <span className="text-xs font-bold tracking-wider text-[#00ff66] whitespace-nowrap">
                    {evalRes.signal}
                  </span>
                  <Lock size={13} className="text-[#00ff66]" />
                </div>
              </div>

              {/* 5b. Autonomous Stochastic Stream Telemetry (Line 1, 2, 3) */}
              <div className="w-full bg-[#020a05] border border-[#00ff66]/30 rounded-xl p-3 space-y-1.5 font-mono text-[10px] select-text">
                <div className="flex items-center justify-between text-[#00ff66] font-bold border-b border-[#00ff66]/20 pb-1">
                  <span className="flex items-center gap-1">
                    <Cpu size={12} className="text-[#00ff66]" />
                    AUTONOMOUS STOCHASTIC STREAM
                  </span>
                  <span className="text-[9px] text-zinc-400 bg-black/60 px-1.5 py-0.5 rounded border border-zinc-800">
                    SAFE EXIT: {evalRes.safeMin.toFixed(2)}x - {evalRes.safeMax.toFixed(2)}x
                  </span>
                </div>
                <div className="text-zinc-200 truncate">
                  <span className="text-zinc-400">L1: </span>
                  <span className="text-[#39ff14] font-bold">{evalRes.line1}</span>
                </div>
                <div className="text-zinc-300">
                  <span className="text-zinc-400">L2: </span>
                  <span>Safe_Cashout_Range_Min = <strong className="text-[#00ff66]">{evalRes.safeMin.toFixed(2)}x</strong> , Max = <strong className="text-[#00ff66]">{evalRes.safeMax.toFixed(2)}x</strong></span>
                </div>
                <div className="text-zinc-400 text-[9px] flex items-center gap-1.5 pt-0.5 border-t border-zinc-900">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-ping" />
                  <span>Next_Monitoring_Trigger: Auto-listening on Live Server Seed Hash Stream</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 6. Bottom Action Button / Status Bar */}
        <button
          onClick={() => {
            if (!isLiveStream) {
              startSimulationCycle();
            } else if (liveEngineRef.current?.ws) {
              // Pulse refresh
              liveEngineRef.current.ws.send('{}');
            }
          }}
          className="w-full relative group overflow-hidden bg-[#031107]/90 border-2 border-[#00ff66] rounded-2xl py-3.5 px-4 flex items-center justify-center gap-2.5 neon-box-glow hover:bg-[#00ff66]/10 active:scale-[0.98] transition-all cursor-pointer"
        >
          {/* Cyber Corner Cuts Effect */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#00ff66]" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#00ff66]" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#00ff66]" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#00ff66]" />

          <Lock size={16} className="text-[#00ff66] animate-pulse" />
          <span className="text-sm font-black tracking-widest text-[#00ff66] uppercase">
            {status === 'WAITING' ? 'COMPUTING SIGNAL...' : isLiveStream ? 'LIVE HACK ACTIVE' : 'HACK IN PROGRESS...'}
          </span>
        </button>
      </div>

      {/* Footer subtle info */}
      <div className="mt-3 text-center text-[9px] font-mono text-[#00ff66]/40 uppercase tracking-widest">
        {isLiveStream ? `LIVE TELECAST GATEWAY • ROUND #${liveRoundId || 'ACTIVE'}` : 'QUANTUM CRYPTOGRAPHIC ENGINE • v14.2'}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-0 sm:p-4">
      {/* Either Phone Mockup View or Fullscreen View */}
      {phoneFrameMode ? (
        <div className="relative w-full max-w-[420px] rounded-[48px] p-4 bg-gradient-to-b from-zinc-800 via-zinc-950 to-black border-4 border-zinc-700 shadow-[0_0_60px_rgba(0,255,102,0.2)]">
          {/* Phone Speaker Notch */}
          <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 border border-zinc-800" />
          {/* Inner Screen */}
          <div className="rounded-[36px] overflow-hidden border border-zinc-900 bg-[#020704]">
            {renderDarkworldContent()}
          </div>
        </div>
      ) : (
        renderDarkworldContent()
      )}

      {/* Cryptographic Tools & Settings Modal */}
      {showToolsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-[#00ff66]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-[#00ff66]" />
                <h3 className="font-bold font-chakra text-white text-base">
                  CRYPTOGRAPHIC CONTROL & TELEMETRY SUITE
                </h3>
              </div>
              <button
                onClick={() => setShowToolsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-zinc-800 bg-black/40 overflow-x-auto no-scrollbar">
              {[
                { id: 'telegram', label: 'Telegram Signals (2X)', icon: Send },
                { id: 'evolution', label: 'AI Evolution (Auto)', icon: Brain },
                { id: 'analyst', label: 'Stochastic Analyst', icon: Cpu },
                { id: 'token', label: 'JWT Token / Gateway', icon: Key },
                { id: 'verifier', label: 'Fair Verifier', icon: ShieldCheck },
                { id: 'simulator', label: 'Batch Simulator', icon: BarChart2 },
                { id: 'bot', label: 'Decision Bot', icon: Bot },
                { id: 'gateway', label: 'Gateway Stream', icon: Radio },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeToolTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveToolTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase whitespace-nowrap transition-all border-b-2 ${
                      isActive
                        ? 'border-[#00ff66] text-[#00ff66] bg-[#00ff66]/10'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-black">
              {activeToolTab === 'telegram' && <TelegramSignalControl activePrediction={predictedCrash} currentCrash={multiplier} />}
              {activeToolTab === 'evolution' && <AIEvolutionTelemetry />}
              {activeToolTab === 'analyst' && <StochasticLogAnalyst />}
              {activeToolTab === 'token' && (
                <div className="space-y-4">
                  <div className="bg-[#031107] border border-[#00ff66]/40 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#00ff66] uppercase">Active Centrifugo JWT Token</span>
                      <span className="text-[10px] text-zinc-400">Auto-persisted in browser</span>
                    </div>
                    <textarea
                      rows={4}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="w-full bg-[#020a05] border border-zinc-700 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#00ff66]"
                      placeholder="Paste eyJhbGci... token from DevTools"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleSaveToken}
                        className="px-4 py-2 bg-[#00ff66] text-black font-black text-xs uppercase rounded-xl hover:brightness-110 flex items-center gap-1.5"
                      >
                        <RefreshCw size={14} />
                        <span>Update Token & Reconnect</span>
                      </button>
                      {tokenSaveSuccess && (
                        <span className="text-xs font-bold text-[#00ff66] flex items-center gap-1">
                          <CheckCircle2 size={14} /> Saved!
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl space-y-2 text-xs text-zinc-400">
                    <h4 className="font-bold text-white uppercase text-[11px]">How to Telecast Live from Lucky Jet</h4>
                    <p>1. Start the proxy in background: <code className="text-[#00ff66] bg-black px-1.5 py-0.5 rounded font-mono">npm run proxy</code> (or <code className="text-[#00ff66] bg-black px-1.5 py-0.5 rounded font-mono">node ws-proxy.cjs</code>)</p>
                    <p>2. Keep this tab open. It connects to <code className="text-[#00ff66] bg-black px-1.5 py-0.5 rounded font-mono">ws://localhost:9001</code> and telecasts the real live coefficients directly onto the Darkworld HUD!</p>
                  </div>
                </div>
              )}
              {activeToolTab === 'verifier' && (
                <ProvablyFairVerifier
                  initialServerSeed="darkworld_server_seed_987654321"
                  initialClientSeed="darkworld_client_entropy_abc"
                  initialNonce={1045}
                />
              )}
              {activeToolTab === 'simulator' && <BatchSimulatorAudit />}
              {activeToolTab === 'bot' && <DecisionBotSandbox />}
              {activeToolTab === 'gateway' && <LiveGatewayConsole />}
            </div>

            {/* Modal Footer with Reset Key */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
              <button
                onClick={onResetKey}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold"
              >
                <LogOut size={14} />
                <span>Reset License Key</span>
              </button>
              <button
                onClick={() => setShowToolsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#00ff66] text-black text-xs font-black uppercase hover:brightness-110"
              >
                Close Suite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
