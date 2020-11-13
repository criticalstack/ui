describe("login", function() {
  it("succeeds with valid credentials", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))
  })
})
