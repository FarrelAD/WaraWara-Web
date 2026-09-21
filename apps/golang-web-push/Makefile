.PHONY: all run test vet fmt check clean

all: check

run:
	go run main.go

test:
	go test -v ./...

vet:
	go vet ./...

fmt:
	go fmt ./...

check: fmt vet test

clean:
	go clean
