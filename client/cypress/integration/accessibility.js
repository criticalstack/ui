import { terminalLog } from "../support/commands";

context("accessibility scan", () => {
  before(() => {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))
    cy.injectAxe()
  })

  describe("main pages", function() {
    it("should have no violations", function() {
      let skipFailures = true;

      /* check data center */
      cy.get('[href="/datacenter"]').click()
      cy.url().should("include", "/datacenter")
      cy.get('.content-title').contains("Nodes Listing")
      cy.checkA11y(null, null, terminalLog, skipFailures)

      /* check cluster */
      cy.get('[href="/cluster"]').click()
      cy.url().should("include", "/cluster")
      cy.get('.content-title').contains("Access")
      cy.checkA11y(null, null, terminalLog, skipFailures)

      /* check marketplace */
      cy.get('[href="/marketplace"]').click()
      cy.url().should("include", "/marketplace")
      cy.get('#mp-popular > .mp-section > .mp-section-title > .mp-title-text').contains("Apps")
      cy.checkA11y(null, null, terminalLog, skipFailures)
    })
  })
})
