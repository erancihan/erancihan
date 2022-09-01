.PHONY: build

WASM_PKG := ./wasm/game-of-life/pkg
NODE_MODULES_PKG := ./node_modules/wasm-game-of-life

build:
	cd ./wasm/game-of-life; wasm-pack build
	rm -rfv \
		${NODE_MODULES_PKG}
	mkdir -v \
		${NODE_MODULES_PKG}
	cp -v \
		${WASM_PKG}/* \
		${NODE_MODULES_PKG}/

serve: build
	yarn start