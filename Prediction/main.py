#!/usr/bin/env python3
"""
Provably Fair Crash Predictor & Simulation Pipeline Orchestrator
---------------------------------------------------------------
Central CLI and execution pipeline integrating:
- Phase 1: Data Acquisition (data_sources)
- Phase 2: Scenario Simulation (computation_engine)
- Phase 3: Real-Time Live Monitoring (monitoring)
- Phase 4: Automated Decision Execution (decision_bot)
- Phase 5: Statistical Validation & Auditing (utilities)
"""

import argparse
import asyncio
import os
import sys
import time

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_sources.fetcher import StateFetcher
from computation_engine.simulator import BatchSimulator
from monitoring.live_feed_listener import LiveFeedListener
from monitoring.replay import SandboxReplayer
from decision_bot.execution_agent import ExecutionAgent
from utilities.export_csv import export_sqlite_to_csv
from utilities.distribution_analyzer import DistributionAnalyzer


def cmd_simulate(args):
    """Executes scenario simulation into SQLite."""
    sim = BatchSimulator(db_path=args.db)
    sim.simulate_batch(
        server_hash=args.server_hash,
        client_entropy=args.client_entropy,
        rounds=args.rounds,
        start_round=args.start_round,
        overwrite=not args.append,
    )


def cmd_fetch(args):
    """Fetches public state and seeds from endpoint."""
    fetcher = StateFetcher()
    fetcher.fetch_state(
        url=args.url,
        override_client_entropy=args.client_seed,
        save_to_cache=not args.no_save,
    )


def cmd_monitor(args):
    """Starts live WebSocket feed listener."""
    listener = LiveFeedListener(db_path=args.db)
    try:
        asyncio.run(listener.listen(ws_url=args.ws, auth_token=args.token))
    except KeyboardInterrupt:
        print("\n🛑 Monitor stopped.")


def cmd_agent(args):
    """Starts automated decision bot."""
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
        print("\n🛑 Decision agent stopped.")


def cmd_replay(args):
    """Replays rounds or starts mock WebSocket server."""
    replayer = SandboxReplayer(db_path=args.db)
    speed_val = 1.0
    try:
        speed_val = float(args.speed.lower().replace("x", ""))
    except ValueError:
        pass

    if args.serve:
        asyncio.run(replayer.start_ws_server(port=args.port, start_round=args.start_round, count=args.count, speed=speed_val))
    else:
        asyncio.run(replayer.run_replay_loop(start_round=args.start_round, count=args.count, speed=speed_val))


def cmd_analyze(args):
    """Runs statistical distribution audit."""
    analyzer = DistributionAnalyzer(db_path=args.db if not args.csv else None, csv_path=args.csv)
    analyzer.run_full_analysis()


def cmd_export(args):
    """Exports SQLite records to CSV."""
    export_sqlite_to_csv(
        db_path=args.db,
        output_csv=args.output,
        limit=args.limit,
        min_multiplier=args.min_multiplier,
    )


async def run_end_to_end_sandbox(test_db: str = "output/analysis_results.db", rounds: int = 20, speed: float = 4.0):
    """Runs complete end-to-end sandbox pipeline with mock server and decision bot."""
    print("=" * 70)
    print("🚀 PROVABLY FAIR PIPELINE: END-TO-END SANDBOX SIMULATION")
    print("=" * 70)

    # 1. Simulate outcomes
    print("\n[Step 1/4] Precomputing 1,000 synthetic test rounds into SQLite...")
    sim = BatchSimulator(db_path=test_db)
    sim.simulate_batch(
        server_hash="sandbox_server_seed_987654321",
        client_entropy="sandbox_client_entropy_abc",
        rounds=1000,
        start_round=1,
        overwrite=True,
    )

    # 2. Run statistical check
    print("\n[Step 2/4] Executing Statistical Distribution Audit...")
    analyzer = DistributionAnalyzer(db_path=test_db)
    analyzer.run_full_analysis()

    # 3. Launch mock stream and decision bot
    print(f"\n[Step 3/4] Launching Local Game Stream & Decision Agent ({rounds} rounds at {speed}x)...")
    replayer = SandboxReplayer(db_path=test_db)
    agent = ExecutionAgent(
        db_path=test_db,
        risk_threshold=0.95,
        min_predicted_mult=1.15,
        bet_amount=10.0,
    )

    # Hook replayer events directly to agent and logger for fast sandbox execution
    scenarios = replayer.fetch_scenarios(start_round=1, limit=rounds)
    for sc in scenarios:
        r_id = sc["round_id"]
        crash_m = sc["multiplier"]
        
        # Announce
        start_evt = json_str = f'{{"type": "round_started", "round": {r_id}}}'
        agent.handle_message(start_evt)
        
        # Ticks
        cur_m = 1.00
        step_increment = 0.01
        while cur_m < crash_m:
            cur_m = round(cur_m + step_increment, 2)
            if cur_m >= crash_m:
                break
            tick_evt = f'{{"type": "tick", "round": {r_id}, "multiplier": {cur_m:.2f}}}'
            agent.handle_message(tick_evt)
            
            # Dynamic tick acceleration
            step_increment = max(0.01, round(cur_m * 0.03, 2))
            await asyncio.sleep(0.01 / speed)

        # Crash
        crash_evt = f'{{"type": "crashed", "round": {r_id}, "multiplier": {crash_m:.2f}}}'
        agent.handle_message(crash_evt)
        await asyncio.sleep(0.05 / speed)

    # 4. Final summary
    print("\n" + "=" * 70)
    print("🏁 [Step 4/4] Sandbox Session Final Summary:")
    print(f"  • Total Rounds Tracked : {agent.total_rounds_seen}")
    print(f"  • Actions Executed     : {agent.actions_executed}")
    print(f"  • Successful Cashouts  : {agent.successful_actions}")
    print(f"  • Missed / Crashed     : {agent.missed_actions}")
    print(f"  • Net Simulated PnL    : +${agent.net_pnl_units:.2f} (ROI: {(agent.net_pnl_units / (agent.total_rounds_seen * agent.bet_amount)) * 100:.1f}%)")
    print("=" * 70)


def cmd_pipeline(args):
    """Executes automated end-to-end sandbox pipeline."""
    speed_val = 4.0
    try:
        speed_val = float(args.speed.lower().replace("x", ""))
    except ValueError:
        pass
    asyncio.run(run_end_to_end_sandbox(test_db=args.db, rounds=args.rounds, speed=speed_val))


def main():
    parser = argparse.ArgumentParser(
        description="Provably Fair Crash Predictor & Simulation Pipeline Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Available pipeline modules")

    # Simulate
    p_sim = subparsers.add_parser("simulate", help="Precompute batch outcomes into SQLite DB")
    p_sim.add_argument("--server_hash", type=str, required=True, help="Server seed or hash")
    p_sim.add_argument("--client_entropy", type=str, default="public_client_seed", help="Client entropy string")
    p_sim.add_argument("--rounds", type=int, default=100000, help="Rounds to generate (default: 100000)")
    p_sim.add_argument("--start_round", type=int, default=1, help="Starting round index")
    p_sim.add_argument("--db", type=str, default="output/analysis_results.db", help="SQLite database output path")
    p_sim.add_argument("--append", action="store_true", help="Append without clearing DB")
    p_sim.set_defaults(func=cmd_simulate)

    # Fetch
    p_fetch = subparsers.add_parser("fetch", help="Extract seed and state variables from API endpoint")
    p_fetch.add_argument("--url", type=str, required=True, help="Endpoint URL to query")
    p_fetch.add_argument("--client_seed", type=str, default=None, help="Optional client seed override")
    p_fetch.add_argument("--no_save", action="store_true", help="Do not save extracted seed to cache")
    p_fetch.set_defaults(func=cmd_fetch)

    # Monitor
    p_mon = subparsers.add_parser("monitor", help="Listen to live WebSocket stream and match predictions")
    p_mon.add_argument("--ws", type=str, default="ws://127.0.0.1:8765", help="WebSocket feed URL")
    p_mon.add_argument("--db", type=str, default="output/analysis_results.db", help="SQLite database path")
    p_mon.add_argument("--token", type=str, default=None, help="Optional bearer token")
    p_mon.set_defaults(func=cmd_monitor)

    # Agent
    p_agent = subparsers.add_parser("agent", help="Launch automated decision bot")
    p_agent.add_argument("--ws", type=str, default="ws://127.0.0.1:8765", help="WebSocket feed URL")
    p_agent.add_argument("--db", type=str, default="output/analysis_results.db", help="SQLite database path")
    p_agent.add_argument("--risk_threshold", type=float, default=0.95, help="Risk cashout factor (default: 0.95)")
    p_agent.add_argument("--min_multiplier", type=float, default=1.10, help="Minimum crash filter threshold")
    p_agent.add_argument("--api_url", type=str, default=None, help="Cashout API POST URL")
    p_agent.add_argument("--token", type=str, default=None, help="API bearer auth token")
    p_agent.add_argument("--bet", type=float, default=10.0, help="Bet unit size for PnL tracking")
    p_agent.set_defaults(func=cmd_agent)

    # Replay
    p_rep = subparsers.add_parser("replay", help="Replay rounds or start mock WebSocket server")
    p_rep.add_argument("--db", type=str, default="output/analysis_results.db", help="SQLite database path")
    p_rep.add_argument("--start_round", type=int, default=1, help="Starting round index")
    p_rep.add_argument("--count", type=int, default=50, help="Number of rounds to replay")
    p_rep.add_argument("--speed", type=str, default="2x", help="Replay speed multiplier")
    p_rep.add_argument("--serve", action="store_true", help="Start local mock WebSocket server on port 8765")
    p_rep.add_argument("--port", type=int, default=8765, help="Port for mock WebSocket server")
    p_rep.set_defaults(func=cmd_replay)

    # Analyze
    p_ana = subparsers.add_parser("analyze", help="Run statistical and Chi-square distribution tests")
    p_ana.add_argument("--db", type=str, default="output/analysis_results.db", help="SQLite database path")
    p_ana.add_argument("--csv", type=str, default=None, help="CSV dataset path")
    p_ana.set_defaults(func=cmd_analyze)

    # Export
    p_exp = subparsers.add_parser("export", help="Export SQLite simulation records to CSV")
    p_exp.add_argument("--db", type=str, default="output/analysis_results.db", help="SQLite database path")
    p_exp.add_argument("--output", type=str, default="output/scenarios.csv", help="Output CSV path")
    p_exp.add_argument("--limit", type=int, default=None, help="Row limit")
    p_exp.add_argument("--min_multiplier", type=float, default=None, help="Filter minimum multiplier")
    p_exp.set_defaults(func=cmd_export)

    # Pipeline
    p_pipe = subparsers.add_parser("pipeline", help="Run full automated sandbox simulation pipeline")
    p_pipe.add_argument("--db", type=str, default="output/analysis_results.db", help="SQLite database path")
    p_pipe.add_argument("--rounds", type=int, default=20, help="Number of test rounds to simulate")
    p_pipe.add_argument("--speed", type=str, default="4x", help="Simulation speed")
    p_pipe.set_defaults(func=cmd_pipeline)

    args = parser.parse_args()
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
