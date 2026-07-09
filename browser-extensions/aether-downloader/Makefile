.PHONY: build copy clean

OUT_DIR := dist
FF_DIR := dist/firefox
CH_DIR := dist/chrome
XPI_NAME := aether-downloader.xpi
CHROME_ZIP := aether-downloader-chrome.zip
ARTIFACTS_DIR := artifacts

# Windows path via WSL
WIN_USER := $(shell cmd.exe /C "echo %USERNAME%" 2>/dev/null | tr -d '\r')
WIN_DEST := /mnt/c/Users/$(WIN_USER)/Downloads/browser-extensions

node_modules: package.json
	npm install
	@touch node_modules

build: node_modules
	npm run build
	npx web-ext build -s $(FF_DIR) -a $(ARTIFACTS_DIR) --overwrite-dest --filename $(XPI_NAME)
	npx web-ext build -s $(CH_DIR) -a $(ARTIFACTS_DIR) --overwrite-dest --filename $(CHROME_ZIP)
	@echo ""
	@echo "Built: $(ARTIFACTS_DIR)/$(XPI_NAME) (Firefox)"
	@echo "Built: $(ARTIFACTS_DIR)/$(CHROME_ZIP) (Chrome)"

copy: build
	@mkdir -p "$(WIN_DEST)"
	cp $(ARTIFACTS_DIR)/$(XPI_NAME) "$(WIN_DEST)/$(XPI_NAME)"
	cp $(ARTIFACTS_DIR)/$(CHROME_ZIP) "$(WIN_DEST)/$(CHROME_ZIP)"
	@echo "Copied to: $(WIN_DEST)/"

clean:
	rm -rf $(OUT_DIR) $(ARTIFACTS_DIR) node_modules
