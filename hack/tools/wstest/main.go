package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pkg/errors"
)

type session struct {
	token  string
	client *http.Client
}

type apiResponse struct {
	Status int
	Ctx    struct {
		RawResult   json.RawMessage `json:"result"`
		Token       string          `json:"token"`
		Error       string          `json:"rawError"`
		RedirectURI string          `json:"redirect_uri"`
	} `json:"context"`
	APIVersion    string `json:"apiVersion"`
	ServerVersion string `json:"version"`
}

func (s *session) reset() {
	var err error
	s.client.Jar, err = cookiejar.New(nil)
	if err != nil {
		panic(err)
	}
	s.token = ""
}

func (s *session) req(method, path string) *http.Request {
	r := req(method, path, nil)
	if s.token != "" {
		r = withToken(r, s.token)
	}
	return r
}

func req(method, path string, body io.Reader) *http.Request {
	r, err := http.NewRequest(method, "https://"+server+path, body)
	if err != nil {
		panic(err)
	}
	return r
}

func withToken(r *http.Request, t string) *http.Request {
	r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", t))
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

func withFormData(r *http.Request, v url.Values) *http.Request {
	return withBody(r, "application/x-www-form-urlencoded; charset=UTF-8", strings.NewReader(v.Encode()))
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

func login(email, password string) (*session, error) {
	s := &session{
		client: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true,
				},
			},
		},
	}
	s.reset()
	resp, err := s.do(withFormData(s.req(http.MethodPost, "/authorize"), url.Values{"email": {email}, "password": {password}})) //, &resp)
	if err != nil {
		return nil, errors.Wrap(err, "unable to login")
	}
	if resp.Status != 200 || resp.Ctx.Error != "" {
		return nil, errors.Wrapf(errors.Errorf(resp.Ctx.Error), "JSON response error (%d)", resp.Status)
	}
	s.token = resp.Ctx.Token
	rr, err := http.NewRequest(http.MethodGet, resp.Ctx.RedirectURI, nil)
	if err != nil {
		return nil, err
	}
	if _, _, err := s.doRaw(withToken(rr, s.token)); err != nil {
		// Technically I don't think this throws an error code, but we check anyway
		return nil, err
	}
	return s, nil
}

var (
	server   string
	email    string
	password string
)

func init() {
	flag.StringVar(&server, "server", "localhost:8000", "server")
	flag.StringVar(&email, "email", "dev@criticalstack.com", "email address for login")
	flag.StringVar(&password, "password", "admin", "email address for login")
}

func main() {
	flag.Parse()
	u := fmt.Sprintf("wss://%s%s", server, flag.Arg(0))
	s, err := login(email, password)
	if err != nil {
		log.Fatal(err)
	}

	dialer := &websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: 45 * time.Second,
		TLSClientConfig:  &tls.Config{InsecureSkipVerify: true},
		Jar:              s.client.Jar,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ch := make(chan os.Signal)
	defer close(ch)
	signal.Notify(ch, os.Interrupt)

	go func() {
		<-ch
		fmt.Println("INTERRUPT")
		cancel()
	}()

	conn, resp, err := dialer.DialContext(ctx, u, nil)
	if err != nil {
		log.Fatal(err)
	}
	if resp.StatusCode != http.StatusSwitchingProtocols {
		b, _ := ioutil.ReadAll(resp.Body)
		log.Fatalf("unexpected response status from websocket request: %d - %q", resp.StatusCode, string(b))
	}
	defer conn.Close()

	msgs := make(chan []byte)
	go func() {
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				if ce, ok := err.(*websocket.CloseError); ok && ce.Code == websocket.CloseNormalClosure {
					return
				}
				log.Fatal(err)
			}
			msgs <- msg
		}
	}()

	for {
		select {
		case <-ctx.Done():
			conn.Close()
			return
		case msg := <-msgs:
			var m struct {
				Type   string `json:"type"`
				Object struct {
					Kind     string                 `json:"kind"`
					Metadata map[string]interface{} `json:"metadata"`
				} `json:"object"`
			}
			if err := json.Unmarshal(msg, &m); err != nil {
				fmt.Printf("ERROR: %v\n", err)
				continue
			}
			fmt.Printf("%s %s %s %s\n", m.Type, m.Object.Kind, m.Object.Metadata["name"], m.Object.Metadata["resourceVersion"])
		}
	}
}
