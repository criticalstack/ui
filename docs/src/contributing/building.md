# Building

Tilt will build the necessary components automatically, but should you feel the need to do it yourself there are a
variety of `make` targets available:

```
$ make help

Usage:
  make <target>

Building
  build            Build client and server
  client           Build client code
  client-dev       Dev build of client code
  server           Build the go binary
  manifests        Generate CRD manifests
  image            Build and tag container images
  image-push       Push container images

Running
  cinder           Start and configure a cinder cluster for local development
  cinder-cleanup   Delete the cinder cluster

Testing
  test             Run go tests
  vtest            Run go tests with -v
  test-e2e         Run e2e tests
  lint             Lint codebase
  lint-full        Run slower linters to detect possible issues

Helpers
  clean            Cleanup the project folders
  help             Display this help
```
