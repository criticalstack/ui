"use strict";

import React from "react";
import CommonHelpers from "./view/common";
import PodHelpers from "./view/pod";
import NodeHelpers from "./view/node";

var view = {
  helpers: CommonHelpers,
};

view.helpers.pod = PodHelpers;
view.helpers.node = NodeHelpers;

export default view;
