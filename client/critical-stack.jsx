"use strict";

import React from "react";
import ReactDOM from "react-dom";
import routes from "./lib/router";
import h from "./lib/helpers";

h.init();

ReactDOM.render(routes, document.getElementById("wrapper"));
