describe("site map tier one", function() {
  it("test that the base url pages load", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    /* testing */
    /* check cluster */
    cy.get('[href="/cluster"]').click()
    cy.url().should("include", "/cluster")
    cy.get('.content-title').contains("Access")

    /* check marketplace */
    cy.get('[href="/marketplace"]').click()
    cy.url().should("include", "/marketplace")
    cy.get('#mp-popular > .mp-section > .mp-section-title > .mp-title-text').contains("Apps")

    /* check data center */
    cy.get('[href="/datacenter"]').click()
    cy.url().should("include", "/datacenter")
    cy.get('.content-title').contains("Nodes Listing")
  })
})
