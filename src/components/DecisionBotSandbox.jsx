import React, { useState, useEffect } from 'react';
import { Bot, Play, Pause, RotateCcw, TrendingUp, TrendingDown, DollarSign, ShieldAlert, Zap, Target, Award, ArrowUpRight } from 'lucide-react';
import { simulateBatchScenarios, runStrategyBacktest } from '../utils/provablyFairEngine';

export default function DecisionBotSandbox() {
  // Strategy Configuration State
  const [initialBankroll, setInitialBankroll] = useState(1000);
  const [baseBet, setBaseBet] = useState(10);
  const [targetMultiplier, setTargetMultiplier] = useState(2.00);
  const [strategy, setStrategy] = useState('MARTINGALE');
  const [stopLoss, setStopLoss] = useState(200);
  const [takeProfit, setTakeProfit] = useState(3000);
  const [maxBet, setMaxBet] = useState(200);
  const [roundsCount, setRoundsCount] = useState(200);

  // Backtest result
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const executeBacktest = () => {
    // Generate fresh synthetic provably fair test rounds
    const dataset = simulateBatchScenarios(
      'sandbox_server_seed_' + Date.now(),
      'sandbox_client_entropy',
      roundsCount,
      1
    );

    const res = runStrategyBacktest(dataset, {
      initialBankroll: Number(initialBankroll),
      baseBet: Number(baseBet),
      targetMultiplier: Number(targetMultiplier),
      strategy,
      stopLoss: Number(stopLoss),
      takeProfit: Number(takeProfit),
      maxBet: Number(maxBet),
    });

    setResult(res);
    setActiveStep(res.history.length);
  };

  useEffect(() => {
    executeBacktest();
  }, [strategy, targetMultiplier]);

  // SVG Chart points calculation
  const getChartPath = () => {
    if (!result || result.history.length < 2) return '';
    const h = result.history;
    const minBal = Math.min(...h.map((p) => p.balance), initialBankroll * 0.5);
    const maxBal = Math.max(...h.map((p) => p.balance), initialBankroll * 1.5);
    const range = maxBal - minBal || 1;

    const width = 600;
    const height = 180;

    const points = h.map((item, idx) => {
      const x = (idx / (h.length - 1)) * width;
      const y = height - ((item.balance - minBal) / range) * (height - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Bot size={14} />
              Automated Decision Agent & Strategy Sandbox
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Algorithmic Execution Bot
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Backtest risk-management models, auto-cashout targets, and dynamic staking strategies across thousands of provably fair crash rounds with zero financial risk.
            </p>
          </div>

          <button
            onClick={executeBacktest}
            className="flex items-center gap-2 bg-aviator-lime text-black font-black px-5 py-2.5 rounded-2xl hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-wider shadow-lg shadow-aviator-lime/20"
          >
            <RotateCcw size={14} />
            Rerun Backtest
          </button>
        </div>
      </div>

      {/* Control Settings & Strategy Selector */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-xl">
        {/* Strategy Types */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
            Select Automated Betting Strategy
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'MARTINGALE', label: 'Martingale (2x on loss)', desc: 'Recovers losses with doubled stakes' },
              { id: 'ANTI_MARTINGALE', label: 'Anti-Martingale', desc: 'Rides win streaks, resets on loss' },
              { id: 'FIXED', label: 'Fixed Flat Stake', desc: 'Consistent bet size each round' },
              { id: 'KELLY', label: 'Kelly Criterion', desc: 'Calculated mathematical edge sizing' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  strategy === s.id
                    ? 'bg-zinc-900 border-aviator-lime shadow-[0_0_15px_rgba(57,255,20,0.15)]'
                    : 'bg-black/50 border-zinc-800 hover:bg-zinc-900/60'
                }`}
              >
                <div className={`text-xs font-black uppercase tracking-wide mb-1 ${
                  strategy === s.id ? 'text-aviator-lime' : 'text-white'
                }`}>
                  {s.label}
                </div>
                <div className="text-[10px] text-zinc-500 line-clamp-1">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Initial Bankroll */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Initial Bankroll ($)
            </label>
            <input
              type="number"
              value={initialBankroll}
              onChange={(e) => setInitialBankroll(Math.max(10, parseFloat(e.target.value) || 10))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
            />
          </div>

          {/* Base Bet */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Base Bet ($)
            </label>
            <input
              type="number"
              value={baseBet}
              onChange={(e) => setBaseBet(Math.max(1, parseFloat(e.target.value) || 1))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
            />
          </div>

          {/* Target Cashout Multiplier */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Target Auto-Cashout
            </label>
            <input
              type="number"
              step="0.05"
              value={targetMultiplier}
              onChange={(e) => setTargetMultiplier(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-aviator-lime font-bold font-mono focus:border-emerald-500"
            />
          </div>

          {/* Max Bet Cap */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Max Bet Cap ($)
            </label>
            <input
              type="number"
              value={maxBet}
              onChange={(e) => setMaxBet(Math.max(5, parseFloat(e.target.value) || 5))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
            />
          </div>

          {/* Stop Loss */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Stop Loss Floor ($)
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-red-400 font-mono focus:border-emerald-500"
            />
          </div>

          {/* Test Rounds */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Simulate Rounds
            </label>
            <select
              value={roundsCount}
              onChange={(e) => setRoundsCount(parseInt(e.target.value))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
            >
              <option value="50">50 Rounds</option>
              <option value="100">100 Rounds</option>
              <option value="200">200 Rounds</option>
              <option value="500">500 Rounds</option>
              <option value="1000">1,000 Rounds</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance KPI Cards */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Final Balance</span>
            <span className={`text-xl font-black font-mono ${result.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${result.finalBalance.toLocaleString()}
            </span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Net P&L</span>
            <span className={`text-xl font-black font-mono ${result.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.netProfit >= 0 ? `+$${result.netProfit.toLocaleString()}` : `-$${Math.abs(result.netProfit).toLocaleString()}`}
            </span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">ROI %</span>
            <span className={`text-xl font-black font-mono ${result.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.roi >= 0 ? `+${result.roi}%` : `${result.roi}%`}
            </span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Win Rate %</span>
            <span className="text-xl font-black text-aviator-lime font-mono">
              {result.winRate}% <span className="text-xs text-zinc-500">({result.wins}W / {result.losses}L)</span>
            </span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Max Drawdown</span>
            <span className="text-xl font-black text-amber-400 font-mono">
              {result.maxDrawdown}%
            </span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Peak Capital</span>
            <span className="text-xl font-black text-cyan-400 font-mono">
              ${result.peakBalance.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Interactive Bankroll Trajectory Chart */}
      {result && result.history.length > 1 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" />
              Bankroll Trajectory & Cumulative Equity Curve
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">
              ${initialBankroll} Start → ${result.finalBalance} End
            </span>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full h-48 bg-black/60 border border-zinc-900 rounded-2xl p-3 relative overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 600 180" className="w-full h-full preserve-3d">
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="90" x2="600" y2="90" stroke="#27272a" strokeDasharray="4 4" />
              <path
                d={getChartPath()}
                fill="none"
                stroke={result.netProfit >= 0 ? '#10b981' : '#ef4444'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Detailed Execution History */}
      {result && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider">
              Automated Bot Action Log (First 15 Rounds)
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Target: {targetMultiplier.toFixed(2)}x</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-black">
                  <th className="py-2.5 px-3">Round #</th>
                  <th className="py-2.5 px-3">Stake ($)</th>
                  <th className="py-2.5 px-3">Crash Outcome</th>
                  <th className="py-2.5 px-3">Decision Status</th>
                  <th className="py-2.5 px-3">Round P&L</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
                {result.history.slice(0, 15).map((h, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/50">
                    <td className="py-2.5 px-3 text-zinc-400">#{h.round}</td>
                    <td className="py-2.5 px-3 text-white font-bold">${h.bet}</td>
                    <td className="py-2.5 px-3 font-bold">
                      <span className={h.multiplier >= targetMultiplier ? 'text-aviator-lime' : 'text-red-400'}>
                        {h.multiplier.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        h.won ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {h.won ? 'Cashed Out' : 'Busted'}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 font-bold ${h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.pnl >= 0 ? `+$${h.pnl}` : `-$${Math.abs(h.pnl)}`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">${h.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
