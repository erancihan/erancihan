.PHONY: build

NODE_MODULES_PKG := ./www/node_modules/wasm-game-of-life/

build:
	wasm-pack build
	rm -rfv \
		${NODE_MODULES_PKG}
	mkdir -v \
		${NODE_MODULES_PKG}
	cp -v \
		./pkg/* \
		${NODE_MODULES_PKG}

serve: build
	cd www && yarn start