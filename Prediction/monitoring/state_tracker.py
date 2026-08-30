"""
Monitoring: Round State Tracker
-------------------------------
Maintains real-time game state, round counters, tick multipliers, and
synchronization metrics between live events and precomputed simulations.
"""

import time
from enum import Enum
from typing import Dict, Optional


class GamePhase(str, Enum):
    IDLE = "IDLE"
    STARTING = "STARTING"
    IN_PROGRESS = "IN_PROGRESS"
    CRASHED = "CRASHED"


class RoundStateTracker:
    """Tracks state lifecycle, timing, and prediction validation for active sessions."""

    def __init__(self):
        self.phase: GamePhase = GamePhase.IDLE
        self.current_round: Optional[int] = None
        self.current_multiplier: float = 1.00
        self.predicted_multiplier: Optional[float] = None
        self.actual_crash_multiplier: Optional[float] = None

        self.round_start_time: Optional[float] = None
        self.last_tick_time: Optional[float] = None
        
        # Session metrics
        self.total_rounds_observed: int = 0
        self.matched_predictions: int = 0
        self.mismatches: int = 0
        self.history: list = []

    def on_round_start(self, round_id: int, predicted: Optional[float] = None):
        """Called when a new round is announced or starts."""
        self.phase = GamePhase.STARTING
        self.current_round = round_id
        self.current_multiplier = 1.00
        self.predicted_multiplier = predicted
        self.actual_crash_multiplier = None
        self.round_start_time = time.time()
        self.last_tick_time = self.round_start_time
        self.total_rounds_observed += 1

    def on_tick(self, multiplier: float):
        """Called upon every live multiplier increment tick."""
        self.phase = GamePhase.IN_PROGRESS
        self.current_multiplier = multiplier
        self.last_tick_time = time.time()

    def on_crash(self, actual_crash: float) -> Dict:
        """Called when the round crashes."""
        self.phase = GamePhase.CRASHED
        self.actual_crash_multiplier = actual_crash
        
        is_exact_match = False
        diff = None
        if self.predicted_multiplier is not None:
            diff = round(abs(self.predicted_multiplier - actual_crash), 2)
            if diff <= 0.01:
                is_exact_match = True
                self.matched_predictions += 1
            else:
                self.mismatches += 1

        elapsed = time.time() - (self.round_start_time or time.time())
        summary = {
            "round_id": self.current_round,
            "predicted": self.predicted_multiplier,
            "actual": actual_crash,
            "difference": diff,
            "matched": is_exact_match,
            "elapsed_seconds": round(elapsed, 2),
        }
        self.history.append(summary)
        return summary

    def get_status_dict(self) -> Dict:
        """Returns snapshot of current live state."""
        return {
            "phase": self.phase.value,
            "current_round": self.current_round,
            "current_multiplier": self.current_multiplier,
            "predicted_multiplier": self.predicted_multiplier,
            "total_observed": self.total_rounds_observed,
            "matched_predictions": self.matched_predictions,
            "mismatches": self.mismatches,
        }
