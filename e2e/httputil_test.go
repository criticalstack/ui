//nolint:unused
package e2e_test

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/http/cookiejar"
	"net/url"

	"github.com/criticalstack/ui/api/v1alpha1"
	"github.com/pkg/errors"
)

type V = map[string]interface{}

func urlValues(m V) url.Values {
	val := make(url.Values)
	for k, v := range m {
		val[k] = []string{fmt.Sprintf("%v", v)}
	}
	return val
}

type session struct {
	token      string
	csrfCookie *http.Cookie
	user       *v1alpha1.User
	client     *http.Client
}

func defaultSession() *session {
	return &session{
		client: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true,
				},
			},
		},
	}
}

func (s *session) setCSRFCookie() error {
	_, _, cookies, err := s.doRawReturnCookie(s.get("/healthz"))
	if err != nil {
		return err
	}
	for _, cookie := range cookies {
		if cookie.Name == "__Host-cs-csrf" || cookie.Name == "cs-csrf" {
			s.csrfCookie = cookie
			break
		}
	}
	return nil
}

type apiResponse struct {
	Status int
	Ctx    struct {
		RawResult   json.RawMessage `json:"result"`
		Token       string          `json:"token"`
		Error       string          `json:"error"`
		RedirectURI string          `json:"redirect_uri"`
	} `json:"context"`
	APIVersion    string `json:"apiVersion"`
	ServerVersion string `json:"version"`
}

func (r apiResponse) Result(v interface{}) error {
	return json.Unmarshal([]byte(r.Ctx.RawResult), v)
}

func (s *session) reset() {
	var err error
	s.client.Jar, err = cookiejar.New(nil)
	if err != nil {
		panic(err)
	}
	s.token = ""
	s.csrfCookie = nil
	s.user = nil
}

func (s *session) req(method, path string) *http.Request {
	r := req(method, path, nil)
	if s.token != "" {
		r = withToken(r, s.token)
	}
	if s.csrfCookie != nil {
		r = withCSRF(r, s.csrfCookie)
	}
	return r
}

func (s *session) get(path string, args ...interface{}) *http.Request {
	return s.req(http.MethodGet, fmt.Sprintf(path, args...))
}
func (s *session) put(path string, args ...interface{}) *http.Request {
	return s.req(http.MethodPut, fmt.Sprintf(path, args...))
}
func (s *session) delete(path string, args ...interface{}) *http.Request {
	return s.req(http.MethodDelete, fmt.Sprintf(path, args...))
}
func (s *session) post(path string, args ...interface{}) *http.Request {
	return s.req(http.MethodPost, fmt.Sprintf(path, args...))
}
func (s *session) patch(path string, args ...interface{}) *http.Request {
	return s.req(http.MethodPatch, fmt.Sprintf(path, args...))
}

func (s *session) reqBody(method, path string, body io.Reader) *http.Request {
	r := req(method, path, body)
	if s.token != "" {
		r = withToken(r, s.token)
	}
	if s.csrfCookie != nil {
		r = withCSRF(r, s.csrfCookie)
	}
	return r
}

func req(method, path string, body io.Reader) *http.Request {
	r, err := http.NewRequest(method, serverURL.String()+path, body)
	if err != nil {
		panic(err)
	}
	return r
}

func withToken(r *http.Request, t string) *http.Request {
	r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", t))
	return r
}

func withCSRF(r *http.Request, c *http.Cookie) *http.Request {
	r.AddCookie(c)
	r.Header.Set("X-CS-CSRF-Token", c.Value)
	return r
}

func withBody(r *http.Request, contentType string, body io.Reader) *http.Request {
	rc, ok := body.(io.ReadCloser)
	if !ok {
		rc = ioutil.NopCloser(body)
	}
	r.Body = rc
	r.Header.Set("Content-Type", contentType)
	return r
}

func withJSON(r *http.Request, body interface{}) *http.Request {
	b, err := json.Marshal(body)
	if err != nil {
		panic(err)
	}
	return withBody(r, "application/json; charset=utf-8", bytes.NewReader(b))
}

func (s *session) doRaw(r *http.Request) (int, []byte, error) {
	resp, err := s.client.Do(r)
	if err != nil {
		return -1, nil, err
	}
	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, err
	}
	return resp.StatusCode, b, nil
}

//todo(milan): would it be worth combining with doRaw?
func (s *session) doRawReturnCookie(r *http.Request) (int, []byte, []*http.Cookie, error) {
	resp, err := s.client.Do(r)
	if err != nil {
		return -1, nil, nil, err
	}
	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, nil, err
	}
	return resp.StatusCode, b, resp.Cookies(), nil
}

func (s *session) getBytes(u string, args ...interface{}) ([]byte, error) {
	st, b, err := s.doRaw(s.get(u, args...))
	if err != nil {
		return nil, err
	}
	if st != http.StatusOK {
		return nil, errors.Errorf("unexpected response code (%d): %v", st, string(b))
	}
	return b, nil
}

func (s *session) do(r *http.Request) (*apiResponse, error) {
	st, b, err := s.doRaw(r)
	if err != nil {
		return nil, err
	}
	tmp := apiResponse{
		Status: st,
	}
	jerr := json.Unmarshal(b, &tmp)
	if tmp.Status != 200 {
		err := errors.Errorf("invalid response")
		if jerr == nil && tmp.Ctx.Error != "" {
			err = errors.Errorf(tmp.Ctx.Error)
		}
		return &tmp, errors.Wrapf(err, "JSON response error (%d)", tmp.Status)
	}
	if jerr != nil {
		return nil, jerr
	}
	return &tmp, nil
}

//todo(milan): is this worth combining with do() ?
func (s *session) doReturnCookie(r *http.Request) (*apiResponse, []*http.Cookie, error) {
	st, b, cookies, err := s.doRawReturnCookie(r)
	if err != nil {
		return nil, nil, err
	}
	tmp := apiResponse{
		Status: st,
	}
	jerr := json.Unmarshal(b, &tmp)
	if tmp.Status != 200 {
		err := errors.Errorf("invalid response")
		if jerr == nil && tmp.Ctx.Error != "" {
			err = errors.Errorf(tmp.Ctx.Error)
		}
		return &tmp, nil, errors.Wrapf(err, "JSON response error (%d)", tmp.Status)
	}
	if jerr != nil {
		return nil, nil, jerr
	}
	return &tmp, cookies, nil
}

func (s *session) doResult(r *http.Request, v interface{}) error {
	resp, err := s.do(r)
	if err != nil {
		return err
	}
	return resp.Result(v)
}

// TODO(milan): needs a better refactor
func (s *session) expectStatus(r *http.Request, expected int) error {
	resp, err := s.do(r)

	if resp.Status != expected {
		return errors.Errorf("response status (%d), expected (%d) did not match: %v", resp.Status, expected, err)
	}
	return nil
}
