# 🌐 24/7 Cloud Deployment Guide (Runs Even When PC Is Turned Off)

To keep the **Lucky Jet Verifier, AI Models, and Telegram Bot** running **24 hours a day, 7 days a week — even when your computer is completely powered off or disconnected from the internet** — you can deploy this project to a free cloud hosting provider such as **Render.com** or **Railway.app**.

---

## 🚀 Option 1: Deploy on Render.com (Recommended & Free)

### Step 1: Push latest code to GitHub
Run the following in your local repository terminal:
```bash
git add .
git commit -m "Configure 24/7 autonomous cloud engine"
git push origin main
```

### Step 2: Create Web Service on Render
1. Visit [Render.com](https://render.com) and log in with your GitHub account.
2. Click **New +** ➔ **Web Service**.
3. Select your repository: `telebotwinning1` (or `devaprasanth-456/telebotwinning1`).
4. Set the following settings:
   - **Name**: `lucky-jet-autonomous-bot`
   - **Region**: Choose the closest region (e.g., Singapore or Frankfurt)
   - **Branch**: `main`
   - **Runtime**: **Docker** (Render will automatically detect `Dockerfile` and `render.yaml`)
   - **Instance Type**: **Free**
5. Click **Create Web Service**.

### Step 3: Done!
- Render will build the container with Python, Node.js, and all dependencies.
- It will automatically launch `start_automation.py`.
- **The bot, live verifier, and AI models will now run 24/7 in the cloud**, recording rounds into `newverification.csv`, evolving AI models, and broadcasting signals to Telegram **even when your local PC is turned off**!

---

## 🚂 Option 2: Deploy on Railway.app

1. Visit [Railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** ➔ **Deploy from GitHub repo**.
3. Select `devaprasanth-456/telebotwinning1`.
4. Railway will automatically build the `Dockerfile` and start `start_automation.py`.

---

## 💻 Local Windows Auto-Startup (When PC Is On)

Whenever you use your PC, you can ensure the system boots up immediately in the background:
1. Double-click `install-auto-startup.bat`.
2. It installs `start-background.vbs` into your Windows Startup folder.
3. Every time your computer turns on, all services run silently in the background.
