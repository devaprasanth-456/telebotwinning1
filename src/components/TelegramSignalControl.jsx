import React, { useState, useEffect } from 'react';
import {
  Send,
  Bot,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Radio,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  Copy,
  Check,
  Clock,
  Play
} from 'lucide-react';
import {
  loadTelegramConfig,
  saveTelegramConfig,
  formatSignalText,
  formatFlewAwayText,
  sendDirectTelegramMessage,
  testTelegramBotProfile
} from '../utils/telegramClient';

export default function TelegramSignalControl({ activePrediction = 2.35, currentCrash = 2.82 }) {
  const [config, setConfig] = useState(loadTelegramConfig());
  const [botStatus, setBotStatus] = useState({ checking: false, authenticated: false, botName: '', error: null });
  const [feedMessages, setFeedMessages] = useState([
    { id: 1, type: 'bet', text: '🟢 BET - Odds over 2.00x', time: '20:00', multiplier: 2.82, status: 'sent' },
    { id: 2, type: 'flew', text: 'FLEW AWAY! 2.82x', time: '20:01', multiplier: 2.82, status: 'sent' },
    { id: 3, type: 'wait', text: '🔴 WAIT - Odds under 2.00x', time: '20:01', multiplier: 1.55, status: 'sent' },
    { id: 4, type: 'flew', text: 'FLEW AWAY! 1.55x', time: '20:01', multiplier: 1.55, status: 'sent' },
    { id: 5, type: 'bet', text: '🟢 BET - Odds over 2.00x', time: '20:01', multiplier: 2.80, status: 'sent' },
    { id: 6, type: 'flew', text: 'FLEW AWAY! 2.80x', time: '20:01', multiplier: 2.80, status: 'sent' },
    { id: 7, type: 'bet', text: '🟢 BET - Odds over 2.00x', time: '20:01', multiplier: 6.56, status: 'sent' },
    { id: 8, type: 'flew', text: 'FLEW AWAY! 6.56x', time: '20:01', multiplier: 6.56, status: 'sent' },
  ]);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Check token authentication on load
  const verifyToken = async (tokenToTest) => {
    const token = tokenToTest || config.bot_token;
    if (!token) {
      setBotStatus({ checking: false, authenticated: false, botName: '', error: 'Token is empty' });
      return;
    }

    setBotStatus(prev => ({ ...prev, checking: true, error: null }));
    const res = await testTelegramBotProfile(token);
    if (res.success) {
      setBotStatus({
        checking: false,
        authenticated: true,
        botName: `@${res.bot.username} (${res.bot.first_name})`,
        error: null
      });
    } else {
      setBotStatus({
        checking: false,
        authenticated: false,
        botName: '',
        error: res.error
      });
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

  const handleSaveConfig = () => {
    saveTelegramConfig(config);
    verifyToken(config.bot_token);
    setTestResult({ type: 'success', msg: 'Configuration saved and persisted!' });
    setTimeout(() => setTestResult(null), 4000);
  };

  // Dispatch custom message to Telegram
  const handleSendCustomSignal = async (type, customMult = null) => {
    setIsSending(true);
    let msgText = '';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (type === 'BET') {
      msgText = `🟢 <b>BET - Odds over ${config.threshold.toFixed(2)}x</b> ${timeStr}`;
    } else if (type === 'WAIT') {
      msgText = `🔴 <b>WAIT - Odds under ${config.threshold.toFixed(2)}x</b> ${timeStr}`;
    } else if (type === 'FLEW') {
      const mult = customMult || currentCrash || 2.82;
      msgText = `FLEW AWAY! <b>${mult.toFixed(2)}x</b> ${timeStr}`;
    } else if (type === 'BATCH') {
      msgText = `✅ <b>12 Signals received.</b> ${timeStr}\n\n⏳ The next signals in 5 hour 22 minutes 43 seconds later`;
    }

    const res = await sendDirectTelegramMessage(config.bot_token, config.chat_id, msgText);
    setIsSending(false);

    // Add to local visual feed
    const newMsg = {
      id: Date.now(),
      type: type.toLowerCase(),
      text: msgText.replace(/<\/?b>/g, ''),
      time: timeStr,
      status: res.success ? 'sent' : 'failed',
    };
    setFeedMessages(prev => [newMsg, ...prev.slice(0, 19)]);

    if (res.success) {
      setTestResult({ type: 'success', msg: `Message sent to chat ${config.chat_id}!` });
    } else {
      setTestResult({ type: 'error', msg: `Send failed: ${res.error}` });
    }
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleCopyChatId = () => {
    navigator.clipboard.writeText(config.chat_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 text-white font-sans">
      
      {/* 1. Header & Live Connection Status */}
      <div className="bg-gradient-to-r from-zinc-950 via-[#031107] to-zinc-950 border border-[#00ff66]/40 p-4 sm:p-5 rounded-3xl shadow-[0_0_30px_rgba(0,255,102,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#00ff66]/10 border border-[#00ff66]/40 flex items-center justify-center text-[#00ff66]">
            <Bot size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold font-chakra text-white text-base tracking-wide uppercase">
                Aviator Signal Monitor Bot
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30">
                OVER / UNDER 2.00X
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
              {botStatus.checking ? (
                <span className="text-yellow-400 flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" /> Verifying Telegram Token...
                </span>
              ) : botStatus.authenticated ? (
                <span className="text-[#39ff14] flex items-center gap-1">
                  <CheckCircle2 size={12} /> {botStatus.botName} (Ready)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} /> Token Check: {botStatus.error || 'Check BotFather Token'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Live Status Pill & Open Bot Link */}
        <div className="flex items-center gap-2">
          <a
            href={`https://t.me/${config.bot_username || 'AviatorSignalMonitorBot'}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs uppercase shadow-[0_0_15px_rgba(0,136,204,0.4)] transition-all cursor-pointer"
          >
            <Send size={13} />
            <span>Open Bot (@{config.bot_username || 'AviatorSignalMonitorBot'})</span>
            <ExternalLink size={12} />
          </a>
          <div className="flex items-center gap-2 bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-xl font-mono text-xs">
            <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-[#00ff66] animate-ping' : 'bg-red-500'}`} />
            <span className="text-zinc-300 font-bold">{config.enabled ? 'LIVE MERGED' : 'PAUSED'}</span>
          </div>
          <button
            onClick={() => verifyToken()}
            disabled={botStatus.checking}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-[#00ff66] transition-all"
            title="Refresh connection"
          >
            <RefreshCw size={15} className={botStatus.checking ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Credentials & Config Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Column: Telegram Credentials */}
        <div className="bg-[#020a05] border border-[#00ff66]/30 p-4 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-[#00ff66] uppercase flex items-center gap-1.5">
              <Sliders size={14} /> Bot Credentials
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Linked to Live Predictor</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                TELEGRAM BOT TOKEN (From @BotFather)
              </label>
              <input
                type="text"
                value={config.bot_token}
                onChange={(e) => setConfig({ ...config, bot_token: e.target.value })}
                placeholder="7896699257:AAGbHyL8bn..."
                className="w-full bg-black/80 border border-zinc-700 focus:border-[#00ff66] rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                TELEGRAM CHAT ID / CHANNEL ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.chat_id}
                  onChange={(e) => setConfig({ ...config, chat_id: e.target.value })}
                  placeholder="6551286352"
                  className="w-full bg-black/80 border border-zinc-700 focus:border-[#00ff66] rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 outline-none transition-colors"
                />
                <button
                  onClick={handleCopyChatId}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white flex items-center gap-1 text-xs"
                  title="Copy Chat ID"
                >
                  {copied ? <Check size={14} className="text-[#00ff66]" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  ODDS THRESHOLD
                </label>
                <div className="flex items-center gap-1 bg-black/80 border border-zinc-700 rounded-xl px-2.5 py-1.5">
                  <input
                    type="number"
                    step="0.05"
                    value={config.threshold}
                    onChange={(e) => setConfig({ ...config, threshold: parseFloat(e.target.value) || 2.00 })}
                    className="w-full bg-transparent text-xs font-mono text-[#00ff66] font-bold outline-none"
                  />
                  <span className="text-xs text-zinc-400 font-mono">X</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  BATCH INTERVAL
                </label>
                <div className="flex items-center gap-1 bg-black/80 border border-zinc-700 rounded-xl px-2.5 py-1.5">
                  <input
                    type="number"
                    value={config.batch_interval_rounds}
                    onChange={(e) => setConfig({ ...config, batch_interval_rounds: parseInt(e.target.value) || 12 })}
                    className="w-full bg-transparent text-xs font-mono text-white font-bold outline-none"
                  />
                  <span className="text-[10px] text-zinc-400 font-mono">ROUNDS</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="rounded border-zinc-700 text-[#00ff66] focus:ring-0"
                />
                <span>Auto-Dispatch On New Rounds</span>
              </label>

              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-[#00ff66] text-black font-black text-xs uppercase rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,102,0.3)]"
              >
                <Check size={14} /> Save & Apply
              </button>
            </div>

            {testResult && (
              <div className={`p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
                testResult.type === 'success' ? 'bg-[#00ff66]/10 text-[#39ff14] border border-[#00ff66]/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {testResult.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Test Trigger & Video UI Preview */}
        <div className="bg-[#020a05] border border-[#00ff66]/30 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
              <span className="text-xs font-bold text-[#00ff66] uppercase flex items-center gap-1.5">
                <Zap size={14} /> Instant Test Triggers
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">Test Telemetry</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => handleSendCustomSignal('BET')}
                disabled={isSending}
                className="p-3 bg-[#031b0c] border border-[#00ff66]/60 rounded-xl text-left hover:bg-[#00ff66]/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[#00ff66] font-bold">SIGNAL 1</span>
                  <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-[#39ff14]">
                  🟢 BET (Over 2.00x)
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Send instant Over 2X signal</div>
              </button>

              <button
                onClick={() => handleSendCustomSignal('WAIT')}
                disabled={isSending}
                className="p-3 bg-[#1b0303] border border-red-500/60 rounded-xl text-left hover:bg-red-500/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-red-400 font-bold">SIGNAL 2</span>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-red-400">
                  🔴 WAIT (Under 2.00x)
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Send instant Under 2X signal</div>
              </button>

              <button
                onClick={() => handleSendCustomSignal('FLEW', 2.82)}
                disabled={isSending}
                className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-left hover:border-zinc-500 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">CRASH REPORT</span>
                  <Activity size={12} className="text-zinc-400" />
                </div>
                <div className="text-xs font-bold text-zinc-200">
                  FLEW AWAY! 2.82x
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Simulate round crash</div>
              </button>

              <button
                onClick={() => handleSendCustomSignal('BATCH')}
                disabled={isSending}
                className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-left hover:border-zinc-500 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">SUMMARY</span>
                  <CheckCircle2 size={12} className="text-[#00ff66]" />
                </div>
                <div className="text-xs font-bold text-zinc-200">
                  ✅ 12 Signals Received
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Next signals batch timer</div>
              </button>
            </div>
          </div>

          <div className="bg-black/60 border border-zinc-800/80 rounded-xl p-3 text-[11px] text-zinc-400 space-y-1">
            <div className="text-[#00ff66] font-bold flex items-center gap-1">
              <ShieldCheck size={13} />
              <span>Direct Linkage Workflow:</span>
            </div>
            <p>1. Our engine decodes SHA-512 hashes from live traffic.</p>
            <p>2. If generated prediction &ge; 2.00x &rarr; Dispatches <b>🟢 BET</b> to Telegram.</p>
            <p>3. If generated prediction &lt; 2.00x &rarr; Dispatches <b>🔴 WAIT</b> to Telegram.</p>
            <p>4. When round finishes &rarr; Dispatches <b>FLEW AWAY! [crash]x</b>.</p>
          </div>
        </div>
      </div>

      {/* 3. Telegram Chat Simulation Feed (As seen in the Video) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#00ff66]" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Live Telegram Dispatch Feed (As shown in video)
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            {feedMessages.length} Messages in Feed
          </span>
        </div>

        {/* Telegram Chat Bubbles Container */}
        <div className="bg-[#0b141a] rounded-2xl p-4 border border-zinc-800/80 max-h-64 overflow-y-auto space-y-2.5 font-sans">
          {feedMessages.map((msg) => {
            const isBet = msg.type === 'bet';
            const isWait = msg.type === 'wait';
            const isFlew = msg.type === 'flew';
            return (
              <div key={msg.id} className="flex justify-start">
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-md border ${
                  isBet
                    ? 'bg-[#0f2e1b] border-[#00ff66]/40 text-white'
                    : isWait
                    ? 'bg-[#2b1111] border-red-500/40 text-white'
                    : 'bg-[#18252d] border-zinc-700/60 text-zinc-200'
                }`}>
                  <div className="flex items-center justify-between gap-4 font-mono">
                    <span className={`font-bold ${isBet ? 'text-[#39ff14]' : isWait ? 'text-red-400' : 'text-zinc-200'}`}>
                      {msg.text}
                    </span>
                    <span className="text-[9px] text-zinc-400 shrink-0">{msg.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mock Telegram Action Buttons Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <div className="bg-[#18252d] border border-zinc-700/60 rounded-xl py-2 px-3 text-center text-xs font-medium text-zinc-300">
            🔑 Login
          </div>
          <div className="bg-[#18252d] border border-zinc-700/60 rounded-xl py-2 px-3 text-center text-xs font-medium text-zinc-300">
            🎮 Open Game
          </div>
          <div className="bg-[#18252d] border border-zinc-700/60 rounded-xl py-2 px-3 text-center text-xs font-medium text-zinc-300 col-span-2 sm:col-span-1">
            📊 Odds History
          </div>
        </div>
      </div>

    </div>
  );
}
