package application

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

var (
	keyStyle     = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("111"))
	sectionStyle = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("229")).Underline(true)
)

type keyHelp struct {
	key, desc string
}

type helpSection struct {
	title string
	keys  []keyHelp
}

// keyLine renders keys as "key desc · key desc" with highlighted keys.
func (m model) keyLine(keys ...keyHelp) string {
	parts := make([]string, len(keys))
	for i, k := range keys {
		parts[i] = keyStyle.Render(k.key) + " " + dimStyle.Render(k.desc)
	}
	return strings.Join(parts, dimStyle.Render(" · "))
}

// helpBar is the one-line footer; it drops keys from the end until it fits.
func (m model) helpBar(keys ...keyHelp) string {
	for n := len(keys); n > 0; n-- {
		if line := " " + m.keyLine(keys[:n]...); ansi.StringWidth(line) <= m.width {
			return line
		}
	}
	return ansi.Truncate(" "+m.keyLine(keys...), m.width, "…")
}

// actionSection lists the action keys; with the Shift setting, the plain key
// acts on the cursor mail and the Shift key on the selection.
func (m model) actionSection() helpSection {
	if m.settings.ShiftSelection {
		return helpSection{"Act (cursor / Shift: selection)", []keyHelp{
			{"e E", "archive / move to inbox"},
			{"d D", "move to Trash"},
			{"m M", "mark read / unread"},
			{"v V", "add / remove label"},
			{"u", "unsubscribe from sender"},
			{"o", "open in Gmail"},
		}}
	}
	return helpSection{"Act on selection or cursor", []keyHelp{
		{"e", "archive / move to inbox"},
		{"d", "move to Trash"},
		{"m", "mark read / unread"},
		{"v", "add / remove label"},
		{"u", "unsubscribe from sender"},
		{"o", "open in Gmail"},
	}}
}

// helpSections lists the keys of the current view for the ? dialog.
func (m model) helpSections() []helpSection {
	switch m.mode {
	case modeReader:
		return []helpSection{
			{"Read", []keyHelp{
				{"j/k", "scroll"},
				{"space/b", "page down / up"},
				{"g/G", "top / bottom"},
				{"n/p", "next / previous mail"},
				{"q", "back to list"},
			}},
			m.actionSection(),
		}
	case modeStats:
		return []helpSection{
			{"Range", []keyHelp{
				{"h/l", "previous / next range"},
				{"t", "range ending today"},
				{"tab", "length: 7 / 30 / 90 days"},
				{"c", "custom range"},
				{"r", "reload range"},
			}},
			{"Senders", []keyHelp{
				{"j/k", "move"},
				{"enter", "mails of sender"},
				{"a", "all time (asks first)"},
				{"u", "unsubscribe"},
				{"q", "back to day view"},
			}},
		}
	}
	if m.list == listAll {
		title, back := "All mail", keyHelp{"a/esc", "back to day view"}
		if m.all.sender != nil {
			title, back = "Sender mail", keyHelp{"esc", "back to senders"}
		}
		return []helpSection{
			{title, []keyHelp{
				{"f", "filter: unread / all"},
				{"/", "search (Gmail query)"},
				{"tab", "all received / inbox"},
				{"r", "reload"},
				back,
			}},
			{"Move", []keyHelp{
				{"j/k", "up / down (more loads at the end)"},
				{"g/G", "top / bottom"},
				{"pgup/pgdn", "page"},
				{"enter", "read mail"},
			}},
			{"Select", []keyHelp{
				{"x", "mail (on sender: group)"},
				{"X", "clear selection"},
			}},
			m.actionSection(),
		}
	}
	return []helpSection{
		{"Move", []keyHelp{
			{"h/l", "previous / next day"},
			{"t", "today"},
			{"c", "calendar"},
			{"j/k", "up / down"},
			{"g/G", "top / bottom"},
			{"pgup/pgdn", "page"},
		}},
		{"Select", []keyHelp{
			{"x", "mail (on sender: group)"},
			{"A", "all of day / none"},
			{"X", "clear (all days)"},
		}},
		m.actionSection(),
		{"View", []keyHelp{
			{"enter", "read mail"},
			{"a", "all mail (unread first)"},
			{"tab", "all received / inbox"},
			{"space/z", "fold sender / all"},
			{"s", "senders over a range"},
			{"r", "reload day"},
			{",", "settings"},
			{"q", "quit"},
		}},
	}
}

// viewHelp renders the help sections in two columns, or one when narrow.
func (m model) viewHelp() string {
	sections := m.helpSections()
	blocks := make([]string, len(sections))
	for i, s := range sections {
		w := 0
		for _, k := range s.keys {
			w = max(w, len(k.key))
		}
		lines := []string{sectionStyle.Render(s.title)}
		for _, k := range s.keys {
			lines = append(lines, keyStyle.Render(pad(k.key, w))+"  "+k.desc)
		}
		blocks[i] = strings.Join(lines, "\n")
	}

	half := (len(blocks) + 1) / 2
	left := strings.Join(blocks[:half], "\n\n")
	right := strings.Join(blocks[half:], "\n\n")
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, "    ", right)
	if lipgloss.Width(body)+4 > m.width { // modal border and padding
		body = strings.Join(blocks, "\n\n")
	}
	return titleStyle.Render("Keys") + "\n\n" + body + "\n\n" + dimStyle.Render("any key to close")
}

// actionKeys are the action keys for footers; with the Shift setting and a
// selection, a reminder that Shift acts on it comes first.
func (m model) actionKeys() []keyHelp {
	keys := []keyHelp{{"e", "archive"}, {"d", "trash"}, {"m", "read/unread"}, {"v", "label"}}
	if m.settings.ShiftSelection && len(m.selected) > 0 {
		keys = append([]keyHelp{{"⇧", "on selection"}}, keys...)
	}
	return keys
}
