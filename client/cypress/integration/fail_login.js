describe("bad username login", function() {
  it("fails to login", function() {
    cy.visit("/login")

    cy.get("#login-email")
      .type("bad@username.com")
      .should("have.value", "bad@username.com")

    cy.get("#login-password")
      .type("admin")
      .should("have.value", "admin")

    cy.contains("Sign In").click()

    cy.get(".notifications")
      .contains("fail")

    cy.url().should("include", "/login")
  })
})

describe("bad password login", function() {
  it("fails to login", function() {
    cy.visit("/login")

    cy.get("#login-email")
      .type("dev@criticalstack.com")
      .should("have.value", "dev@criticalstack.com")

    cy.get("#login-password")
      .type("badpass")
      .should("have.value", "badpass")

    cy.contains("Sign In").click()

    cy.get(".notifications")
      .contains("fail")

    cy.url().should("include", "/login")
  })
})
