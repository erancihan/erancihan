# gmail-tui

Terminal Gmail viewer that shows mail one day at a time, grouped by sender.
Access is read-only (`gmail.readonly` scope).

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
    - Download the JSON file and rename it to `credentials.json`.

Place `credentials.json` in the first of these that applies:
1. `$GMAIL_TUI_HOME`, if set.
2. `./secrets/`, if it already holds `credentials.json` (gitignored).
3. `~/.config/gmail-tui/`.

The login token is saved next to it as `token.json`. On first run the app opens a
browser for login (it prints the link too). While the consent screen is in
"Testing" mode, Google expires the login after 7 days; the app then asks you to
log in again.

## Run
```sh
go run .
```

## Keys

Day view
| Key | Action |
| --- | --- |
| `h` / `l`, `←` / `→` | previous / next day |
| `t` | today |
| `j` / `k`, `g` / `G`, `pgup` / `pgdn` | move |
| `enter` | read mail (on a sender: fold) |
| `space` / `z` | fold sender / fold all (folds are kept across days) |
| `u` | open the sender's unsubscribe link |
| `o` | open the mail in Gmail |
| `s` | sender stats |
| `tab` | switch between all received mail and inbox only |
| `r` | reload the day |
| `q` | quit |

Reader: `j`/`k` scroll, `space`/`b` page, `n`/`p` next/previous mail, `u` unsubscribe, `o` open in Gmail, `q` back.

Sender stats: senders ranked by mail count over 7, 30 or 90 days ending at the
current day (`tab` cycles). `u` opens the selected sender's unsubscribe link,
`r` reloads, `q` back. At most 2000 mails are counted per range.
