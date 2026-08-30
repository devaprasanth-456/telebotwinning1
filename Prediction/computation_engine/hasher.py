"""
Computation Engine: Hasher
---------------------------
Implements the core Provably Fair HMAC-SHA256 outcome derivation algorithm.
Extracts 32-bit leading entropy and computes deterministic Pareto multipliers.
"""

import hashlib
import hmac
import math
from typing import Dict, Tuple


def compute_multiplier_raw(int_val: int) -> float:
    """
    Computes multiplier from a 32-bit unsigned integer (0 to 2^32 - 1).
    Formula: floor((0xFFFFFFFF * 100) / (int_val + 1)) / 100.0
    """
    # 0xFFFFFFFF = 4,294,967,295 (2^32 - 1)
    raw_val = (0xFFFFFFFF * 100) / (int_val + 1)
    return math.floor(raw_val) / 100.0


def compute_outcome(server_hash: str, client_entropy: str, round_id: int) -> Dict:
    """
    Derives deterministic round outcome given (server_hash, client_entropy, round_id).
    
    Returns:
        Dict containing round_id, predicted_multiplier, int_32bit, hex_32bit, hash_signature
    """
    message = f"{client_entropy}:{round_id}".encode("utf-8")
    key = server_hash.encode("utf-8")

    # Step 1: Compute HMAC-SHA256 digest
    digest = hmac.new(key, message, hashlib.sha256).hexdigest()

    # Step 2: Slice leading 4 bytes (8 hex characters)
    hex_slice = digest[:8]
    int_val = int(hex_slice, 16)

    # Step 3: Compute final crash multiplier
    multiplier = compute_multiplier_raw(int_val)

    return {
        "round_id": round_id,
        "predicted_multiplier": multiplier,
        "int_32bit": int_val,
        "hex_32bit": hex_slice,
        "hash_signature": digest,
    }


def compute_outcome_tuple(server_hash: str, client_entropy: str, round_id: int) -> Tuple:
    """Fast tuple-returning variant optimized for high-throughput batch insertion into SQLite."""
    message = f"{client_entropy}:{round_id}".encode("utf-8")
    key = server_hash.encode("utf-8")
    digest = hmac.new(key, message, hashlib.sha256).hexdigest()
    hex_slice = digest[:8]
    int_val = int(hex_slice, 16)
    multiplier = math.floor((0xFFFFFFFF * 100) / (int_val + 1)) / 100.0
    return (round_id, multiplier, int_val, hex_slice, digest)
