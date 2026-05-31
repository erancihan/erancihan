.PHONY: build copy clean

OUT_DIR := dist
XPI_NAME := aether-downloader.xpi
ARTIFACTS_DIR := artifacts

# Windows path via WSL
WIN_USER := $(shell cmd.exe /C "echo %USERNAME%" 2>/dev/null | tr -d '\r')
WIN_DEST := /mnt/c/Users/$(WIN_USER)/Downloads/browser-extensions

node_modules: package.json
	npm install
	@touch node_modules

build: node_modules
	npm run build
	npx web-ext build -s $(OUT_DIR) -a $(ARTIFACTS_DIR) --overwrite-dest --filename $(XPI_NAME)
	@echo ""
	@echo "Built: $(ARTIFACTS_DIR)/$(XPI_NAME)"

copy: build
	@mkdir -p "$(WIN_DEST)"
	cp $(ARTIFACTS_DIR)/$(XPI_NAME) "$(WIN_DEST)/$(XPI_NAME)"
	@echo "Copied to: $(WIN_DEST)/$(XPI_NAME)"

clean:
	rm -rf $(OUT_DIR) $(ARTIFACTS_DIR) node_modules
