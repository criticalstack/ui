describe("namespace create delete", function() {
  const nameSpaceName = 'test-namespace-5678'

  it("creates and deletes a namespace", function() {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    cy.get('[href="/cluster"]').click()
    cy.contains('Namespaces').click()
    cy.get('.MuiList-root').contains('Namespaces').click()

    cy.get('.content-title button.btn-create').contains('Create').click()
    cy.wait(500);
    cy.get('.create-drawer .wizard-resource').contains('Namespace').click()
    cy.wait(500);

    cy.get('input[placeholder="Namespace Name"]')
      .type(nameSpaceName)
      .should('have.value', nameSpaceName)

    cy.get('.dialog-actions button.btn-create')
      .click()

    cy.get('.create-drawer button[title="close"]').click()

    cy.get('#namespace-table').contains(nameSpaceName)
      .rightclick()

    cy.get('.MuiList-root')
      .contains("Delete")
      .click()
    cy.get('.MuiButtonBase-root.btn-delete')
      .click()
  })
})
