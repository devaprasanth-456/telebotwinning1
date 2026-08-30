# Darkworld Aviator & Lucky Jet Telegram Bot (24/7 Render Deployment)

High-Precision Telegram Signal Bot synchronized with live game WebSocket lifecycle stream and autonomous stochastic fallback engine.

---

## 🚀 Render.com 1-Click Deployment Guide

Follow these steps to deploy your bot on Render so it runs 24/7 without getting stuck or timing out:

### 1. Push Code to GitHub
Ensure all files are committed and pushed to your repository:
```bash
git add .
git commit -m "Fix Render port check and telegram bot 24/7 watchdog"
git push origin main
```

### 2. Create a Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Select your repository (`telebotwinning`).
4. Configure the following settings:
   - **Name**: `darkworld-telegram-bot`
   - **Region**: Any (e.g. Frankfurt / Singapore / Oregon)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node telegram-bot.cjs`
   - **Instance Type**: `Free`

### 3. Set Environment Variables on Render
Under the **Environment Variables** section in Render, add:
| Key | Recommended Value | Description |
|-----|-------------------|-------------|
| `PORT` | `10000` | Port for Render HTTP health checks |
| `BOT_TOKEN` | `8996586274:AAEmM5lqjgc6FwDErYt69CwqSqOCPGPSDzw` | Your Telegram Bot Token |
| `CHAT_ID` | `6551286352` | Your default Chat ID |
| `RENDER_EXTERNAL_URL` | `https://your-service-name.onrender.com` | (Optional) Used for self-ping keepalive |

### 4. Health Check Path
Under **Advanced Settings**:
- **Health Check Path**: `/health`

Click **Create Web Service**. Render will deploy your bot and verify the `/health` endpoint.

---

## 💓 Keeping Render Free Tier Awake 24/7 (Prevent Sleeping)

Render Free Web Services go to sleep after 15 minutes of inactivity. To keep your bot running 24/7 without interruption:
1. Go to [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) (100% Free).
2. Create a monitor with:
   - **URL**: `https://your-service-name.onrender.com/health`
   - **Interval**: Every 5 or 10 minutes.
   - **Method**: `GET`
3. This sends an HTTP request every 5–10 minutes, keeping your Render service active 24/7!

---

## ⚡ Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Subscribe and activate live predictions |
| `/stop` | Pause predictions |
| `/status` or `/ping` | Check bot uptime, engine mode, subscriber count & gateway health |
| `/test` | Trigger an immediate diagnostic prediction test |
| `/threshold <val>` | Change the signal threshold (e.g., `/threshold 2.00`) |
| `/token <jwt>` | Update live game token dynamically without restarting |

---

## 🌐 Built-in Web Status Dashboard
Once deployed, open `https://your-app.onrender.com/` in your browser to view the real-time cyber status dashboard showing live logs, engine mode, uptime, and subscriber count.
