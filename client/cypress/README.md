# Cypress Tests

Critical Stack uses Cypress for UI Integration Tests. 

For more information about cypress please see the official [Cypress Documentation](https://docs.cypress.io/guides/overview/why-cypress.html#In-a-nutshell).

All the Cypress tests are [here](/client/cypress/integration).

## Workflow tests
The basic pattern of workflow tests is...
- log in as user
- create, modify or delete a resource
- verify that the UI reflects that change
- verify that the API reflects that change
