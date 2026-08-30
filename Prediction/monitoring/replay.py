"""
Monitoring: Sandbox Replayer & Mock Game Stream Server
------------------------------------------------------
Simulates active crash game sessions from SQLite scenarios.
Can replay in terminal or run a local mock WebSocket server (ws://127.0.0.1:8765)
for testing the live feed observer and decision bot without external network dependencies.
"""

import argparse
import asyncio
import json
import math
import os
import sqlite3
import sys
import time
from typing import List, Optional, Set

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import websockets
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False


class SandboxReplayer:
    """Replays precomputed rounds and broadcasts realistic crash game feeds."""

    def __init__(self, db_path: str = "output/analysis_results.db"):
        self.db_path = db_path
        self.connected_clients: Set = set()

    def fetch_scenarios(self, start_round: int = 1, limit: int = 50) -> List[dict]:
        """Loads scenarios from the SQLite database."""
        if not os.path.exists(self.db_path):
            raise FileNotFoundError(f"Database not found at {self.db_path}. Please run simulation first.")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT round_id, predicted_multiplier, hex_32bit FROM scenarios WHERE round_id >= ? ORDER BY round_id ASC LIMIT ?",
            (start_round, limit),
        )
        rows = cursor.fetchall()
        conn.close()

        return [{"round_id": r[0], "multiplier": r[1], "hex": r[2]} for r in rows]

    async def broadcast_event(self, event_data: dict):
        """Sends a JSON event to all connected WebSocket clients."""
        if self.connected_clients:
            msg = json.dumps(event_data)
            await asyncio.gather(
                *[client.send(msg) for client in list(self.connected_clients)],
                return_exceptions=True,
            )

    async def simulate_round(self, round_data: dict, speed_factor: float = 1.0):
        """Simulates a single crash round with incremental tick progression."""
        round_id = round_data["round_id"]
        crash_point = round_data["multiplier"]

        # Phase 1: Round Announced
        start_evt = {
            "type": "round_started",
            "round": round_id,
            "index": round_id,
            "status": "starting",
            "timestamp": time.time(),
        }
        await self.broadcast_event(start_evt)
        print(f"\n🚀 [Round #{round_id}] Started (Simulated Crash: {crash_point:.2f}x)")

        # Countdown delay
        await asyncio.sleep(max(0.2, 1.0 / speed_factor))

        # Phase 2: Live Multiplier Rising
        cur_mult = 1.00
        step_time = 0.05 / speed_factor
        step_increment = 0.01

        while cur_mult < crash_point:
            tick_evt = {
                "type": "tick",
                "round": round_id,
                "multiplier": round(cur_mult, 2),
                "status": "in_progress",
            }
            await self.broadcast_event(tick_evt)
            print(f"  📈 Multiplier: {cur_mult:.2f}x", end="\r")

            cur_mult = round(cur_mult + step_increment, 2)
            step_increment = max(0.01, round(cur_mult * 0.03, 2))
            await asyncio.sleep(step_time)

        # Phase 3: Crashed
        crash_evt = {
            "type": "crashed",
            "round": round_id,
            "multiplier": crash_point,
            "status": "crashed",
            "timestamp": time.time(),
        }
        await self.broadcast_event(crash_evt)
        print(f"  💥 [Round #{round_id}] Crashed at {crash_point:.2f}x!")

        # Cooldown before next round
        await asyncio.sleep(max(0.3, 1.5 / speed_factor))

    async def run_replay_loop(self, start_round: int = 1, count: int = 50, speed: float = 1.0):
        """Main replay sequence."""
        scenarios = self.fetch_scenarios(start_round=start_round, limit=count)
        if not scenarios:
            print("⚠️ No scenarios found in database for the given range.")
            return

        print(f"🎬 Starting sandbox replay of {len(scenarios)} rounds at {speed}x speed...")
        for scenario in scenarios:
            await self.simulate_round(scenario, speed_factor=speed)

        print("\n🏁 Sandbox replay completed.")

    async def start_ws_server(self, host: str = "127.0.0.1", port: int = 8765, start_round: int = 1, count: int = 100, speed: float = 2.0):
        """Starts WebSocket broadcast server for external listeners/agents."""
        if not HAS_WEBSOCKETS:
            print("❌ Error: 'websockets' library is required to run mock server.", file=sys.stderr)
            return

        async def handler(websocket):
            self.connected_clients.add(websocket)
            client_ip = getattr(websocket, "remote_address", "unknown")
            print(f"\n🔗 New client connected: {client_ip}")
            try:
                await websocket.wait_closed()
            finally:
                self.connected_clients.remove(websocket)
                print(f"\n🔌 Client disconnected: {client_ip}")

        print("=" * 65)
        print("🎮 Provably Fair Mock Game Stream Server (Sandbox)")
        print("=" * 65)
        print(f"Server URL    : ws://{host}:{port}")
        print(f"Database Source: {self.db_path}")
        print(f"Speed Factor  : {speed}x")
        print("-" * 65)

        async with websockets.serve(handler, host, port):
            print(f"🟢 Mock WebSocket server listening on ws://{host}:{port}")
            # Run the replay loop concurrently
            await self.run_replay_loop(start_round=start_round, count=count, speed=speed)


def main():
    parser = argparse.ArgumentParser(
        description="Replay simulated crash rounds or run a local mock WebSocket game server."
    )
    parser.add_argument("--db", type=str, default="output/analysis_results.db", help="Path to SQLite database")
    parser.add_argument("--start_round", type=int, default=1, help="Starting round ID (default: 1)")
    parser.add_argument("--count", type=int, default=50, help="Number of rounds to replay (default: 50)")
    parser.add_argument("--speed", type=str, default="2x", help="Playback speed (e.g. 1x, 2x, 5x, 10x)")
    parser.add_argument("--serve", action="store_true", help="Start local WebSocket server on port 8765")
    parser.add_argument("--port", type=int, default=8765, help="Port for WebSocket server (default: 8765)")

    args = parser.parse_args()

    speed_val = 1.0
    try:
        speed_val = float(args.speed.lower().replace("x", ""))
    except ValueError:
        pass

    replayer = SandboxReplayer(db_path=args.db)

    try:
        if args.serve:
            asyncio.run(replayer.start_ws_server(port=args.port, start_round=args.start_round, count=args.count, speed=speed_val))
        else:
            asyncio.run(replayer.run_replay_loop(start_round=args.start_round, count=args.count, speed=speed_val))
    except KeyboardInterrupt:
        print("\n🛑 Replay terminated by user.")


if __name__ == "__main__":
    main()
