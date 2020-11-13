describe("logout", function() {
  it("removes the user session cookie", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    /* click the hamburger */
    cy.get('button[aria-label="Open the menu"').click()

    /* logout */
    cy.contains("Logout").click()

    /* check that we do NOT have a user_session cookie */
    cy.getCookie('user_session').should('not.exist')

    cy.url().should("include", "/login")
  })
})
