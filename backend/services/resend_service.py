"""Resend email service for transactional emails such as Password Reset OTPs."""

import logging
import os
import resend

logger = logging.getLogger("cattlesense.resend")


def get_resend_config() -> tuple[str, str]:
    """Retrieve Resend API key and sender email from environment."""
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    from_email = os.getenv("RESEND_FROM_EMAIL", "").strip() or "CattleSense <onboarding@resend.dev>"
    return api_key, from_email


def build_password_reset_html(otp_code: str, recipient_name: str | None = None) -> str:
    """Construct branded HTML template for Password Reset OTP verification."""
    greeting = f"Hello {recipient_name}," if recipient_name else "Hello Farmer,"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CattleSense Password Reset Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CattleSense</h1>
              <p style="margin: 4px 0 0; color: #d1fae5; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Smart Cattle Health Platform</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #0f172a;">Password Reset Verification</h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 22px; color: #475569;">
                {greeting}<br>
                We received a request to reset the password for your CattleSense account. Use the 6-digit verification code below to complete your reset:
              </p>

              <!-- OTP Code Display -->
              <div style="margin: 24px 0; padding: 20px; background-color: #ecfdf5; border-radius: 12px; border: 1.5px dashed #10b981; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Your One-Time Verification Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; color: #065f46; letter-spacing: 8px; margin: 0;">
                  {otp_code}
                </div>
              </div>

              <!-- Expiration Warning -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #059669; border-radius: 4px;">
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #334155;">
                      <strong>Note:</strong> This verification code will expire in <strong>5 minutes</strong> and can only be used once.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b;">
                If you did not request a password reset, you can safely ignore this email. Your existing password remains unchanged and secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 16px;">
                © 2026 CattleSense Agricultural AI Platform. All rights reserved.<br>
                Empowering Sri Lankan dairy farmers with precision health surveillance.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_password_reset_text(otp_code: str, recipient_name: str | None = None) -> str:
    """Construct plain text fallback for email clients without HTML rendering."""
    greeting = f"Hello {recipient_name}," if recipient_name else "Hello Farmer,"
    return (
        f"CattleSense - Password Reset Verification\n\n"
        f"{greeting}\n"
        f"We received a request to reset your CattleSense password.\n\n"
        f"Your verification code is: {otp_code}\n\n"
        f"This code will expire in 5 minutes and is valid for a single use.\n"
        f"If you did not request this password reset, please ignore this message.\n\n"
        f"— CattleSense Platform"
    )


def send_password_reset_email(
    to_email: str,
    otp_code: str,
    recipient_name: str | None = None,
) -> tuple[bool, str | None]:
    """
    Send a password reset OTP email using the Resend Python SDK.
    Returns: (success: bool, error_message: str | None)
    """
    api_key, from_email = get_resend_config()

    if not api_key:
        logger.warning(
            "RESEND_API_KEY environment variable is not configured. Email dispatch skipped in local dev."
        )
        return False, "Email service is currently unconfigured on this server."

    resend.api_key = api_key

    html_content = build_password_reset_html(otp_code, recipient_name)
    text_content = build_password_reset_text(otp_code, recipient_name)

    try:
        params: resend.Emails.SendParams = {
            "from": from_email,
            "to": [to_email],
            "subject": "CattleSense Password Reset Verification Code",
            "html": html_content,
            "text": text_content,
        }
        response = resend.Emails.send(params)
        logger.info("Password reset email sent via Resend: %s", getattr(response, "id", "success"))
        return True, None
    except Exception as exc:
        logger.error("Failed to send email via Resend: %s", str(exc))
        return False, f"Email delivery failed: {str(exc)}"
