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

type Application struct {
	Table   table.Model
	Service *gmail.Service // Google Service
	err     error
	Loading bool

	nextPageToken     string
	currentFetchToken string
	pageStack         []string
}

// Custom message types for Bubble Tea
type emailsLoadedMsg struct {
	rows      []table.Row
	nextToken string
}

type errMsg error

func NewApplication(srv *gmail.Service) Application {
	columns := []table.Column{
		{Title: "St", Width: 4},
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

	return Application{
		Table:   t,
		Service: srv,
		Loading: true,
	}
}

// --- INIT (Start of the app) ---
func (m Application) Init() tea.Cmd {
	// Start by fetching the first page (token is empty string)
	return fetchEmails(m.Service, "")
}

func (m Application) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {

	// 1. Handle Window Resize (Dynamic Layout)
	case tea.WindowSizeMsg:
		// Calculate height: Window Height - Header/Footer/Borders (approx 5 lines)
		h := msg.Height - 5
		if h < 5 {
			h = 5 // Minimum height
		}
		m.Table.SetHeight(h)
		m.Table.SetWidth(msg.Width)
		// Adjust column widths relative to screen width?
		// For simplicity, we keep fixed ratios, but you could calc here.
		return m, nil

	// 2. Handle Key Presses
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit

		case "n", "right":
			// Go to Next Page
			if m.nextPageToken != "" && !m.Loading {
				m.Loading = true
				// Push current token to history stack so we can go back
				m.pageStack = append(m.pageStack, m.currentFetchToken)
				// Set current token to the next one
				m.currentFetchToken = m.nextPageToken
				return m, fetchEmails(m.Service, m.nextPageToken)
			}

		case "p", "left":
			// Go to Previous Page
			if len(m.pageStack) > 0 && !m.Loading {
				m.Loading = true
				// Pop the last token from history
				lastIndex := len(m.pageStack) - 1
				prevToken := m.pageStack[lastIndex]
				m.pageStack = m.pageStack[:lastIndex]

				// Set current token
				m.currentFetchToken = prevToken
				return m, fetchEmails(m.Service, prevToken)
			}
		}

	// 3. Handle Data Loaded
	case emailsLoadedMsg:
		m.Loading = false
		m.Table.SetRows(msg.rows)
		m.nextPageToken = msg.nextToken
		// Reset cursor to top of list
		m.Table.SetCursor(0)

	// 4. Handle Errors
	case errMsg:
		m.err = msg
		return m, tea.Quit
	}

	m.Table, cmd = m.Table.Update(msg)
	return m, cmd
}

// --- VIEW ---
func (m Application) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v", m.err)
	}

	view := baseStyle.Render(m.Table.View()) + "\n"

	if m.Loading {
		view += " Status: Loading..."
	} else {
		page := len(m.pageStack) + 1
		view += fmt.Sprintf(" Page %d | 'n' for next, 'p' for prev, 'q' to quit", page)
	}

	return view
}

func fetchEmails(srv *gmail.Service, pageToken string) tea.Cmd {
	return func() tea.Msg {
		call := srv.Users.Messages.List("me").MaxResults(50)
		if pageToken != "" {
			call = call.PageToken(pageToken)
		}

		r, err := call.Do()
		if err != nil {
			return errMsg(err)
		}

		var rows []table.Row

		for _, msg := range r.Messages {
			// 'metadata' format is faster than 'full' as it skips the body
			fullMsg, err := srv.Users.Messages.Get("me", msg.Id).Format("metadata").Do()
			if err != nil {
				continue
			}

			// --- 1. Determine Read Status ---
			status := ""
			isUnread := false
			for _, label := range fullMsg.LabelIds {
				if label == "UNREAD" {
					isUnread = true
					break
				}
			}
			if isUnread {
				// use closed envelope for read emails
				status = "●" // Bullet point for unread
			}

			// --- 2. Parse Headers ---
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

			// Clean Sender
			if strings.Contains(sender, "<") {
				sender = strings.Split(sender, "<")[0]
				sender = strings.TrimSpace(sender)
			}
			sender = truncateString(sender, 20)

			// Clean Subject
			subject = truncateString(subject, 35)

			// Parse and Clean Date
			parsedTime, err := mail.ParseDate(dateStr)
			if err == nil {
				dateStr = parsedTime.Format("Jan 02 15:04")
			} else {
				if len(dateStr) > 15 {
					dateStr = dateStr[:15] + ".."
				}
			}

			// Clean Snippet
			snippet := fullMsg.Snippet
			snippet = truncateString(snippet, 30)

			rows = append(rows, table.Row{status, sender, subject, dateStr, snippet})
		}

		return emailsLoadedMsg{rows: rows, nextToken: r.NextPageToken}
	}
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-2] + ".."
}
