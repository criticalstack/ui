# Developer Shell

In addition to providing a shell interface for running pods, the Critical Stack UI enables developers to launch a
"developer shell" job quickly and easily - then attach to it. The default container image used is `bitnami/kubectl`,
allowing a user to interact with the cluster directly using familiar tools.

## Permissions

The developer shell is launched, by default, in the current user's "default namespace". The container uses the `default`
Service Account in that namespace. If that service account has no roles bound to it, you will not be able to interact
meaningfully with the cluster using the credentials provided by the shell.

## Persistence

A `1Gi` persistent volume is created on demand when a user requests their first developer shell. The volume is mounted
as `/data` in the container, and intended to be used for persisting data across sessions (it could make sense to store a
user's home directory here).

## Planned Features

- Customized base image
- Persistent history/home directory storage
- Choosing service account and role from the UI
