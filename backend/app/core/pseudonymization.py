"""
AURA Zero-Trust Pseudonymization & De-Identification Engine
============================================================
Separates identity metadata (email, name, device ID) from sensitive medical
telemetry logs using HMAC-SHA256 salt hashes.

Ensures that even if raw telemetry databases were inspected, individual logs are
strictly pseudonymized and cannot be linked back to real-world identity.
"""

from __future__ import annotations

import hashlib
import hmac
import os
from uuid import UUID

PSEUDONYM_SALT = os.getenv("PSEUDONYM_SALT", "aura_zero_trust_salt_2026")


def generate_pseudonym_hash(user_id: UUID) -> str:
    """Generates a deterministic 64-character SHA256 pseudonym hash from user UUID."""
    return hmac.new(
        PSEUDONYM_SALT.encode(),
        str(user_id).encode(),
        hashlib.sha256
    ).hexdigest()
