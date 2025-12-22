## Setup (Google Cloud)
- Create a Project: Go to the Google Cloud Console and create a new project.
- Enable API: Search for "Gmail API" in the library and enable it.
- Configure Consent Screen:
    - Go to "OAuth consent screen".
    - Choose External (unless you have a Google Workspace organization).
    - Add your own email as a Test User (crucial, otherwise you get a "403 Access Denied" error during dev).

- Create Credentials:
    - Go to "Credentials" -> "Create Credentials" -> "OAuth client ID".
    - Application type: Desktop app.
    - Download the JSON file and rename it to credentials.json. Place it in project folder.