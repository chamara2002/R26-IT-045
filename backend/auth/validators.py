"""Validation helpers for authentication and profile payloads."""


def validate_signup_payload(name: str, email: str, password: str):
    """Return None when valid, otherwise an error message string."""
    if not name or not email or not password:
        return "name, email and password are required"
    if len(password) < 6:
        return "Password must be at least 6 characters"
    return None


def validate_profile_payload(name: str, email: str):
    """Return None when valid profile values are provided."""
    if not name or not email:
        return "Please fill all fields"
    return None
