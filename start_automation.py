#!/usr/bin/env python3
"""
Master Autonomous Supervisor & 24/7 Pipeline for Lucky Jet
------------------------------------------------------------
Orchestrates:
1. Live Gateway Verifier & Data Ingest (Writes to newverification.csv)
2. Continuous Multi-Model AI Evolution Engine (Watches newverification.csv & updates models)
3. Telegram Signal Bot & Cyber Dashboard Web Server
4. Auto-Recovery & Process Watchdog (Auto-restarts any crashed subsystem)
"""

import os
import sys
import time
import subprocess
import atexit
from datetime import datetime

# Ensure UTF-8 console output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, "bot_background.log")

PROCESSES = {}

def log(message):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    formatted = f"[{ts}] {message}"
    print(formatted, flush=True)
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(formatted + "\n")
    except Exception:
        pass

def start_process(name, command_args):
    log(f"🚀 [Supervisor] Launching {name}...")
    try:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        
        # Open log file handle for appending child output
        log_fh = open(LOG_FILE, 'a', encoding='utf-8')
        
        proc = subprocess.Popen(
            command_args,
            cwd=BASE_DIR,
            stdout=log_fh,
            stderr=subprocess.STDOUT,
            env=env
        )
        PROCESSES[name] = {
            "proc": proc,
            "cmd": command_args,
            "log_fh": log_fh,
            "restarts": 0
        }
        log(f"✅ [Supervisor] {name} active (PID: {proc.pid})")
        return proc
    except Exception as e:
        log(f"❌ [Supervisor] Failed to launch {name}: {e}")
        return None

def cleanup():
    log("🛑 [Supervisor] Terminating all background services...")
    for name, item in PROCESSES.items():
        proc = item.get("proc")
        if proc and proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                pass
    time.sleep(1)
    for name, item in PROCESSES.items():
        proc = item.get("proc")
        if proc and proc.poll() is None:
            try:
                proc.kill()
            except Exception:
                pass
        fh = item.get("log_fh")
        if fh and not fh.closed:
            try:
                fh.close()
            except Exception:
                pass
    log("👋 [Supervisor] All services stopped cleanly.")

atexit.register(cleanup)

def main():
    log("=" * 70)
    log("⚡ LUCKY JET AUTONOMOUS 24/7 PREDICTOR & AI EVOLUTION ENGINE")
    log("=" * 70)
    log("▶ 1. Live Data Ingest & Verifier  -> newverification.csv")
    log("▶ 2. Multi-Model Continuous AI   -> ai_evolution_state.json")
    log("▶ 3. Real-Time Telegram Signal Bot -> Port 3000 & @darkworlbot")
    log("▶ 4. Auto-Supervision Watchdog    -> 24/7 Zero Manual Work")
    log("=" * 70)

    # 1. Start Continuous Multi-Model AI Evolution Engine
    start_process(
        "AI_Evolution_Daemon",
        [sys.executable, os.path.join(BASE_DIR, "xgboost_lucky_jet.py"), "--continuous", "--interval", "4"]
    )

    # 2. Start Live Verifier Ingester (Writing to newverification.csv)
    start_process(
        "Live_Verifier_Ingest",
        [sys.executable, os.path.join(BASE_DIR, "lucky_jet_verifier.py"), "newverification.csv"]
    )

    # 3. Start Telegram Bot & Cyber Web Service
    node_cmd = "node"
    start_process(
        "Telegram_Bot_Service",
        [node_cmd, os.path.join(BASE_DIR, "telegram-bot.cjs")]
    )

    log("🎯 All automation processes launched and running. Starting watchdog loop...")

    # Watchdog loop
    while True:
        try:
            for name, item in list(PROCESSES.items()):
                proc = item.get("proc")
                if proc and proc.poll() is not None:
                    code = proc.poll()
                    item["restarts"] += 1
                    log(f"⚠️ [Supervisor] {name} exited with code {code}. Auto-recovering in 3s (Restart #{item['restarts']})...")
                    time.sleep(3)
                    start_process(name, item["cmd"])

            time.sleep(5)
        except KeyboardInterrupt:
            log("Received exit signal from user.")
            break
        except Exception as e:
            log(f"⚠️ [Supervisor Loop Error]: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
