"""
AURA AES-256 Encryption Utility
================================
Encrypts/decrypts sensitive PII fields (user notes, check-in text,
accommodation descriptions) before writing to and after reading from
the database.

Uses Fernet (AES-128-CBC with HMAC-SHA256) from the `cryptography`
library — symmetric, authenticated encryption.  The key is derived from
the env variable ENCRYPTION_KEY; if unset in development a stable
per-process key is auto-generated (NOT suitable for production –
all encrypted rows would become unreadable after a restart).
"""

from __future__ import annotations

import base64
import logging
import os

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

# ── Key bootstrap ──────────────────────────────────────────────────────────────

def _load_or_generate_key() -> bytes:
    """Return a 32-byte URL-safe-base64 key for Fernet.

    Priority:
    1. ENCRYPTION_KEY env var (production — set this in Render environment variables)
    2. Auto-generate a *per-process* key and warn loudly (local dev only)
    """
    raw = os.environ.get("ENCRYPTION_KEY", "")
    if raw:
        try:
            key = raw.encode() if isinstance(raw, str) else raw
            # Validate it decodes to 32 bytes
            decoded = base64.urlsafe_b64decode(key + b"==")
            if len(decoded) == 32:
                return key
        except Exception:
            pass
        logger.warning("ENCRYPTION_KEY env var is set but invalid — auto-generating a temporary key")

    logger.warning(
        "⚠️  ENCRYPTION_KEY is not set.  Generating a temporary in-process key. "
        "Encrypted data WILL be unreadable after a restart.  "
        "Set ENCRYPTION_KEY in production."
    )
    return Fernet.generate_key()


_FERNET_KEY: bytes = _load_or_generate_key()
_fernet = Fernet(_FERNET_KEY)


# ── Public helpers ─────────────────────────────────────────────────────────────

def encrypt_field(value: str | None) -> str | None:
    """Encrypt a plain-text string → base64 ciphertext.

    Returns ``None`` if *value* is ``None`` or empty so nullable DB columns
    stay nullable.
    """
    if not value:
        return value
    try:
        return _fernet.encrypt(value.encode()).decode()
    except Exception as exc:  # pragma: no cover
        logger.error("Encryption failed: %s", exc)
        raise


def decrypt_field(token: str | None) -> str | None:
    """Decrypt a Fernet ciphertext → plain-text string.

    Returns the original *token* unchanged on ``InvalidToken`` so that rows
    that were inserted before encryption was enabled are still readable.
    """
    if not token:
        return token
    try:
        return _fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        # Row was stored before encryption was enabled — return as-is
        logger.debug("decrypt_field: token is not Fernet-encrypted; returning plaintext")
        return token
    except Exception as exc:  # pragma: no cover
        logger.error("Decryption failed: %s", exc)
        raise
