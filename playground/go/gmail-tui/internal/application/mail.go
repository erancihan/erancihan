package application

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"html"
	"mime"
	"net/mail"
	"slices"
	"strings"
	"sync"
	"time"

	"golang.org/x/text/encoding/htmlindex"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/googleapi"
)

const (
	fetchWorkers = 8    // parallel metadata requests; Gmail allows ~50 gets/sec per user
	maxPerDay    = 500  // upper bound on mails fetched for a single day
	maxPerRange  = 2000 // upper bound on mails counted for a sender range
)

// --- SCOPE ---
type scope int

const (
	scopeReceived scope = iota // everything that arrived, archived included
	scopeInbox                 // only mail still in the inbox
)

func (s scope) String() string {
	if s == scopeInbox {
		return "Inbox"
	}
	return "All received"
}

// key is the scope's name in settings.json.
func (s scope) key() string {
	if s == scopeInbox {
		return "inbox"
	}
	return "received"
}

// Spam and trash are excluded by Gmail search by default.
func (s scope) query() string {
	if s == scopeInbox {
		return "in:inbox"
	}
	return "-in:sent -in:drafts -in:chats"
}

// --- DATA ---
type email struct {
	ID          string
	FromName    string
	FromAddr    string
	Subject     string
	Snippet     string
	Unsubscribe string   // best List-Unsubscribe target, if any
	Labels      []string // Gmail label ids
	Time        time.Time
	Unread      bool
}

type group struct {
	key    string // lowercased sender address
	name   string
	emails []email // newest first
}

// unsubscribe returns the first opt-out link found among the group's mails.
func (g group) unsubscribe() string {
	for _, e := range g.emails {
		if e.Unsubscribe != "" {
			return e.Unsubscribe
		}
	}
	return ""
}

// message is a fully loaded mail for the reader.
type message struct {
	From, To, Date, Subject string
	Unsubscribe             string
	Body                    string
}

var errStopPaging = errors.New("stop paging")

// loadDay lists all mail received on the local calendar day starting at
// `day` (the inbox view filters this locally) and fetches metadata only for
// ids not in `known`. It returns the day's ids, the newly fetched mails and
// the number that failed to load.
func loadDay(srv *gmail.Service, day time.Time, known map[string]bool) (ids []string, emails []email, failed int, err error) {
	ctx := context.Background()
	q := fmt.Sprintf("after:%d before:%d %s", day.Unix(), day.AddDate(0, 0, 1).Unix(), scopeReceived.query())
	ids, _, err = listIDs(ctx, srv, q, maxPerDay)
	if err != nil {
		return nil, nil, 0, err
	}
	var todo []string
	for _, id := range ids {
		if !known[id] {
			todo = append(todo, id)
		}
	}
	emails, missing, failed := getMetadata(ctx, srv, todo)
	return ids, emails, failed + len(missing), nil
}

// listIDs lists up to `limit` ids matching q, newest first. truncated reports
// whether the limit cut the result short.
func listIDs(ctx context.Context, srv *gmail.Service, q string, limit int) (ids []string, truncated bool, err error) {
	err = srv.Users.Messages.List("me").Q(q).MaxResults(500).
		Fields("messages/id", "nextPageToken").
		Pages(ctx, func(r *gmail.ListMessagesResponse) error {
			for _, m := range r.Messages {
				ids = append(ids, m.Id)
			}
			if len(ids) >= limit {
				return errStopPaging
			}
			return nil
		})
	if errors.Is(err, errStopPaging) {
		return ids[:limit], true, nil
	}
	return ids, false, err
}

// getMetadata fetches list metadata for the given ids in parallel. missing holds
// ids Gmail no longer has; failed counts other errors.
func getMetadata(ctx context.Context, srv *gmail.Service, ids []string) (emails []email, missing []string, failed int) {
	all := make([]email, len(ids))
	errs := make([]error, len(ids))
	jobs := make(chan int)
	var wg sync.WaitGroup
	for range fetchWorkers {
		wg.Go(func() {
			for i := range jobs {
				m, err := withRetry(func() (*gmail.Message, error) {
					return srv.Users.Messages.Get("me", ids[i]).Context(ctx).
						Format("metadata").MetadataHeaders("From", "Subject", "List-Unsubscribe").
						Fields("id", "labelIds", "snippet", "internalDate", "payload/headers").
						Do()
				})
				if err != nil {
					errs[i] = err
					continue
				}
				all[i] = parseEmail(m)
			}
		})
	}
	for i := range ids {
		jobs <- i
	}
	close(jobs)
	wg.Wait()

	for i, e := range all {
		switch {
		case errs[i] == nil:
			emails = append(emails, e)
		case notFound(errs[i]):
			missing = append(missing, ids[i])
		default:
			failed++
		}
	}
	return emails, missing, failed
}

func notFound(err error) bool {
	var gerr *googleapi.Error
	return errors.As(err, &gerr) && gerr.Code == 404
}

// receivable reports whether a mail belongs in the "all received" view, the
// local equivalent of the search `-in:sent -in:drafts -in:chats` (spam and
// trash are excluded by Gmail search by default).
func receivable(e email) bool {
	return !slices.ContainsFunc(e.Labels, func(l string) bool {
		return l == "SENT" || l == "DRAFT" || l == "CHAT" || l == "SPAM" || l == "TRASH"
	})
}

// match reports whether a mail from the "all received" set belongs in scope s.
func (s scope) match(e email) bool {
	return s != scopeInbox || slices.Contains(e.Labels, "INBOX")
}

// withRetry retries a request that hit Gmail's rate limit, backing off 1s, 2s, 4s.
func withRetry[T any](do func() (T, error)) (T, error) {
	for wait := time.Second; ; wait *= 2 {
		v, err := do()
		if err == nil || wait > 4*time.Second || !rateLimited(err) {
			return v, err
		}
		time.Sleep(wait)
	}
}

func rateLimited(err error) bool {
	var gerr *googleapi.Error
	if !errors.As(err, &gerr) {
		return false
	}
	if gerr.Code == 429 {
		return true
	}
	for _, e := range gerr.Errors {
		if e.Reason == "rateLimitExceeded" || e.Reason == "userRateLimitExceeded" {
			return true
		}
	}
	return false
}

func parseEmail(m *gmail.Message) email {
	e := email{
		ID:      m.Id,
		Snippet: html.UnescapeString(m.Snippet),
		Time:    time.UnixMilli(m.InternalDate).Local(),
		Unread:  slices.Contains(m.LabelIds, "UNREAD"),
		Labels:  m.LabelIds,
		Subject: "(no subject)",
	}
	for _, h := range m.Payload.Headers {
		switch h.Name {
		case "From":
			e.FromName, e.FromAddr = parseFrom(h.Value)
		case "Subject":
			if v := strings.TrimSpace(h.Value); v != "" {
				e.Subject = v
			}
		case "List-Unsubscribe":
			e.Unsubscribe = unsubscribeLink(h.Value)
		}
	}
	return e
}

// parseFrom splits a From header into display name and lowercased address.
// The name falls back to the address.
func parseFrom(v string) (name, addr string) {
	if a, err := mail.ParseAddress(v); err == nil {
		name, addr = a.Name, strings.ToLower(a.Address)
	} else {
		addr = strings.ToLower(strings.TrimSpace(v))
	}
	if name == "" {
		name = addr
	}
	return name, addr
}

// unsubscribeLink picks a target from a List-Unsubscribe header such as
// "<mailto:x@y>, <https://y/unsub>", preferring web links over mailto.
func unsubscribeLink(v string) string {
	var mailto string
	for _, part := range strings.Split(v, ",") {
		link := strings.Trim(strings.TrimSpace(part), "<>")
		switch {
		case strings.HasPrefix(link, "https://"), strings.HasPrefix(link, "http://"):
			return link
		case strings.HasPrefix(link, "mailto:") && mailto == "":
			mailto = link
		}
	}
	return mailto
}

// groupBySender groups mails by sender address, busiest sender first.
func groupBySender(emails []email) []group {
	index := map[string]int{}
	var groups []group
	for _, e := range emails {
		i, ok := index[e.FromAddr]
		if !ok {
			i = len(groups)
			index[e.FromAddr] = i
			groups = append(groups, group{key: e.FromAddr, name: e.FromName})
		}
		groups[i].emails = append(groups[i].emails, e)
	}
	for i := range groups {
		slices.SortFunc(groups[i].emails, func(a, b email) int { return b.Time.Compare(a.Time) })
	}
	slices.SortStableFunc(groups, func(a, b group) int {
		if len(a.emails) != len(b.emails) {
			return len(b.emails) - len(a.emails)
		}
		return b.emails[0].Time.Compare(a.emails[0].Time)
	})
	return groups
}

// --- FULL MESSAGE ---
func loadMessage(srv *gmail.Service, id string) (*message, error) {
	m, err := srv.Users.Messages.Get("me", id).Format("full").Do()
	if err != nil {
		return nil, err
	}
	msg := &message{Subject: "(no subject)"}
	for _, h := range m.Payload.Headers {
		switch h.Name {
		case "From":
			msg.From = h.Value
		case "To":
			msg.To = h.Value
		case "Date":
			msg.Date = h.Value
		case "Subject":
			if v := strings.TrimSpace(h.Value); v != "" {
				msg.Subject = v
			}
		case "List-Unsubscribe":
			msg.Unsubscribe = unsubscribeLink(h.Value)
		}
	}

	switch {
	case findPart(m.Payload, "text/plain") != nil:
		msg.Body = partText(findPart(m.Payload, "text/plain"))
	case findPart(m.Payload, "text/html") != nil:
		msg.Body = htmlToText(partText(findPart(m.Payload, "text/html")))
	default:
		msg.Body = "(no readable text in this mail)"
	}
	msg.Body = strings.TrimSpace(invisible.Replace(strings.ReplaceAll(msg.Body, "\r\n", "\n")))
	return msg, nil
}

// findPart returns the first non-attachment part with the given MIME type, depth first.
func findPart(p *gmail.MessagePart, mimeType string) *gmail.MessagePart {
	if p == nil {
		return nil
	}
	if p.MimeType == mimeType && p.Filename == "" && p.Body != nil && p.Body.Data != "" {
		return p
	}
	for _, c := range p.Parts {
		if found := findPart(c, mimeType); found != nil {
			return found
		}
	}
	return nil
}

// partText decodes a part's base64url body and converts it from its charset to UTF-8.
func partText(p *gmail.MessagePart) string {
	data, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(p.Body.Data, "="))
	if err != nil {
		return "(could not decode body)"
	}
	for _, h := range p.Headers {
		if !strings.EqualFold(h.Name, "Content-Type") {
			continue
		}
		_, params, err := mime.ParseMediaType(h.Value)
		cs := strings.ToLower(params["charset"])
		if err != nil || cs == "" || cs == "utf-8" || cs == "us-ascii" {
			break
		}
		if enc, err := htmlindex.Get(cs); err == nil {
			if s, err := enc.NewDecoder().Bytes(data); err == nil {
				return string(s)
			}
		}
	}
	return string(data)
}
