describe("sandwich settings", function() {
  it("tests the settings menu can be used to navigate", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    /* testing */
    cy.visit("/datacenter/settings/user-profile")

    /* test sandwich/user-profile */
    cy.get('.settings-menu-toggle').click()
    cy.get('.MuiPaper-root > .settings-sidebar > #user-profile').click()
    cy.url().should("include", "/user-profile")

    /* test sandwich/manage-users */
    cy.get('.settings-menu-toggle').click()
    cy.get('.MuiPaper-root > .settings-sidebar > #manage-users').click()
    cy.url().should("include", "/manage-users")

    /* test sandwich/sso-provider */
    cy.get('.settings-menu-toggle').click()
    cy.get('.MuiPaper-root > .settings-sidebar > #sso-provider').click()
    cy.url().should("include", "/sso-provider")

    /* test sandwich/sources */
    cy.get('.settings-menu-toggle').click()
    cy.get('.MuiPaper-root > .settings-sidebar > #sources').click()
    cy.url().should("include", "/sources")

    /* test sandwich/display-formats */
    cy.get('.settings-menu-toggle').click()
    cy.get('.MuiPaper-root > .settings-sidebar > #display-formats').click()
    cy.url().should("include", "/display-formats")

    /* test sandwich/metrics-settings */
    cy.get('.settings-menu-toggle').click()
    cy.get('.MuiPaper-root > .settings-sidebar > #metrics-settings').click()
    cy.url().should("include", "/metrics-settings")
  })
})
