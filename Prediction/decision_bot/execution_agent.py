"""
Decision Bot: Execution Agent
-----------------------------
Automated decision engine that evaluates live round states against precomputed
predictions, enforces risk-management thresholds, and triggers cash-out actions.
"""

import argparse
import asyncio
import json
import logging
import os
import sqlite3
import sys
import time
import urllib.request
from typing import Dict, Optional

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import websockets
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


LOG_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "logs",
    "runtime_session.log",
)


def setup_logger(log_path: str = LOG_FILE) -> logging.Logger:
    """Configures structured action logger."""
    os.makedirs(os.path.dirname(os.path.abspath(log_path)), exist_ok=True)
    logger = logging.getLogger("DecisionAgent")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    return logger


class ExecutionAgent:
    """Evaluates live events against predictions and executes cashout actions."""

    def __init__(
        self,
        db_path: str = "output/analysis_results.db",
        risk_threshold: float = 0.95,
        min_predicted_mult: float = 1.10,
        api_url: Optional[str] = None,
        auth_token: Optional[str] = None,
        bet_amount: float = 10.0,
    ):
        self.db_path = db_path
        self.risk_threshold = risk_threshold
        self.min_predicted_mult = min_predicted_mult
        self.api_url = api_url
        self.auth_token = auth_token
        self.bet_amount = bet_amount
        self.logger = setup_logger()

        # Session tracking
        self.current_round: Optional[int] = None
        self.predicted_mult: Optional[float] = None
        self.target_cashout: Optional[float] = None
        self.cashed_out_this_round: bool = False
        self.skipped_this_round: bool = False

        self.total_rounds_seen = 0
        self.actions_executed = 0
        self.successful_actions = 0
        self.missed_actions = 0
        self.net_pnl_units = 0.0

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

    def evaluate_new_round(self, round_id: int):
        """Prepares strategy upon round start announcement."""
        self.current_round = round_id
        self.cashed_out_this_round = False
        self.skipped_this_round = False
        self.total_rounds_seen += 1

        self.predicted_mult = self.lookup_prediction(round_id)

        if self.predicted_mult is None:
            self.skipped_this_round = True
            msg = f"⏭️ [Round #{round_id}] No precomputed prediction found. Skipping round."
            print(msg)
            self.logger.warning(msg)
            return

        # Check minimum profitability threshold
        if self.predicted_mult < self.min_predicted_mult:
            self.skipped_this_round = True
            msg = (
                f"🛡️ [Round #{round_id}] Low crash risk (Predicted: {self.predicted_mult:.2f}x < {self.min_predicted_mult:.2f}x). "
                f"Skipping round to protect capital."
            )
            print(msg)
            self.logger.info(msg)
            return

        # Calculate safe target cashout
        self.target_cashout = round(self.predicted_mult * self.risk_threshold, 2)
        # Ensure target is at least 1.01x
        if self.target_cashout < 1.01:
            self.target_cashout = 1.01

        msg = (
            f"🎯 [Round #{round_id}] Predicted: {self.predicted_mult:.2f}x "
            f"| Target Cash-Out: {self.target_cashout:.2f}x (Risk Margin: {(1-self.risk_threshold)*100:.0f}%)"
        )
        print(msg)
        self.logger.info(msg)

    def evaluate_tick(self, current_multiplier: float):
        """Checks if live multiplier reached target cash-out threshold."""
        if self.cashed_out_this_round or self.skipped_this_round:
            return

        if self.target_cashout is not None and current_multiplier >= self.target_cashout:
            self.trigger_cashout(self.current_round, current_multiplier)

    def trigger_cashout(self, round_id: int, multiplier: float):
        """Sends cash-out API request or logs simulated execution."""
        self.cashed_out_this_round = True
        self.actions_executed += 1
        profit = round(self.bet_amount * (multiplier - 1.0), 2)
        self.net_pnl_units += profit
        self.successful_actions += 1

        if self.api_url:
            # Live REST dispatch
            headers = {"Content-Type": "application/json"}
            if self.auth_token:
                headers["Authorization"] = f"Bearer {self.auth_token}"
            payload = json.dumps({"round": round_id, "multiplier": multiplier}).encode("utf-8")

            try:
                if HAS_REQUESTS:
                    resp = requests.post(self.api_url, headers=headers, json={"round": round_id, "multiplier": multiplier}, timeout=2)
                    status_text = f"HTTP {resp.status_code}"
                else:
                    req = urllib.request.Request(self.api_url, data=payload, headers=headers, method="POST")
                    with urllib.request.urlopen(req, timeout=2) as resp:
                        status_text = f"HTTP {resp.status}"
            except Exception as e:
                status_text = f"Dispatch Error: {e}"
        else:
            status_text = "SIMULATED (Sandbox)"

        msg = (
            f"💰 [Round #{round_id}] CASH-OUT EXECUTED at {multiplier:.2f}x "
            f"| Target: {self.target_cashout:.2f}x | Profit: +${profit:.2f} | Mode: {status_text}"
        )
        print(f"\n{msg}")
        self.logger.info(msg)

    def evaluate_crash(self, actual_crash: float):
        """Evaluates round end result."""
        if not self.skipped_this_round and not self.cashed_out_this_round and self.target_cashout is not None:
            # Round crashed before cashout occurred
            self.missed_actions += 1
            loss = self.bet_amount
            self.net_pnl_units -= loss
            msg = (
                f"❌ [Round #{self.current_round}] Crashed early at {actual_crash:.2f}x "
                f"(Target was {self.target_cashout:.2f}x) | Loss: -${loss:.2f}"
            )
            print(f"\n{msg}")
            self.logger.warning(msg)

    def handle_message(self, raw_message: str):
        """Processes live WebSocket message JSON."""
        try:
            data = json.loads(raw_message)
        except json.JSONDecodeError:
            return

        evt_type = data.get("type") or data.get("event") or ""
        round_id = data.get("round") or data.get("index") or data.get("round_id")
        mult = data.get("multiplier") or data.get("value")

        if evt_type in ["round_started", "game_starting", "start", "new_round"]:
            if round_id is not None:
                self.evaluate_new_round(int(round_id))
        elif evt_type in ["tick", "live_update", "update", "tick_update"]:
            if mult is not None:
                self.evaluate_tick(float(mult))
        elif evt_type in ["crashed", "round_ended", "game_over", "crash"]:
            actual = float(mult) if mult is not None else 1.00
            self.evaluate_crash(actual)

    async def run_bot(self, ws_url: str):
        """Starts real-time agent listener loop."""
        if not HAS_WEBSOCKETS:
            print("❌ Error: 'websockets' library is required for decision bot. Run 'pip install websockets'", file=sys.stderr)
            return

        print("=" * 65)
        print("🤖 Automated Decision Bot & Action Engine")
        print("=" * 65)
        print(f"WebSocket Source   : {ws_url}")
        print(f"Risk Threshold     : {self.risk_threshold * 100:.0f}% of predicted crash")
        print(f"Min Crash Filter   : {self.min_predicted_mult:.2f}x")
        print(f"Simulated Bet Base : ${self.bet_amount:.2f}")
        print(f"Action Dispatch API: {self.api_url or 'Sandbox Mode (Local Simulation)'}")
        print("-" * 65)

        while True:
            try:
                async with websockets.connect(ws_url) as ws:
                    print("🟢 Agent connected to game feed. Active & monitoring...\n")
                    async for message in ws:
                        self.handle_message(message)
            except (websockets.ConnectionClosed, ConnectionRefusedError, OSError) as e:
                print(f"⚠️ Feed disconnected ({e}). Reconnecting in 3s...")
                await asyncio.sleep(3)


def main():
    parser = argparse.ArgumentParser(
        description="Run automated decision bot that executes cash-out strategy based on predictions."
    )
    parser.add_argument("--db", type=str, default="output/analysis_results.db", help="Path to SQLite predictions database")
    parser.add_argument("--ws", type=str, default="ws://127.0.0.1:8765", help="WebSocket feed URL (default: ws://127.0.0.1:8765)")
    parser.add_argument("--risk_threshold", type=float, default=0.95, help="Fraction of predicted crash to cash out at (default: 0.95)")
    parser.add_argument("--min_multiplier", type=float, default=1.10, help="Minimum predicted crash to enter round (default: 1.10)")
    parser.add_argument("--api_url", type=str, default=None, help="Optional cash-out API endpoint URL")
    parser.add_argument("--token", type=str, default=None, help="Optional API Authorization Bearer token")
    parser.add_argument("--bet", type=float, default=10.0, help="Unit bet size for PnL tracking (default: 10.0)")

    args = parser.parse_args()

    agent = ExecutionAgent(
        db_path=args.db,
        risk_threshold=args.risk_threshold,
        min_predicted_mult=args.min_multiplier,
        api_url=args.api_url,
        auth_token=args.token,
        bet_amount=args.bet,
    )

    try:
        asyncio.run(agent.run_bot(ws_url=args.ws))
    except KeyboardInterrupt:
        print("\n🛑 Decision Bot stopped by user.")
        print(f"Summary: Rounds Seen: {agent.total_rounds_seen}, Actions: {agent.actions_executed}, Net PnL: ${agent.net_pnl_units:.2f}")


if __name__ == "__main__":
    main()
