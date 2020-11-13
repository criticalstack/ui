{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "criticalstack-ui.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "criticalstack-ui.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "criticalstack-ui.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "criticalstack-ui.labels" -}}
app.kubernetes.io/name: {{ include "criticalstack-ui.name" . }}
helm.sh/chart: {{ include "criticalstack-ui.chart" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Generate certificates for criticalstack-ui
*/}}
{{- define "criticalstack-ui.gen-certs" -}}
{{- $altNames := list ( printf "%s.%s" (include "criticalstack-ui.name" .) .Release.Namespace ) ( printf "%s.%s.svc" (include "criticalstack-ui.name" .) .Release.Namespace ) ( printf "localhost" ) -}}
{{- $ca := genCA "criticalstack-ui-ca" 365 -}}
{{- $cert := genSignedCert ( include "criticalstack-ui.name" . ) nil $altNames 365 $ca -}}
tls.crt: {{ $cert.Cert | b64enc }}
tls.key: {{ $cert.Key | b64enc }}
{{- end -}}

{{/*
Generate session key for criticalstack-ui
*/}}
{{- define "criticalstack-ui.gen-session-key" -}}
{{- if .Values.overrideSessionKey -}}
CS_UI_SESSION_KEY: {{ .Values.overrideSessionKey | b64enc | quote }}
{{- else -}}
CS_UI_SESSION_KEY: {{ randAlphaNum 64 | b64enc | quote }}
{{- end -}}
{{- end -}}

{{/*
Expand the name of the chart.
*/}}
{{- define "dex.name" -}}
{{- default .Chart.Name "dex" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "dex.fullname" -}}
{{- printf "%s-%s" .Release.Name "dex" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "dex.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "dex.labels" -}}
app.kubernetes.io/name: {{ include "dex.name" . }}
helm.sh/chart: {{ include "dex.chart" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "dex.redirectURIs" -}}
{{- if .Values.identity.issuerOverride -}}
- {{ printf "%s/sso/callback" .Values.identity.issuerOverride | trunc 63  }}
- {{ printf "%s/kubeconfig/download" .Values.identity.issuerOverride | trunc 63  -}}
{{- else -}}
	{{- if .Values.identity.redirectURIs -}}
	{{- .Values.identity.redirectURIs | toYaml -}}
	{{- else -}}
- {{ printf "https://%s/sso/callback" .Values.global.clusterDomain | trunc 63  }}
- {{ printf "https://%s/kubeconfig/download" .Values.global.clusterDomain | trunc 63  -}}
	{{- end -}}
{{- end -}}
{{- end -}}

{{- define "dex.issuerURL" -}}
{{- if .Values.identity.issuerOverride -}}
{{- printf "%s/dex" .Values.identity.issuerOverride | trunc 63  -}}
{{- else -}}
	{{- if .Values.identity.issuerURL -}}
	{{- .Values.identity.issuerURL -}}
	{{- else -}}
	{{- printf "https://%s/dex" .Values.global.clusterDomain | trunc 63  -}}
	{{- end -}}
{{- end -}}
{{- end -}}
