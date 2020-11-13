package sso

import (
	"context"
	"math/rand"
	"net/http"
	"net/url"

	"github.com/coreos/go-oidc"
	"github.com/pkg/errors"
	"golang.org/x/oauth2"
)

type UserInfo struct {
	Name         string   `json:"name"`
	Email        string   `json:"email"`
	Groups       []string `json:"groups"`
	Token        string   `json:"token"`
	RefreshToken string   `json:"refresh_token"`
}

type URLParam = oauth2.AuthCodeOption

func SetQuery(k, v string) URLParam {
	return oauth2.SetAuthURLParam(k, v)
}

type Connector interface {
	RedirectURL(string, ...URLParam) string
	Authenticate(string) (*UserInfo, error)
}

func NewConnector(provider string, oc *oauth2.Config, hc *http.Client) (Connector, error) {
	if oc.ClientID == "" || oc.ClientSecret == "" {
		return nil, errors.New("sso configuration invalid: client ID and secret must be set")
	}
	ctx := context.WithValue(context.TODO(), oauth2.HTTPClient, hc)
	if !isValidURL(provider) {
		return nil, errors.New("invalid provider url")
	}
	p, err := oidc.NewProvider(ctx, provider)
	if err != nil {
		return nil, errors.Wrap(err, "failed to create OpenID provider")
	}
	oc.Endpoint = p.Endpoint()
	if len(oc.Scopes) == 0 {
		oc.Scopes = defaultScopes
	}
	return &openIDConnector{
		p:   p,
		o:   oc,
		ctx: ctx,
	}, nil
}

// TODO(ktravis): move this to be in model or somewhere else
func getRandomString(strSize *int, specialC bool) string {
	defaultSize := 16
	if strSize != nil && *strSize >= 8 {
		defaultSize = *strSize
	}

	baseStr := "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	if specialC {
		baseStr += "~!@#$%^&*()_+{}|<>?:/`-=[];"
	}

	letters := []rune(baseStr)
	result := make([]rune, defaultSize)
	for i := range result {
		result[i] = letters[rand.Intn(len(letters))]
	}
	return string(result)
}

//RandomString is just interface to getRandomString
func RandomString(flat int) string {
	return getRandomString(&flat, true) //need special characters injected for pw
}

func isValidURL(u string) bool {
	if _, err := url.ParseRequestURI(u); err != nil {
		return false
	}
	return true
}
