# img-dedupe — build targets
#
# The desktop GUI (Wails) needs native libraries — GTK 3 + WebKit2GTK 4.1
# (Ubuntu: apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev). It is gated
# behind the `desktop` build tag so the CLI, web server and tests build without
# the native toolchain.

BIN      ?= imgdedupe
GUI_BIN  ?= imgdedupe-gui
GUI_TAGS ?= desktop production webkit2_41

.PHONY: build gui serve test vet clean

build:
	go build -o $(BIN) ./cmd

gui:
	go build -tags '$(GUI_TAGS)' -ldflags '-w -s' -o $(GUI_BIN) ./desktop

serve: build
	./$(BIN) serve

test:
	go test ./...

vet:
	go vet ./...
	go vet -tags '$(GUI_TAGS)' ./desktop

clean:
	rm -f $(BIN) $(GUI_BIN)
