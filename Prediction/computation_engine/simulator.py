"""
Computation Engine: Batch Simulator
------------------------------------
Precomputes large batches of future deterministic scenarios into an indexed
SQLite database (analysis_results.db) for sub-millisecond query lookups.
"""

import argparse
import os
import sqlite3
import sys
import time
from typing import Dict, List, Optional, Tuple

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from .hasher import compute_outcome_tuple, compute_outcome
except ImportError:
    from hasher import compute_outcome_tuple, compute_outcome


class BatchSimulator:
    """Simulates large batches of provably fair outcomes and persists them to SQLite."""

    def __init__(self, db_path: str = "output/analysis_results.db"):
        self.db_path = db_path
        self._ensure_db_dir()
        self._init_schema()

    def _ensure_db_dir(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)

    def _init_schema(self):
        """Initializes table schema and optimized indexes."""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scenarios (
                    round_id INTEGER PRIMARY KEY,
                    predicted_multiplier REAL NOT NULL,
                    int_32bit INTEGER NOT NULL,
                    hex_32bit TEXT NOT NULL,
                    hash_signature TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_mult ON scenarios(predicted_multiplier);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_round ON scenarios(round_id);")
            conn.commit()
        finally:
            conn.close()

    def simulate_batch(
        self,
        server_hash: str,
        client_entropy: str,
        rounds: int = 100000,
        start_round: int = 1,
        batch_size: int = 10000,
        overwrite: bool = True,
    ) -> Dict:
        """
        Executes high-throughput precomputation and bulk writes to SQLite.
        """
        print("=" * 65)
        print("⚡ Provably Fair Cryptographic Simulator")
        print("=" * 65)
        print(f"Server Seed Hash : {server_hash}")
        print(f"Client Entropy   : {client_entropy}")
        print(f"Total Scenarios  : {rounds:,} (Rounds {start_round:,} to {start_round + rounds - 1:,})")
        print(f"Target Database  : {self.db_path}")
        print("-" * 65)

        start_time = time.perf_counter()

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Performance tuning pragmas for high speed bulk insertion
        cursor.execute("PRAGMA synchronous = OFF;")
        cursor.execute("PRAGMA journal_mode = MEMORY;")

        if overwrite:
            cursor.execute("DELETE FROM scenarios;")
            conn.commit()

        insert_sql = """
            INSERT OR REPLACE INTO scenarios 
            (round_id, predicted_multiplier, int_32bit, hex_32bit, hash_signature) 
            VALUES (?, ?, ?, ?, ?);
        """

        current_batch: List[Tuple] = []
        total_inserted = 0
        multipliers_sample = []

        for r_id in range(start_round, start_round + rounds):
            record = compute_outcome_tuple(server_hash, client_entropy, r_id)
            current_batch.append(record)
            
            # Keep sample for summary metrics
            if len(multipliers_sample) < 50000:
                multipliers_sample.append(record[1])

            if len(current_batch) >= batch_size:
                cursor.executemany(insert_sql, current_batch)
                conn.commit()
                total_inserted += len(current_batch)
                current_batch.clear()

        if current_batch:
            cursor.executemany(insert_sql, current_batch)
            conn.commit()
            total_inserted += len(current_batch)
            current_batch.clear()

        conn.close()

        elapsed = time.perf_counter() - start_time
        speed = total_inserted / elapsed if elapsed > 0 else 0

        # Summary statistics
        min_m = min(multipliers_sample) if multipliers_sample else 0
        max_m = max(multipliers_sample) if multipliers_sample else 0
        avg_m = sum(multipliers_sample) / len(multipliers_sample) if multipliers_sample else 0
        sorted_m = sorted(multipliers_sample)
        med_m = sorted_m[len(sorted_m) // 2] if sorted_m else 0
        sub_2x = (sum(1 for m in multipliers_sample if m < 2.00) / len(multipliers_sample)) * 100 if multipliers_sample else 0

        print(f"✅ Successfully simulated & stored {total_inserted:,} scenarios in {elapsed:.3f}s ({speed:,.0f} rounds/sec).")
        print("\n📊 Batch Summary Metrics:")
        print(f"  • Min Multiplier    : {min_m:.2f}x")
        print(f"  • Max Multiplier    : {max_m:.2f}x")
        print(f"  • Mean Multiplier   : {avg_m:.2f}x")
        print(f"  • Median Multiplier : {med_m:.2f}x")
        print(f"  • Sub-2.00x Rounds  : {sub_2x:.2f}% (Theoretical: ~50.0%)")
        print("=" * 65)

        return {
            "total_inserted": total_inserted,
            "elapsed_seconds": elapsed,
            "speed_rounds_per_sec": speed,
            "min_multiplier": min_m,
            "max_multiplier": max_m,
            "mean_multiplier": avg_m,
            "median_multiplier": med_m,
            "sub_2x_percent": sub_2x,
        }

    @staticmethod
    def get_prediction(db_path: str, round_id: int) -> Optional[float]:
        """Queries a single round's predicted multiplier directly from SQLite."""
        if not os.path.exists(db_path):
            return None
        conn = sqlite3.connect(db_path)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT predicted_multiplier FROM scenarios WHERE round_id = ?", (round_id,))
            row = cursor.fetchone()
            return row[0] if row else None
        finally:
            conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="Precompute future provably fair crash multipliers into SQLite."
    )
    parser.add_argument("--server_hash", type=str, required=True, help="Server seed or seed hash")
    parser.add_argument("--client_entropy", type=str, default="public_client_seed", help="Client entropy string")
    parser.add_argument("--rounds", type=int, default=100000, help="Number of rounds to precompute (default: 100000)")
    parser.add_argument("--start_round", type=int, default=1, help="Starting round ID (default: 1)")
    parser.add_argument("--db", type=str, default="output/analysis_results.db", help="SQLite database path")
    parser.add_argument("--append", action="store_true", help="Append without clearing existing records")

    args = parser.parse_args()

    simulator = BatchSimulator(db_path=args.db)
    simulator.simulate_batch(
        server_hash=args.server_hash,
        client_entropy=args.client_entropy,
        rounds=args.rounds,
        start_round=args.start_round,
        overwrite=not args.append,
    )


if __name__ == "__main__":
    main()
