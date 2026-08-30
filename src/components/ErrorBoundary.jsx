import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('predictor_active_key');
    } catch (_) {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-chakra select-none">
          <div className="max-w-md bg-[#031107] border-2 border-[#00ff66] p-8 rounded-3xl space-y-5 shadow-[0_0_40px_rgba(0,255,102,0.3)]">
            <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-500/50 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold tracking-wider text-stencil-darkworld">
              DARKWORLD SYSTEM RECOVERY
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              {this.state.error?.message || 'Interface encountered a state synchronization fault.'}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full bg-[#00ff66] text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-wider"
            >
              <RefreshCw size={16} />
              <span>Reset & Reload Darkworld</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
