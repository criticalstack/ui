# Machine API and Worker Management

The Critical Stack UI uses [machine-api](https://github.com/criticalstack/machine-api) to manage the lifecycle of worker
nodes in the cluster.

When running locally via cinder, machine-api (`mapi`) and [machine-api-provider-docker](https://github.com/criticalstack/machine-api-provider-docker) (`mapd`) are installed automatically. From the "Nodes" screen, you will have the option to create a new worker node (i.e. a Docker container on your host) which will automatically join the cluster.

TODO:
- running with cinder and mapd
  - gif
- running in aws
- worker configs
- dynamic configuration discovery
