"""Authentication service helpers."""

from werkzeug.security import check_password_hash, generate_password_hash


def hash_password(password: str) -> str:
    """Hash plain password using Werkzeug default strategy."""
    return generate_password_hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Validate plain password against stored hash."""
    return check_password_hash(password_hash, password)
