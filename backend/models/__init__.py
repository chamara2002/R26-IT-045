"""Database models package for CattleSense."""

from flask_sqlalchemy import SQLAlchemy

# Shared SQLAlchemy instance initialized in app factory.
db = SQLAlchemy()
