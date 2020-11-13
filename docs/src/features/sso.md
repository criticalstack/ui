# SSO

Because the Critical Stack UI utilizes [Dex](https://dexidp.io) as its identity provider, enabling SSO is as simple as
configuring Dex. We provide several convenient methods for accomplishing this task.

## UI

Administrators can configure Dex [connectors](https://dexidp.io/docs/connectors/) from the UI by visiting the "SSO
Provider" menu under "Settings".

The "Connectors" section allows a user to create, edit, and delete existing connectors.

**Note:** by default an `authproxy` connector exists to connect the UI with Dex, which allows local users to [download a
valid Kubeconfig](/design.md#dex).

![sso connector](/images/sso-connector.gif)

When creating a new connector, selecting the `type` will allow you to enter the relevant configuration data for that
type - currently the UI supports creating **GitHub**, **OIDC**, and **LDAP** connectors via form - but more can be added upon
request.

**Note:** when creating a connector through the UI, the redirect URI will be auto-filled. In the case that it needs to
be changed, the _path_ used should always be `/dex/callback`. In almost all cases, the full redirect URI should be
`<user login URL>/dex/callback`.

When more than one connector (excluding the `authproxy`) is present, the UI login screen will link to Dex's landing page
so that a user can choose the desired identity provider - rather than linking to the provider directly.

By right-clicking a connector and choosing "Set as default", it can be made to show up on the login screen even if there
are other choices available (avoiding the need for users to visit the Dex landing page). This is accomplished
by applying the label `criticalstack.com/dex.default` to the `Connector` resource.

## Helm Values

Connectors can also be created at the time of chart installation by passing specific values to Helm. The
`identity.connectors` map provides this configuration data, for example:

```yaml
identity:
  connectors:
    my-connector:
      name: MyConnector
      type: oidc
      config:
        issuer: https://my-connector.com
        clientID: my_client_id
        clientSecret: my_client_secret
        redirectURI: http://localhost:8000/dex/callback
        default: true
        anyOtherConfig:
        - added
        - here
    github:
      name: GitHub
      type: github
      config:
        clientID: my_client_id
        clientSecret: my_client_secret
        redirectURI: http://localhost:8000/dex/callback
```

The following connector resources (in addition to an `authproxy`) would be created:

```yaml
kind: Connector
apiVersion: dex.coreos.com/v1
metadata:
  name: github
  namespace: critical-stack
  labels:
    criticalstack.com/dex.default: "true"
id: github
name: GitHub
type: github
config: eyJjbGllbnRJRCI6Im15X2NsaWVudF9pZCIsImNsaWVudFNlY3JldCI6Im15X2NsaWVudF9zZWNyZXQiLCJyZWRpcmVjdFVSSSI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9kZXgvY2FsbGJhY2sifQ==
---
kind: Connector
apiVersion: dex.coreos.com/v1
metadata:
  name: my-connector
  namespace: critical-stack
id: my-connector
name: MyConnector
type: oidc
config: eyJhbnlPdGhlckNvbmZpZyI6WyJhZGRlZCIsImhlcmUiXSwiY2xpZW50SUQiOiJteV9jbGllbnRfaWQiLCJjbGllbnRTZWNyZXQiOiJteV9jbGllbnRfc2VjcmV0IiwiaXNzdWVyIjoiaHR0cHM6Ly9teS1jb25uZWN0b3IuY29tIiwicmVkaXJlY3RVUkkiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvZGV4L2NhbGxiYWNrIn0=
```

Any values in the `config` property of a connector are directly marshaled to JSON and then base64 encoded.

## kube-apiserver OIDC configuration

The `kube-apiserver` must be configured for OIDC for it to fully leverage the UI-Dex integration. This will allow Kubernetes RBAC to be tied to the OIDC grants returned by Dex.

The following arguments must be set on the `kube-apiserver`:
```bash
--oidc-issuer-url=https://<criticalstack-ui-url>/dex
--oidc-client-id=critical-stack
--oidc-username-claim=email
--oidc-groups-claim=groups
```

If the UI is being served with a non-root-trusted CA certificate (as in the auth-proxy config mentioned above), the CA will also need to be set:
```bash
--oidc-ca-file=/etc/kubernetes/pki/auth-proxy-ca.crt
```


If [crit](https://github.com/criticalstack/crit) is used to bootstrap the cluster, these arguments can be provided in the crit [ControlPlaneConfig](https://pkg.go.dev/github.com/criticalstack/crit@v1.0.1/pkg/config/v1alpha2#ControlPlaneConfiguration) as follows:

```yaml
kubeAPIServer:
  extraArgs:
    oidc-ca-file: /etc/kubernetes/pki/auth-proxy-ca.crt
    oidc-client-id: critical-stack
    oidc-groups-claim: groups
    oidc-issuer-url: "https://<criticalstack-ui-url>/dex"
    oidc-username-claim: email
```

Check the full `kube-apiserver` argument reference [here](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/) for more information.


## Replacing Dex

TODO
- configuring a non-default sso provider
