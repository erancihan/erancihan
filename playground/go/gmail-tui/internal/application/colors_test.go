package application

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
)

func TestValidColor(t *testing.T) {
	for s, want := range map[string]bool{"0": true, "194": true, "255": true, "256": false, "-1": false,
		"#fff": true, "#d7ffd7": true, "#d7ff": false, "green": false, "": false} {
		if validColor(s) != want {
			t.Errorf("validColor(%q) = %v", s, !want)
		}
	}
	if c := colorOf(map[string]string{"selected_bg": "nope"}, "selected_bg"); c != lipgloss.Color("194") {
		t.Errorf("invalid override not ignored: %v", c)
	}
}

// themeModel opens the theme dialog with settings saved to a temp file.
func themeModel(t *testing.T) (model, string) {
	t.Helper()
	t.Cleanup(func() { applyColors(nil) })
	path := filepath.Join(t.TempDir(), "settings.json")
	m := flat(t)
	m.width, m.height = 140, 40
	m.settingsPath = path
	m = press(t, m, ",")
	for range settingItems {
		m = press(t, m, "j")
	}
	m = press(t, m, "enter")
	if m.modal != modalColors {
		t.Fatal("theme dialog not open")
	}
	return m, path
}

func TestPaletteLivePreviewAndUndo(t *testing.T) {
	m, path := themeModel(t)
	m = press(t, m, "j", "j", "enter") // Selected background: 194
	if !m.colorEd.picking || paletteRows[m.colorEd.row][m.colorEd.col] != 194 {
		t.Fatalf("palette not on 194: %d,%d", m.colorEd.row, m.colorEd.col)
	}
	m = press(t, m, "l") // 195, applied live but not saved
	if markedStyle.GetBackground() != lipgloss.Color("195") {
		t.Errorf("live preview = %v", markedStyle.GetBackground())
	}
	if s, _ := LoadSettings(path); s.Colors["selected_bg"] != "" {
		t.Errorf("saved while browsing: %v", s.Colors)
	}
	m = press(t, m, "esc") // undo
	if m.colorEd.picking || markedStyle.GetBackground() != lipgloss.Color("194") || len(m.settings.Colors) != 0 {
		t.Errorf("undo: %v %v", markedStyle.GetBackground(), m.settings.Colors)
	}
	m = press(t, m, "enter", "k", "enter") // one row up, keep
	got := m.settings.Colors["selected_bg"]
	if got == "" || got == "194" || markedStyle.GetBackground() != lipgloss.Color(got) {
		t.Errorf("kept %q", got)
	}
	if s, _ := LoadSettings(path); s.Colors["selected_bg"] != got {
		t.Errorf("not saved: %v", s.Colors)
	}
}

func TestPaletteRowsAndHex(t *testing.T) {
	m, _ := themeModel(t)
	if len(paletteRows) != 8 || len(paletteRows[1]) != 36 || paletteRows[7][23] != 255 {
		t.Fatalf("palette layout wrong")
	}
	m = press(t, m, "#")
	for _, r := range "zz" { // ignored: not hex
		m = press(t, m, string(r))
	}
	for _, r := range "abc" {
		m = press(t, m, string(r))
	}
	next, _ := m.Update(key("enter"))
	m = next.(model)
	if m.settings.Colors["cursor_bg"] != "#abc" || selectedStyle.GetBackground() != lipgloss.Color("#abc") {
		t.Errorf("hex: %v", m.settings.Colors)
	}
	m = press(t, m, "x")
	if len(m.settings.Colors) != 0 {
		t.Errorf("reset: %v", m.settings.Colors)
	}
}

func TestThemePresets(t *testing.T) {
	m, path := themeModel(t)
	if themeName(m.settings.Colors) != "Default" {
		t.Fatalf("start theme %q", themeName(m.settings.Colors))
	}
	m = press(t, m, "]")
	if themeName(m.settings.Colors) != "Light" || selectedStyle.GetBackground() != lipgloss.Color("153") {
		t.Errorf("] -> %q", themeName(m.settings.Colors))
	}
	if s, _ := LoadSettings(path); themeName(s.Colors) != "Light" {
		t.Errorf("theme not saved")
	}
	m = press(t, m, "[", "[")
	if themeName(m.settings.Colors) != "Mono" {
		t.Errorf("[ wraps to %q", themeName(m.settings.Colors))
	}
	m = press(t, m, "#", "1", "2", "3", "enter") // edit one color: Custom
	v := ansi.Strip(m.View())
	if themeName(m.settings.Colors) != "Custom" || !strings.Contains(v, "Custom") || !strings.Contains(v, "Preview") {
		t.Errorf("custom:\n%s", v)
	}
	m = press(t, m, "esc")
	if m.modal != modalSettings {
		t.Errorf("esc should go back to settings, modal=%v", m.modal)
	}
}

func TestColorsAppliedAtStart(t *testing.T) {
	t.Cleanup(func() { applyColors(nil) })
	s := defaultSettings()
	s.Colors = map[string]string{"cursor_bg": "24"}
	NewApplication(nil, Options{Settings: s})
	if selectedStyle.GetBackground() != lipgloss.Color("24") {
		t.Errorf("cursor bg = %v", selectedStyle.GetBackground())
	}
}
