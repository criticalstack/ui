Cypress.Commands.add("login", (email, password) => {
  cy.visit("/login")

  cy.get("#login-email")
    .type(email)
    .should("have.value", email)

  cy.get("#login-password")
    .type(password)
    .should("have.value", password)

  cy.contains("Sign In").click()

  cy.url().should("include", "/datacenter/nodes")

  /* check that we have a user_session cookie */
  cy.getCookie('user_session').should('exist')
})

module.exports = {
  terminalLog: function(violations) {
    cy.task(
      'log',
      `${violations.length} accessibility violation${
        violations.length === 1 ? '' : 's'
      } ${violations.length === 1 ? 'was' : 'were'} detected`
    )
    // pluck specific keys to keep the table readable
    const violationData = violations.map(
      ({ id, impact, description, nodes }) => ({
        id,
        impact,
        description,
        nodes: nodes.length
      })
    )

    cy.task('table', violationData)
  }
}

before(() => {
  cy.server()
})
