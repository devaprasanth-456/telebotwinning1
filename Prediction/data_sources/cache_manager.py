"""
Seed Cache Manager
------------------
Stores, tracks, and retrieves historical server/client seed states.
Ensures session continuity and records seed rotation history with timestamps.
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


class SeedCacheManager:
    """Manages persistence of server seed hashes, client entropy, and rotation history."""

    DEFAULT_CACHE_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data_sources",
        "seed_history.json",
    )

    def __init__(self, cache_file: Optional[str] = None):
        self.cache_file = cache_file or self.DEFAULT_CACHE_PATH
        self._ensure_cache_file()

    def _ensure_cache_file(self):
        """Ensures the cache directory and JSON file exist."""
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
        if not os.path.exists(self.cache_file):
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump({"seeds": [], "latest": None}, f, indent=2)

    def load_history(self) -> Dict:
        """Loads the full seed history from disk."""
        try:
            with open(self.cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"seeds": [], "latest": None}

    def get_latest(self) -> Optional[Dict]:
        """Returns the most recently recorded seed state."""
        data = self.load_history()
        return data.get("latest")

    def save_seed(
        self,
        server_hash: str,
        client_entropy: Optional[str] = "default_client_entropy",
        source_url: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict:
        """
        Saves a new seed state. Detects if the seed has rotated and updates the cache.
        """
        history = self.load_history()
        now_str = datetime.now().isoformat()

        entry = {
            "server_hash": server_hash,
            "client_entropy": client_entropy,
            "source_url": source_url or "manual_entry",
            "recorded_at": now_str,
            "notes": notes or "",
        }

        is_new_rotation = True
        if history.get("latest"):
            if history["latest"].get("server_hash") == server_hash and history["latest"].get("client_entropy") == client_entropy:
                is_new_rotation = False

        if is_new_rotation:
            history.setdefault("seeds", []).append(entry)

        history["latest"] = entry

        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)

        return entry

    def list_all_seeds(self) -> List[Dict]:
        """Returns all recorded seed transitions."""
        return self.load_history().get("seeds", [])


if __name__ == "__main__":
    manager = SeedCacheManager()
    latest = manager.get_latest()
    print("Latest Seed in Cache:", latest)
