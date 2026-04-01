package ignore

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

const (
	// IgnoreFileName is the name of the per-folder ignore rules file.
	IgnoreFileName = ".grsyncignore"
)

// DefaultPatterns are ignored unless overridden by a .grsyncignore file.
var DefaultPatterns = []string{
	// Version control
	".git",
	".svn",
	".hg",

	// Node.js
	"node_modules",

	// Python
	"__pycache__",
	".venv",
	"venv",
	".env",

	// Go
	"vendor",

	// Build outputs
	"dist",
	"build",
	"target",
	"out",

	// IDE / editor
	".idea",
	".vscode",
	"*.swp",
	"*.swo",
	"*~",

	// OS files
	".DS_Store",
	"Thumbs.db",
	"desktop.ini",
}

// Checker evaluates whether a file or directory should be ignored during sync.
type Checker struct {
	patterns []string
}

// NewChecker creates a Checker. If a .grsyncignore file exists at the given
// root directory, its patterns replace the default patterns entirely.
// If the file does not exist, the default patterns are used.
func NewChecker(rootDir string) (*Checker, error) {
	ignoreFile := filepath.Join(rootDir, IgnoreFileName)

	patterns, err := loadIgnoreFile(ignoreFile)
	if err != nil {
		// File doesn't exist or can't be read — use defaults
		return &Checker{patterns: DefaultPatterns}, nil
	}

	return &Checker{patterns: patterns}, nil
}

// NewCheckerWithDefaults creates a Checker using only the default patterns.
func NewCheckerWithDefaults() *Checker {
	return &Checker{patterns: DefaultPatterns}
}

// NewCheckerWithPatterns creates a Checker with explicit patterns (for testing).
func NewCheckerWithPatterns(patterns []string) *Checker {
	return &Checker{patterns: patterns}
}

// ShouldIgnore returns true if the given path (relative, using forward slashes)
// should be ignored based on the loaded patterns.
// For directories, pass the directory name; for files, pass the file name.
// The path is matched component-by-component against patterns.
func (c *Checker) ShouldIgnore(relPath string) bool {
	// Normalize to forward slashes
	relPath = filepath.ToSlash(relPath)

	// Check each component of the path against each pattern
	parts := strings.Split(relPath, "/")
	for _, part := range parts {
		for _, pattern := range c.patterns {
			if matchPattern(pattern, part) {
				return true
			}
		}
	}

	// Also check the full path against patterns (for path-based rules like "a/b/c")
	for _, pattern := range c.patterns {
		if strings.Contains(pattern, "/") {
			if matchPattern(pattern, relPath) {
				return true
			}
		}
	}

	return false
}

// Patterns returns the currently loaded patterns (for debugging/display).
func (c *Checker) Patterns() []string {
	return c.patterns
}

// loadIgnoreFile reads a .grsyncignore file and returns the parsed patterns.
// Lines starting with '#' are comments. Empty lines are skipped.
// Leading/trailing whitespace is trimmed.
func loadIgnoreFile(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var patterns []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		patterns = append(patterns, line)
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return patterns, nil
}

// matchPattern checks if a name matches a gitignore-style pattern.
// Supports:
//   - Exact match: "node_modules" matches "node_modules"
//   - Glob wildcards: "*.swp" matches "file.swp"
//   - Path patterns: "a/b" matches "a/b" (checked against full relPath)
func matchPattern(pattern, name string) bool {
	// Use filepath.Match for glob support (*, ?)
	matched, err := filepath.Match(pattern, name)
	if err != nil {
		// Invalid pattern — skip it
		return false
	}
	return matched
}
