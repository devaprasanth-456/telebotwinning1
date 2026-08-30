"""
Utilities: SQLite to CSV Exporter
---------------------------------
Exports precomputed simulation datasets from SQLite to CSV format for
external auditing, spreadsheet analysis, or backup storage.
"""

import argparse
import csv
import os
import sqlite3
import sys
import time

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def export_sqlite_to_csv(
    db_path: str = "output/analysis_results.db",
    output_csv: str = "output/scenarios.csv",
    limit: int = None,
    min_multiplier: float = None,
    chunk_size: int = 10000,
) -> int:
    """Streams data from SQLite database to a CSV file."""
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found: {db_path}")

    os.makedirs(os.path.dirname(os.path.abspath(output_csv)), exist_ok=True)

    start_time = time.perf_counter()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    query = "SELECT round_id, predicted_multiplier, int_32bit, hex_32bit, hash_signature, created_at FROM scenarios"
    conditions = []
    params = []

    if min_multiplier is not None:
        conditions.append("predicted_multiplier >= ?")
        params.append(min_multiplier)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY round_id ASC"

    if limit is not None:
        query += f" LIMIT {limit}"

    cursor.execute(query, params)

    fieldnames = ["round_id", "predicted_multiplier", "int_32bit", "hex_32bit", "hash_signature", "created_at"]
    total_written = 0

    with open(output_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fieldnames)

        while True:
            rows = cursor.fetchmany(chunk_size)
            if not rows:
                break
            writer.writerows(rows)
            total_written += len(rows)

    conn.close()
    elapsed = time.perf_counter() - start_time
    print(f"✅ Successfully exported {total_written:,} records to {output_csv} in {elapsed:.2f}s.")
    return total_written


def main():
    parser = argparse.ArgumentParser(
        description="Export SQLite simulation records to CSV format."
    )
    parser.add_argument("--db", type=str, default="output/analysis_results.db", help="Source SQLite database path")
    parser.add_argument("--output", type=str, default="output/scenarios.csv", help="Target output CSV path")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of rows to export")
    parser.add_argument("--min_multiplier", type=float, default=None, help="Filter for multipliers >= threshold")

    args = parser.parse_args()

    try:
        export_sqlite_to_csv(
            db_path=args.db,
            output_csv=args.output,
            limit=args.limit,
            min_multiplier=args.min_multiplier,
        )
    except Exception as e:
        print(f"❌ Export failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
