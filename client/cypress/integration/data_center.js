describe("data center page", function() {
  it("test that clicking the navigation tabs on the data center page redirect to the corresponding URLs ", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    /* testing */
    /* check data center */
    cy.get('[href="/datacenter"]').click()
    cy.url().should("include", "/datacenter")
    cy.get('.content-title').contains("Nodes Listing")

    /* Nodes */
    cy.get('.header-sub-menu-datacenter').contains("Nodes").click()
    cy.url().should("include", "/nodes")
    cy.get('.content-title').contains("Nodes")

    /* Resources */
    cy.get('.header-sub-menu-datacenter').contains("Resources").click()
    cy.url().should("include", "/resources")
    cy.get('.content-title').contains("Resources")

    /* Workloads */
    cy.get('.header-sub-menu-datacenter').contains("Workloads").click()
    cy.get('.MuiList-root').contains("Deployment").click()
    cy.url().should("include", "/deployment")
    cy.get('.content-title').contains("Deployments")

    cy.get('.header-sub-menu-datacenter').contains("Workloads").click()
    cy.get('.MuiList-root').contains("Replica Sets").click()
    cy.url().should("include", "/replica-sets")
    cy.get('.content-title').contains("Replica Sets")

    cy.get('.header-sub-menu-datacenter').contains("Workloads").click()
    cy.get('.MuiList-root').contains("Daemon Sets").click()
    cy.url().should("include", "/daemon-sets")
    cy.get('.content-title').contains("Daemon Sets")

    cy.get('.header-sub-menu-datacenter').contains("Workloads").click()
    cy.get('.MuiList-root').contains("Stateful Sets").click()
    cy.url().should("include", "/stateful-sets")
    cy.get('.content-title').contains("Stateful Sets")

    cy.get('.header-sub-menu-datacenter').contains("Workloads").click()
    cy.get('.MuiList-root').contains("Cron Jobs").click()
    cy.url().should("include", "/cron-jobs")
    cy.get('.content-title').contains("Cron Jobs")

    // Seith: skipping "Jobs"

    cy.get('.header-sub-menu-datacenter').contains("Workloads").click()
    cy.get('.MuiList-root').contains("Pods").click()
    cy.url().should("include", "/pods")
    cy.get('.content-title').contains("Pods")

    cy.get('.header-sub-menu-datacenter').contains("Workloads").click()
    cy.get('.MuiList-root').contains("App Releases").click()
    cy.url().should("include", "/releases")
    cy.get('.content-title').contains("App Releases")

    /* Services and Discovery*/
    cy.get('.header-sub-menu-datacenter').contains("Services and Discovery").click()
    cy.get('.MuiList-root').contains("Ingress").click()
    cy.url().should("include", "/ingress")
    cy.get('.content-title').contains("Ingress")

    cy.get('.header-sub-menu-datacenter').contains("Services and Discovery").click()
    cy.get('.MuiList-root').contains("Services").click()
    cy.url().should("include", "/services")
    cy.get('.content-title').contains("Services")

    cy.get('.header-sub-menu-datacenter').contains("Services and Discovery").click()
    cy.get('.MuiList-root').contains("Endpoints").click()
    cy.url().should("include", "/endpoints")
    cy.get('.content-title').contains("Endpoints")

    /* Storage */
    cy.get('.header-sub-menu-datacenter').contains("Storage").click()
    cy.get('.MuiList-root').contains("Persistent Volume Claims").click()
    cy.url().should("include", "/persistent-volume-claims")
    cy.get('.content-title').contains("Persistent Volume Claims")

    cy.get('.header-sub-menu-datacenter').contains("Storage").click()
    cy.get('.MuiList-root').contains("Persistent Volumes").click()
    cy.url().should("include", "/persistent-volumes")
    cy.get('.content-title').contains("Persistent Volumes")

    cy.get('.header-sub-menu-datacenter').contains("Storage").click()
    cy.get('.MuiList-root').contains("Storage Classes").click()
    cy.url().should("include", "/storage-classes")
    cy.get('.content-title').contains("Storage Classes")

    /* Config */
    cy.get('.header-sub-menu-datacenter').contains("Config").click()
    cy.get('.MuiList-root').contains("Pod Presets").click()
    cy.url().should("include", "/pod-presets")
    cy.get('.content-title').contains("Pod Presets")

    cy.get('.header-sub-menu-datacenter').contains("Config").click()
    cy.get('.MuiList-root').contains("Network Policies").click()
    cy.url().should("include", "/network-policies")
    cy.get('.content-title').contains("Network Policies")

    cy.get('.header-sub-menu-datacenter').contains("Config").click()
    cy.get('.MuiList-root').contains("Secrets").click()
    cy.url().should("include", "/secrets")
    cy.get('.content-title').contains("Secrets")

    cy.get('.header-sub-menu-datacenter').contains("Config").click()
    cy.get('.MuiList-root').contains("Service Accounts").click()
    cy.url().should("include", "/service-accounts")
    cy.get('.content-title').contains("Service Accounts")

    cy.get('.header-sub-menu-datacenter').contains("Config").click()
    cy.get('.MuiList-root').contains("Config Maps").click()
    cy.url().should("include", "/config-maps")
    cy.get('.content-title').contains("Config Maps")

    cy.get('.header-sub-menu-datacenter').contains("Config").click()
    cy.get('.MuiList-root').contains("Horizontal Pod Autoscalers").click()
    cy.url().should("include", "/horizontal-pod-autoscalers")
    cy.get('.content-title').contains("Horizontal Pod Autoscalers")

    /* More */
    cy.get('.header-sub-menu-datacenter').contains("More").click()
    cy.get('.MuiList-root').contains("Resource Quotas").click()
    cy.url().should("include", "/resource-quotas")
    cy.get('.content-title').contains("Resource Quotas")

    cy.get('.header-sub-menu-datacenter').contains("More").click()
    cy.get('.MuiList-root').contains("Limit Ranges").click()
    cy.url().should("include", "/limit-ranges")
    cy.get('.content-title').contains("Limit Ranges")

    cy.get('.header-sub-menu-datacenter').contains("More").click()
    cy.get('.MuiList-root').contains("Events").click()
    cy.url().should("include", "/events")
    cy.get('.content-title').contains("Events")
  })
})
