"use strict";

import zIndex from "@material-ui/core/styles/zIndex";

var blue = {
  50: "#e3f2fd",
  100: "#bbdefb",
  200: "#90caf9",
  300: "#64b5f6",
  400: "#42a5f5",
  500: "#0078E7",
  600: "#1e88e5",
  700: "#1976d2",
  800: "#1565c0",
  900: "#0d47a1",
  A100: "#82b1ff",
  A200: "#448aff",
  A400: "#2979ff",
  A700: "#0078E7",
  contrastDefaultColor: "light"
};

export default {
  zIndex: zIndex,
  palette: {
    primary: blue,
    secondary: blue
  },
  typography: {
    fontFamily: [
      "Helvetica Neue",
      "Helvetica",
      "Arial",
      "sans-serif"
    ].join(","),
    fontSize: 20,
    body1: {
      fontSize: 14
    },
    body2: {
      fontSize: 14
    },
    heading: {
      fontSize: 14
    },
    h5: {
      fontSize: 25
    }
  }
};
