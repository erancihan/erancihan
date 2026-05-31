.PHONY: build css copy clean

EXT_DIR := extension
OUT_DIR := dist
XPI_NAME := camera-finder.xpi

# Windows Desktop path via WSL — adjust USERNAME if needed
WIN_USER := $(shell cmd.exe /C "echo %USERNAME%" 2>/dev/null | tr -d '\r')
WIN_DEST := /mnt/c/Users/$(WIN_USER)/Desktop

EXT_FILES := \
	$(EXT_DIR)/manifest.json \
	$(EXT_DIR)/camera_db.js \
	$(EXT_DIR)/background.js \
	$(EXT_DIR)/content.js \
	$(EXT_DIR)/popup.html \
	$(EXT_DIR)/popup.js \
	$(EXT_DIR)/dashboard.html \
	$(EXT_DIR)/dashboard.js \
	$(EXT_DIR)/styles.css

css: $(EXT_DIR)/styles.css

$(EXT_DIR)/styles.css: $(EXT_DIR)/src/styles.css $(EXT_DIR)/popup.html $(EXT_DIR)/dashboard.html
	npx @tailwindcss/cli -i $(EXT_DIR)/src/styles.css -o $(EXT_DIR)/styles.css --minify

build: css $(OUT_DIR)/$(XPI_NAME)
	@echo ""
	@echo "Built: $(OUT_DIR)/$(XPI_NAME)"

$(OUT_DIR)/$(XPI_NAME): $(EXT_FILES)
	@mkdir -p $(OUT_DIR)
	cd $(EXT_DIR) && zip -r ../$(OUT_DIR)/$(XPI_NAME) . -x ".*" -x "src/*"
	@echo ""

copy: build
	cp $(OUT_DIR)/$(XPI_NAME) "$(WIN_DEST)/$(XPI_NAME)"
	@echo "Copied to: $(WIN_DEST)/$(XPI_NAME)"
	@echo ""
	@echo "Install in Firefox: about:addons → ⚙ → Install Add-on From File → Desktop/$(XPI_NAME)"

clean:
	rm -rf $(OUT_DIR) $(EXT_DIR)/styles.css
