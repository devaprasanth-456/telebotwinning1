"""Computation Engine: Cryptographic HMAC-SHA256 simulation and batch outcome generation."""
from .hasher import compute_outcome, compute_multiplier_raw
from .simulator import BatchSimulator

__all__ = ["compute_outcome", "compute_multiplier_raw", "BatchSimulator"]
