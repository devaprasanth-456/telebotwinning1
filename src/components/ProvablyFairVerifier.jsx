import React, { useState, useEffect } from 'react';
import { ShieldCheck, Hash, Key, Cpu, Copy, Check, ArrowRight, RefreshCw, Sparkles, Layers } from 'lucide-react';
import { computeProvablyFairOutcome } from '../utils/provablyFairEngine';

export default function ProvablyFairVerifier({ initialServerSeed, initialClientSeed, initialNonce }) {
  const [serverSeed, setServerSeed] = useState(initialServerSeed || 'sandbox_server_seed_987654321');
  const [clientSeed, setClientSeed] = useState(initialClientSeed || 'sandbox_client_entropy_abc');
  const [nonce, setNonce] = useState(initialNonce || 1);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [quickSequence, setQuickSequence] = useState([]);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    const res = await computeProvablyFairOutcome(serverSeed, clientSeed, nonce);
    setResult(res);

    // Generate quick 5-round sequence preview
    const seq = [];
    for (let i = 0; i < 5; i++) {
      const n = Number(nonce) + i;
      const r = await computeProvablyFairOutcome(serverSeed, clientSeed, n);
      seq.push(r);
    }
    setQuickSequence(seq);
    setLoading(false);
  };

  useEffect(() => {
    calculate();
  }, [serverSeed, clientSeed, nonce]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const loadPreset = (sSeed, cSeed, n) => {
    setServerSeed(sSeed);
    setClientSeed(cSeed);
    setNonce(n);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-aviator-lime/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aviator-lime/10 border border-aviator-lime/30 text-aviator-lime text-xs font-black uppercase tracking-wider">
              <ShieldCheck size={14} />
              Cryptographic HMAC-SHA256 Verifier
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Provably Fair Audit Engine
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Independently verify crash multipliers with unforgeable mathematical proofs. Every round's multiplier is mathematically fixed by the server seed, client entropy, and round nonce.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadPreset('sandbox_server_seed_987654321', 'sandbox_client_entropy_abc', 1)}
              className="text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-xl border border-zinc-700 transition-all"
            >
              Sandbox Vector
            </button>
            <button
              onClick={() => loadPreset('a8e9f201bc34d89a7702f14e', 'client_1win_vip_user_44', 42)}
              className="text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-xl border border-zinc-700 transition-all"
            >
              High-Entropy Key
            </button>
          </div>
        </div>
      </div>

      {/* Input Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Server Seed */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-2 relative group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs font-black text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-aviator-lime">
              <Key size={14} /> Server Seed / Hash
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">HMAC Key</span>
          </div>
          <input
            type="text"
            value={serverSeed}
            onChange={(e) => setServerSeed(e.target.value)}
            placeholder="e.g. server_secret_hash..."
            className="w-full bg-black/80 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-aviator-lime transition-all"
          />
        </div>

        {/* Client Seed */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-2 relative group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs font-black text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Hash size={14} /> Client Entropy / Seed
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">User Payload</span>
          </div>
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            placeholder="e.g. client_public_seed..."
            className="w-full bg-black/80 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-400 transition-all"
          />
        </div>

        {/* Nonce */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-2 relative group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-xs font-black text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Cpu size={14} /> Nonce / Round #
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNonce((n) => Math.max(1, Number(n) - 1))}
                className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold hover:bg-zinc-700"
              >
                -
              </button>
              <button
                onClick={() => setNonce((n) => Number(n) + 1)}
                className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold hover:bg-zinc-700"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="number"
            min="1"
            value={nonce}
            onChange={(e) => setNonce(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-black/80 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      {/* Proof Calculation Result Box */}
      {result && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Top Result Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/60 border border-zinc-800/80 rounded-2xl p-5">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest">
                <Sparkles size={14} className="text-aviator-lime" />
                Deterministic Outcome Result
              </div>
              <p className="text-xs text-zinc-500">
                Round Nonce #{result.nonce} mathematically resolved:
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-6 py-3 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-aviator-lime/40 shadow-[0_0_25px_rgba(57,255,20,0.2)] flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-black text-aviator-lime font-mono tracking-tight">
                  {result.multiplier.toFixed(2)}x
                </span>
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  Verified Multiplier
                </span>
              </div>
            </div>
          </div>

          {/* Mathematical Proof Steps */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-aviator-lime" />
              Cryptographic Execution Pipeline Steps
            </h4>

            {/* Step 1: Payload Construction */}
            <div className="bg-black/50 border border-zinc-900 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-zinc-300">1. Payload Serialization</span>
                <span className="text-zinc-500 font-mono">f"{'{client_seed}'}:{'{nonce}'}"</span>
              </div>
              <div className="text-xs font-mono text-cyan-300 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800 break-all">
                {clientSeed}:{nonce}
              </div>
            </div>

            {/* Step 2: HMAC-SHA256 Hash Digest */}
            <div className="bg-black/50 border border-zinc-900 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-zinc-300">2. HMAC-SHA256 Full Digest (64 Hex Characters)</span>
                <button
                  onClick={() => handleCopy(result.hmacDigest)}
                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check size={12} className="text-aviator-lime" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="text-xs font-mono text-zinc-300 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800 break-all">
                <span className="text-aviator-lime font-black underline">{result.hex32}</span>
                <span className="text-zinc-500">{result.hmacDigest.substring(8)}</span>
              </div>
            </div>

            {/* Step 3: 32-bit Slicing & Integer Conversion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-black/50 border border-zinc-900 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-zinc-300">3. First 4-Bytes Slice (32-bit Hex)</span>
                <div className="text-xs font-mono text-aviator-lime bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800">
                  0x{result.hex32}
                </div>
              </div>
              <div className="bg-black/50 border border-zinc-900 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-zinc-300">4. Unsigned 32-bit Integer</span>
                <div className="text-xs font-mono text-amber-300 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800">
                  {result.int32.toLocaleString()} / 4,294,967,295
                </div>
              </div>
            </div>

            {/* Step 4: Pareto Formula Application */}
            <div className="bg-black/50 border border-zinc-900 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-zinc-300">5. Multiplier Derivation Equation</span>
              <div className="text-xs font-mono text-zinc-300 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 space-y-1">
                <div>Formula: <code className="text-zinc-400">floor((0xFFFFFFFF * 100) / (int_val + 1)) / 100</code></div>
                <div className="text-aviator-lime">
                  = floor((429496729500) / ({result.int32} + 1)) / 100 = <span className="font-black text-sm">{result.multiplier.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sequential Verification Window (Nonces Preview) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <ArrowRight size={14} className="text-aviator-lime" />
            Consecutive Nonce Chain (Nonces #{nonce} → #{Number(nonce) + 4})
          </h4>
          <span className="text-[10px] text-zinc-500 font-mono">Immutable Hash Chain</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {quickSequence.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setNonce(item.nonce)}
              className={`p-3 rounded-2xl border text-center transition-all ${
                item.nonce === Number(nonce)
                  ? 'bg-zinc-900 border-aviator-lime shadow-[0_0_15px_rgba(57,255,20,0.15)]'
                  : 'bg-black/40 border-zinc-800/80 hover:bg-zinc-900/60'
              }`}
            >
              <div className="text-[10px] font-mono text-zinc-500 mb-0.5">Nonce #{item.nonce}</div>
              <div className={`text-base font-black font-mono ${
                item.multiplier < 2.0 ? 'text-blue-400' :
                item.multiplier < 10.0 ? 'text-purple-400' : 'text-amber-400'
              }`}>
                {item.multiplier.toFixed(2)}x
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
