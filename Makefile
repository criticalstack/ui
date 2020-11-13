.DEFAULT_GOAL:=help

NAME           := ui
BIN_DIR        ?= bin
TOOLS_DIR      := $(shell pwd)/hack/tools
TOOLS_BIN_DIR  := $(TOOLS_DIR)/bin
CINDER         ?= $(TOOLS_BIN_DIR)/cinder
CINDER_VERSION ?= 1.0.8
CONTROLLER_GEN := $(TOOLS_BIN_DIR)/controller-gen
GOLANGCI_LINT  := $(TOOLS_BIN_DIR)/golangci-lint
REPO_ROOT      := github.com/criticalstack/$(NAME)

GIT_BRANCH = $(shell git rev-parse --abbrev-ref HEAD | sed 's/\///g')
GIT_SHA    = $(shell git rev-parse --short HEAD)
GIT_TAG    = $(shell git describe --tags --abbrev=0 --exact-match 2>/dev/null)
GIT_DIRTY  = $(shell test -n "`git status --porcelain`" && echo "-dirty")

VERSION ?= $(GIT_BRANCH).$(GIT_SHA)$(GIT_DIRTY)
ifneq ($(GIT_TAG),)
	VERSION = $(GIT_TAG)
endif

IMAGE_BASE := criticalstack/$(NAME)
IMAGE_URI  ?= $(IMAGE_BASE):$(VERSION)

LDFLAGS := -s -w
LDFLAGS += -X "$(REPO_ROOT)/internal/app.Version=$(VERSION)"
GOFLAGS = -gcflags "all=-trimpath=$(PWD)" -asmflags "all=-trimpath=$(PWD)"

# list of directories containing go code to build
GO_DIRS := cmd/$(NAME) api internal controllers
GO_SRC  := go.mod go.sum $(foreach dir,$(GO_DIRS),$(shell find $(dir) -type f \( -name '*.go' -not -name 'zz_generated.*' \)))
API_DIR := api
API_SRC := $(shell find $(API_DIR) -type f \( -name '*.go' -not -name 'zz_generated.*' \))
API_DEEPCOPY := $(addsuffix /zz_generated.deepcopy.go,$(shell find $(API_DIR) -type d -not -name $(API_DIR)))
GO_BUILD_ENV_VARS := GO111MODULE=on CGO_ENABLED=0

OBJECT_HEADER := hack/boilerplate.go.txt
CONTROLLER_GEN_CRD_OPTIONS ?= crd:trivialVersions=true
CONTROLLER_GEN_OBJECT_OPTIONS ?= object:headerFile=$(OBJECT_HEADER)

export KUBEBUILDER_ASSETS := $(TOOLS_BIN_DIR)
KUBEBUILDER_ASSETS_BIN := $(addprefix $(TOOLS_BIN_DIR)/,kubebuilder kube-apiserver etcd kubectl)

##@ Building

.PHONY: all build client server manifests image image-push

all: build

build: client server ## Build client and server

client: ## Build client code
	$(MAKE) -C client install prod

client-dev: ## Dev build of client code
	$(MAKE) -C client dev

server: $(BIN_DIR)/$(NAME) ## Build the go binary

deepcopy-gen: $(API_DEEPCOPY) ## Generate k8s object deepcopy methods

$(API_DEEPCOPY): $(CONTROLLER_GEN) $(API_SRC) $(OBJECT_HEADER)
	$(CONTROLLER_GEN) $(CONTROLLER_GEN_OBJECT_OPTIONS) paths="./..."

manifests: $(CONTROLLER_GEN) ## Generate CRD manifests
	$(CONTROLLER_GEN) $(CONTROLLER_GEN_CRD_OPTIONS) paths="./..." output:crd:artifacts:config=chart/crds

$(BIN_DIR)/$(NAME): $(GO_SRC) deepcopy-gen
	$(GO_BUILD_ENV_VARS) go build -o $@ $(GOFLAGS) -ldflags '$(LDFLAGS)' ./cmd/$(NAME)

image: ## Build and tag container images
	@go mod vendor
	@docker build . -t $(IMAGE_URI) --build-arg GOPROXY --build-arg GOSUMDB --build-arg VERSION=$(VERSION)

version:
	@echo $(VERSION)

image-push: ## Push container images
	@docker push $(IMAGE_URI)

##@ Running

.PHONY: cinder cinder-cleanup

CLUSTER_NAME ?= ui-dev

cinder: $(CINDER) ## Start and configure a cinder cluster for local development
	$(CINDER) create cluster -c hack/cinder.yaml --name $(CLUSTER_NAME)
	@kubectl config set-context $$(kubectl config current-context) --namespace=critical-stack

UI_ENDPOINT ?= http://$$(cinder get ip --name $(CLUSTER_NAME)):30000

cinder-cleanup: $(CINDER) ## Delete the cinder cluster
	$(CINDER) delete cluster --name $(CLUSTER_NAME)

##@ Testing

.PHONY: test test-e2e client-test lint lint-full

test: $(KUBEBUILDER_ASSETS_BIN) ## Run go tests
	go test -run=$(TESTS) ./...

vtest: $(KUBEBUILDER_ASSETS_BIN) ## Run go tests with -v
	go test -run=$(TESTS) -v ./...

test-e2e: ## Run e2e tests
	go test $(GOFLAGS) -ldflags '$(LDFLAGS)' -v ./e2e -e2e -run=$(TESTS) -external $(UI_ENDPOINT)

lint: $(GOLANGCI_LINT) ## Lint codebase
	$(GOLANGCI_LINT) run -v

lint-full: $(GOLANGCI_LINT) ## Run slower linters to detect possible issues
	$(GOLANGCI_LINT) run -v --fast=false

##@ Helpers

.PHONY: clean help

$(CINDER): # Install cinder
	mkdir -p $(TOOLS_BIN_DIR)
	curl -sL -w '' "https://github.com/criticalstack/crit/releases/download/v$(CINDER_VERSION)/crit_$(CINDER_VERSION)_$(shell uname)_$(shell uname -m).tar.gz" | tar -xz -C $(TOOLS_BIN_DIR) cinder

$(CONTROLLER_GEN): $(TOOLS_DIR)/go.mod # Build controller-gen from tools folder.
	cd $(TOOLS_DIR); go build -o bin/controller-gen sigs.k8s.io/controller-tools/cmd/controller-gen

$(GOLANGCI_LINT): $(TOOLS_DIR)/go.mod # Build golangci-lint from tools folder.
	cd $(TOOLS_DIR); go build -o bin/golangci-lint github.com/golangci/golangci-lint/cmd/golangci-lint

KUBEBUILDER_VERSION ?= 2.3.1

$(KUBEBUILDER_ASSETS_BIN):
	mkdir -p $(KUBEBUILDER_ASSETS)
	curl -L https://go.kubebuilder.io/dl/$(KUBEBUILDER_VERSION)/$(shell go env GOOS)/$(shell go env GOARCH) | tar -xz -C /tmp/
	mv /tmp/kubebuilder_$(KUBEBUILDER_VERSION)_$(shell go env GOOS)_$(shell go env GOARCH)/bin/* $(KUBEBUILDER_ASSETS)/

clean: ## Cleanup the project folders
	rm -f $(BIN_DIR)/*
	rm -f $(TOOLS_BIN_DIR)/*

help:  ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
