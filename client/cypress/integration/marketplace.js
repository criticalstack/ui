describe("marketplace page", function() {
  it("test that filtering and navigation are working on the marketplace page", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    /* testing */
    /* check marketplace */
    cy.get('[href="/marketplace"]').click()
    cy.url().should("include", "/marketplace")
    cy.get('#mp-popular > .mp-section > .mp-section-title > .mp-title-text').contains("Apps")

    /* navigate to a demo app */
    cy.get('#mp-search-input').type('drupal{enter}')
    cy.get('#mp-popular').contains('Learn More').click()
    cy.url().should("include", "/demo.drupal")
  })
})
