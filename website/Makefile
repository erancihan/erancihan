.PHONY: dev server

# Development -------------------------------

watch-theme:
	@cd themes/theme; yarn watch

watch-website:
	hugo server -D --watch

dev:
	@$(MAKE) -j2 watch-theme watch-website

# Release -----------------------------------

build-theme:
	@cd themes/theme; yarn build

build-website:
	hugo --minify

release: build-theme build-website
