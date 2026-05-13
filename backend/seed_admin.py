#!/usr/bin/env python3
"""
First Admin Seeding Script for CattleSense Admin Panel

This script initializes the first admin user in the system.
Run this after setting up the database schema.

Usage:
    python seed_admin.py
"""

import sys
from getpass import getpass
from sqlalchemy import text

from app import app, db
from models.user import User
from services.auth_service import hash_password


def ensure_users_role_column():
    """Ensure users.role column exists for admin-enabled schema."""
    with app.app_context():
        result = db.session.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'role'
                """
            )
        ).first()

        if result:
            return

        db.session.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'farmer'
                """
            )
        )
        db.session.commit()
        print("✓ Added missing 'role' column to users table.")


def check_admin_exists():
    """Check if any admin users exist in the database."""
    with app.app_context():
        admin_count = User.query.filter_by(role='admin').count()
        return admin_count > 0


def create_first_admin():
    """Create the first admin user interactively."""
    print("\n" + "=" * 60)
    print("CattleSense Admin Panel - First Admin Setup")
    print("=" * 60 + "\n")

    with app.app_context():
        # Check if admins already exist
        if check_admin_exists():
            print("✓ Admin user(s) already exist in the system.")
            print("  Use the admin panel to invite new admins.")
            return False

        print("No admin users found. Let's create the first admin account.\n")

        # Get admin details
        while True:
            name = input("Admin Name: ").strip()
            if name:
                break
            print("Name cannot be empty.")

        while True:
            email = input("Admin Email: ").strip().lower()
            if not email:
                print("Email cannot be empty.")
                continue

            # Validate email format
            if '@' not in email or '.' not in email.split('@')[1]:
                print("Invalid email format.")
                continue

            # Check if email already exists
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                print(f"User with email '{email}' already exists.")
                continue

            break

        while True:
            password = getpass("Password (min 8 characters): ")
            if len(password) < 8:
                print("Password must be at least 8 characters.")
                continue

            password_confirm = getpass("Confirm Password: ")
            if password != password_confirm:
                print("Passwords do not match.")
                continue

            break

        # Create admin user
        try:
            admin_user = User(
                name=name,
                email=email,
                password_hash=hash_password(password),
                role='admin'
            )

            db.session.add(admin_user)
            db.session.commit()

            print("\n" + "=" * 60)
            print("✓ First admin user created successfully!")
            print("=" * 60)
            print(f"\nAdmin Details:")
            print(f"  Name:  {admin_user.name}")
            print(f"  Email: {admin_user.email}")
            print(f"  ID:    {admin_user.id}")
            print("\nYou can now log in to the admin panel at: /admin/login")
            print("=" * 60 + "\n")

            return True

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error creating admin user: {str(e)}")
            return False


if __name__ == '__main__':
    try:
        ensure_users_role_column()
        success = create_first_admin()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {str(e)}")
        sys.exit(1)
