.PHONY: dev server

# Development -------------------------------

watch-theme:
	@cd themes/main; yarn watch

watch-website:
	hugo server -D --watch

dev:
	@$(MAKE) -j2 watch-theme watch-website

# Release -----------------------------------

build-theme:
	@cd themes/main; yarn publish

build-website:
	hugo --minify

release: build-theme build-website
