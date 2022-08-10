#!make
include .env
export $(shell sed 's/=.*//' .env)

.PHONY: build run pack release

LDFLAGS := \
-X 'main.AWS_S3_BUCKET=${AWS_S3_BUCKET}' \
-X 'main.AWS_S3_REGION=${AWS_S3_REGION}' \
-X 'main.AWS_S3_BUCKET_URL=${AWS_S3_BUCKET_URL}' \
-X 'main.UPLOAD_FOLDER_PREFIX=${UPLOAD_FOLDER_PREFIX}'

build:
	GOOS=linux go build -ldflags="${LDFLAGS}" -o ./make-build-release/upload main.go

run:
	./make-build-release/upload

pack:
	mv -v ./make-build-release/upload ./make-build-release/main 
	zip ./make-build-release/function.zip ./make-build-release/main

release: build pack
