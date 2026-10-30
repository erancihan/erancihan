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

## Spans
The day list shows one day by default. `w` (or `1`–`5` in its dialog) switches
to This week (Monday–Sunday), Last 7 days, Last 30 days or Last 90 days, shown
as one list with a date column. `h`/`l` move by the span's length (a week, 7,
30 or 90 days), never past today, and `t` goes to the span ending today. Days
come from the day cache; missing days are fetched newest first, two at a time,
and appear as they arrive. The span is remembered with the Remember view
setting. Picking a day in the calendar switches back to Day.

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
| `h` / `l`, `←` / `→` | previous / next day (or span) |
| `w` | span: Day, This week, Last 7 / 30 / 90 days |
| `t` | today |
| `c` | calendar |
| `a` | all mail list (see below) |
| `j` / `k`, `g` / `G`, `pgup` / `pgdn` | move |
| `enter` | read mail (on a sender: fold) |
| `x` | select mail (on a sender: the whole group) |
| `A` | select all mail of the shown day, or unselect them |
| `X` | clear the selection on all days |
| `e` / `E` | archive; if none is in the inbox, move back to the inbox |
| `d` / `D` | move to Trash (asks first) |
| `m` / `M` | mark read; if all are read already, mark unread |
| `v` / `V` | label picker: type to filter, `enter` adds the label (or removes it if all have it), a new name creates it (`L` = `V`) |
| `u` | open the sender's unsubscribe link |
| `o` | open the mail in Gmail |
| `s` | sender stats |
| `#` | labels screen (create, rename, move, delete) |
| `tab` | switch between all received mail and inbox only |
| `space` / `z` | fold sender / fold all (grouped view) |
| `,` | settings |
| `r` | reload the day |
| `q` | quit |

With the "Shift applies actions to selection" setting (on by default), `e`,
`d`, `m` and `v` act on the mail under the cursor (on a sender header: the
group), and `E`, `D`, `M` and `V` act on the selected mails, so you can handle
one mail without losing a selection. With the setting off, both forms act on
the selected mails, or on the mail under the cursor when
nothing is selected. In the All received view, archived mails have a faint
subject. The selection is kept while you read mail and change days,
so one action can cover mail from several days; the title shows how many
selected mails are on other days.

The title shows the shown day's unread count and the inbox's unread count over
all days.

Reader: `j`/`k` scroll, `space`/`b` page, `n`/`p` next/previous mail, `u`, `o`, `q` back;
`e` `d` `m` `v` act on the open mail, and with the Shift setting `E` `D` `M` `V`
act on the selection.

Senders (`s`): senders ranked by mail count over a range of days, by default
the last 7 days ending today. `h`/`l` move the range back or forward by its own
length, `tab` cycles the length (7, 30, 90 days), `t` makes it end today, and
`c` sets any From–To range (up to 366 days). `a` counts over all time (the
newest 10,000 mails) after asking first, since Gmail needs one request per
mail; `tab` goes back to the range. Ranges whose days are all cached are
counted at once; otherwise the mails are listed and only those not stored yet
are fetched, with progress shown. `enter` opens the selected sender's mail over
the same range as a mail list (reader, selection and actions work as usual;
`esc` goes back to the senders). `u` opens the sender's unsubscribe link, `r`
reloads, `q` goes back.

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

## Labels
`#` shows your labels as a tree with mail and unread counts. Gmail nests labels
by name only (`Work/Clients` shows under `Work`), so a parent that is not a
label itself is shown as "parent name only".

- `n` creates a label (use `/` to nest), `N` creates one below the selected label.
- `r` renames the selected level; labels below it follow.
- `m` moves a label under another label or to the top level. Its sub-labels
  move with it (`Work/Clients/2024` becomes `Archive/Clients/2024`), as in
  Gmail's web client. Names that would clash with an existing label are refused.
- `d` deletes a label after asking. Mail is not deleted, it only loses the
  label. If the label has labels below it, `y` keeps them and `a` deletes them too.
- `enter` lists the mail with that label; `esc` comes back. `R` reloads.

## Settings
| Setting | Default |
| --- | --- |
| Group by sender | off: one list, newest first |
| Mark as read when opened | on |
| Remember view: start in the view (All received / Inbox) and span last chosen | on |
| Shift applies actions to selection: `e d m v` act on the cursor mail, `E D M V` on the selection | on |

"Colors…" at the end of the settings dialog opens the theme screen: the color
roles (cursor, selected rows, titles, senders, labels, errors, …) next to a
live preview. `[`/`]` switch between the presets Default, Light (for light
terminals), Ocean, Forest, Sunset and Mono. `enter` opens a 256-color picker
for the selected role; moving through it updates the preview at once, `enter`
keeps the color, `esc` restores the previous one, and `#` takes a hex value
(`#d7ffd7`). `x` resets a role to its default. Changed colors are saved under
`colors` in `settings.json`.
