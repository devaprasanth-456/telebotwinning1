"""
Monitoring: Live Feed Listener
------------------------------
Connects to real-time WebSocket streams, extracts active round events,
queries precomputed simulation database, and logs live tracking events.
"""

import argparse
import asyncio
import json
import logging
import os
import sqlite3
import sys
from datetime import datetime
from typing import Callable, Optional

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import websockets
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False

try:
    from .state_tracker import RoundStateTracker
except ImportError:
    from state_tracker import RoundStateTracker


LOG_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "logs",
    "runtime_session.log",
)


def setup_logger(log_path: str = LOG_FILE) -> logging.Logger:
    """Configures structured runtime session logger."""
    os.makedirs(os.path.dirname(os.path.abspath(log_path)), exist_ok=True)
    logger = logging.getLogger("CrashLiveFeed")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    return logger


class LiveFeedListener:
    """Listens to live WebSocket game feeds and synchronizes with SQLite simulation outcomes."""

    def __init__(
        self,
        db_path: str = "output/analysis_results.db",
        log_path: str = LOG_FILE,
        on_event_callback: Optional[Callable] = None,
    ):
        self.db_path = db_path
        self.tracker = RoundStateTracker()
        self.logger = setup_logger(log_path)
        self.on_event_callback = on_event_callback
        self.running = False

    def lookup_prediction(self, round_id: int) -> Optional[float]:
        """Queries precomputed outcome from SQLite."""
        if not os.path.exists(self.db_path):
            return None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT predicted_multiplier FROM scenarios WHERE round_id = ?", (round_id,))
            row = cursor.fetchone()
            conn.close()
            return row[0] if row else None
        except Exception:
            return None

    def process_message(self, raw_msg: str):
        """Parses WebSocket payload and updates state / logs."""
        try:
            data = json.loads(raw_msg)
        except json.JSONDecodeError:
            return

        event_type = data.get("type") or data.get("event") or ""
        round_id = data.get("round") or data.get("index") or data.get("round_id")
        mult = data.get("multiplier") or data.get("value")

        now_str = datetime.now().strftime("%H:%M:%S")

        # 1. Round Start Event
        if event_type in ["round_started", "game_starting", "start", "new_round"]:
            if round_id is not None:
                round_num = int(round_id)
                predicted = self.lookup_prediction(round_num)
                self.tracker.on_round_start(round_num, predicted)
                
                pred_text = f"{predicted:.2f}x" if predicted is not None else "⚠️ Not in DB"
                msg = f"🚀 Round #{round_num:,} started — Predicted Crash: {pred_text}"
                print(f"[{now_str}] {msg}")
                self.logger.info(msg)

        # 2. Live Multiplier Tick Event
        elif event_type in ["tick", "live_update", "update", "tick_update"]:
            if mult is not None:
                cur_val = float(mult)
                self.tracker.on_tick(cur_val)
                # Print progress update
                pred = self.tracker.predicted_multiplier
                target_str = f" | Predicted: {pred:.2f}x" if pred else ""
                # Print single-line overwrite tick or periodic tick
                if cur_val % 0.5 < 0.05 or cur_val < 1.20:
                    print(f"[{now_str}] 📈 Tick: {cur_val:.2f}x{target_str}", end="\r")

        # 3. Crash Event
        elif event_type in ["crashed", "round_ended", "game_over", "crash"]:
            actual_crash = float(mult) if mult is not None else self.tracker.current_multiplier
            summary = self.tracker.on_crash(actual_crash)
            
            match_icon = "✅ Exact Match" if summary["matched"] else "⚠️ Variance"
            diff_text = f"(Diff: {summary['difference']:.2f}x)" if summary['difference'] is not None else ""
            msg = (
                f"💥 Round #{summary['round_id']} Crashed at {actual_crash:.2f}x "
                f"| Pred: {summary['predicted']}x | {match_icon} {diff_text} | Duration: {summary['elapsed_seconds']}s"
            )
            print(f"\n[{now_str}] {msg}")
            self.logger.info(msg)

        if self.on_event_callback:
            self.on_event_callback(data, self.tracker.get_status_dict())

    async def listen(self, ws_url: str, auth_token: Optional[str] = None):
        """Main async connection loop with auto-reconnect."""
        if not HAS_WEBSOCKETS:
            print("❌ Error: 'websockets' library is required for live monitoring. Run 'pip install websockets'", file=sys.stderr)
            return

        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        print("=" * 65)
        print("📡 Live Feed Observer & Real-Time Matcher")
        print("=" * 65)
        print(f"WebSocket URL : {ws_url}")
        print(f"Database Path : {self.db_path}")
        print(f"Log Output    : {LOG_FILE}")
        print("-" * 65)

        self.running = True
        while self.running:
            try:
                print(f"Connecting to {ws_url}...")
                async with websockets.connect(ws_url, extra_headers=headers) as ws:
                    print("🟢 Connected to live game feed. Listening for events...\n")
                    self.logger.info(f"Connected to live stream: {ws_url}")
                    async for message in ws:
                        if not self.running:
                            break
                        self.process_message(message)
            except (websockets.ConnectionClosed, ConnectionRefusedError, OSError) as err:
                print(f"⚠️ Stream disconnected ({err}). Reconnecting in 3s...")
                await asyncio.sleep(3)
            except Exception as e:
                print(f"❌ Unexpected WebSocket error: {e}")
                await asyncio.sleep(3)


def main():
    parser = argparse.ArgumentParser(
        description="Listen to live crash game WebSocket feed and match against simulated outcomes."
    )
    parser.add_argument("--ws", type=str, required=True, help="WebSocket URL (e.g., wss://game.com/ws or ws://127.0.0.1:8765)")
    parser.add_argument("--db", type=str, default="output/analysis_results.db", help="Path to precomputed SQLite database")
    parser.add_argument("--token", type=str, default=None, help="Optional authentication bearer token")

    args = parser.parse_args()

    listener = LiveFeedListener(db_path=args.db)
    try:
        asyncio.run(listener.listen(ws_url=args.ws, auth_token=args.token))
    except KeyboardInterrupt:
        print("\n🛑 Observer stopped by user.")


if __name__ == "__main__":
    main()
