describe("user management", function() {
  it("creates new users", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    cy.visit('/datacenter/settings/manage-users')
    cy.get('.content-title button.btn-create').contains('Create').click()
    cy.wait(500);
    cy.get('.create-drawer .wizard-resource').contains('User').click()
    cy.wait(500);

    let testEmail = "cypress@test.com";
    cy.get("#root_username").type("cypress test user")
    cy.get("#root_email").type(testEmail)
    cy.get("#root_password").type("thisisalongpassword")
    cy.get("#root_password1").type("thisisalongpassword")
    cy.get("#root_roleID").select('default-admin')
    cy.get("#root_defaultNamespace").select('default')
    cy.get("#root_defaultNamespace").select('default')
    cy.get('#create').click()

    cy.get('.create-drawer button[title="close"]').click()

    cy.get('.MuiSnackbar-root button.dialog-button').click()
    cy.get('#userrequests-table tbody').find('tr').should('have.length', 2)

    cy.get('#userrequests-table tr').contains(testEmail).rightclick();

    cy.get('.MuiList-root.userrequests .menu-entry').contains("Delete").click();
    cy.get('div[role="dialog"] button.btn-delete').click()
    cy.get('#userrequests-table tbody').find('tr').should('have.length', 1)
  })
})
