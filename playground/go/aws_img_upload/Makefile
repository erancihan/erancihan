.PHONY: build pack release

build:
	GOOS=linux go build -o ./make-build-release/upload main.go

pack:
	mv -v ./make-build-release/upload ./make-build-release/main 
	zip ./make-build-release/function.zip ./make-build-release/main

release: build pack
