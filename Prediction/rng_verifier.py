#!/usr/bin/env python3
"""
Provably Fair RNG Verification & Statistical Export Tool
--------------------------------------------------------
This script implements offline cryptographic verification of HMAC-SHA256
deterministic outcomes for statistical distribution and randomness testing.
Formula applied:
  1. HMAC-SHA256(key=server_seed, message=f"{client_seed}:{nonce}")
  2. Take the first 4 bytes (32-bit unsigned integer) of the HMAC output.
  3. crash_multiplier = floor(0xFFFFFFFF * 100 / (hash_int + 1)) / 100
"""
import argparse
import csv
import hashlib
import hmac
import math
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def compute_multiplier(server_seed: str, client_seed: str, nonce: int) -> dict:
    """
    Computes the deterministic multiplier for a given (server_seed, client_seed, nonce) triplet.
    """
    # Step 1: Format the message payload (client_seed + nonce separator)
    message = f"{client_seed}:{nonce}".encode("utf-8")
    key = server_seed.encode("utf-8")
    
    # Step 2: Compute HMAC-SHA256 hash digest
    hmac_digest = hmac.new(key, message, hashlib.sha256).hexdigest()
    
    # Step 3: Extract the leading 4 bytes (8 hex characters) to form a 32-bit unsigned int
    # 0xFFFFFFFF corresponds to 2^32 - 1 = 4,294,967,295
    hex_slice = hmac_digest[:8]
    int_val = int(hex_slice, 16)
    
    # Step 4: Calculate the multiplier using the standard distribution formula
    # Note: 0xFFFFFFFF * 100 / (int_val + 1) generates a Pareto-like heavy-tailed distribution.
    raw_val = (0xFFFFFFFF * 100) / (int_val + 1)
    multiplier = math.floor(raw_val) / 100.0
    
    return {
        "nonce": nonce,
        "hmac_digest": hmac_digest,
        "hex_32bit": hex_slice,
        "int_32bit": int_val,
        "multiplier": multiplier,
    }


def run_verification(server_seed: str, client_seed: str, nonces: int, output_file: str):
    """
    Iterates through nonces, generates records, and writes output to CSV.
    """
    print("=" * 60)
    print("🔬 Provably Fair RNG Verification & Dataset Generator")
    print("=" * 60)
    print(f"Server Seed : {server_seed}")
    print(f"Client Seed : {client_seed}")
    print(f"Total Nonces: {nonces}")
    print(f"Output CSV  : {output_file}")
    print("-" * 60)

    records = []
    multipliers = []

    for n in range(1, nonces + 1):
        record = compute_multiplier(server_seed, client_seed, n)
        records.append(record)
        multipliers.append(record["multiplier"])

    # Export to CSV
    fieldnames = ["nonce", "multiplier", "int_32bit", "hex_32bit", "hmac_digest"]
    with open(output_file, mode="w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    # Statistical Summary
    avg_mult = sum(multipliers) / len(multipliers)
    min_mult = min(multipliers)
    max_mult = max(multipliers)
    median_mult = sorted(multipliers)[len(multipliers) // 2]
    
    # Percentage of rounds crashing below 2.00x
    under_2x = (sum(1 for m in multipliers if m < 2.00) / len(multipliers)) * 100

    print("✅ Export completed successfully.")
    print("\n📊 Sequence Summary Statistics:")
    print(f"  • Min Multiplier    : {min_mult:.2f}x")
    print(f"  • Max Multiplier    : {max_mult:.2f}x")
    print(f"  • Mean (Average)    : {avg_mult:.2f}x")
    print(f"  • Median Multiplier : {median_mult:.2f}x")
    print(f"  • Multipliers < 2.0x: {under_2x:.2f}% (Expected theoretical: ~50%)")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Verify Provably Fair HMAC-SHA256 RNG sequences and export datasets."
    )
    parser.add_argument(
        "--server_seed",
        type=str,
        required=True,
        help="Unhashed or revealed server seed string",
    )
    parser.add_argument(
        "--client_seed",
        type=str,
        required=True,
        help="Client seed / user-provided entropy string",
    )
    parser.add_argument(
        "--nonces",
        type=int,
        default=100,
        help="Number of sequential nonces to verify (default: 100)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="rng_verification_dataset.csv",
        help="Path to output CSV file (default: rng_verification_dataset.csv)",
    )

    args = parser.parse_args()

    if args.nonces <= 0:
        print("Error: --nonces must be greater than 0.", file=sys.stderr)
        sys.exit(1)

    run_verification(args.server_seed, args.client_seed, args.nonces, args.output)


if __name__ == "__main__":
    main()
