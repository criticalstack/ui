package e2e_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/pkg/errors"
)

func TestLogin(t *testing.T) {
	cases := []struct {
		name     string
		email    string
		password string
		err      error
	}{
		{
			name:     "default admin",
			email:    defaultEmail,
			password: defaultPassword,
		},
		{
			name:     "bad credentials",
			email:    "uh@oh.org",
			password: "badnews",
			err:      errors.Errorf("login failed: unknown user (uh@oh.org) or incorrect password"),
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			defer printErrorLogs(t)()
			s, err := login(c.email, c.password)
			if diff := cmpError(c.err, err); diff != "" {
				t.Fatalf("unexpected error result: %v", diff)
			}
			if err != nil {
				return
			}
			if s.token == "" {
				t.Errorf("valid login did not return a token")
			}
			if s.user.Email != c.email {
				t.Errorf("returned user has unexpected email (not %q): %+v", c.email, s.user)
			}
		})
	}
}

func TestChangePassword(t *testing.T) {
	defer printErrorLogs(t)()
	adminSession, err := login(defaultEmail, defaultPassword)
	if err != nil {
		t.Fatalf("admin login failed: %v", err)
	}
	testUserEmail := fmt.Sprintf("test-%s@user.org", randString(8))
	const (
		initialPassword = "initial-password"
		changedPassword = "changed-password"
	)
	ur, err := adminSession.createUser(
		&v1alpha1.User{
			UserTemplate: v1alpha1.UserTemplate{
				Username: "cool test dude",
				Email:    testUserEmail,
				Active:   true,
			},
		}, initialPassword, "")
	if err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}

	defer adminSession.deleteUser(ur)
	s, err := login(ur.Spec.Email, initialPassword)
	if err != nil {
		t.Fatalf("created user login failed: %v", err)
	}
	// first check that it requires the current password
	_, err = s.do(withJSON(s.post("/api/v1/users/password"), V{"current": changedPassword, "password": changedPassword}))
	if err == nil {
		t.Fatal("expected an error when current password is not passed correctly")
	}

	// actually reset password
	_, err = s.do(withJSON(s.post("/api/v1/users/password"), V{"current": initialPassword, "password": changedPassword}))
	if err != nil {
		t.Fatalf("password reset failed: %v", err)
	}

	// after changing password, try to do something else that requires auth and confirm that the response is a 401/403
	// (logged out)
	if err := s.expectStatus(s.get("/api/v1/namespaces"), http.StatusUnauthorized); err != nil {
		t.Fatalf("Expected session to be invalid: %v", err)
	}

	if _, err := login(ur.Spec.Email, initialPassword); err == nil {
		t.Fatal("password changed successfully, but old password still works")
	}

	if _, err := login(ur.Spec.Email, changedPassword); err != nil {
		t.Fatalf("failed to login with new password: %v", err)
	}
}
