package application

import (
	"encoding/base64"
	"testing"
	"time"

	"google.golang.org/api/gmail/v1"
)

func TestParseEmail(t *testing.T) {
	m := &gmail.Message{
		Id:           "1",
		Snippet:      "Don&#39;t miss",
		InternalDate: 1_700_000_000_000,
		LabelIds:     []string{"INBOX", "UNREAD"},
		Payload: &gmail.MessagePart{Headers: []*gmail.MessagePartHeader{
			{Name: "From", Value: `"GitHub" <Noreply@GitHub.com>`},
			{Name: "Subject", Value: "  "},
		}},
	}
	e := parseEmail(m)
	if e.FromName != "GitHub" || e.FromAddr != "noreply@github.com" {
		t.Errorf("from = %q <%q>", e.FromName, e.FromAddr)
	}
	if e.Subject != "(no subject)" || e.Snippet != "Don't miss" || !e.Unread {
		t.Errorf("unexpected %+v", e)
	}
}

func TestGroupBySender(t *testing.T) {
	t0 := time.Date(2026, 10, 30, 9, 0, 0, 0, time.Local)
	groups := groupBySender([]email{
		{FromAddr: "a@x", Time: t0},
		{FromAddr: "b@x", Time: t0.Add(time.Hour)},
		{FromAddr: "b@x", Time: t0.Add(3 * time.Hour)},
		{FromAddr: "c@x", Time: t0.Add(2 * time.Hour)},
	})
	var order []string
	for _, g := range groups {
		order = append(order, g.key)
	}
	if got := len(groups); got != 3 || order[0] != "b@x" || order[1] != "c@x" || order[2] != "a@x" {
		t.Fatalf("order = %v", order)
	}
	if !groups[0].emails[0].Time.Equal(t0.Add(3 * time.Hour)) {
		t.Errorf("group not newest first")
	}
}

func TestUnsubscribeLink(t *testing.T) {
	cases := map[string]string{
		"<mailto:u@x.com?subject=unsub>, <https://x.com/u?id=1>": "https://x.com/u?id=1",
		"<mailto:u@x.com>": "mailto:u@x.com",
		"":                 "",
	}
	for in, want := range cases {
		if got := unsubscribeLink(in); got != want {
			t.Errorf("unsubscribeLink(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestHTMLToText(t *testing.T) {
	in := `<html><head><style>p{color:red}</style></head><body>
<p>Hello&nbsp;<b>there</b>,</p><p>&#8203;</p><p>&#8203;</p>
<ul><li>one</li><li>two</li></ul><script>alert(1)</script>Bye</body></html>`
	want := "Hello there,\n\n• one\n• two\nBye"
	if got := htmlToText(in); got != want {
		t.Errorf("htmlToText = %q, want %q", got, want)
	}
}

func TestPartTextCharset(t *testing.T) {
	// "Fatura hazır" in windows-1254 (ı = 0xFD)
	raw := []byte("Fatura haz\xfdr")
	p := &gmail.MessagePart{
		Headers: []*gmail.MessagePartHeader{{Name: "Content-Type", Value: `text/plain; charset="windows-1254"`}},
		Body:    &gmail.MessagePartBody{Data: base64.URLEncoding.EncodeToString(raw)},
	}
	if got := partText(p); got != "Fatura hazır" {
		t.Errorf("partText = %q", got)
	}
}

func TestSummarize(t *testing.T) {
	t0 := time.Date(2026, 10, 30, 9, 0, 0, 0, time.Local)
	s := summarize([]email{
		{FromAddr: "a@x", FromName: "A", Time: t0, Unread: true},
		{FromAddr: "a@x", FromName: "A", Time: t0.Add(time.Hour), Unsubscribe: "https://a/u"},
		{FromAddr: "b@x", FromName: "B", Time: t0},
	})
	if len(s) != 2 || s[0].addr != "a@x" || s[0].count != 2 || s[0].unread != 1 || s[0].unsubscribe != "https://a/u" {
		t.Fatalf("summarize = %+v", s)
	}
}
