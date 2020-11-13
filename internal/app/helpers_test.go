package app

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func stringInSlice(myString string, mySliceOfStrings []string) bool {
	for _, stringFromSlice := range mySliceOfStrings {
		if stringFromSlice == myString {
			return true
		}
	}
	return false
}

func TestParseDeleteOptionsTable(t *testing.T) {
	testCases := []struct {
		Name                       string
		RawQuery                   string
		ExpectedGracePeriodSeconds int64
		ExpectedPropagationPolicy  string
		ExpectedDryRun             []string
		ExpectedError              bool // will be true if an error is Expected
	}{
		{"Defaults", "", 0, "Background", []string{}, false},
		{"Change GracePeriodSeconds", "gracePeriodSeconds=17", 17, "Background", []string{}, false},
		{"Negative GracePeriodSeconds", "gracePeriodSeconds=-3", -3, "Background", []string{}, false},
		{"Unsupported GracePeriodSeconds", "gracePeriodSeconds=Banana", 0, "Background", []string{}, true},
		{"Change PropagationPolicy", "deletionPropagation=Orphan", 0, "Orphan", []string{}, false},
		{"Unsupported PropagationPolicy", "deletionPropagation=Banana", 0, "Banana", []string{}, false},
		{"DryRun", "dryRun=All", 0, "Background", []string{"All"}, false},
		{"Unsupported DryRun", "dryRun=Banana", 0, "Background", []string{"Banana"}, false},
		{"More Than One DryRun", "dryRun=All&dryRun=Some", 0, "Background", []string{"All", "Some"}, false},
		{"More Than One DryRun Other Order", "dryRun=Some&dryRun=All", 0, "Background", []string{"All", "Some"}, false},
	}

	for _, tc := range testCases {
		// Setup
		e := echo.New()
		req := httptest.NewRequest(http.MethodPost, "/?"+tc.RawQuery, nil)
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		t.Run(fmt.Sprintf(tc.Name), func(t *testing.T) {
			result, err := parseDeleteOptions(c)
			if err != nil {
				if !tc.ExpectedError {
					t.Errorf("failure ExpectedError: expected %v but got %v ", tc.ExpectedError, err)
				}
			} else {
				// check GracePeriodSeconds
				if *result.GracePeriodSeconds != tc.ExpectedGracePeriodSeconds {
					t.Errorf("failure GracePeriodSeconds: expected %v but got %v ", tc.ExpectedGracePeriodSeconds, *result.GracePeriodSeconds)
				}

				// check PropagationPolicy
				if string(*result.PropagationPolicy) != tc.ExpectedPropagationPolicy {
					t.Errorf("failure PropagationPolicy: expected %v but got %v ", tc.ExpectedPropagationPolicy, *result.PropagationPolicy)
				}

				if len(result.DryRun) != 0 || len(tc.ExpectedDryRun) != 0 {
					// Check that all expected dryRun values are present
					for _, s := range tc.ExpectedDryRun {
						if !stringInSlice(s, result.DryRun) {
							t.Errorf("failure missing expected DryRun: expected %q but got %q ", tc.ExpectedDryRun, result.DryRun)
						}
					}
					// Check that there are no unexpected dryRun values
					for _, s := range result.DryRun {
						if !stringInSlice(s, tc.ExpectedDryRun) {
							t.Errorf("failure unexpected DryRun result: expected %q but got %q ", tc.ExpectedDryRun, result.DryRun)
						}
					}
				}
			}
		})
	}
}
