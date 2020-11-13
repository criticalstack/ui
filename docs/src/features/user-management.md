# User Management

As mentioned in the [design docs](/design.md#users), the Critical Stack UI introduces the `User` resource to represent
application users. 

## Overview

Users contain identifying information and some basic metadata:

```yaml
apiVersion: criticalstack.com/v1alpha1
kind: User
metadata:
  # unique hash of email address
  name: sy3e5vknpktgkezpehh3rv76v5helr6vgnrm26feoz67stsosg6ef4jbdb2uegk
type: local
active: true
defaultNamespace: critical-stack
email: dev@criticalstack.com
username: Cluster Administrator
```

There are two flavors of user, determined by their `type` field:

- `local` users are created manually and log in with an email and password
- `sso` users are created "lazily" on first log in (see [SSO](./sso.md)) and do not have a password

When Dex authenticates an SSO user (creating the `User` resource if necessary), it attaches `group` information obtained
from the identity provider. These groups are used for matching role binding _subjects_ when determining user
permissions.

Local user passwords are salted and hashed, stored as `Secret` resources in the `critical-stack` namespace. Users are
given role bindings that allow them to get and modify their own properties for the purpose of
changing profile data.

## Creation

There are multiple ways to create a user. A `local` user may be created through the UI via the "Manage Users" screen,
under "Settings". During the creation process, an administrator can choose to assign a `ClusterRole` as a convenient way
to provide immediate access to the user. If a specific namespace is chosen, the `ClusterRole` is granted via a
`RoleBinding` in that namespace - otherwise "Cluster Wide" must be checked to indicate that a `ClusterRoleBinding` will
be created.

![user creation roles](/images/user-creation-roles.png)

Any cluster roles with the **label** `criticalstack.com/rbac=defaults` will show up as options in this list, giving you a way to add
additional "canned" roles to the user creation process. The description is pulled from an **annotation** named
`criticalstack.com/description`.

Once created, all users and any corresponding (cluster) roles and bindings maybe found under "Cluster" > "Access Control".

![user creation](/images/user-creation.gif)


The `User` Custom Resource should not typically be created directly - instead, create a `UserRequest` which will be
reconciled by the users controller (part of the UI deployment).

A simple `UserRequest` resource might look like:

```yaml
apiVersion: criticalstack.com/v1alpha1
kind: UserRequest
metadata:
  # human-readable name
  name: admin
spec:
  template:
    type: local
    active: true
    defaultNamespace: critical-stack
    email: dev@criticalstack.com
    username: Cluster Administrator
```

The `UserRequest`'s `.spec.template` field will become the properties of the created `User` object.

One key difference is that the name of the resource need not be a deterministic value derived from the email address.
This makes it possible to create resources directly without access to the hashing function used (i.e. from within Helm
templates).

In the above example the created user does not have a password set, meaning they will be unable to log in. The
`UserRequest` provides a couple of methods for setting an initial user password:

- For simple cases like local development, an initial password can be set on the user request itself:

```yaml
# ...
spec:
  initialPassword:
    value: Winter20
  template: # ...
```

**Note**: that this will generate hashed password data from the provided plaintext password on initial user creation.
The password text remains in the `UserRequest` resource, but updating it will not change the created user's password.

Another method is to reference a secret, rather than embedding a plaintext password directly:

```yaml
# ...
spec:
  initialPassword:
    secretRef:
      name: my-initial-password
      namespace: default
      key: ""        # field to read from secret data - if omitted, use the first
      consume: false # if true, remove the secret after generating password data
  template: # ...
```

The `key` and `consume` fields are optional to provide additional flexibility.

A user created via the UI or `UserRequest` CRD has a default `ClusterRole` and `ClusterRoleBinding` created for them,
allowing `get`, `update`, and `patch` actions on their `UserRequest` resource, as well as `get` on their `User`.

To disable this behavior, set `.spec.skipUserBindings` to `true`.

**Note**: all resources created by the `UserRequest` controller are owned by the `UserRequest` object - when deleted,
the `User`, password data `Secret`, and any created RBAC resources will be deleted.

## Status

The `UserRequest` resource has a `status` subresource which indicates whether the corresponding `User` has been created by
the controller. The `.status.user` field is the name of the created user resource, while `.status.conditions` signals if the `User` is
ready. This allows for a process to depend on user creation:

```shell
kubectl wait userrequests admin --for condition=Ready
```

This functionality is used by our automated tests to ensure that a user is available before attempting to log in.


## User Fields

The `active` property indicates whether a user can log in or not, and can be toggled from the user-management screen in
the UI:

![toggle user active](/images/togg-active-user.gif)


Users have a default namespace, which will be their "landing page" upon login. From the "Settings" area of the UI, a
user can change their default namespace, as well as upload an avatar or reset their password.

## Permissions

See [RBAC](/design.md#rbac) for an overview of the permission model used throughout the UI.

The access summary screen ("Cluster" > "Access Control" > "Access") displays an overview of `User` and `Group` subjects
that have bound roles and cluster roles:

![access summary](/images/access-summary.png)

Known users and groups will be listed here. By right-clicking a subject, you can quickly add additional role bindings and cluster
role bindings for that subject.

### Role Bindings and Cluster Role Bindings

When creating a role binding or a cluster role binding, note that you are not limited to subjects that show up in the selection
dropdown - typing a name will allow you to create a new subject:

![subject naming](/images/binding-create-subject.gif)

### Roles and Cluster Roles

When creating roles and cluster roles, note that you are not limited to the API groups, Resources, and Verbs that show up in their respective selection dropdowns - typing in a new value will allow you to create a new group, resource, or verb. 

![new values](/images/roles-new-values.gif)

Also note that when creating a new role, you can either start with selecting an API group and then the resources or by selecting a resource first and then the API group.

![create rules](/images/roles-create-rule.gif)

## Initial Roles

Initial role bindings will be created on installation depending on the values passed to the UI Helm chart. See
[configuration](/gettingstarted/configuration#rbac) for more information.
