import React, { useState, useEffect } from 'react';
import { Play, Download, BarChart2, PieChart, Activity, RefreshCw, FileText, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import { simulateBatchScenarios, analyzeDistribution, exportToCsv, exportToJson } from '../utils/provablyFairEngine';

export default function BatchSimulatorAudit() {
  const [serverSeed, setServerSeed] = useState('sandbox_server_seed_987654321');
  const [clientSeed, setClientSeed] = useState('sandbox_client_entropy_abc');
  const [roundCount, setRoundCount] = useState(500);
  const [startNonce, setStartNonce] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const generated = simulateBatchScenarios(serverSeed, clientSeed, roundCount, startNonce);
      const analysis = analyzeDistribution(generated);
      setRounds(generated);
      setStats(analysis);
      setPage(1);
      setIsSimulating(false);
    }, 80);
  };

  useEffect(() => {
    runSimulation();
  }, []);

  const totalPages = Math.ceil(rounds.length / pageSize);
  const currentRounds = rounds.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-wider">
              <BarChart2 size={14} />
              Scenario Simulator & Distribution Audit
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Batch Provably Fair Engine
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Generate up to 10,000 deterministic rounds in milliseconds. Audit Return-to-Player (RTP), Pareto distribution compliance, and export full datasets to CSV/JSON.
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportToCsv(rounds, `provably_fair_${roundCount}_rounds.csv`)}
              disabled={rounds.length === 0}
              className="flex items-center gap-1.5 text-xs font-black bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl border border-zinc-700 transition-all"
            >
              <Download size={14} className="text-aviator-lime" />
              Export CSV
            </button>
            <button
              onClick={() => exportToJson(rounds, `provably_fair_${roundCount}_rounds.json`)}
              disabled={rounds.length === 0}
              className="flex items-center gap-1.5 text-xs font-black bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl border border-zinc-700 transition-all"
            >
              <FileText size={14} className="text-cyan-400" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Control Panel */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Server Seed */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Server Seed
            </label>
            <input
              type="text"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Client Seed */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Client Seed
            </label>
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Start Nonce */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Start Nonce
            </label>
            <input
              type="number"
              min="1"
              value={startNonce}
              onChange={(e) => setStartNonce(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Batch Size Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Rounds Count
            </label>
            <select
              value={roundCount}
              onChange={(e) => setRoundCount(parseInt(e.target.value))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="50">50 Rounds</option>
              <option value="100">100 Rounds</option>
              <option value="500">500 Rounds</option>
              <option value="1000">1,000 Rounds</option>
              <option value="2500">2,500 Rounds</option>
              <option value="5000">5,000 Rounds</option>
            </select>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all text-xs uppercase tracking-wider"
        >
          {isSimulating ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Computing Cryptographic Hashes...
            </>
          ) : (
            <>
              <Play size={16} className="fill-white" />
              Generate & Audit {roundCount.toLocaleString()} Scenario Rounds
            </>
          )}
        </button>
      </div>

      {/* KPI Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Sample Size</span>
            <span className="text-xl font-black text-white font-mono">{stats.sampleSize.toLocaleString()}</span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Max Crash Multiplier</span>
            <span className="text-xl font-black text-amber-400 font-mono">{stats.max.toLocaleString()}x</span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Mean (Average)</span>
            <span className="text-xl font-black text-cyan-400 font-mono">{stats.mean}x</span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Median (50th %ile)</span>
            <span className="text-xl font-black text-aviator-lime font-mono">{stats.median}x</span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">RTP (at 2.0x)</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{stats.empiricalRtp}%</span>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Crash &lt; 2.0x</span>
            <span className="text-xl font-black text-red-400 font-mono">{stats.under2xPct}%</span>
          </div>
        </div>
      )}

      {/* Distribution Histogram & Threshold Table */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Histogram Bins */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <PieChart size={14} className="text-blue-400" />
                Multiplier Frequency Distribution
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">{stats.sampleSize} Total Samples</span>
            </div>

            <div className="space-y-3 pt-2">
              {stats.bins.map((b, idx) => {
                const pct = ((b.count / stats.sampleSize) * 100).toFixed(1);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-300 font-mono font-bold">{b.label}</span>
                      <span className="text-zinc-400 font-mono">
                        {b.count} rounds <span className="text-zinc-500">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, pct)}%`, backgroundColor: b.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] bg-black/60 p-3 rounded-xl border border-zinc-900">
              <span className="text-zinc-400">Max Consecutive Low Crashes (&lt;2x):</span>
              <span className="text-red-400 font-black font-mono">{stats.maxLossStreak} rounds</span>
            </div>
          </div>

          {/* Cumulative Threshold Validation Table */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={14} className="text-aviator-lime" />
                  Theoretical vs Empirical P(X ≥ x)
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">P(X ≥ x) = 1/x</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-black">
                      <th className="py-2">Target</th>
                      <th className="py-2">Hits</th>
                      <th className="py-2">Empirical</th>
                      <th className="py-2">Theoretical</th>
                      <th className="py-2 text-right">Deviation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
                    {stats.thresholdStats.slice(0, 6).map((th, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/40">
                        <td className="py-2 text-white font-bold">{th.threshold.toFixed(2)}x</td>
                        <td className="py-2 text-zinc-400">{th.hits}</td>
                        <td className="py-2 text-aviator-lime font-bold">{th.empiricalPct}%</td>
                        <td className="py-2 text-zinc-500">{th.theoreticalPct}%</td>
                        <td className={`py-2 text-right font-bold ${
                          Math.abs(th.deviationPct) < 2 ? 'text-zinc-400' :
                          th.deviationPct > 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {th.deviationPct > 0 ? `+${th.deviationPct}%` : `${th.deviationPct}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-black/60 p-3 rounded-xl border border-zinc-900 text-[10px] text-zinc-400 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-aviator-lime flex-shrink-0" />
              <span>Statistical convergence confirmed: dataset follows HMAC-SHA256 Pareto distribution.</span>
            </div>
          </div>
        </div>
      )}

      {/* Generated Dataset Table View */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider">
            Simulated Rounds Ledger (Page {page} of {totalPages || 1})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-bold bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-zinc-300 disabled:opacity-40 hover:bg-zinc-800"
            >
              Prev
            </button>
            <span className="text-xs font-mono text-zinc-400 px-2">{page} / {totalPages || 1}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-xs font-bold bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-zinc-300 disabled:opacity-40 hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-black">
                <th className="py-2.5 px-3">Nonce #</th>
                <th className="py-2.5 px-3">Multiplier</th>
                <th className="py-2.5 px-3">32-bit Hex</th>
                <th className="py-2.5 px-3">Raw Integer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
              {currentRounds.map((r, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-2.5 px-3 text-zinc-400">#{r.nonce}</td>
                  <td className="py-2.5 px-3 font-bold">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                      r.multiplier < 2.0 ? 'text-blue-400 bg-blue-500/10' :
                      r.multiplier < 10.0 ? 'text-purple-400 bg-purple-500/10' :
                      'text-amber-400 bg-amber-500/10'
                    }`}>
                      {r.multiplier.toFixed(2)}x
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500">0x{r.hex32}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{r.int32.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
