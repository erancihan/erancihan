package application

import (
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"
	"google.golang.org/api/gmail/v1"
)

// --- MODEL ---
type reader struct {
	email  email    // list entry the reader was opened from
	msg    *message // nil while loading
	err    error
	lines  []string // wrapped header and body
	offset int
	height int
}

type messageLoadedMsg struct {
	id  string
	msg *message
	err error
}

func (m model) openReader(e email) (tea.Model, tea.Cmd) {
	m.mode = modeReader
	m.status = ""
	m.reader = reader{email: e, msg: m.bodies[e.ID]}
	m.reader.layout(m.width, m.readerHeight())
	var cmds []tea.Cmd
	if m.reader.msg == nil {
		cmds = append(cmds, fetchMessage(m.service, e.ID))
	}
	if m.settings.MarkReadOnOpen && e.Unread {
		cmds = append(cmds, modifyCmd(m.service, []string{e.ID}, nil, []string{"UNREAD"}, ""))
	}
	return m, tea.Batch(cmds...)
}

func (m model) messageLoaded(msg messageLoadedMsg) (tea.Model, tea.Cmd) {
	if msg.err == nil {
		m.bodies[msg.id] = msg.msg
	}
	if m.mode == modeReader && msg.id == m.reader.email.ID {
		m.reader.msg, m.reader.err = msg.msg, msg.err
		m.reader.layout(m.width, m.readerHeight())
	}
	return m, nil
}

// readerHeight is the screen height minus status and help.
func (m model) readerHeight() int {
	return max(1, m.height-2)
}

// layout wraps the header and body to the screen width.
func (r *reader) layout(width, height int) {
	r.height = height
	r.lines = nil
	add := func(s string) {
		r.lines = append(r.lines, strings.Split(ansi.Wrap(s, width, ""), "\n")...)
	}

	add(titleStyle.Render(r.email.Subject))
	if r.msg != nil {
		add(dimStyle.Render("From: ") + r.msg.From)
		if r.msg.To != "" {
			add(dimStyle.Render("To:   ") + r.msg.To)
		}
		add(dimStyle.Render("Date: ") + r.msg.Date)
		if r.msg.Unsubscribe != "" {
			add(dimStyle.Render("Unsubscribe: " + r.msg.Unsubscribe))
		}
	} else {
		add(dimStyle.Render("From: ") + r.email.FromName + " <" + r.email.FromAddr + ">")
	}
	r.lines = append(r.lines, dimStyle.Render(strings.Repeat("─", width)))

	switch {
	case r.err != nil:
		add(errorStyle.Render("Error: " + r.err.Error()))
	case r.msg == nil:
		add("Loading…")
	default:
		add(r.msg.Body)
	}
	r.scrollBy(0)
}

func (r *reader) scrollBy(delta int) {
	r.offset = max(0, min(r.offset+delta, len(r.lines)-r.height))
}

// --- UPDATE ---
func (m model) updateReader(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "esc", "backspace", "h", "left":
		m.mode = modeDay
		m.status = ""

	case "j", "down":
		m.reader.scrollBy(1)
	case "k", "up":
		m.reader.scrollBy(-1)
	case " ", "pgdown", "ctrl+d", "f":
		m.reader.scrollBy(m.reader.height - 1)
	case "pgup", "ctrl+u", "b":
		m.reader.scrollBy(-(m.reader.height - 1))
	case "g", "home":
		m.reader.scrollBy(-len(m.reader.lines))
	case "G", "end":
		m.reader.scrollBy(len(m.reader.lines))

	// Next / previous mail of the day, in list order
	case "n":
		if m.stepEmail(1) {
			e, _ := m.selectedEmail()
			next, cmd := m.openReader(e)
			nm := next.(model)
			more := nm.loadMoreIfNeeded()
			return nm, tea.Batch(cmd, more)
		}
	case "p":
		if m.stepEmail(-1) {
			e, _ := m.selectedEmail()
			return m.openReader(e)
		}

	case "u":
		link := m.reader.email.Unsubscribe
		if m.reader.msg != nil && m.reader.msg.Unsubscribe != "" {
			link = m.reader.msg.Unsubscribe
		}
		return m, openUnsubscribe(m.reader.email.FromName, link)
	case "o":
		return m, openLink(gmailLink(m.reader.email.ID))

	// Actions on this mail
	case "e", "E", "d", "D", "m", "M", "v", "V", "L":
		act, shift, _ := actionKey(msg.String())
		if !m.settings.ShiftSelection {
			return m.runOn(act, []email{m.reader.email}, false) // without the setting, the reader acts on the open mail
		}
		return m.runAction(act, shift, []email{m.reader.email})
	}
	return m, nil
}

// --- VIEW ---
func (m model) viewReader() string {
	r := m.reader
	var b strings.Builder
	end := min(r.offset+r.height, len(r.lines))
	for _, l := range r.lines[r.offset:end] {
		b.WriteString(l + "\n")
	}
	b.WriteString(strings.Repeat("\n", max(0, r.height-(end-r.offset))))
	b.WriteString(m.footerStatus())
	keys := []keyHelp{{"?", "help"}, {"q", "back"}, {"n/p", "next/prev"}}
	b.WriteString(m.helpBar(append(keys, m.actionKeys()...)...))
	return b.String()
}

// --- COMMANDS ---
func fetchMessage(srv *gmail.Service, id string) tea.Cmd {
	return func() tea.Msg {
		msg, err := loadMessage(srv, id)
		return messageLoadedMsg{id: id, msg: msg, err: err}
	}
}
