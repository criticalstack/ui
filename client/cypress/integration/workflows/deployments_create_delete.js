describe("deployments", function() {
  const deploymentName = 'test-deployment-12345'

  it("tests that the user can log in and create a deployment using the UI", function() {
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

    /* delete the deployment */
    cy.get('#deployments-table')
      .contains(deploymentName)
      .rightclick()

    let waitForDeleted = () => {
      cy.request({
        url: `/api/v1/resources/deployments/${deploymentName}?namespace=critical-stack`,
        failOnStatusCode: false
      }).then((resp) => {
        if (resp.status == 500) { return }
        // if not 500, expect 200
        expect(resp).to.have.property('status', 200)
        waitForDeleted()
      })
    }
    cy.get('.MuiList-root')
      .contains("Delete")
      .click()
    cy.get('.MuiButtonBase-root.btn-delete')
      .click()
      .then(waitForDeleted)
  })
})
