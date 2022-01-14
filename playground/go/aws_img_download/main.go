package main

import "fmt"

var (
	AWS_S3_REGION     = ""
	AWS_S3_BUCKET     = ""
	AWS_S3_BUCKET_URL = "//" + AWS_S3_BUCKET + ".s3." + AWS_S3_REGION + ".amazonaws.com"
)

func main() {
	if len(AWS_S3_BUCKET) == 0 {
		panic("AWS_S3_BUCKET cannot be empty")
	}
	if len(AWS_S3_REGION) == 0 {
		panic("AWS_S3_REGION cannot be empty")
	}

	fmt.Println(AWS_S3_BUCKET_URL)
}
