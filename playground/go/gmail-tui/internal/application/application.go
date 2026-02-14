package application

import (
	"fmt"
	"net/mail"
	"strings"

	"github.com/charmbracelet/bubbles/table"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"google.golang.org/api/gmail/v1"
)

// --- STYLING ---
var baseStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.NormalBorder()).
	BorderForeground(lipgloss.Color("240"))

// --- MODEL ---
type model struct {
	table             table.Model
	service           *gmail.Service
	err               error
	loading           bool
	nextPageToken     string
	currentFetchToken string
	pageStack         []string
	query             string // Track current filter (e.g., "label:INBOX")
}

// --- CONSTRUCTOR ---
func NewApplication(srv *gmail.Service) model {
	columns := []table.Column{
		{Title: " ", Width: 1},
		{Title: "From", Width: 20},
		{Title: "Subject", Width: 35},
		{Title: "Date", Width: 15},
		{Title: "Snippet", Width: 30},
	}

	t := table.New(
		table.WithColumns(columns),
		table.WithFocused(true),
		table.WithHeight(10),
	)

	s := table.DefaultStyles()
	s.Header = s.Header.
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(lipgloss.Color("240")).
		BorderBottom(true).
		Bold(true)
	s.Selected = s.Selected.
		Foreground(lipgloss.Color("229")).
		Background(lipgloss.Color("57")).
		Bold(false)
	t.SetStyles(s)

	return model{
		table:   t,
		service: srv,
		loading: true,
		query:   "label:INBOX", // Default to Inbox (Non-Archived)
	}
}

// --- MESSAGES ---
type emailsLoadedMsg struct {
	rows      []table.Row
	nextToken string
}

type errMsg error

// --- INIT ---
func (m model) Init() tea.Cmd {
	// Pass the current query to fetchEmails
	return fetchEmails(m.service, "", m.query)
}

// --- UPDATE ---
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {

	case tea.WindowSizeMsg:
		h := msg.Height - 5
		if h < 5 {
			h = 5
		}
		m.table.SetHeight(h)
		m.table.SetWidth(msg.Width)
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit

		// Toggle View Mode
		case "tab":
			m.loading = true
			m.pageStack = []string{} // Clear history
			m.currentFetchToken = ""
			m.nextPageToken = ""
			m.table.SetCursor(0)

			// Toggle between Inbox and Archived
			if m.query == "label:INBOX" {
				m.query = "-label:INBOX" // Syntax for "Not Inbox" (Archived)
			} else {
				m.query = "label:INBOX"
			}
			return m, fetchEmails(m.service, "", m.query)

		case "n", "right":
			if m.nextPageToken != "" && !m.loading {
				m.loading = true
				m.pageStack = append(m.pageStack, m.currentFetchToken)
				m.currentFetchToken = m.nextPageToken
				return m, fetchEmails(m.service, m.nextPageToken, m.query)
			}

		case "p", "left":
			if len(m.pageStack) > 0 && !m.loading {
				m.loading = true
				lastIndex := len(m.pageStack) - 1
				prevToken := m.pageStack[lastIndex]
				m.pageStack = m.pageStack[:lastIndex]
				m.currentFetchToken = prevToken
				return m, fetchEmails(m.service, prevToken, m.query)
			}
		}

	case emailsLoadedMsg:
		m.loading = false
		m.table.SetRows(msg.rows)
		m.nextPageToken = msg.nextToken
		m.table.SetCursor(0)

	case errMsg:
		m.err = msg
		return m, tea.Quit
	}

	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

// --- VIEW ---
func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v", m.err)
	}

	view := baseStyle.Render(m.table.View()) + "\n"

	// Determine View Name
	viewName := "Inbox"
	if m.query == "-label:INBOX" {
		viewName = "Archived"
	}

	if m.loading {
		view += fmt.Sprintf(" Status: Loading %s...", viewName)
	} else {
		page := len(m.pageStack) + 1
		view += fmt.Sprintf(" %s (Pg %d) | 'tab' Toggle View | 'n' Next | 'p' Prev | 'q' Quit", viewName, page)
	}

	return view
}

// --- COMMANDS ---
// fetchEmails now accepts a 'query' argument to filter results
func fetchEmails(srv *gmail.Service, pageToken string, query string) tea.Cmd {
	return func() tea.Msg {
		call := srv.Users.Messages.List("me").MaxResults(50).Q(query) // Apply Query
		if pageToken != "" {
			call = call.PageToken(pageToken)
		}

		r, err := call.Do()
		if err != nil {
			return errMsg(err)
		}

		var rows []table.Row

		for _, msg := range r.Messages {
			fullMsg, err := srv.Users.Messages.Get("me", msg.Id).Format("metadata").Do()
			if err != nil {
				continue
			}

			status := ""
			isUnread := false
			for _, label := range fullMsg.LabelIds {
				if label == "UNREAD" {
					isUnread = true
					break
				}
			}
			if isUnread {
				status = "" // \uf0e0
			}

			sender := ""
			subject := "(No Subject)"
			dateStr := ""

			for _, h := range fullMsg.Payload.Headers {
				switch h.Name {
				case "From":
					sender = h.Value
				case "Subject":
					subject = h.Value
				case "Date":
					dateStr = h.Value
				}
			}

			if strings.Contains(sender, "<") {
				sender = strings.Split(sender, "<")[0]
				sender = strings.TrimSpace(sender)
			}
			if len(sender) > 20 {
				sender = sender[:20] + ".."
			}

			if len(subject) > 35 {
				subject = subject[:35] + ".."
			}

			parsedTime, err := mail.ParseDate(dateStr)
			if err == nil {
				dateStr = parsedTime.Format("Jan 02 15:04")
			} else {
				if len(dateStr) > 15 {
					dateStr = dateStr[:15] + ".."
				}
			}

			snippet := fullMsg.Snippet
			if len(snippet) > 30 {
				snippet = snippet[:30] + "..."
			}

			rows = append(rows, table.Row{status, sender, subject, dateStr, snippet})
		}

		return emailsLoadedMsg{rows: rows, nextToken: r.NextPageToken}
	}
}
