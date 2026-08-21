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


def create_first_admin(name=None, email=None, password=None, phone=None):
    """Create the first admin user interactively or from arguments."""
    print("\n" + "=" * 60)
    print("CattleSense Admin Panel - Admin Setup")
    print("=" * 60 + "\n")

    with app.app_context():
        # Interactive prompts if args are missing
        if not name:
            while True:
                name = input("Admin Name: ").strip()
                if name:
                    break
                print("Name cannot be empty.")

        if not email:
            while True:
                email = input("Admin Email: ").strip().lower()
                if not email:
                    print("Email cannot be empty.")
                    continue
                if '@' not in email or '.' not in email.split('@')[1]:
                    print("Invalid email format.")
                    continue
                break

        # Check existing
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            existing_user.role = 'admin'
            if password:
                existing_user.password_hash = hash_password(password)
            if phone:
                existing_user.phone = phone
            db.session.commit()
            print(f"✓ Existing user '{email}' promoted to Admin successfully!")
            return True

        if not password:
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
                phone=phone or None,
                password_hash=hash_password(password),
                role='admin'
            )

            db.session.add(admin_user)
            db.session.commit()

            print("\n" + "=" * 60)
            print("✓ Admin user created successfully!")
            print("=" * 60)
            print(f"\nAdmin Details:")
            print(f"  Name:  {admin_user.name}")
            print(f"  Email: {admin_user.email}")
            print(f"  Phone: {admin_user.phone or 'N/A'}")
            print(f"  Role:  {admin_user.role}")
            print(f"  ID:    {admin_user.id}")
            print("\nYou can now log in to the admin panel at: /admin")
            print("=" * 60 + "\n")

            return True

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error creating admin user: {str(e)}")
            return False


if __name__ == '__main__':
    try:
        ensure_users_role_column()
        name_arg = sys.argv[1] if len(sys.argv) > 1 else None
        email_arg = sys.argv[2] if len(sys.argv) > 2 else None
        pass_arg = sys.argv[3] if len(sys.argv) > 3 else None
        phone_arg = sys.argv[4] if len(sys.argv) > 4 else None
        success = create_first_admin(name_arg, email_arg, pass_arg, phone_arg)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {str(e)}")
        sys.exit(1)
