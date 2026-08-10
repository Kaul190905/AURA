import pytest
from uuid import uuid4
from app.schemas.sensor_data import SensorDataCreate
from app.core.biometric_firewall import inspect_telemetry_payload
from app.core.hmac_firewall import verify_hmac_signature
from app.core.pseudonymization import generate_pseudonym_hash
import time

def test_biometric_spoof_detection():
    user_id = uuid4()
    # Extreme hypoxia check
    payload = SensorDataCreate(heart_rate=180.0, blood_oxygen=55.0, noise=70.0, temperature=98.0)
    anomalies = inspect_telemetry_payload(user_id, payload)
    assert len(anomalies) > 0
    assert "Severe Hypoxia" in anomalies[0]

def test_hmac_request_signature_verification():
    payload = b'{"noise": 65.0}'
    ts = str(time.time())
    # Generate signature using default key
    import hmac, hashlib
    key = "aura_hmac_secret_key_2026_default"
    msg = ts.encode() + payload
    sig = hmac.new(key.encode(), msg, hashlib.sha256).hexdigest()

    # Verify signature
    assert verify_hmac_signature(payload, ts, sig) is True

def test_zero_trust_pseudonymization_hash():
    uid = uuid4()
    h1 = generate_pseudonym_hash(uid)
    h2 = generate_pseudonym_hash(uid)
    assert h1 == h2
    assert len(h1) == 64
