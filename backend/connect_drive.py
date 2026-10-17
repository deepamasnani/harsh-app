"""One-time Google sign-in so invoices save to your Drive."""

from google_auth_oauthlib.flow import InstalledAppFlow

from app.config import GDRIVE_OAUTH_CLIENT_FILE, GDRIVE_TOKEN_FILE
from app.storage import DRIVE_SCOPES, _save_token, ensure_folders


def main():
    if not GDRIVE_OAUTH_CLIENT_FILE.exists():
        print("Missing %s" % GDRIVE_OAUTH_CLIENT_FILE)
        print()
        print("In Google Cloud:")
        print("  1. Enable Google Drive API")
        print("  2. Configure the OAuth consent screen (External, add yourself as a test user)")
        print("  3. Create Credentials → OAuth client ID → Desktop app")
        print("  4. Download the JSON and save it as:")
        print("     %s" % GDRIVE_OAUTH_CLIENT_FILE)
        raise SystemExit(1)

    print("A browser window will open. Sign in with the Google account that owns the Drive.")
    flow = InstalledAppFlow.from_client_secrets_file(str(GDRIVE_OAUTH_CLIENT_FILE), DRIVE_SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")
    _save_token(creds)
    print("Saved login to %s" % GDRIVE_TOKEN_FILE)
    ensure_folders()
    print("Created Drive folders: Harsh Hardware / signatures and Harsh Hardware / invoices")


if __name__ == "__main__":
    main()
