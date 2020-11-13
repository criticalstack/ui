# Installation

Deploy the included [Helm chart](https://github.com/criticalstack/ui/tree/main/chart) to your Kubernetes cluster:

```shell
helm upgrade --install cs ./chart \
  --create-namespace \
  --namespace critical-stack
```

**Don't have a cluster handy? Check out [cinder 🔥](#cinder)!**

The default chart installation depends on [Cert Manager](https://github.com/jetstack/cert-manager) being installed to
generate certificates. If you'd rather skip this, pass `--set tls.enabled=false` to Helm.

Visit the UI service endpoint:

```shell
$ kubectl get service -n critical-stack cs-ui
NAME    TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
cs-ui   NodePort   10.254.244.88   <none>        8000:30000/TCP   12s
```

## Developing Locally

_Skip to the [tl;dr?](#tldr)_

The Critical Stack UI is best developed with [cinder](https://docs.crit.sh/cinder-guide/overview.html) and [tilt](https://docs.tilt.dev/install.html):

```shell
git clone github.com/criticalstack/ui
```

**Note:** If you clone the repo into a directory _within_ `$GOPATH`, make sure that
you have `$GO111MODULE` set to `on`.

### Requirements

1. Go 1.14+: to build server code
2. NodeJS and NPM: to build client code
3. Docker: for local testing and to build container images
4. kubectl: for local testing; see the [installation guide](https://kubernetes.io/docs/tasks/tools/install-kubectl/)
5. Helm 3: see the [installation guide](https://helm.sh/docs/intro/install/)

### Cinder

Run the following to install [cinder](https://docs.crit.sh/cinder-guide/overview.html) and setup a local development cluster:

```shell
make cinder
```

The required version of `cinder` will be installed to `hack/tools/bin/cinder`.

**Note:** if you would like to provide a different binary, you may set the `CINDER` variable when calling `make`:

```shell
CINDER=/usr/local/bin/cinder make cinder
```

The configuration file used by `make cinder` is [hack/cinder.yaml](), and the created cluster will be named `ui-dev`.

Cinder is deployed with the `LocalRegistry` [feature gate](https://docs.crit.sh/cinder-guide/features.html#local-registry) enabled, allowing rapid iteration when building container images locally.

In addition, [machine-api](https://github.com/criticalstack/machine-api) and [machine-api-provider-docker](https://github.com/criticalstack/machine-api-provider-docker) are installed, allowing you to [deploy additional worker nodes](./docs/machine-api.md) to your local cluster as Docker containers.

### Get Tilt(ed)

```shell
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
```

**Note:** this will not run on older versions of tilt, make sure to have `>= v0.15.0`.

Now you're ready to run:

```shell
tilt up
```

### Log In

Once Tilt has finished installing resources, you can log in to the UI. By default, the Kubernetes Service attached
to the UI deployment listens on `nodePort: 30000`, meaning it is accessible at `http://$(cinder get ip --name ui-dev):30000`.

For convenience, cinder [is configured](./hack/cinder.yaml) with:

```yaml
extraPortMappings:
- listenAddress: 0.0.0.0
  hostPort: 8000
  containerPort: 30000
  protocol: TCP
```

So that you can reach the UI by pointing your browser at [http://localhost:8000](http://localhost:8000).

The [chart values](./chart/values.yaml) do not specify a default user, but the [Tiltfile](./Tiltfile) does for the purpose of local
development. The email address is `dev@criticalstack.com`, and the initial password is `admin`. See
[configuration](/configuration.md) for more detail on changing initial credentials.

### tl;dr

It really wasn't that much, but ok.

First time setup:

```shell
# install helm
curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash
# install tilt
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
```

Setup your local cluster & start tilt

```shell
make cinder
tilt up
```

Click [http://localhost:8000](http://localhost:8000). Log in with email `dev@criticalstack.com` and password `admin`.
