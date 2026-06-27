# Companion app — convenience targets. `make install` handles full setup:
# npm deps (postinstall fetches the sample avatar + Cubism Core if missing) +
# rebuilding the node-pty native module against Electron's ABI.

.PHONY: install dev build start test typecheck rebuild fetch-avatar fetch-avatar-force clean distclean

install:
	npm install
	npm run rebuild

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

test:
	npm test

typecheck:
	npm run typecheck

rebuild:
	npm run rebuild

fetch-avatar:
	npm run fetch-avatar

fetch-avatar-force:
	npm run fetch-avatar:force

clean:
	rm -rf out

distclean: clean
	rm -rf node_modules
