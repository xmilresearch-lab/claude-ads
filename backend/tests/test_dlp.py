import pytest

from app.middleware.dlp import redact_pii, scan_for_pii


def test_detects_email():
    found = scan_for_pii("Contact us at user@example.com for help")
    assert "email" in found


def test_detects_ssn():
    found = scan_for_pii("SSN: 123-45-6789")
    assert "us_ssn" in found


def test_detects_credit_card():
    found = scan_for_pii("Card number: 4111111111111111")
    assert "credit_card" in found


def test_detects_aws_key():
    found = scan_for_pii("Key: AKIAIOSFODNN7EXAMPLE")
    assert "aws_key" in found


def test_clean_content_returns_empty():
    found = scan_for_pii("Our Q2 revenue grew by 23% this quarter.")
    assert found == []


def test_redact_ssn():
    result = redact_pii("User SSN is 123-45-6789")
    assert "123-45-6789" not in result
    assert "[SSN REDACTED]" in result


def test_redact_credit_card():
    result = redact_pii("Pay with 4111111111111111")
    assert "4111111111111111" not in result
    assert "[CC REDACTED]" in result


def test_redact_aws_key():
    result = redact_pii("AWS key AKIAIOSFODNN7EXAMPLE is exposed")
    assert "AKIAIOSFODNN7EXAMPLE" not in result
    assert "[AWS_KEY REDACTED]" in result
