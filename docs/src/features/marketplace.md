# Marketplace
The Critical Stack Marketplace provides a repository of "building blocks" for application developers. It allows for easy access to premade kubernetes resources. The marketplace can be populated by adding sources, or by individually adding applications.

## Overview
A marketplace application is a packaged "component" (a Helm chart wrapped in additional metadata) in the cluster's marketplace catalog. They are versioned, and can be installed by a user into a cluster namespace. Applications can be [added individually](#adding-applications-directly) or by [adding a source](#marketplace-source-configuration). When a source is added, all applications under that source will be added to the marketplace when reconciled by the source controller (part of the UI marketplace deployment).

## Marketplace Source Configuration
A source is any [Helm repo](https://helm.sh/docs/topics/chart_repository/) that supplies metadata and assets (aka Helm charts) for one or more applications. Sources may be added to a cluster by a cluster administrator. This may be done via the UI or via the CRD. 

### Source Configuration via UI
A source may be added and configured through the UI via the "Sources" screen, under "Settings". When adding a source to the cluster, a unique name and the source URL are required. Optionally, the UI also provides the ability to configure a username and password for the sources that require it.

![source configuration](/images/mp-source-configuration.gif)

### Source Configuration via CRD
A `Source` Custom Resource can be created to directly add a marketplace source to the cluster.

A simple `Source` resource may look like:
```yaml
apiVersion: marketplace.criticalstack.com/v1alpha2
kind: Source
metadata:
  name: sample-source
  labels:
    created-by: dev-criticalstack-com
spec:
  url: 'https://charts.helm.sh/stable'
```

## Marketplace Application Configuration
Applications with schema configurations ([adding schema configurations](#editing-applications)) will need to have their configuration form completed and saved before being able to install the application.

If an application has schema configurations, the schema configuration form can be found under the application detail page. The application detail page may be accessed by selecting "Learn More" on the application tile cards. From this page, there are two methods for accessing the configuration form:
- directly selecting the "Configuration" tab
- clicking "Configure App" in the application card on the right side of the page

![app configuration](/images/mp-app-configuration.gif)

## Marketplace Application Preview
By default, application previews are enabled and can be seen after clicking "Preview & Install App". Application previews can be disabled by toggling off "Include dry run". The application preview will show the resources the application will be deploy into the cluster without actually deploying the resources. The preview will also show the anticipated status of the resource and how deploying the resource will impact any existing resource limits and quotas. After seeing the preview, the user can choose whether or not to confirm the installation.

![app_preview](/images/mp-app-preview.gif)

## Marketplace Application Releases
An application may be installed multiple times. Each installation creates a new application release. All the installations (aka releases) for an application may be found in that application's app detail page under the "Installations" tab. Application releases may also be found under **Data Center > Workloads > App Releases**. This page will show all applications releases including the Helm chart installations that were not installed via marketplace. 

## Advance Configurations

### Enabling/Disabling Marketplace
When enabled, the marketplace may be found on the top navbar in the UI. Marketplace is enabled when one or more sources or applications exists on the cluster. When all sources and applications are removed from the cluster, marketplace will be disabled and it will be removed from the UI.

### Source Sync
The sync status of a source can be seen in the Marketplace Sources table under "Settings". 

![source sync](/images/mp-source-sync.png)

The interval for when a source will try to sync can be edited by modifying the `updateFrequency` value in the `Source` resource. By default, this value is empty so the source will not update.
```yaml
# ...
spec:
  updateFrequency: 100ms
  # ...
```

A source can also be explicitly configured to not sync by setting the `skipSync` flag to true in the `Source` resource.
```yaml
# ...
spec:
  skipSync: true
  # ...
```

### Adding Applications Directly
Applications may be added directly by creating and applying an `Application` Custom Resource.

A simple `Application` resource may look like:
```yaml
apiVersion: marketplace.criticalstack.com/v1alpha2
appName: sample
kind: Application
metadata:
  labels:
    marketplace.criticalstack.com/application.name: sample
    marketplace.criticalstack.com/source.name: demo
  name: demo.sample
versions:
- apiVersion: v1
  appVersion: 1.17.10
  description: Chart for the sample resource
  home: http://www.sample.org
  icon: # URL for the icon
  keywords: # ...
  maintainers: # email and name of this chart's maintainers
  removed: false
  sources: # optional URL to the source code of this chart
  urls: # URL to where this chart is stored
  version: 5.4.1
# ...
```

`Application` resources that are without a marketplace source can remove the source label: `marketplace.criticalstack.com/source.name`.

### Editing Applications
After being added to marketplace, applications can be edited under their application detail page by selecting the "Edit" icon in the application card.

![app edit](/images/mp-app-edit.gif)

An application can be edited through the UI by selecting "Simple" edit. The user will first have to select a version of the application to edit before continuing. The user will be able to edit the application details (i.e. name, icon, application tags), documents, and configuration form.

Additional documents may be added in the "Edit Documents" section and will appear as additional pages in the application navigation tabs. Existing documents, except `README.md`, may also be removed from the application and subsequently from the navigation tabs.

Additional schema may also be added for configuration in the "Edit Configuration Form" section. A preview of the configuration form is shown to display how the form will look and to check for any validations. The user may also decide to exclude the schema - this will only remove the schema that the user may have added or changed and will revert the schema configuration form to the default one.

### App Categories
Categories can be added to application to allow for marketplace to filter by category. They can be added via the UI under the application detail page by clicking the "Edit" icon in the application card and then selecting "Categories". Categories may also be applied by directly adding the respective labels to the application metadata. The category name will be part of the label key that maps to an empty value:
```yaml
labels:    
    marketplace.criticalstack.com/application.category.application.security: ''
    marketplace.criticalstack.com/application.category.cicd: ''
    marketplace.criticalstack.com/application.category.data.broker: ''
    marketplace.criticalstack.com/application.category.data.storage: ''
    marketplace.criticalstack.com/application.category.development: ''
    marketplace.criticalstack.com/application.category.information.security: ''
    marketplace.criticalstack.com/application.category.monitoring: ''
    marketplace.criticalstack.com/application.category.networking: ''
    marketplace.criticalstack.com/application.category.web: ''
```
