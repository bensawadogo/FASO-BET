import os
from api.lib.internal_auth import validate_internal_key, get_expected_internal_key

def test_validate_internal_key_default():
    assert validate_internal_key("fasobet-internal-2025") is True
    assert validate_internal_key("wrong-key") is False

def test_validate_internal_key_env(monkeypatch):
    monkeypatch.setenv("FASTOBET_INTERNAL_KEY", "secret-123")
    assert get_expected_internal_key() == "secret-123"
    assert validate_internal_key("secret-123") is True
    assert validate_internal_key("fasobet-internal-2025") is False
