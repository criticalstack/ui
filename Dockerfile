############################
# First stage: client asset builder
# Dubnium is the NodeJS codename for current LTS (10.x) release
FROM docker.io/node:dubnium as client-builder

WORKDIR /ui/client

# Copy the package.json and Makefile first so node_modules don't have to change after source-files change
COPY client/package*.json ./

ENV CI=true

# As long as package*.json don't change, then this step will be cached
# Note that this step is done first and separately from the clientAssets below
RUN npm install --only=prod

# Copy the client source code
COPY client ./

RUN npm run build:prod

############################
# Second stage: build the executable with embedded client assets
FROM docker.io/golang:1.14 AS go-builder

# Set the environment variables for the go command
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOSUMDB=off GO111MODULE=on

WORKDIR /ui

# Copy Go module info and vendored dependencies first
# they are less susceptible to change on every build
# and will therefore be cached for speeding up the next build
COPY ./go.mod ./go.sum ./

# Import the code from the context.
COPY api ./api
COPY controllers ./controllers
COPY internal ./internal
COPY cmd ./cmd

# Put these right before the go build since they will change with each commit,
# which reduces docker caching
ARG VERSION=dev

RUN go build \
    -ldflags "-s -w -X github.com/criticalstack/ui/internal/app.Version=$VERSION" \
    -o ./bin/ui ./cmd/ui

############################
# Final stage: Just the executable and bare minimum other files
FROM scratch AS final

LABEL MAINTAINER="Critical Stack <dev@criticalstack.com>"

# Import the Certificate-Authority certificates for enabling HTTPS.
COPY --from=go-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Perform any further action as an unprivileged user.
USER 65534:65534

# ui runs on port 8000
EXPOSE 8000

# Built client/frontend assets
COPY --from=client-builder --chown=65534:65534 /ui/client/build /client/build

# Add ui bin
COPY --from=go-builder --chown=65534:65534 /ui/bin/ui /

ENTRYPOINT ["/ui"]
