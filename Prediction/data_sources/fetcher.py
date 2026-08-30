"""
Data Sources: State & Seed Fetcher
----------------------------------
Queries public game status endpoints to extract public seed hashes,
session nonces, and current game entropy parameters.
"""

import argparse
import json
import re
import sys
import urllib.request
from typing import Any, Dict, Optional

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from .cache_manager import SeedCacheManager
except ImportError:
    from cache_manager import SeedCacheManager

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


COMMON_SEED_KEYS = [
    "server_seed",
    "serverSeed",
    "server_seed_hash",
    "serverSeedHash",
    "seed",
    "currentServerSeed",
    "current_server_seed",
    "hash",
    "active_seed",
    "activeSeed",
]

COMMON_CLIENT_KEYS = [
    "client_seed",
    "clientSeed",
    "client_entropy",
    "clientEntropy",
    "user_seed",
    "userSeed",
]

COMMON_NONCE_KEYS = [
    "nonce",
    "round",
    "round_id",
    "roundId",
    "current_round",
    "currentRound",
    "game_id",
]


class StateFetcher:
    """Extracts public state variables and cryptographic seeds from endpoints."""

    def __init__(self, cache_manager: Optional[SeedCacheManager] = None):
        self.cache_manager = cache_manager or SeedCacheManager()

    def _http_get(self, url: str, headers: Optional[Dict[str, str]] = None) -> str:
        """Performs an HTTP GET request using requests or standard urllib fallback."""
        default_headers = {"User-Agent": "ProvablyFairAuditor/1.0", "Accept": "application/json"}
        if headers:
            default_headers.update(headers)

        if HAS_REQUESTS:
            resp = requests.get(url, headers=default_headers, timeout=10)
            resp.raise_for_status()
            return resp.text
        else:
            req = urllib.request.Request(url, headers=default_headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.read().decode("utf-8")

    def extract_from_json(self, data: Any) -> Dict[str, Any]:
        """Recursively extracts seed, client entropy, and round identifiers from JSON data."""
        extracted: Dict[str, Any] = {}

        if isinstance(data, dict):
            for k, v in data.items():
                if not extracted.get("server_hash") and k in COMMON_SEED_KEYS and isinstance(v, str):
                    extracted["server_hash"] = v
                if not extracted.get("client_entropy") and k in COMMON_CLIENT_KEYS and isinstance(v, str):
                    extracted["client_entropy"] = v
                if not extracted.get("current_round") and k in COMMON_NONCE_KEYS and isinstance(v, (int, str)):
                    try:
                        extracted["current_round"] = int(v)
                    except ValueError:
                        pass

                # Recursive search in nested dicts/lists
                if isinstance(v, (dict, list)):
                    sub = self.extract_from_json(v)
                    for sub_k, sub_v in sub.items():
                        if sub_k not in extracted:
                            extracted[sub_k] = sub_v

        elif isinstance(data, list):
            for item in data:
                sub = self.extract_from_json(item)
                for sub_k, sub_v in sub.items():
                    if sub_k not in extracted:
                        extracted[sub_k] = sub_v

        return extracted

    def fetch_state(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        save_to_cache: bool = True,
        override_client_entropy: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetches state from a remote URL, extracts seeds and identifiers,
        and optionally updates the local seed cache.
        """
        print(f"📡 Querying status endpoint: {url}")
        raw_text = self._http_get(url, headers=headers)
        
        extracted: Dict[str, Any] = {}
        try:
            json_data = json.loads(raw_text)
            extracted = self.extract_from_json(json_data)
        except json.JSONDecodeError:
            pass

        # Regex fallback for hex seeds if not found in structured JSON keys
        if not extracted.get("server_hash"):
            hex_matches = re.findall(r"\b[a-fA-F0-9]{32,64}\b", raw_text)
            if hex_matches:
                extracted["server_hash"] = hex_matches[0]

        if override_client_entropy:
            extracted["client_entropy"] = override_client_entropy
        elif not extracted.get("client_entropy"):
            extracted["client_entropy"] = "public_client_seed"

        server_hash = extracted.get("server_hash")
        if server_hash:
            print(f"🔑 Successfully extracted Server Seed / Hash: {server_hash}")
            if save_to_cache:
                self.cache_manager.save_seed(
                    server_hash=server_hash,
                    client_entropy=extracted.get("client_entropy", "public_client_seed"),
                    source_url=url,
                    notes=f"Fetched from endpoint (Round: {extracted.get('current_round', 'N/A')})",
                )
                print(f"💾 Saved to seed cache: {self.cache_manager.cache_file}")
        else:
            print("⚠️ Warning: Could not locate a valid hex seed in endpoint response.")

        return extracted


def main():
    parser = argparse.ArgumentParser(
        description="Fetch and extract public provably fair seed states from API endpoints."
    )
    parser.add_argument("--url", type=str, required=True, help="URL of the state/debug endpoint")
    parser.add_argument("--client_seed", type=str, default=None, help="Optional client seed override")
    parser.add_argument("--headers", type=str, default=None, help="Optional JSON string of HTTP headers")
    parser.add_argument("--no_save", action="store_true", help="Do not save extracted seed to cache")

    args = parser.parse_args()

    headers_dict = None
    if args.headers:
        try:
            headers_dict = json.loads(args.headers)
        except Exception as e:
            print(f"Error parsing headers JSON: {e}", file=sys.stderr)
            sys.exit(1)

    fetcher = StateFetcher()
    try:
        result = fetcher.fetch_state(
            url=args.url,
            headers=headers_dict,
            save_to_cache=not args.no_save,
            override_client_entropy=args.client_seed,
        )
        print("\nExtracted State Data:")
        print(json.dumps(result, indent=2))
    except Exception as err:
        print(f"❌ Failed to fetch endpoint: {err}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
