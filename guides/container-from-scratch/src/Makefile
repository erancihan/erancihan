# Build every step into ./bin. The programs are Linux-only (they use clone/
# pivot_root/mount syscalls), so they will not build on macOS or Windows — which
# is itself a lesson of this guide (see docs/11 and docs/12).

STEPS := \
	step1-exec \
	step2-uts-namespace \
	step3-reexec \
	step4-pid-and-proc \
	step5-rootfs-pivot-root \
	step6-cgroups \
	step8-rootless \
	step9-overlayfs \
	step10-hardening

BIN := bin

.PHONY: all clean vet fmt rootfs
all: $(addprefix $(BIN)/,$(STEPS)) $(BIN)/mini-docker

# The capstone builds from step7-mini-docker but installs as ./bin/mini-docker.
$(BIN)/mini-docker: step7-mini-docker/main.go | $(BIN)
	go build -o $@ ./step7-mini-docker

$(BIN)/%: %/main.go | $(BIN)
	go build -o $@ ./$*

$(BIN):
	mkdir -p $(BIN)

vet:
	go vet ./...

fmt:
	gofmt -l -w .

# Convenience: download a tiny Alpine rootfs to /tmp/alpine for steps 5 and 7.
ALPINE_URL := https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-minirootfs-3.20.3-x86_64.tar.gz
rootfs:
	mkdir -p /tmp/alpine
	curl -sSL $(ALPINE_URL) | sudo tar -xz -C /tmp/alpine
	@echo "rootfs ready at /tmp/alpine — run: sudo ROOTFS=/tmp/alpine ./bin/mini-docker run /bin/sh"

clean:
	rm -rf $(BIN)
