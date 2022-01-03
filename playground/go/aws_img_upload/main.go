package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

type LambdaRequest struct {
	Filename string `json:"filename"`
	Image    string `json:"image"`
}

type LambdaResponse struct {
	Status    string `json:"status"`
	Value     string `json:"value"`
	Timestamp int64  `json:"timestamp"`
}

const (
	AWS_S3_REGION     = "us-east-2"
	AWS_S3_BUCKET     = "my-bucket"
	AWS_S3_BUCKET_URL = "//" + AWS_S3_BUCKET + ".s3." + AWS_S3_REGION + ".amazonaws.com"
)

func handle(ctx context.Context, name events.APIGatewayProxyRequest) (LambdaResponse, error) {
	// retrieve request body
	request := LambdaRequest{}
	json.Unmarshal([]byte(name.Body), &request)

	// retrieve request stuff
	fileDest := "/uploads/" + request.Filename
	imageDAT := request.Image

	coI := strings.Index(imageDAT, ",")
	raw := string(imageDAT)[coI+1:]
	unbased, _ := base64.StdEncoding.DecodeString(raw)

	// check file suffix
	switch strings.TrimSuffix(imageDAT[5:coI], ":base64") {
	case "image/png":
		if !strings.HasSuffix(fileDest, ".png") {
			fileDest += ".png"
		}
	case "image/jpeg":
		if !strings.HasSuffix(fileDest, ".jpeg") {
			fileDest += ".jpeg"
		}
	}

	// upload image to S3
	// create session
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(AWS_S3_REGION),
	})
	if err != nil {
		return LambdaResponse{
				Status:    "Error during create session",
				Value:     fmt.Sprintf("%v", err),
				Timestamp: time.Now().Unix(),
			},
			nil
	}

	// put object to S3 bucket
	image := bytes.NewReader(unbased)
	_, err = s3.New(sess).PutObject(&s3.PutObjectInput{
		Bucket:               aws.String(AWS_S3_BUCKET),
		Key:                  aws.String(fileDest),
		ACL:                  aws.String("public-read"),
		Body:                 image,
		ContentLength:        aws.Int64(image.Size()),
		ContentType:          aws.String(http.DetectContentType(unbased)),
		ContentDisposition:   aws.String("attachment"),
		ServerSideEncryption: aws.String("AES256"),
	})
	if err != nil {
		return LambdaResponse{
				Status:    "Error during S3 PutObject",
				Value:     fmt.Sprintf("%v", err),
				Timestamp: time.Now().Unix(),
			},
			nil
	}

	return LambdaResponse{
			Status:    "ok",
			Value:     AWS_S3_BUCKET_URL + fileDest,
			Timestamp: time.Now().Unix(),
		},
		nil
}

func main() {
	lambda.Start(handle)
}
