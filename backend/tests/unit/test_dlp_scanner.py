import pytest
from app.middleware.dlp_scanner import (
    DLPCategory,
    DLPResult,
    redact_output,
    scan_output,
)

# ── clean content ──────────────────────────────────────────────────────────


def test_clean_content_no_violations() -> None:
    result = scan_output("Here is a great blog post about marketing automation.")
    assert result.has_violations is False


def test_clean_content_violations_list_empty() -> None:
    result = scan_output("No sensitive data here.")
    assert result.violations == []


def test_clean_content_redacted_unchanged() -> None:
    content = "The campaign performed well this quarter."
    result = scan_output(content)
    assert result.redacted_content == content


def test_empty_string_is_clean() -> None:
    result = scan_output("")
    assert result.has_violations is False


# ── email ──────────────────────────────────────────────────────────────────


def test_email_detected() -> None:
    result = scan_output("Contact us at john.doe@example.com for help.")
    assert DLPCategory.EMAIL in result.violations


def test_email_masked_format() -> None:
    result = scan_output("Email: john.doe@example.com")
    assert "j***@example.com" in result.redacted_content


def test_email_original_removed() -> None:
    result = scan_output("Send to alice@company.org now.")
    assert "alice@company.org" not in result.redacted_content


def test_multiple_emails_all_masked() -> None:
    result = scan_output("cc: alice@a.com and bob@b.com")
    assert "alice@a.com" not in result.redacted_content
    assert "bob@b.com" not in result.redacted_content


def test_email_subdomain_detected() -> None:
    result = scan_output("Reply to user@mail.company.co.uk")
    assert DLPCategory.EMAIL in result.violations


def test_email_with_plus_detected() -> None:
    result = scan_output("Alias: user+tag@example.com")
    assert DLPCategory.EMAIL in result.violations


# ── SSN ───────────────────────────────────────────────────────────────────


def test_ssn_hyphen_detected() -> None:
    result = scan_output("SSN: 123-45-6789")
    assert DLPCategory.SSN in result.violations


def test_ssn_space_detected() -> None:
    result = scan_output("Social: 123 45 6789")
    assert DLPCategory.SSN in result.violations


def test_ssn_replaced_with_placeholder() -> None:
    result = scan_output("SSN is 123-45-6789.")
    assert "[SSN]" in result.redacted_content
    assert "123-45-6789" not in result.redacted_content


def test_short_number_not_flagged_as_ssn() -> None:
    result = scan_output("Order #123-45")
    assert DLPCategory.SSN not in result.violations


# ── credit card ────────────────────────────────────────────────────────────


def test_visa_card_detected() -> None:
    result = scan_output("Card: 4111111111111111")
    assert DLPCategory.CREDIT_CARD in result.violations


def test_formatted_card_detected() -> None:
    result = scan_output("Card: 4111-1111-1111-1111")
    assert DLPCategory.CREDIT_CARD in result.violations


def test_card_masked_last_four() -> None:
    result = scan_output("Card: 4111-1111-1111-1234")
    assert "****-****-****-1234" in result.redacted_content


def test_mastercard_detected() -> None:
    result = scan_output("MC: 5500005555555559")
    assert DLPCategory.CREDIT_CARD in result.violations


def test_amex_detected() -> None:
    result = scan_output("Amex: 378282246310005")
    assert DLPCategory.CREDIT_CARD in result.violations


# ── US phone ──────────────────────────────────────────────────────────────


def test_us_phone_dashes_detected() -> None:
    result = scan_output("Call us at 555-867-5309.")
    assert DLPCategory.PHONE_US in result.violations


def test_us_phone_dots_detected() -> None:
    result = scan_output("Phone: 555.867.5309")
    assert DLPCategory.PHONE_US in result.violations


def test_us_phone_parens_detected() -> None:
    result = scan_output("Reach us: (555) 867-5309")
    assert DLPCategory.PHONE_US in result.violations


def test_us_phone_replaced_with_placeholder() -> None:
    result = scan_output("Call 555-867-5309 now.")
    assert "[PHONE]" in result.redacted_content
    assert "555-867-5309" not in result.redacted_content


def test_us_phone_with_country_code_detected() -> None:
    result = scan_output("Dial +1 555-867-5309")
    assert DLPCategory.PHONE_US in result.violations


# ── international phone ────────────────────────────────────────────────────


def test_intl_phone_detected() -> None:
    result = scan_output("Call +447911123456 for support.")
    assert DLPCategory.PHONE_INTL in result.violations


def test_intl_phone_replaced() -> None:
    result = scan_output("Number: +447911123456")
    assert "[PHONE]" in result.redacted_content
    assert "+447911123456" not in result.redacted_content


def test_intl_phone_german_detected() -> None:
    result = scan_output("Kontakt: +4930123456789")
    assert DLPCategory.PHONE_INTL in result.violations


# ── IP address ────────────────────────────────────────────────────────────


def test_ipv4_detected() -> None:
    result = scan_output("Server at 192.168.1.100 is up.")
    assert DLPCategory.IP_ADDRESS in result.violations


def test_public_ip_detected() -> None:
    result = scan_output("Connecting to 8.8.8.8 now.")
    assert DLPCategory.IP_ADDRESS in result.violations


def test_ip_replaced_with_placeholder() -> None:
    result = scan_output("IP: 10.0.0.1")
    assert "[IP_ADDRESS]" in result.redacted_content
    assert "10.0.0.1" not in result.redacted_content


def test_invalid_ip_not_flagged() -> None:
    result = scan_output("Version 999.999.999.999 is invalid")
    assert DLPCategory.IP_ADDRESS not in result.violations


# ── API key ───────────────────────────────────────────────────────────────


def test_openai_style_key_detected() -> None:
    result = scan_output("Key: sk-abcdefghijklmnopqrstuvwxyz1234")
    assert DLPCategory.API_KEY in result.violations


def test_api_key_replaced_with_placeholder() -> None:
    result = scan_output("Token: sk-abcdefghijklmnopqrstuvwxyz1234")
    assert "[API_KEY]" in result.redacted_content


def test_short_token_not_flagged() -> None:
    result = scan_output("ID: abc123def456")
    assert DLPCategory.API_KEY not in result.violations


# ── DLPResult structure ────────────────────────────────────────────────────


def test_result_is_dataclass() -> None:
    result = scan_output("test content")
    assert isinstance(result, DLPResult)
    assert hasattr(result, "has_violations")
    assert hasattr(result, "violations")
    assert hasattr(result, "redacted_content")


def test_violations_is_list() -> None:
    result = scan_output("test content")
    assert isinstance(result.violations, list)


def test_has_violations_true_when_violations_present() -> None:
    result = scan_output("Email: user@example.com")
    assert result.has_violations is True


def test_has_violations_false_when_clean() -> None:
    result = scan_output("This is clean content with no PII.")
    assert result.has_violations is False


def test_multiple_violation_categories_detected() -> None:
    result = scan_output("Email: user@example.com, SSN: 123-45-6789")
    assert DLPCategory.EMAIL in result.violations
    assert DLPCategory.SSN in result.violations


def test_same_category_not_duplicated_in_violations() -> None:
    result = scan_output("Emails: a@x.com and b@y.com")
    assert result.violations.count(DLPCategory.EMAIL) == 1


# ── redact_output convenience wrapper ─────────────────────────────────────


def test_redact_output_returns_string() -> None:
    result = redact_output("Hello world")
    assert isinstance(result, str)


def test_redact_output_redacts_email() -> None:
    result = redact_output("Contact jane@example.com")
    assert "jane@example.com" not in result
    assert "j***@example.com" in result


def test_redact_output_clean_content_unchanged() -> None:
    content = "This is a safe marketing message."
    assert redact_output(content) == content


def test_redact_output_multiple_types() -> None:
    result = redact_output(
        "User alice@test.com called 555-123-4567 from 192.168.0.1"
    )
    assert "alice@test.com" not in result
    assert "555-123-4567" not in result
    assert "192.168.0.1" not in result


# ── end-to-end mixed content ───────────────────────────────────────────────


def test_clean_marketing_copy_unchanged() -> None:
    copy = (
        "Boost your brand with our AI-powered automation platform. "
        "Start your free trial today and see results in 24 hours."
    )
    assert redact_output(copy) == copy


def test_pii_heavy_content_fully_redacted() -> None:
    content = (
        "Customer John (john@corp.com) called from 212-555-9876. "
        "SSN on file: 987-65-4321. Charged card 4111-1111-1111-1111."
    )
    result = redact_output(content)
    assert "john@corp.com" not in result
    assert "212-555-9876" not in result
    assert "987-65-4321" not in result
    assert "4111-1111-1111-1111" not in result
    assert "[EMAIL]" not in result          # email uses masker, not placeholder
    assert "j***@corp.com" in result
    assert "[SSN]" in result
    assert "****-****-****-1111" in result
