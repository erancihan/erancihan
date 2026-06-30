# img-dedupe — build & release targets
#
# Native GUI (Wails) needs platform webview libraries:
#   Linux:   GTK3 + WebKit2GTK 4.1  (apt: libgtk-3-dev libwebkit2gtk-4.1-dev)
#   Windows: WebView2 (present on Win10/11); built with the pure-Go webview2,
#            so it cross-compiles from any OS with CGO_ENABLED=0
#   macOS:   system WebKit — build on macOS only (CGO; not cross-compilable)
#
# Packaging tools:
#   .deb / .rpm : nfpm     (go install github.com/goreleaser/nfpm/v2/cmd/nfpm@latest)
#   .exe        : makensis (NSIS)

BIN     := imgdedupe
GUI_BIN := imgdedupe-gui
DIST    := dist

# Override on the command line or in CI, e.g. `make release VERSION=1.2.0`.
VERSION    ?= 0.1.0
# Strict 3-part numeric form for the Windows version resource.
WINVERSION := $(shell echo "$(VERSION)" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+' || echo 0.0.0)
LDFLAGS    := -X main.version=$(VERSION)

GUI_TAGS_LINUX := desktop production webkit2_41
GUI_TAGS_WIN   := desktop production

GO   ?= go
NFPM ?= nfpm

.PHONY: all build gui test vet clean version dist-dirs \
        package-linux package-windows package-macos release

all: build

# Print the resolved version (handy for CI).
version:
	@echo $(VERSION)

# Build the CLI for the host OS.
build:
	$(GO) build -ldflags "$(LDFLAGS)" -o $(BIN) ./cmd

# Build the native GUI for the host (Linux webview tags).
gui:
	$(GO) build -tags '$(GUI_TAGS_LINUX)' -ldflags "-w -s $(LDFLAGS)" -o $(GUI_BIN) ./desktop

test:
	$(GO) test ./...

vet:
	$(GO) vet ./...
	$(GO) vet -tags '$(GUI_TAGS_LINUX)' ./desktop

dist-dirs:
	@mkdir -p $(DIST)/linux $(DIST)/windows

# ---- Linux: .deb + .rpm via nfpm ------------------------------------------
package-linux: dist-dirs
	$(GO) build -ldflags "$(LDFLAGS)" -o $(DIST)/linux/$(BIN) ./cmd
	$(GO) build -tags '$(GUI_TAGS_LINUX)' -ldflags "-w -s $(LDFLAGS)" -o $(DIST)/linux/$(GUI_BIN) ./desktop
	VERSION=$(VERSION) $(NFPM) pkg -f build/linux/nfpm.yaml -p deb -t $(DIST)/
	VERSION=$(VERSION) $(NFPM) pkg -f build/linux/nfpm.yaml -p rpm -t $(DIST)/
	@echo ">> Linux packages written to $(DIST)/"

# ---- Windows: .exe installer via NSIS (cross-compiles from any OS) ---------
package-windows: dist-dirs
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 $(GO) build -tags '$(GUI_TAGS_WIN)' \
		-ldflags "-w -s -H windowsgui $(LDFLAGS)" -o $(DIST)/windows/$(GUI_BIN).exe ./desktop
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 $(GO) build \
		-ldflags "-w -s $(LDFLAGS)" -o $(DIST)/windows/$(BIN).exe ./cmd
	makensis -V2 \
		-DVERSION=$(VERSION) -DWINVERSION=$(WINVERSION) \
		-DSRCDIR=$(abspath $(DIST)/windows) \
		-DOUTFILE=$(abspath $(DIST))/imgdedupe-$(VERSION)-setup.exe \
		-DICON=$(abspath build/windows/imgdedupe.ico) \
		build/windows/installer.nsi
	@echo ">> Windows installer: $(DIST)/imgdedupe-$(VERSION)-setup.exe"

# ---- macOS: .app + .dmg (run on macOS) ------------------------------------
package-macos:
	VERSION=$(VERSION) ./build/darwin/package-macos.sh

# ---- release: build every installer the host can produce ------------------
# Windows cross-compiles everywhere; Linux/macOS packages need their own host.
release:
	@case "$$(uname -s)" in \
	  Linux)  $(MAKE) package-linux package-windows VERSION=$(VERSION) ;; \
	  Darwin) $(MAKE) package-macos package-windows VERSION=$(VERSION) ;; \
	  *)      echo "unsupported host: $$(uname -s)"; exit 1 ;; \
	esac

clean:
	rm -f $(BIN) $(GUI_BIN)
	rm -rf $(DIST)
