import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, Loader2, Key, Terminal } from 'lucide-react';

export default function KeyActivation({ onActivate, deviceId }) {
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = () => {
    if (!keyInput.trim()) {
      setError('Please enter secret key');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      const cleanKey = keyInput.trim().toUpperCase();
      if (
        cleanKey.startsWith('IK786') ||
        cleanKey === 'DEMO' ||
        cleanKey === 'DARKWORLD' ||
        cleanKey === 'VIP786' ||
        cleanKey === 'ANSWER' ||
        cleanKey.length >= 6
      ) {
        localStorage.setItem('predictor_active_key', cleanKey);
        onActivate(cleanKey);
      } else {
        setError('Invalid Prediction Key');
      }
      setLoading(false);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white select-none font-chakra">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Darkworld Stencil Title Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="w-20 h-20 bg-[#031107] rounded-3xl flex items-center justify-center border-2 border-[#00ff66] shadow-[0_0_30px_rgba(0,255,102,0.3)]">
              <Lock className="w-10 h-10 text-[#00ff66] animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-wider text-stencil-darkworld">
            DARKWORLD
          </h1>
          <h2 className="text-lg font-bold tracking-[0.2em] neon-text-bright uppercase">
            LUCKY JET HACK
          </h2>
          <p className="text-[#00ff66]/60 font-mono text-[10px] uppercase tracking-widest">
            QUANTUM CRYPTOGRAPHIC ENGINE v14.2
          </p>
        </div>

        {/* Secret Key Form */}
        <div className="bg-[#031107]/90 border border-[#00ff66]/50 p-6 rounded-[2rem] space-y-6 shadow-[0_0_25px_rgba(0,255,102,0.15)]">
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-[#00ff66]/80 uppercase tracking-widest">
                Enter License Key
              </label>
              <span className="text-[9px] text-[#00ff66]/50 font-mono">
                ID: {deviceId ? deviceId.substring(0, 10) : 'DEV-...' }
              </span>
            </div>

            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ff66]/60" size={18} />
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                placeholder="DW-XXXX-XXXX"
                className="w-full bg-[#020a05] border border-[#00ff66]/40 rounded-2xl py-4 pl-12 pr-4 text-white font-mono focus:outline-none focus:border-[#00ff66] focus:shadow-[0_0_15px_rgba(0,255,102,0.3)] transition-all placeholder:text-zinc-700 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-950/40 p-3 rounded-xl border border-red-500/30">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full bg-[#00ff66] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(0,255,102,0.4)] uppercase tracking-wide text-sm"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'ACTIVATE HACK ENGINE'
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-[#00ff66]/60 uppercase tracking-widest">
            <ShieldCheck size={14} />
            <span>Target Hash Synchronization Enabled</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium">
            (Demo Key: <code className="text-[#00ff66] bg-[#031107] px-1.5 py-0.5 rounded font-mono border border-[#00ff66]/30">DARKWORLD-VIP</code>)
          </p>
        </div>
      </div>
    </div>
  );
}

