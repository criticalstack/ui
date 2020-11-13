"use strict";
import Formats from "./localstorage/formats";
import MarketplaceLayout from "./localstorage/marketplace-layout";
import Metrics from "./localstorage/metrics";
import Tables from "./localstorage/tables";
import History from "./localstorage/history";
import Resources from "./localstorage/resources";

export default {
  localStorage: {
    "formats": new Formats("csos-formats"),
    "marketplace-layout": new MarketplaceLayout("csos-marketplace-layout"),
    "metrics": new Metrics("csos-metrics"),
    "tables": new Tables("csos-tables"),
    "history": new History("csos-history"),
    "resources": new Resources("csos-resources")
  }
};
