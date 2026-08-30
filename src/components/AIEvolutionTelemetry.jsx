import React, { useState, useEffect } from 'react';
import { Brain, Cpu, TrendingUp, Zap, Sparkles, Activity, ShieldCheck, RefreshCw, BarChart2 } from 'lucide-react';
import { globalSelfEvolvingAI } from '../utils/SelfEvolvingAIEngine';

export default function AIEvolutionTelemetry() {
  const [aiState, setAiState] = useState(globalSelfEvolvingAI.getState());

  useEffect(() => {
    const interval = setInterval(() => {
      setAiState(globalSelfEvolvingAI.getState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const modelLabels = {
    cryptoEntropy: { name: 'Direction 1: Cryptographic Entropy', desc: 'SHA-512 Lower-Byte Linear Modulus with Adaptive Divisor' },
    markovTransition: { name: 'Direction 2: Stochastic Markov Matrix', desc: '4-State Regime Probabilities (LOW, MID, HIGH, SURGE)' },
    paretoTail: { name: 'Direction 3: Heavy-Tail Pareto Tail', desc: 'Continuous Shape Alpha Fitting for High-Tail Outliers' },
    streakMomentum: { name: 'Direction 4: Streak Momentum / Reversion', desc: 'Damping Fatigue Regression & Breakout Surge Modeling' },
  };

  const modelColors = {
    cryptoEntropy: 'bg-[#00ff66] text-[#00ff66]',
    markovTransition: 'bg-cyan-400 text-cyan-400',
    paretoTail: 'bg-purple-400 text-purple-400',
    streakMomentum: 'bg-amber-400 text-amber-400',
  };

  return (
    <div className="space-y-4 text-xs font-mono text-zinc-300">
      {/* Header Badge */}
      <div className="bg-[#020a05] border border-[#00ff66]/40 rounded-xl p-3 flex items-center justify-between shadow-[0_0_15px_rgba(0,255,102,0.1)]">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-[#00ff66] animate-pulse" />
          <div>
            <div className="text-sm font-black text-[#00ff66] uppercase tracking-wider flex items-center gap-1.5">
              SELF-EVOLVING MULTI-DIRECTIONAL AI ENGINE
              <span className="text-[9px] bg-[#00ff66]/20 border border-[#00ff66]/40 px-1.5 py-0.2 rounded-full text-[#39ff14]">
                GEN-{aiState.generation}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Autonomous Online Reinforcement Learning • 0 Manual Assistance
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-zinc-400 uppercase">Total Rounds Learned</div>
          <div className="text-base font-black text-white font-mono">{aiState.totalLearnedRounds}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-black/60 border border-zinc-800 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-zinc-400 uppercase">Rolling Model Loss</div>
          <div className="text-lg font-black text-[#39ff14] font-mono">
            {aiState.averageLoss?.toFixed(3) || '0.180'}
          </div>
          <div className="text-[9px] text-zinc-500">Logarithmic error ($L$)</div>
        </div>

        <div className="bg-black/60 border border-zinc-800 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-zinc-400 uppercase">Adaptive Divisor</div>
          <div className="text-lg font-black text-cyan-400 font-mono">
            {aiState.params.cryptoDivisor?.toFixed(2) || '5000.30'}
          </div>
          <div className="text-[9px] text-zinc-500">SGD Calibrated</div>
        </div>

        <div className="bg-black/60 border border-zinc-800 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-zinc-400 uppercase">Pareto Alpha ($\alpha$)</div>
          <div className="text-lg font-black text-purple-400 font-mono">
            {aiState.params.paretoAlpha?.toFixed(2) || '1.85'}
          </div>
          <div className="text-[9px] text-zinc-500">Heavy-Tail Shape</div>
        </div>
      </div>

      {/* Live Directional Model Weights */}
      <div className="bg-black/80 border border-zinc-800 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between text-zinc-200 font-bold border-b border-zinc-800 pb-1.5">
          <span className="flex items-center gap-1.5 text-[#00ff66]">
            <Activity size={14} />
            DYNAMIC ENSEMBLE WEIGHT DISTRIBUTION (ONLINE MULTIPLICATIVE WEIGHTS)
          </span>
          <span className="text-[10px] text-zinc-400">Sum = 100%</span>
        </div>

        <div className="space-y-2.5">
          {Object.entries(aiState.weights).map(([modelKey, weight]) => {
            const pct = (weight * 100).toFixed(1);
            const info = modelLabels[modelKey] || { name: modelKey, desc: '' };
            const colorClass = modelColors[modelKey] || 'bg-zinc-500 text-zinc-500';

            return (
              <div key={modelKey} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-200">{info.name}</span>
                  <span className="font-mono font-bold text-white bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700">
                    {pct}% voting power
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full transition-all duration-500 ${colorClass.split(' ')[0]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[9px] text-zinc-500">{info.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Markov Transition Matrix Telemetry */}
      <div className="bg-black/80 border border-zinc-800 rounded-xl p-3 space-y-2">
        <div className="text-[11px] font-bold text-zinc-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Cpu size={13} />
            AUTONOMOUS MARKOV REGIME TRANSITION MATRIX
          </span>
          <span className="text-[9px] text-zinc-400">Auto-updated on each round</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] pt-1">
          {Object.entries(aiState.params.markovMatrix).map(([regime, transitions]) => (
            <div key={regime} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 space-y-1">
              <div className="font-bold text-[#00ff66] border-b border-zinc-800 pb-0.5">
                From {regime}
              </div>
              <div className="text-zinc-400 space-y-0.5 text-[9px]">
                <div>Low: {(transitions.LOW * 100).toFixed(0)}%</div>
                <div>Mid: {(transitions.MID * 100).toFixed(0)}%</div>
                <div>High: {(transitions.HIGH * 100).toFixed(0)}%</div>
                <div className="text-amber-400 font-bold">Surge: {(transitions.SURGE * 100).toFixed(0)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Autonomous Evolution Status Banner */}
      <div className="p-2.5 rounded-xl bg-[#021808]/80 border border-[#00ff66]/40 flex items-center gap-2 text-[10px] text-zinc-300">
        <Sparkles size={14} className="text-[#00ff66] shrink-0 animate-spin" />
        <div>
          <strong className="text-[#39ff14]">Fully Autonomous Operation:</strong> Every time a round concludes, the AI automatically computes prediction residuals, applies Exponential Gradient loss penalties, rebalances model voting power, and adapts hyper-parameters in all four directions.
        </div>
      </div>
    </div>
  );
}
