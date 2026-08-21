"""Validation helpers for authentication and profile payloads."""

import re

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
PHONE_CLEAN_REGEX = re.compile(r"[\s\-\(\)]")
PHONE_FORMAT_REGEX = re.compile(r"^(\+?[0-9]{9,15})$")


def clean_phone_number(phone: str) -> str:
    """Strip spaces, dashes, and parentheses from a phone number string."""
    if not phone:
        return ""
    return PHONE_CLEAN_REGEX.sub("", phone.strip())


def is_valid_phone(phone: str) -> bool:
    """Validate phone number format (local or international)."""
    cleaned = clean_phone_number(phone)
    return bool(PHONE_FORMAT_REGEX.match(cleaned))


def is_valid_email(email: str) -> bool:
    """Validate email format."""
    if not email:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def validate_signup_payload(
    name: str,
    phone: str,
    email: str = "",
    password: str = "",
    farm_name: str = "",
    province: str = "",
    district: str = "",
    ds_division: str = "",
    gn_division: str = "",
    farm_address: str = "",
    cattle_count: any = None,
    farming_experience: str = "",
):
    """Return None when valid, otherwise an error message string."""
    if not name or not name.strip():
        return "Full Name is required"

    if not phone or not phone.strip():
        return "Mobile Number is required"

    if not is_valid_phone(phone):
        return "Please enter a valid mobile phone number"

    if email and email.strip():
        if not is_valid_email(email):
            return "Please enter a valid email address"

    if not province or not province.strip():
        return "Province is required"

    if not district or not district.strip():
        return "District is required"

    if cattle_count is None or str(cattle_count).strip() == "":
        return "Number of Cattle is required"

    try:
        cattle_num = int(cattle_count)
        if cattle_num <= 0:
            return "Number of Cattle must be a valid positive number"
    except (ValueError, TypeError):
        return "Number of Cattle must be a valid positive number"

    if not password:
        return "Password is required"

    if len(password) < 8:
        return "Password must be at least 8 characters"

    return None


def validate_profile_payload(name: str, phone: str = "", email: str = ""):
    """Return None when valid profile values are provided."""
    if not name or not name.strip():
        return "Full Name is required"
    if phone and not is_valid_phone(phone):
        return "Please enter a valid mobile phone number"
    if email and not is_valid_email(email):
        return "Please enter a valid email address"
    return None

