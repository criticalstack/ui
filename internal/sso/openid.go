package sso

import (
	"context"
	"strings"

	"github.com/coreos/go-oidc"
	"github.com/pkg/errors"
	"golang.org/x/oauth2"
)

var (
	emailFields     = []string{"email", "Email", "eMail", "EMail"}
	nameFields      = []string{"name", "Name", "full_name", "FullName"}
	firstNameFields = []string{"first_name", "FirstName", "FName"}
	lastNameFields  = []string{"last_name", "LastName", "LName"}

	defaultScopes = []string{oidc.ScopeOpenID, "profile", "email", "groups", "offline_access"}
)

var _ Connector = (*openIDConnector)(nil)

type openIDConnector struct {
	p   *oidc.Provider
	o   *oauth2.Config
	ctx context.Context
}

func (c *openIDConnector) RedirectURL(state string, opts ...URLParam) string {
	return c.o.AuthCodeURL(state, opts...)
}

func firstString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, _ := m[k].(string); v != "" {
			return v
		}
	}
	return ""
}

func asStringSlice(x interface{}) []string {
	if x == nil {
		return nil
	}
	switch t := x.(type) {
	case []string:
		return t
	case []interface{}:
		out := make([]string, 0)
		for _, y := range t {
			if s, ok := y.(string); ok {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func (c *openIDConnector) Authenticate(code string) (*UserInfo, error) {
	token, err := c.o.Exchange(c.ctx, code)
	if err != nil {
		return nil, errors.Wrap(err, "failed retrieving OpenID access token")
	}

	u := &UserInfo{}
	var tmp map[string]interface{}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("no id_token in token response")
	}
	idToken, err := c.p.Verifier(&oidc.Config{ClientID: c.o.ClientID}).Verify(c.ctx, rawIDToken)
	if err != nil {
		return nil, errors.Wrap(err, "failed to verify ID token")
	}
	u.Token = rawIDToken

	if err := idToken.Claims(&tmp); err != nil {
		return nil, errors.Wrap(err, "error decoding ID token claims")
	}

	// if userinfo is not supported, this will return an error which we can discard
	// TODO(ktravis): check error more rigorously
	if info, err := c.p.UserInfo(c.ctx, oauth2.StaticTokenSource(token)); err == nil {
		if err := info.Claims(&tmp); err != nil {
			return nil, errors.Wrap(err, "failed to unmarshal userinfo claims")
		}
	}

	u.Name = firstString(tmp, nameFields...)
	u.Email = firstString(tmp, emailFields...)
	if u.Name == "" {
		u.Name = strings.TrimSpace(firstString(tmp, firstNameFields...) + " " + firstString(tmp, lastNameFields...))
	}
	u.Groups = asStringSlice(tmp["groups"])
	if g := asStringSlice(tmp["Groups"]); len(u.Groups) == 0 && len(g) > 0 {
		u.Groups = g
	}

	if adGroups := asStringSlice(tmp["ADGroups"]); len(adGroups) > 0 {
		for i, group := range adGroups {
			attrs := strings.Split(group, ",")
			for _, entry := range attrs {
				if strings.HasPrefix(strings.ToUpper(entry), "CN=") {
					adGroups[i] = strings.TrimSpace(strings.SplitN(entry, "=", 2)[1])
					break
				}
			}
		}
		u.Groups = adGroups
	}
	return u, nil
}
