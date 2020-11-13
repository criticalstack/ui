package app

import (
	"net/url"
	"testing"

	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestWebsocketRequestValidate(t *testing.T) {
	cases := []struct {
		name string
		req  *WebsocketRequest
		gv   *schema.GroupVersion
	}{
		{
			name: "watch nodes",
			req: &WebsocketRequest{
				Action: WatchNodesAction,
				Params: make(url.Values),
			},
		},
		{
			name: "watch nodes base64 proto",
			req: &WebsocketRequest{
				Action:   WatchNodesAction,
				Params:   make(url.Values),
				Protocol: "base64.channel.k8s.io",
			},
		},
		{
			name: "watch resource",
			req: &WebsocketRequest{
				Action: WatchResourceAction,
				Params: url.Values{
					"resourceType": {"pods"},
				},
			},
			gv: &schema.GroupVersion{Version: "v1"},
		},
		{
			name: "watch resource explicit v1",
			req: &WebsocketRequest{
				Action: WatchResourceAction,
				Params: url.Values{
					"resourceType": {"pods"},
					"api":          {"v1"},
				},
			},
			gv: &schema.GroupVersion{Version: "v1"},
		},
		{
			name: "watch non core resource",
			req: &WebsocketRequest{
				Action: WatchResourceAction,
				Params: url.Values{
					"resourceType": {"podsecuritypolicies"},
					"api":          {"policy/v1beta1"},
				},
			},
			gv: &schema.GroupVersion{
				Group:   "policy",
				Version: "v1beta1",
			},
		},
		{
			name: "container logs",
			req: &WebsocketRequest{
				Action: ContainerLogsAction,
				Params: url.Values{
					"pod":       {"my-cool-pod"},
					"container": {""},
				},
			},
		},
		{
			name: "container logs with container",
			req: &WebsocketRequest{
				Action: ContainerLogsAction,
				Params: url.Values{
					"pod":       {"my-cool-pod"},
					"container": {"the-container"},
				},
			},
		},
		{
			name: "container exec",
			req: &WebsocketRequest{
				Action: ContainerExecAction,
				Params: url.Values{
					"pod":       {"my-cool-pod"},
					"container": {""},
					"command":   {"/bin/sh"},
				},
			},
		},
		{
			name: "container exec with container",
			req: &WebsocketRequest{
				Action: ContainerExecAction,
				Params: url.Values{
					"pod":       {"my-cool-pod"},
					"container": {"the-container"},
					"command":   {"/bin/sh"},
				},
			},
		},
	}
	errCases := []struct {
		name string
		req  *WebsocketRequest
	}{
		{
			name: "no params",
			req: &WebsocketRequest{
				Action: WatchNodesAction,
			},
		},
		{
			name: "bad action",
			req:  &WebsocketRequest{},
		},
		{
			name: "bad proto",
			req: &WebsocketRequest{
				Action:   WatchNodesAction,
				Params:   make(url.Values),
				Protocol: "unrecognized",
			},
		},
		{
			name: "container logs no pod",
			req: &WebsocketRequest{
				Action: ContainerLogsAction,
				Params: url.Values{
					"pod":       {""},
					"container": {""},
				},
			},
		},
		{
			name: "container logs invalid pod name",
			req: &WebsocketRequest{
				Action: ContainerLogsAction,
				Params: url.Values{
					"pod": {"WOW$WRONG"},
				},
			},
		},
		{
			name: "container exec no pod",
			req: &WebsocketRequest{
				Action: ContainerExecAction,
				Params: url.Values{
					"pod":       {""},
					"container": {""},
					"command":   {"/bin/sh"},
				},
			},
		},
		{
			name: "container exec no command",
			req: &WebsocketRequest{
				Action: ContainerExecAction,
				Params: url.Values{
					"pod":       {""},
					"container": {""},
					"command":   {"/bin/sh"},
				},
			},
		},
		{
			name: "container exec invalid pod name",
			req: &WebsocketRequest{
				Action: ContainerExecAction,
				Params: url.Values{
					"pod":     {"WOW$WRONG"},
					"command": {"/bin/sh"},
				},
			},
		},
		{
			name: "watch resource no type",
			req: &WebsocketRequest{
				Action: WatchResourceAction,
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if err := c.req.validate(); err != nil {
				t.Fatalf("unexpected validation error: %v", err)
			}
			if c.gv == nil {
				if c.req.gv != nil {
					t.Fatalf("unexpected GroupVersion on validated request, expected nil, got: %v", c.req.gv)
				}
			} else if c.req.gv == nil {
				t.Fatalf("unexpected GroupVersion on validated request, expected %v, got: nil", c.gv)
			} else if *c.gv != *c.req.gv {
				t.Fatalf("unexpected GroupVersion on validated request, expected %v, got: %v", c.gv, c.req.gv)
			}
		})
	}
	for _, c := range errCases {
		t.Run(c.name, func(t *testing.T) {
			err := c.req.validate()
			if err == nil {
				t.Fatal("request should not have validated")
			}
		})
	}
}
