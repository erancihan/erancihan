# gmail-tui

Terminal Gmail client that shows mail one day at a time. It can move mail to
Trash, mark it read or unread, and add or remove labels, one mail at a time or in
bulk. It uses the `gmail.modify` scope; it cannot delete mail permanently.

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

The login token is saved next to it as `token.json`, and settings as
`settings.json`. When the app needs different permissions than the saved login
has (for example after an upgrade from the read-only version), it asks you to log
in again. On first run the app opens a
browser for login (it prints the link too). While the consent screen is in
"Testing" mode, Google expires the login after 7 days; the app then asks you to
log in again.

## Caching
Each mail is stored once, in `cache.json` (next to `token.json`); days and the
all-mail list refer to mails by id. Each day is fetched once (the last 60 days
are kept on disk), so past days open instantly, also after a restart. The
all-mail list asks Gmail which mails match, but only downloads mails that are
not stored yet. Mail cannot arrive
in the past, so days are never listed again. Changes still happen to known mail
(read in another client, labelled, trashed), and new mail arrives for today:
every minute the app asks Gmail's History API for changes since the last check
and applies them. The day before the shown one is loaded in the background.
`r` reloads the shown day from scratch.

## Run
```sh
go run .
```

## Keys
The footer shows the main keys; `?` shows all keys of the current view.

Day view
| Key | Action |
| --- | --- |
| `h` / `l`, `←` / `→` | previous / next day |
| `t` | today |
| `c` | calendar |
| `a` | all mail list (see below) |
| `j` / `k`, `g` / `G`, `pgup` / `pgdn` | move |
| `enter` | read mail (on a sender: fold) |
| `x` | select mail (on a sender: the whole group) |
| `A` | select all mail of the shown day, or unselect them |
| `X` | clear the selection on all days |
| `d` | move to Trash (asks first) |
| `m` | mark read; if all are read already, mark unread |
| `e` | archive; if none is in the inbox, move back to the inbox |
| `L` | label picker: type to filter, `enter` adds the label (or removes it if all have it), a new name creates it |
| `u` | open the sender's unsubscribe link |
| `o` | open the mail in Gmail |
| `s` | sender stats |
| `tab` | switch between all received mail and inbox only |
| `space` / `z` | fold sender / fold all (grouped view) |
| `,` | settings |
| `r` | reload the day |
| `q` | quit |

`e`, `d`, `m` and `L` act on the selected mails, or on the mail under the cursor when
nothing is selected. In the All received view, archived mails have a faint
subject. The selection is kept while you read mail and change days,
so one action can cover mail from several days; the title shows how many
selected mails are on other days.

The title shows the shown day's unread count and the inbox's unread count over
all days.

Reader: `j`/`k` scroll, `space`/`b` page, `n`/`p` next/previous mail, `e`, `d`, `m`,
`L`, `u`, `o` as above, `q` back.

Senders (`s`): senders ranked by mail count over a range of days, by default
the last 7 days ending today. `h`/`l` move the range back or forward by its own
length, `tab` cycles the length (7, 30, 90 days), `t` makes it end today, and
`c` sets any From–To range (up to 366 days). Ranges whose days are all cached
are counted at once; others are fetched once (at most 2000 mails), and the
fetched days are added to the cache. `u` opens the selected sender's
unsubscribe link, `r` reloads, `q` goes back.

All mail (`a`): one list across all dates, newest first, to work through old
mail without going day by day. It starts filtered to unread mail; `f` switches
between Unread and All, `/` adds any Gmail query (`from:github`,
`older_than:1y`, `label:work`, …), and `tab` switches All received / Inbox.
It loads 100 mails at a time and loads more as you scroll to the end. Mails you
read or archive stay in the list (shown as read / faint) until `r` reloads it,
like in Gmail. Selection, actions and the reader work as in the day view;
`a` or `esc` goes back to the day view.

Calendar (`c`): the month of the shown day, with each day's mail and unread
count in the current view. Cached days are counted from the cache; other past
days are counted with id-only list requests (no mail is downloaded). `h`/`l`
move a day, `j`/`k` a week, `[`/`]` a month, `t` goes to today, `enter` opens
the day, `r` counts the month again, `esc` closes.

## Settings
| Setting | Default |
| --- | --- |
| Group by sender | off: one list, newest first |
| Mark as read when opened | on |
| Remember view: start in the view (All received / Inbox) last chosen with `tab` | on |
