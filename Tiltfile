# -*- mode: Python -*-

load('ext://restart_process', 'docker_build_with_restart')
load('ext://helm_remote', 'helm_remote')

allow_k8s_contexts([
    'kubernetes-admin@ui-dev',
    'kubernetes-admin@crit',
])

k8s_yaml(listdir('./chart/crds'))

local_resource('crds', 'make manifests', deps=[
    'Makefile', 'api'
])
local_resource('go-compile', 'make server', deps=[
    'Makefile', 'go.mod', 'go.sum', 'cmd/ui', 'internal', 'api', 'controllers'
])
local_resource('test', 'make test', auto_init=False, trigger_mode=TRIGGER_MODE_MANUAL)
local_resource('test-e2e', 'make test-e2e UI_ENDPOINT=http://localhost:8000', auto_init=False, trigger_mode=TRIGGER_MODE_MANUAL)

docker_build_with_restart(
    'criticalstack/ui',
    '.',
    dockerfile='hack/Dockerfile',
    entrypoint=["/ui"],
    build_args={'GOPROXY':os.environ.get('GOPROXY', '')},
    only=[
        './client/build',
        './bin/ui'
    ],
    live_update=[
        # TODO(ktravis): would be nice to not restart the process when the client files change, only binary... but it's
        # ok for now
        sync('./client/build', '/client/build'),
        sync('./bin/ui', '/ui'),
    ]
)

prometheus_helm_repo_url = 'https://prometheus-community.github.io/helm-charts'
helm_remote(
  'prometheus',
  repo_url=prometheus_helm_repo_url,
  release_name='prometheus',
  namespace='critical-stack',
  version='11.16.8',
  values=[
    'hack/prometheus/standalone.yaml',
  ]
)
helm_remote(
  'prometheus-adapter',
  repo_url=prometheus_helm_repo_url,
  release_name='prometheus-adapter',
  namespace='critical-stack',
  version='2.7.0',
  values=[
    'hack/prometheus/adapter.yaml',
  ]
)

stackapps_chart_version = '0.1.1'
stackapps_chart_url = 'https://github.com/criticalstack/stackapps/releases/download/chart%2Fv{0}/stackapps-v{0}.tgz'.format(stackapps_chart_version)
local_resource('install-stackapps', 'helm upgrade -n critical-stack --install cs-stackapps '+stackapps_chart_url, auto_init=False, trigger_mode=TRIGGER_MODE_MANUAL)

k8s_yaml(helm(
  './chart',
  # The release name, equivalent to helm --name
  name='cs-ui',
  # The namespace to install in, equivalent to helm --namespace
  namespace='critical-stack',
  # Values to set from the command-line
  set=[
    'overrideSessionKey=goodtestsecret',
    'identity.issuerCAFile=""',
    'tls.enabled=false',
    'identity.issuerOverride=http://localhost:8000',
    'healthcheck.enabled=false',
    'users.admin.initialPassword.value=admin',
    'users.admin.template.email=dev@criticalstack.com',
    'users.admin.template.defaultNamespace=critical-stack',
    'users.admin.template.type=local',
    'users.admin.template.active=true',
    'users.admin.template.username=Cluster Administrator',
  ],
))
k8s_resource(workload='cs-ui')

local_resource('package.json',
  'cd client; npm install',
  deps=['client/package.json']
)
local_resource('js',
  'cd client; npm run build:dev',
  deps=[
    'client/critical-stack.jsx', 'client/css', 'client/lib', 'client/shared'
  ],
  ignore=['client/node_modules']
)
local_resource('lint-js', 'cd client; npm run lint', trigger_mode=TRIGGER_MODE_MANUAL)
