/**
 * telegramClient.js
 * 
 * Frontend helper for Telegram Bot Signal Telemetry & Diagnostics
 * Directly linked to generated Over/Under 2.00x values
 */

const STORAGE_KEY = 'aviator_telegram_config_v1';

export const DEFAULT_TELEGRAM_CONFIG = {
  bot_token: "8996586274:AAEmM5lqjgc6FwDErYt69CwqSqOCPGPSDzw",
  chat_id: "6551286352",
  bot_id: "8996586274",
  bot_name: "Dark 🌐 World",
  bot_username: "darkworlbot",
  enabled: true,
  threshold: 2.00,
  send_flew_away: true,
  send_summary_batch: true,
  batch_interval_rounds: 12,
  include_inline_buttons: true,
  show_timestamps: true,
};

export function loadTelegramConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(saved) };
    }
  } catch (_) {}
  return { ...DEFAULT_TELEGRAM_CONFIG };
}

export function saveTelegramConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (_) {}
}

export function formatSignalText(predictedMultiplier, threshold = 2.00) {
  const mult = typeof predictedMultiplier === 'number' ? predictedMultiplier : parseFloat(predictedMultiplier) || 1.0;
  const isOver = mult >= threshold;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  if (isOver) {
    return {
      text: `🟢 BET - Odds over ${threshold.toFixed(2)}x ${timeStr}`,
      isOver: true,
      badge: 'BET',
      time: timeStr
    };
  } else {
    return {
      text: `🔴 WAIT - Odds under ${threshold.toFixed(2)}x ${timeStr}`,
      isOver: false,
      badge: 'WAIT',
      time: timeStr
    };
  }
}

export function formatFlewAwayText(crashMultiplier) {
  const mult = typeof crashMultiplier === 'number' ? crashMultiplier : parseFloat(crashMultiplier) || 1.0;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return {
    text: `FLEW AWAY! ${mult.toFixed(2)}x ${timeStr}`,
    crashMultiplier: mult,
    time: timeStr
  };
}

export async function sendDirectTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId) {
    return { success: false, error: 'Bot token and Chat ID are required.' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result };
    } else {
      return { success: false, error: `[${data.error_code}] ${data.description}` };
    }
  } catch (err) {
    return { success: false, error: err.message || 'Network error connecting to Telegram' };
  }
}

export async function testTelegramBotProfile(botToken) {
  if (!botToken) return { success: false, error: 'Token is empty.' };
  try {
    const url = `https://api.telegram.org/bot${botToken}/getMe`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.ok) {
      return { success: true, bot: data.result };
    } else {
      return { success: false, error: `[${data.error_code}] ${data.description}` };
    }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to connect to Telegram' };
  }
}
