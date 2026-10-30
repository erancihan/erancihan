package application

import (
	"strings"

	nethtml "golang.org/x/net/html"
)

// htmlToText renders an HTML mail body as plain text: drops scripts and styles,
// breaks lines at block elements and collapses whitespace.
func htmlToText(s string) string {
	z := nethtml.NewTokenizer(strings.NewReader(s))
	var b strings.Builder
	skip := 0
	for {
		tt := z.Next()
		switch tt {
		case nethtml.ErrorToken:
			return tidyText(b.String())

		case nethtml.StartTagToken, nethtml.SelfClosingTagToken, nethtml.EndTagToken:
			name, _ := z.TagName()
			switch tag := string(name); tag {
			case "script", "style", "head", "title":
				if tt == nethtml.StartTagToken {
					skip++
				} else if tt == nethtml.EndTagToken && skip > 0 {
					skip--
				}
			case "br", "p", "div", "tr", "table", "blockquote", "ul", "ol",
				"h1", "h2", "h3", "h4", "h5", "h6", "hr":
				b.WriteString("\n")
			case "li":
				if tt == nethtml.StartTagToken {
					b.WriteString("\n• ")
				}
			case "td", "th":
				b.WriteString(" ")
			}

		case nethtml.TextToken:
			if skip == 0 {
				b.Write(z.Text())
			}
		}
	}
}

// invisible drops zero-width and soft-hyphen characters that marketing mails use as preheader padding.
var invisible = strings.NewReplacer("\u200b", "", "\u200c", "", "\u200d", "", "\u034f", "", "\u00ad", "", "\ufeff", "")

// tidyText collapses whitespace inside lines and squeezes runs of blank lines to one.
func tidyText(s string) string {
	s = invisible.Replace(s)
	var out []string
	blank := false
	for line := range strings.SplitSeq(s, "\n") {
		line = strings.Join(strings.Fields(line), " ")
		if line == "" {
			if !blank && len(out) > 0 {
				out = append(out, "")
			}
			blank = true
			continue
		}
		blank = false
		out = append(out, line)
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}
