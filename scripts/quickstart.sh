#!/bin/sh
# shellcheck shell=dash

PROMETHEUS_REPO_URL="https://prometheus-community.github.io/helm-charts"
: "${PROMETHEUS_CHART_VERSION:=11.16.8}"
: "${PROMETHEUS_ADAPTER_CHART_VERSION:=2.7.0}"

: "${UI_CHART_VERSION:=1.0.1}"
UI_CHART_URL="https://github.com/criticalstack/ui/releases/download/chart%2Fv${UI_CHART_VERSION}/ui-v${UI_CHART_VERSION}.tgz"

SWOLL_CHART_REPO="https://criticalstack.github.io/charts"

: "${STACKAPPS_CHART_VERSION:=0.1.1}"
STACKAPPS_CHART_URL="https://github.com/criticalstack/stackapps/releases/download/chart%2Fv${STACKAPPS_CHART_VERSION}/stackapps-v${STACKAPPS_CHART_VERSION}.tgz"

: "${DEBUG:-}"
: "${NO_COLORS:-}"
HAS_DOCKER="$(type "docker" > /dev/null 2>&1 && echo true || echo false)"
HAS_CINDER="$(type "cinder" > /dev/null 2>&1 && echo true || echo false)"
HAS_HELM="$(type "helm" > /dev/null 2>&1 && echo true || echo false)"

DEFAULT_INSTALL_DIR="/usr/local/bin"
HELM_BIN="helm"

bold=""
normal=""
if [ -z "$NO_COLORS" ]; then
    bold=$(tput bold)
    normal=$(tput sgr0)
fi

prompt_bool() {
    while true; do
        read -r -p "${bold}$1 [Y/n$([ -z "$DOC" ] || echo "/?")]${normal} " answer
        case "$answer" in
            [Yy]* | "" ) return 0 ;;
            [Nn]* ) return 1 ;;
            * ) [ "$answer" = "?" ] && [ -n "$DOC" ] && echo "$DOC" || echo "${bold}Please answer y/n${normal}" ;;
        esac
    done
}

run_and_print() {
    echo "$*"
    "$@"
}

should_create_cluster() {
    ! ( kubectl cluster-info >/dev/null 2>&1 && \
        prompt_bool "🖧  Use existing cluster ($(kubectl config current-context))?" )
}

if ! $HAS_HELM; then
    echo "${bold}⚓Helm is not installed, installing ...${normal}"
    read -r -p "Install to ... [$DEFAULT_INSTALL_DIR] " INSTALL_DIR
    if [ -z "$INSTALL_DIR" ]; then
        INSTALL_DIR="$DEFAULT_INSTALL_DIR"
    fi
    curl -sSfL https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | HELM_INSTALL_DIR=$INSTALL_DIR bash
    HELM_BIN="${INSTALL_DIR}/helm"
else
    echo -n "${bold}⚓ Helm is already installed${normal}"
    [ -n "$DEBUG" ] && echo ", version:" && $HELM_BIN version || echo "!"
fi

if should_create_cluster; then
    if ! $HAS_DOCKER; then
        echo "🐳 You don't seem to have Docker installed. Read this: https://docs.docker.com/get-docker/"
        exit 1
    fi

    CINDER_BIN="cinder"

    if ! $HAS_CINDER; then
        echo "${bold}🔥 Installing crit & cinder ...${normal}"
        read -r -p "Install to ... [$DEFAULT_INSTALL_DIR] " INSTALL_DIR
        if [ -z "$INSTALL_DIR" ]; then
            INSTALL_DIR="$DEFAULT_INSTALL_DIR"
        fi
        curl -sSfL https://get.crit.sh | INSTALL_DIR=$INSTALL_DIR sh
        CINDER_BIN="${INSTALL_DIR}/cinder"
    else
        echo -n "${bold}🔥 cinder is already installed${normal}"
        [ -n "$DEBUG" ] && echo ", version:" && $CINDER_BIN version || echo "!"
    fi

    echo "🖧 ${bold}Creating a local cluster ...${normal}"
    CLUSTER_NAME="critical-stack"
    run_and_print $CINDER_BIN create cluster --name "$CLUSTER_NAME" -c - <<EOF || exit 1
apiVersion: cinder.crit.sh/v1alpha1
kind: ClusterConfiguration
extraPortMappings:
  - listenAddress: 0.0.0.0
    hostPort: 8000
    containerPort: 30000
    protocol: TCP
featureGates:
  MachineAPI: true
EOF
fi

DOC="Prometheus is used to provide cluster metrics. See https://criticalstack.github.io/ui/features/metrics.html"
if prompt_bool "🗠  Install prometheus and prometheus-adapter Helm charts?"; then
    PROMETHEUS_CHART_VALUES="$(mktemp --tmpdir prom-values.XXXXXX.yaml)"
    if ! curl -sfL -o "$PROMETHEUS_CHART_VALUES" \
        "https://github.com/criticalstack/ui/raw/main/hack/prometheus/standalone.yaml"; then
        echo "Failed to download prometheus chart values."
        exit 1
    fi
    PROMETHEUS_ADAPTER_CHART_VALUES="$(mktemp --tmpdir prom-adapter-values.XXXXXX.yaml)"
    if ! curl -sfL -o "$PROMETHEUS_CHART_VALUES" \
        "https://github.com/criticalstack/ui/raw/main/hack/prometheus/adapter.yaml"; then
        echo "Failed to download prometheus-adapter chart values."
        exit 1
    fi

    # install prometheus
    run_and_print helm upgrade --install -n critical-stack prometheus \
        --repo="${PROMETHEUS_REPO_URL}" \
        --version="${PROMETHEUS_CHART_VERSION}" \
        prometheus -f "$PROMETHEUS_CHART_VALUES" >/dev/null

    # install prometheus-adapter
    run_and_print helm upgrade --install -n critical-stack prometheus-adapter \
        --repo="${PROMETHEUS_REPO_URL}" \
        --version="${PROMETHEUS_ADAPTER_CHART_VERSION}" \
        prometheus-adapter -f "$PROMETHEUS_ADAPTER_CHART_VALUES" >/dev/null
fi
DOC=""

DOC="A tool for developers and cluster administrators. See https://criticalstack.github.io/ui/"
if prompt_bool "📦 Install Critical Stack UI?"; then
    run_and_print helm upgrade --install -n critical-stack cs-ui \
        --set tls.enabled=false \
        --set identity.issuerCAFile="" \
        "$UI_CHART_URL"

    DOC="This user can log in to the UI and will be granted the cluster-admin ClusterRole."
    if prompt_bool "👤 Create a default user?"; then
        DEFAULT_EMAIL="dev@criticalstack.com"
        DEFAULT_PASS="admin"
        read -r -p "Email? [${DEFAULT_EMAIL}] " email
        : "${email:=$DEFAULT_EMAIL}"
        read -r -p "Password? [default is \"${DEFAULT_PASS}\"] " -s password && echo
        : "${password:=$DEFAULT_PASS}"
        cat <<EOF | kubectl apply -f -
kind: UserRequest
apiVersion: criticalstack.com/v1alpha1
metadata:
  name: admin
spec:
  initialPassword:
    value: "$password"
  template:
    active: true
    email: "$email"
    defaultNamespace: critical-stack
    type: local
    username: Administrator
EOF
    fi
#     * setup dex connector for github?
fi
DOC=""

DOC="Tools for monitoring kernel-level activity. See https://github.com/criticalstack/swoll/"
if prompt_bool "💪 Install Swoll?"; then
    run_and_print helm upgrade --install -n critical-stack --repo "$SWOLL_CHART_REPO" swoll swoll
fi
DOC=""

DOC="Secure, reproducible application deployment and lifecycle management. See https://criticalstack.github.io/stackapps/"
if prompt_bool "🥞 Install StackApps?"; then
    run_and_print helm upgrade --install -n critical-stack cs-stackapps "$STACKAPPS_CHART_URL"
fi
DOC=""

echo "✔️ ${bold}All set! Visit http://localhost:8000 to get started.${normal}"
