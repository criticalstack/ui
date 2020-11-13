import React from "react";
import { withRouter } from "react-router-dom";
import Table from "./table";
import TableTitle from "./table-title";
import _ from "lodash";

class Content extends React.Component {
  constructor(props) {
    super(props);
  }

  filterByApp(data) {
    let path = this.props.location.pathname;
    let appName = path.substring(path.lastIndexOf("/") + 1);
    return data.filter(d => {
      let hasMPLabel = _.has(d, ["metadata", "labels", "marketplace.criticalstack.com/application.name"]);
      if (hasMPLabel) {
        return d.metadata.labels["marketplace.criticalstack.com/application.name"] === appName;
      } else {
        return false;
      }
    });
  }

  render() {
    let filteredAppList = this.filterByApp(this.props.data);

    return (
      <>
        <TableTitle
          title="Installed Versions"
          icon="glyphicons glyphicons-simple-trolley"
          count={filteredAppList.length}
        />
        <Table data={filteredAppList}/>
      </>
    );
  }
}

export default withRouter(Content);
