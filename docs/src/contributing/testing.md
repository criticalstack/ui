# Testing

## Unit Tests
Unit tests focus on individual pieces of logic - a single function - and don’t require any additional services to execute. They are a quick way to get the initial feel on the current implementation, but have the risk of integration bugs slipping through.

Unit tests are currently being developed using [go test](https://golang.org/pkg/testing/). 

TODO: unit tests (and TESTS env var for focused testing)
  - Setting `KUBEBUILDER_ASSETS` in makefile (link to kubebuilder book on testing)

## Controller Tests
Controller tests are the integration tests for Kubernetes controllers and focus on testing the behavior of an entire controller or the interactions between two or more controllers. The tests run on a test environment using [envtest](https://github.com/kubernetes-sigs/controller-runtime/tree/master/pkg/envtest) where one or more controllers are configured to run against the test cluster. This will allow the controllers to interact as if they are in a real environment by creating/updating Kubernetes objects and waiting for the controllers to take action.

Controller tests are currently being developed using [ginkgo](http://onsi.github.io/ginkgo/) and [gomega](http://onsi.github.io/gomega/) following the framework set up by [Kubebuilder](https://book.kubebuilder.io/cronjob-tutorial/writing-tests.html). 

## End-to-End Tests
End-to-end tests are used to verify that all components are working as expected in a realistic environment. 

Currently, end-to-end tests are developed using [go test](https://golang.org/pkg/testing/) and are placed under [./e2e/]() in the repo.

E2E tests will require a local cluster be up and running with all the core Critical Stack components. This may be done [using Tilt](/installation.html#tldr).

## Cypress Tests
Cypress tests are end-to-end tests that use a web browser to simulate user insteraction with the UI.

They can be run inside the [./client/]() folder with `npx cypress open`.

## Running Tests
Tests may be run via Tilt or via the command line.

When running tests via Tilt, the Tilt UI can be used: 

![testing on tilt](/images/test-tilt.gif)

The `test` section will run both the unit tests and the controller tests while the `test-e2e` section will run the e2e tests. Each section may be rerun by clicking the refresh icon and can be seen by selecting the section in the sidebar. 

When running the tests locally through the command line, the following `make` targets are used:

- `make test` : Run all Go unit tests, including Kubernetes controller tests.
- `make test-e2e` : Run e2e tests in [./e2e/]() on an existing cluster (based on KUBECONFIG).
- `make lint` : Run golangci-linter.

**Note** that when running the e2e tests locally, it needs a local server to be up and running. Whether or not Tilt is used to run the tests, it will still be used to deploy the server before running the tests.

## Linting
Linting is used to analyze the source code to flag programming errors, bugs, stylistic errors, and any suspicious contructs.

[golangci](https://github.com/golangci/golangci-lint) is currently used to lint the code.

The linter can be run in the command line by running `make lint`.
