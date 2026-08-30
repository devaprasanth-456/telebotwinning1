import React, { useState, useEffect } from 'react';
import { ChevronLeft, Lock, X, AlertCircle, Loader2 } from 'lucide-react';
import { fetchPredictorApps } from '../utils/provablyFair';

const PREDICTOR_APPS = [
  {
    id: '1xbet',
    name: '1xBet Aviator Pro',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    color: 'from-blue-600 to-indigo-900',
  },
  {
    id: 'betway',
    name: 'Betway Signal Hack',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80',
    color: 'from-zinc-800 to-black',
  },
  {
    id: 'premierbet',
    name: 'Premier Bet Predictor',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    color: 'from-yellow-500 to-green-700',
  },
  {
    id: 'mostbet',
    name: 'Mostbet Aviator v9',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80',
    color: 'from-red-600 to-amber-600',
  },
  {
    id: '1win',
    name: '1Win Aviator VIP',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
    color: 'from-blue-500 to-sky-700',
  }
];

export default function MorePredictors() {
  const [selectedApp, setSelectedApp] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePredictor, setActivePredictor] = useState(null);
  const [loadingVpn, setLoadingVpn] = useState(false);
  const [apps, setApps] = useState(PREDICTOR_APPS);

  // Try to load real predictor apps from server
  useEffect(() => {
    fetchPredictorApps().then((serverApps) => {
      if (serverApps && Array.isArray(serverApps) && serverApps.length > 0) {
        setApps(serverApps);
        console.log('[API] Real predictor apps loaded:', serverApps);
      }
    });
  }, []);

  const handleVerifyPassword = () => {
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      // Valid passwords
      if (password.trim().length >= 4 || password === '1234' || password === '786') {
        setActivePredictor(selectedApp);
        setSelectedApp(null);
        setPassword('');
        setLoadingVpn(true);
      } else {
        setError('Incorrect password');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <>
      {/* VPN Connection Loading Screen Overlay */}
      {loadingVpn && activePredictor ? (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-50 animate-fadeIn">
          <button
            onClick={() => {
              setLoadingVpn(false);
              setActivePredictor(null);
            }}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white p-2"
          >
            <X size={24} />
          </button>
          
          <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-aviator-green/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-aviator-green animate-spin" />
            <div className="absolute inset-2 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center p-2">
              <img
                src={activePredictor.image_url}
                alt={activePredictor.name}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>

          <h2 className="text-lg font-black text-white mb-2 text-center">
            {activePredictor.name}
          </h2>
          <p className="text-aviator-green font-bold text-sm uppercase tracking-widest animate-pulse text-center">
            Loading VPN for your predictor...
          </p>
          <p className="text-zinc-500 text-xs mt-4 text-center max-w-xs">
            Securing connection. Please wait...
          </p>
        </div>
      ) : null}

      {/* List of Predictors */}
      <div className="w-full max-w-[340px] space-y-1 mt-4">
        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center mb-3">
          More Predictors
        </p>
        <div className="flex flex-col gap-1">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                setSelectedApp(app);
                setPassword('');
                setError('');
              }}
              className="flex items-center gap-4 w-full py-2.5 px-3 rounded-xl bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 text-left active:opacity-70 transition-all hover:bg-zinc-900/50"
            >
              <div className="flex-shrink-0 w-[72px] h-[44px] rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 flex items-center justify-center relative">
                <img
                  src={app.image_url}
                  alt={app.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <span className="text-[15px] font-semibold text-white truncate">
                {app.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Password Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedApp(null)}
          />

          {/* Dialog Container */}
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl z-10 animate-slideUp">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-zinc-500 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                <img
                  src={selectedApp.image_url}
                  alt={selectedApp.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-lg font-black text-white text-center">
                {selectedApp.name}
              </h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Enter password
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  placeholder="Password"
                  className="w-full bg-black border border-zinc-700 rounded-2xl py-3.5 pl-11 pr-4 text-white focus:outline-none focus:border-aviator-green text-sm"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-aviator-red flex items-center gap-1">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </p>
              )}

              <button
                type="button"
                onClick={handleVerifyPassword}
                disabled={loading}
                className="w-full bg-aviator-lime text-black font-black py-3.5 rounded-2xl disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wide text-sm flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  'Continue'
                )}
              </button>
              <p className="text-[10px] text-zinc-600 text-center">
                (Demo Password: <code className="text-aviator-green font-mono">1234</code>)
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
