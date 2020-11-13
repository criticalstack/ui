const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value'
).set
const changeRangeInputValue = $range => value => {
  nativeInputValueSetter.call($range[0], value)
  $range[0].dispatchEvent(new Event('change', { value, bubbles: true }))
}

describe("scale up/down deployments", function() {
  const deploymentName = 'test-deployment-12345'

  it("tests that the user can scale up and down a deployment using the UI", () => {
    cy.login(Cypress.config('adminUsername'), Cypress.config('adminPassword'))

    /* go to deployments tab */
    cy.get('.header-sub-menu-datacenter')
      .contains("Workloads")
      .click()
    cy.get('.MuiList-root')
      .contains("Deployment")
      .click()
    cy.url()
      .should("include", "/deployment")
    cy.get('.content-title')
      .contains("Deployments")

    /* assert that there is no deployment called deploymentName yet */
    cy.get('#deployments-table')
      .should('not.contain', deploymentName)

    /* open the simple editor */
    cy.get('.content-title button.btn-create').contains('Create').click()
    cy.wait(500);
    cy.get('.create-drawer .wizard-resource').contains('Deployment').click()
    cy.wait(500);

    /* type app name */
    cy.get('input[placeholder="App Name"]')
      .type(deploymentName)
      .should('have.value', deploymentName)

    /* type container image */
    cy.get('input[placeholder="Container Image"]')
      .type("nginx")
      .should('have.value', "nginx")

    cy.get('.dialog-actions button.btn-create')
      .click()

    cy.get('.create-drawer button[title="close"]').click()

    cy.get('#deployments-table tbody tr')
      .contains(deploymentName)
      .closest('tr')
      .within(() => {
        // desired
        cy.get('td').eq(2).contains("1")
        // current
        cy.get('td').eq(3).contains("1")
      })
      .rightclick()

    cy.get('.menu-parent.deployments .menu-entry')
      .contains("Scale").click()

    cy.get('input#root_replicas')
      .then(input => changeRangeInputValue(input)(3))

    cy.get('#ok').click()

    cy.get('#deployments-table tbody tr')
      .contains(deploymentName)
      .closest('tr')
      .within(() => {
        // desired
        cy.get('td').eq(2).contains("3")
        // current
        cy.get('td').eq(3).contains("3")
      })
      .rightclick()

    cy.get('.menu-parent.deployments .menu-entry')
      .contains("Delete")
      .click()
    cy.get('.MuiButtonBase-root.btn-delete')
      .click()
  })
})
