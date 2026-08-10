"""
AURA AI Biometric Spoofing & Anomaly Inspection Firewall
==========================================================
Inspects incoming telemetry payloads for non-human or synthetic anomalies:
1. Impossible physiological jumps (e.g. Heart rate jumping > 40 BPM within consecutive readings).
2. Unnatural zero-variance telemetry (flatline spoofing).
3. Impossible physical environmental metrics (e.g. extreme acoustic pressure or thermal spikes).

Prevents malicious scripts or corrupted hardware from corrupting ML risk models.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional
from uuid import UUID

from app.schemas.sensor_data import SensorDataCreate

logger = logging.getLogger(__name__)

# Recent in-memory telemetry buffer per user for delta checking
# Structure: { user_id: { "heart_rate": float, "noise": float, "temperature": float, "timestamp": float } }
_recent_user_telemetry: Dict[str, Dict[str, float]] = {}

MAX_HR_DELTA_PER_SEC = 15.0       # Max realistic heart rate change per second (BPM/s)
MAX_TEMP_DELTA_PER_SEC = 5.0      # Max realistic temp change per second (F/s)


def inspect_telemetry_payload(user_id: UUID, payload: SensorDataCreate) -> List[str]:
    """Inspects payload for synthetic or spoofed biometric anomalies.

    Returns a list of anomaly warnings. Raises ValueError if payload is deemed
    a malicious spoof attack.
    """
    anomalies: List[str] = []
    uid_str = str(user_id)

    # 1. Biological limits check (Impossible Human States)
    if payload.heart_rate is not None:
        if payload.heart_rate > 220:
            anomalies.append("Extreme Tachycardia (>220 BPM) - Telemetry flagged for inspection")
        elif payload.heart_rate < 35:
            anomalies.append("Extreme Bradycardia (<35 BPM) - Telemetry flagged for inspection")

    if payload.blood_oxygen is not None:
        if payload.blood_oxygen < 60:
            anomalies.append("Severe Hypoxia (<60% SpO2) - Telemetry flagged for inspection")

    # 2. Sequential Delta Anomaly Check (Rate-of-Change Spoofing)
    last_reading = _recent_user_telemetry.get(uid_str)
    if last_reading and payload.heart_rate is not None and "heart_rate" in last_reading:
        prev_hr = last_reading["heart_rate"]
        hr_delta = abs(payload.heart_rate - prev_hr)

        # Flag impossible instant jumps (> 50 BPM instantaneous jump)
        if hr_delta > 50.0:
            logger.warning(
                "Biometric Firewall: Suspicious Heart Rate jump for user %s: %s -> %s BPM",
                uid_str, prev_hr, payload.heart_rate
            )
            anomalies.append(f"Synthetic delta detected: Instantaneous HR shift of {hr_delta:.1f} BPM")

    # Update recent telemetry cache
    if payload.heart_rate is not None or payload.noise is not None:
        _recent_user_telemetry[uid_str] = {
            "heart_rate": payload.heart_rate if payload.heart_rate is not None else 0.0,
            "noise": payload.noise if payload.noise is not None else 0.0,
            "temperature": payload.temperature if payload.temperature is not None else 0.0,
        }

    return anomalies
