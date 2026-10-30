package application

import (
	"slices"
)

// Every mail is stored once, in model.mails, keyed by id. Views hold ids only:
// a day lists the ids of its mails, the all-mail list the ids Gmail returned.
// Actions and the sync change the one stored copy, and every view sees it.

// dayStore is the mail of one day, as ids into model.mails.
type dayStore struct {
	IDs    []string // newest first
	Failed int      // mails that failed to load; such days are not saved to disk
}

// resolve returns the stored mails for ids, skipping ids that are gone.
func (m model) resolve(ids []string) []email {
	out := make([]email, 0, len(ids))
	for _, id := range ids {
		if e, ok := m.mails[id]; ok {
			out = append(out, e)
		}
	}
	return out
}

// dayMails returns the stored mails of a cached day, newest first.
func (m model) dayMails(k string) []email {
	return m.resolve(m.days[k].IDs)
}

// storeDay stores a fetched day, replacing its mail list.
func (m *model) storeDay(k string, es []email, failed int) {
	slices.SortStableFunc(es, func(a, b email) int { return b.Time.Compare(a.Time) })
	ids := make([]string, len(es))
	for i, e := range es {
		m.mails[e.ID] = e
		ids[i] = e.ID
	}
	m.days[k] = dayStore{IDs: ids, Failed: failed}
}

// addToDay stores e and inserts it into its day, if that day is cached.
// It reports whether e was new to the day.
func (m *model) addToDay(e email) bool {
	m.mails[e.ID] = e
	k := dayKey(e.Time)
	s, ok := m.days[k]
	if !ok || slices.Contains(s.IDs, e.ID) {
		return false
	}
	i, _ := slices.BinarySearchFunc(s.IDs, e, func(id string, e email) int {
		return e.Time.Compare(m.mails[id].Time)
	})
	s.IDs = slices.Insert(slices.Clone(s.IDs), i, e.ID)
	m.days[k] = s
	return true
}

// removeMails drops mails from the store and from every view.
func (m *model) removeMails(set map[string]bool) {
	if len(set) == 0 {
		return
	}
	gone := func(id string) bool { return set[id] }
	for id := range set {
		delete(m.mails, id)
	}
	for k, s := range m.days {
		if slices.ContainsFunc(s.IDs, gone) {
			s.IDs = slices.DeleteFunc(slices.Clone(s.IDs), gone)
			m.days[k] = s
		}
	}
	m.all.ids = slices.DeleteFunc(m.all.ids, gone)
}

// updateMails applies fn to the stored mails in set; mails that no longer
// count as received (e.g. moved to spam) are removed.
func (m *model) updateMails(set map[string]bool, fn func(*email)) {
	gone := map[string]bool{}
	for id := range set {
		e, ok := m.mails[id]
		if !ok {
			continue
		}
		fn(&e)
		if !receivable(e) {
			gone[id] = true
			continue
		}
		m.mails[id] = e
	}
	m.removeMails(gone)
}
