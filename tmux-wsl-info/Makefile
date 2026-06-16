.PHONY: build clean

build:
	GOOS=windows GOARCH=amd64 go build -o bin/wsl-info.exe ./cmd/wsl-info/
	GOOS=linux GOARCH=amd64 go build -o bin/wsl-info-daemon ./cmd/daemon/

clean:
	rm -f bin/wsl-info.exe bin/wsl-info-daemon
