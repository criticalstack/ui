describe("cluster page", function() {
  it("test that clicking the navigation tabs on the cluster page redirect to the corresponding URLs ", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    /* testing */
    /* check cluster */
    cy.get('[href="/cluster"]').click()
    cy.url().should("include", "/cluster")

    /* ClusterRoleBindings */
    cy.get('.cs-tabs-parent').contains("ClusterRoleBindings").click()
    cy.url().should("include", "/clusterrolebindings")

    /* ClusterRoles */
    cy.get('.cs-tabs-parent').contains("ClusterRoles").click()
    cy.url().should("include", "/clusterroles")

    /* RoleBindings */
    cy.get('.cs-tabs-parent').contains("RoleBindings").click()
    cy.url().should("include", "/rolebindings")

    /* Roles */
    cy.get('.cs-tabs-parent').contains("Roles").click()
    cy.url().should("include", "/roles")

    /* Access */
    cy.get('.cs-tabs-parent').contains("Access").click()
    cy.url().should("include", "/access")
  })
})
