package application

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
)

// Settings are user preferences, saved as JSON next to the login token.
type Settings struct {
	GroupBySender  bool              `json:"group_by_sender"`
	MarkReadOnOpen bool              `json:"mark_read_on_open"`
	RememberView   bool              `json:"remember_view"`
	ShiftSelection bool              `json:"shift_for_selection"` // e/d/m/v act on the cursor, E/D/M/V on the selection
	View           string            `json:"view,omitempty"`      // last view ("received" or "inbox"), used when RememberView is on
	Span           string            `json:"span,omitempty"`      // last span of the day list, used when RememberView is on
	Colors         map[string]string `json:"colors,omitempty"`    // color overrides by role, see colors.go
}

func defaultSettings() Settings {
	return Settings{GroupBySender: false, MarkReadOnOpen: true, RememberView: true, ShiftSelection: true}
}

// LoadSettings reads settings from path; missing fields keep their defaults.
func LoadSettings(path string) (Settings, error) {
	s := defaultSettings()
	b, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return s, err
	}
	return s, json.Unmarshal(b, &s)
}

func (s Settings) save(path string) error {
	if path == "" {
		return nil
	}
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(b, '\n'), 0600)
}

// settingItems are the rows of the settings modal.
var settingItems = []struct {
	name  string
	field func(*Settings) *bool
}{
	{"Group by sender", func(s *Settings) *bool { return &s.GroupBySender }},
	{"Mark as read when opened", func(s *Settings) *bool { return &s.MarkReadOnOpen }},
	{"Remember view (All received / Inbox)", func(s *Settings) *bool { return &s.RememberView }},
	{"Shift applies actions to selection (E D M V)", func(s *Settings) *bool { return &s.ShiftSelection }},
}
