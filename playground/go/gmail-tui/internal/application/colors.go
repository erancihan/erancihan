package application

import (
	"fmt"
	"maps"
	"regexp"
	"strconv"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// Colors are 256-color numbers or hex values. settings.json can override each
// role; applyColors rebuilds the styles from them. The theme dialog offers
// presets, a 256-color picker and a live preview.

type colorRole struct {
	key  string // name in settings.json
	name string
	def  string
}

var colorRoles = []colorRole{
	{"cursor_bg", "Cursor background", "57"},
	{"cursor_fg", "Cursor text", "229"},
	{"selected_bg", "Selected background", "194"},
	{"selected_fg", "Selected text", "235"},
	{"title", "Titles", "229"},
	{"sender", "Senders and keys", "111"},
	{"label", "Labels", "180"},
	{"check", "Check marks", "78"},
	{"dim", "Dimmed text", "240"},
	{"error", "Errors", "203"},
	{"border", "Dialog border", "62"},
}

// themes are presets: full sets of role colors. Default is no overrides.
var themes = []struct {
	name   string
	colors map[string]string
}{
	{"Default", nil},
	{"Light", map[string]string{"cursor_bg": "153", "cursor_fg": "16", "selected_bg": "194", "selected_fg": "22",
		"title": "25", "sender": "26", "label": "130", "check": "28", "dim": "245", "error": "160", "border": "25"}},
	{"Ocean", map[string]string{"cursor_bg": "24", "cursor_fg": "195", "selected_bg": "23", "selected_fg": "159",
		"title": "81", "sender": "117", "label": "222", "check": "43", "dim": "244", "error": "203", "border": "31"}},
	{"Forest", map[string]string{"cursor_bg": "22", "cursor_fg": "193", "selected_bg": "194", "selected_fg": "22",
		"title": "150", "sender": "114", "label": "180", "check": "78", "dim": "242", "error": "167", "border": "65"}},
	{"Sunset", map[string]string{"cursor_bg": "130", "cursor_fg": "230", "selected_bg": "223", "selected_fg": "52",
		"title": "215", "sender": "209", "label": "180", "check": "150", "dim": "243", "error": "196", "border": "166"}},
	{"Mono", map[string]string{"cursor_bg": "250", "cursor_fg": "232", "selected_bg": "238", "selected_fg": "255",
		"title": "255", "sender": "252", "label": "248", "check": "255", "dim": "242", "error": "255", "border": "245"}},
}

var hexColor = regexp.MustCompile(`^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)

// validColor reports whether s is a 256-color number or a hex color.
func validColor(s string) bool {
	if hexColor.MatchString(s) {
		return true
	}
	n, err := strconv.Atoi(s)
	return err == nil && n >= 0 && n <= 255
}

// colorOf returns the color of a role: its valid override, else its default.
func colorOf(over map[string]string, key string) lipgloss.Color {
	if c, ok := over[key]; ok && validColor(c) {
		return lipgloss.Color(c)
	}
	for _, r := range colorRoles {
		if r.key == key {
			return lipgloss.Color(r.def)
		}
	}
	return lipgloss.Color("")
}

// applyColors rebuilds the styles with the given overrides.
func applyColors(over map[string]string) {
	c := func(key string) lipgloss.Color { return colorOf(over, key) }
	titleStyle = lipgloss.NewStyle().Bold(true).Foreground(c("title"))
	dimStyle = lipgloss.NewStyle().Foreground(c("dim"))
	senderStyle = lipgloss.NewStyle().Bold(true).Foreground(c("sender"))
	selectedStyle = lipgloss.NewStyle().Foreground(c("cursor_fg")).Background(c("cursor_bg"))
	errorStyle = lipgloss.NewStyle().Foreground(c("error"))
	checkStyle = lipgloss.NewStyle().Bold(true).Foreground(c("check"))
	markedStyle = lipgloss.NewStyle().Foreground(c("selected_fg")).Background(c("selected_bg"))
	labelStyle = lipgloss.NewStyle().Foreground(c("label"))
	modalStyle = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(c("border")).Padding(0, 1)
	todayStyle = lipgloss.NewStyle().Bold(true).Underline(true).Foreground(c("title"))
	shownStyle = lipgloss.NewStyle().Bold(true).Foreground(c("check"))
	keyStyle = lipgloss.NewStyle().Bold(true).Foreground(c("sender"))
	sectionStyle = lipgloss.NewStyle().Bold(true).Foreground(c("title")).Underline(true)
}

// themeName names the preset the overrides match, or "Custom".
func themeName(over map[string]string) string {
	for _, t := range themes {
		if maps.Equal(t.colors, over) || len(t.colors) == 0 && len(over) == 0 {
			return t.name
		}
	}
	return "Custom"
}

// --- PALETTE ---

// paletteRows lays out the 256 colors: the 16 basic colors, the 6×6×6 cube
// as six rows of 36 (one row per red level), and the 24 grays.
var paletteRows = func() [][]int {
	rows := [][]int{make([]int, 16)}
	for i := range 16 {
		rows[0][i] = i
	}
	for r := range 6 {
		row := make([]int, 36)
		for c := range 36 {
			row[c] = 16 + r*36 + c
		}
		rows = append(rows, row)
	}
	gray := make([]int, 24)
	for i := range 24 {
		gray[i] = 232 + i
	}
	return append(rows, gray)
}()

// palettePos finds a 256-color number in the palette; hex colors start at 0,0.
func palettePos(c string) (row, col int) {
	n, err := strconv.Atoi(c)
	if err != nil {
		return 0, 0
	}
	for r, cols := range paletteRows {
		for i, v := range cols {
			if v == n {
				return r, i
			}
		}
	}
	return 0, 0
}

// --- DIALOG ---

// colorEditor is the state of the theme dialog.
type colorEditor struct {
	cursor   int    // role
	picking  bool   // the palette is open for the role
	row, col int    // palette cursor
	before   string // the role's override when picking started ("" = default)
	hex      bool   // typing a hex value
	value    string // hex being typed
	err      string
}

// setColor stores an override (empty resets to the default) and applies it;
// persist also saves the settings.
func (m *model) setColor(key, value string, persist bool) {
	if m.settings.Colors == nil {
		m.settings.Colors = map[string]string{}
	}
	if value == "" {
		delete(m.settings.Colors, key)
	} else {
		m.settings.Colors[key] = value
	}
	applyColors(m.settings.Colors)
	if persist {
		m.saveSettings()
	}
}

func (m *model) saveSettings() {
	if err := m.settings.save(m.settingsPath); err != nil {
		m.status = errorStyle.Render("Could not save settings: " + err.Error())
	}
}

// setTheme replaces all overrides with a preset.
func (m *model) setTheme(i int) {
	m.settings.Colors = maps.Clone(themes[i].colors)
	applyColors(m.settings.Colors)
	m.saveSettings()
}

func (m model) updateColors(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	ed := &m.colorEd
	role := colorRoles[ed.cursor]
	k := msg.String()

	switch {
	case ed.hex:
		switch k {
		case "esc":
			ed.hex, ed.err = false, ""
		case "backspace":
			if ed.value != "" {
				ed.value = ed.value[:len(ed.value)-1]
			}
		case "enter":
			v := ed.value
			if !strings.HasPrefix(v, "#") {
				v = "#" + v
			}
			if !hexColor.MatchString(v) {
				ed.err = "use #rgb or #rrggbb"
				return m, nil
			}
			ed.hex, ed.picking, ed.err = false, false, ""
			m.setColor(role.key, v, true)
		default:
			if len(k) == 1 && strings.ContainsAny(k, "0123456789abcdefABCDEF#") && len(ed.value) < 7 {
				ed.value += k
				ed.err = ""
			}
		}
		return m, nil

	case ed.picking:
		row, col := ed.row, ed.col
		switch k {
		case "h", "left":
			col--
		case "l", "right":
			col++
		case "k", "up":
			row--
		case "j", "down":
			row++
		case "enter", " ":
			ed.picking = false
			m.setColor(role.key, m.settings.Colors[role.key], true)
			return m, nil
		case "esc", "q":
			ed.picking = false
			m.setColor(role.key, ed.before, false) // back to what it was
			return m, nil
		case "#":
			ed.hex, ed.value, ed.err = true, "#", ""
			return m, nil
		case "x":
			ed.picking = false
			m.setColor(role.key, "", true)
			return m, nil
		default:
			return m, nil
		}
		row = max(0, min(row, len(paletteRows)-1))
		if row != ed.row { // keep the horizontal position across rows of other lengths
			col = col * len(paletteRows[row]) / len(paletteRows[ed.row])
		}
		col = max(0, min(col, len(paletteRows[row])-1))
		ed.row, ed.col = row, col
		m.setColor(role.key, strconv.Itoa(paletteRows[row][col]), false) // live preview
		return m, nil
	}

	switch k {
	case "esc", "q":
		m.modal = modalSettings
	case "j", "down":
		ed.cursor = min(ed.cursor+1, len(colorRoles)-1)
	case "k", "up":
		ed.cursor = max(ed.cursor-1, 0)
	case "enter", " ":
		ed.before = m.settings.Colors[role.key]
		ed.row, ed.col = palettePos(string(colorOf(m.settings.Colors, role.key)))
		ed.picking = true
	case "#":
		ed.before = m.settings.Colors[role.key]
		ed.picking, ed.hex, ed.value, ed.err = true, true, "#", ""
	case "x", "backspace", "delete":
		m.setColor(role.key, "", true)
	case "]", "[":
		i := 0
		for j, t := range themes {
			if t.name == themeName(m.settings.Colors) {
				i = j
			}
		}
		if k == "]" {
			i = (i + 1) % len(themes)
		} else {
			i = (i - 1 + len(themes)) % len(themes)
		}
		m.setTheme(i)
	}
	return m, nil
}

// --- VIEW ---
func swatch(c lipgloss.Color) string {
	return lipgloss.NewStyle().Background(c).Render("  ")
}

func (m model) viewColors() string {
	ed := m.colorEd
	var left []string
	themeLine := "Theme  " + dimStyle.Render("◂ ") + titleStyle.Render(themeName(m.settings.Colors)) + dimStyle.Render(" ▸")
	left = append(left, titleStyle.Render("Colors"), themeLine, "")
	for i, r := range colorRoles {
		c := colorOf(m.settings.Colors, r.key)
		value := string(c)
		if _, ok := m.settings.Colors[r.key]; !ok {
			value = dimStyle.Render(value)
		}
		name := pad(r.name, 20)
		if i == ed.cursor {
			name = selectedStyle.Render(name)
		}
		left = append(left, swatch(c)+" "+name+" "+value)
	}

	right := m.themePreview()
	var body string
	if ed.picking {
		body = m.viewPalette()
	} else {
		body = strings.Join(left, "\n")
	}
	if lipgloss.Width(body)+lipgloss.Width(right)+8 <= m.width {
		body = lipgloss.JoinHorizontal(lipgloss.Top, body, "    ", right)
	} else {
		body += "\n\n" + right
	}

	var keys string
	switch {
	case ed.hex:
		keys = m.keyLine(keyHelp{"enter", "use"}, keyHelp{"esc", "back to palette"})
	case ed.picking:
		keys = m.keyLine(keyHelp{"hjkl", "pick"}, keyHelp{"enter", "keep"}, keyHelp{"#", "hex"},
			keyHelp{"x", "default"}, keyHelp{"esc", "undo"})
	default:
		keys = m.keyLine(keyHelp{"j/k", "role"}, keyHelp{"enter", "pick color"}, keyHelp{"[/]", "theme"},
			keyHelp{"x", "reset"}, keyHelp{"esc", "back"})
	}
	return body + "\n\n" + keys
}

// viewPalette draws the 256-color grid with the cursor on the picked color.
func (m model) viewPalette() string {
	ed := m.colorEd
	role := colorRoles[ed.cursor]
	lines := []string{titleStyle.Render("Pick " + strings.ToLower(role.name)), ""}
	for r, cols := range paletteRows {
		if r == 1 || r == len(paletteRows)-1 {
			lines = append(lines, "") // gaps around the color cube
		}
		var b strings.Builder
		for c, v := range cols {
			cell := lipgloss.NewStyle().Background(lipgloss.Color(strconv.Itoa(v)))
			if r == ed.row && c == ed.col {
				// mark the cursor with a contrasting glyph
				fg := "16"
				if v < 16 && v != 7 && v != 15 || v >= 232 && v < 244 {
					fg = "231"
				}
				b.WriteString(cell.Foreground(lipgloss.Color(fg)).Render("◆ "))
			} else {
				b.WriteString(cell.Render("  "))
			}
		}
		lines = append(lines, b.String())
	}
	c := colorOf(m.settings.Colors, role.key)
	info := fmt.Sprintf("%s %s", swatch(c), string(c))
	if ed.hex {
		info = "hex " + selectedStyle.Render(pad(ed.value+"▏", 8))
	}
	lines = append(lines, "", info)
	if ed.err != "" {
		lines = append(lines, errorStyle.Render(ed.err))
	}
	return strings.Join(lines, "\n")
}

// themePreview renders sample parts of the app with the current colors.
func (m model) themePreview() string {
	row := func(time, mark, sender, subject string) string {
		return fmt.Sprintf("  %s %s %s %s", time, mark, pad(sender, 8), subject) // check column, then as in the list
	}
	const w = 44
	lines := []string{
		titleStyle.Render("◂ Fri, 30 Oct ▸") + dimStyle.Render("  12 mails · 3 unread"),
		dimStyle.Render(pad("  Time    Sender   Subject", w)),
		"  11:20 " + unreadMark + " " + senderStyle.Render(pad("GitHub", 8)) + " " + unreadStyle.Render("PR merged") + labelStyle.Render(" [Work]"),
		selectedStyle.Width(w).Render(row("10:05", " ", "Bank", "Statement ready")),
		markedStyle.Width(w).Render(checkMark + row("09:40", " ", "Shop", "Order shipped")[1:]),
		checkStyle.Render(checkMark) + " 09:12   " + senderStyle.Render(pad("News", 8)) + " Weekly digest" + dimStyle.Render(" — top stories"),
		"",
		errorStyle.Render(" Could not reach Gmail (r to retry)"),
		" " + m.keyLine(keyHelp{"?", "help"}, keyHelp{"e", "archive"}, keyHelp{"d", "trash"}),
	}
	return modalStyle.Render(dimStyle.Render("Preview") + "\n" + strings.Join(lines, "\n"))
}
