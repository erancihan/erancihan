package application

import (
	"slices"
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func labelsModel(t *testing.T) model {
	t.Helper()
	m := flat(t)
	m.width, m.height = 100, 24
	m = press(t, m, "#")
	if m.mode != modeLabelsView || !m.lv.loading {
		t.Fatal("labels screen not loading")
	}
	next, _ := m.Update(labelInfosMsg{infos: []labelInfo{
		{ID: "L1", Name: "Work", total: 120, unread: 4},
		{ID: "L2", Name: "Work/Clients", total: 30},
		{ID: "L3", Name: "Work/Clients/2024", total: 8},
		{ID: "L4", Name: "Archive", total: 500},
		{ID: "L5", Name: "Travel/Flights", total: 12}, // "Travel" itself is not a label
		{ID: "L6", Name: "receipts", total: 40, unread: 1},
	}})
	return next.(model)
}

func paths(rows []labelRow) []string {
	var out []string
	for _, r := range rows {
		out = append(out, r.path)
	}
	return out
}

func TestLabelTree(t *testing.T) {
	m := labelsModel(t)
	got := paths(m.labelRows())
	want := []string{"Archive", "receipts", "Travel", "Travel/Flights", "Work", "Work/Clients", "Work/Clients/2024"}
	if !slices.Equal(got, want) {
		t.Errorf("tree = %v", got)
	}
	v := ansi.Strip(m.View())
	if !strings.Contains(v, "Travel (parent name only)") || !strings.Contains(v, "      Clients") {
		t.Errorf("view:\n%s", v)
	}
}

func TestMoveRenamesSubtree(t *testing.T) {
	m := labelsModel(t)
	ops, err := m.renameOps("Work/Clients", "Archive/Clients")
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, op := range ops {
		names = append(names, op.id+"="+op.name)
	}
	if !slices.Equal(names, []string{"L2=Archive/Clients", "L3=Archive/Clients/2024"}) {
		t.Errorf("ops = %v", names)
	}
	if _, err := m.renameOps("Work/Clients", "Receipts"); err == nil {
		t.Error("expected a name conflict with receipts")
	}
}

func TestMoveTargetsAndFlow(t *testing.T) {
	m := labelsModel(t)
	m.lv.cursor = slices.Index(paths(m.labelRows()), "Work/Clients")
	m = press(t, m, "m")
	if m.modal != modalMove {
		t.Fatal("move picker not open")
	}
	got := m.moveTargets()
	// top level offered; not itself, not its sub-label, not its current parent
	if got[0] != "" || slices.Contains(got, "Work/Clients") || slices.Contains(got, "Work/Clients/2024") || slices.Contains(got, "Work") {
		t.Errorf("targets = %v", got)
	}
	for _, r := range "arch" {
		m = press(t, m, string(r))
	}
	if got := m.moveTargets(); !slices.Equal(got, []string{"Archive"}) {
		t.Fatalf("filtered = %v", got)
	}
	next, cmd := m.Update(key("enter"))
	m = next.(model)
	if cmd == nil || m.modal != modalNone || m.status != "Updating labels…" {
		t.Errorf("move did not start: %q", m.status)
	}
	next, _ = m.Update(labelOpsDoneMsg{verb: "Moved Clients under Archive", done: 2})
	if s := next.(model).status; s != "Moved Clients under Archive" {
		t.Errorf("status = %q", s)
	}
}

func TestRenameAndCreateValidation(t *testing.T) {
	m := labelsModel(t)
	m.lv.cursor = slices.Index(paths(m.labelRows()), "Work")
	m = press(t, m, "r")
	if m.input.value != "Work" || m.input.purpose != "rename" {
		t.Fatalf("rename input = %+v", m.input)
	}
	m = press(t, m, "backspace", "backspace", "backspace", "backspace", "a", "/", "x")
	next, _ := m.Update(key("enter"))
	m = next.(model)
	if !strings.Contains(m.input.err, "use m to move") {
		t.Errorf("slash in rename: %q", m.input.err)
	}
	m = press(t, m, "esc", "N")
	if m.input.value != "Work/" || m.input.purpose != "create" {
		t.Fatalf("N prefill = %+v", m.input)
	}
	for _, r := range "clients" {
		m = press(t, m, string(r))
	}
	next, _ = m.Update(key("enter"))
	if e := next.(model).input.err; e != "a label with this name exists" {
		t.Errorf("duplicate create: %q", e)
	}
	if _, err := cleanLabelName("Work//x"); err == nil {
		t.Error("empty segment accepted")
	}
	if n, _ := cleanLabelName(" Work / Clients "); n != "Work/Clients" {
		t.Errorf("clean = %q", n)
	}
}

func TestDeleteLabelWithChildren(t *testing.T) {
	m := labelsModel(t)
	m.lv.cursor = slices.Index(paths(m.labelRows()), "Work")
	m = press(t, m, "d")
	if m.modal != modalConfirm || len(m.confirm.ids) != 3 || !strings.Contains(m.confirm.detail, "2 labels below it") {
		t.Fatalf("confirm = %+v", m.confirm)
	}
	next, cmd := m.Update(key("a"))
	if cmd == nil || next.(model).modal != modalNone {
		t.Error("a did not delete")
	}
	m.lv.cursor = slices.Index(paths(m.labelRows()), "Travel")
	m = press(t, m, "esc", "d")
	if m.modal == modalConfirm || !strings.Contains(m.status, "only a parent name") {
		t.Errorf("placeholder delete: %q", m.status)
	}
}

func TestLabelMails(t *testing.T) {
	m := labelsModel(t)
	m.lv.cursor = slices.Index(paths(m.labelRows()), "receipts")
	m = press(t, m, "enter")
	if m.list != listAll || m.all.sub == nil || m.allLabel() != "L6" || !strings.Contains(ansi.Strip(m.View()), "Label · receipts") {
		t.Fatalf("label list: %+v", m.all.sub)
	}
	m = press(t, m, "esc")
	if m.mode != modeLabelsView {
		t.Errorf("esc went to %v", m.mode)
	}
}
