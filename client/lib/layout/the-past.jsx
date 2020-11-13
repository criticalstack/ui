import React from "react";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import h from "../helpers";

class ThePast extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      past: [],
      delete: false
    };
  }

  componentDidMount() {
    if (window.localStorage.hasOwnProperty("csos-history")) {
      let stored = CSOS.localStorage.history.data().history || [];
      let past = [];
      let dirty = false;

      stored.map((entry) => {
        let valid = this.validateEntry(entry);
        if (valid) {
          past.push(valid);
        } else {
          dirty = true;
        }
      });

      if (dirty) {
        this.updateStorage(past);
      }

      this.setState({
        past
      });
    }
  }

  componentDidUpdate(prevProps) {
    // rbac is going to muck us up here
    // as we need to check if we can actually
    // access anything in the previous queue first
    // before allowing them. WIP: we need to validate
    // any existing links against access rules
    if (this.props.namespace !== prevProps.namespace) {
      this.setState({
        past: []
      });
      this.updateStorage([]);
      return false;
    }

    this.addEntry(this.props.present);
  }

  validateEntry(present) {
    // make sure we aren't processing garbage
    let re = /^\/{1}([a-zA-Z0-9-]\/{0,1})+[^\W$]$/;
    if (re.exec(present) === null) {
      return false;
    }

    // we can't direct link to anything beyond /marketplace
    // for now as some endpoints require state that we
    // won't have if we direct link (WIP)
    re = /^\/marketplace/;
    if (re.exec(present) !== null) {
      present = "/marketplace";
    }

    const linkParts = present.split("/");
    if (linkParts.length === 6) {
      if (linkParts[2] === "pods") {
        linkParts[5] = 0;
        present = linkParts.join("/");
      }
    }

    let exclude = [
      "/",
      "/login",
      "/datacenter",
      "/cluster",
      "/datacenter/settings"
    ];

    if (exclude.includes(present)) {
      return false;
    }

    if (present.length <= 1) {
      return false;
    }

    return present;
  }

  addEntry(present) {
    let past = this.state.past;
    let entry = this.validateEntry(present);
    if (!entry) {
      return false;
    }

    if (!past.includes(entry)) {
      past.push(entry);
      this.updateStorage(past);

      this.setState({
        past
      });
    }
  }

  removeEntry(entry) {
    let past = this.state.past;
    let index = past.indexOf(entry);

    if (index !== -1) {
      past.splice(index, 1);
      this.updateStorage(past);

      this.setState({
        past
      });
    }
  }

  updateStorage(entries) {
    if (window.localStorage.hasOwnProperty("csos-history")) {
      CSOS.localStorage.history.replace({
        history: entries
      });
    }
  }

  makeLinks(past) {
    const present = this.props.present;
    if (past.length === 0) {
      let entry = this.validateEntry(present);
      if (entry) {
        past.push(entry);
      }
    }

    let links = past.map((link) => {
      let color = link === present ? "#0078e7" : "#6e6e6e";
      const linkParts = link.split("/");
      let linkText = linkParts[linkParts.length - 1].replace(/-/gi, " ");
      let icon = null;
      let remove = null;
      let clickAction = () => h.Vent.emit("link", link);

      // container check
      if (linkParts.length === 6) {
        if (linkParts[2] === "pods") {
          linkText = linkParts[4];
          icon = <i className="csicon csicon-containers bc-link-icon" />;
        }
      }

      if (this.state.delete && link !== present) {
        remove = (
          <div className="bc-link-action">
            <i className="glyphicons glyphicons-menu-close" />
          </div>
        );

        color = "#b13e31";
        clickAction = () => this.removeEntry(link);
      }

      return (
        <div
          style={{
            color
          }}
          className="bc-link"
          key={linkText}
          onClick={clickAction}
        >
          {icon}
          <span className="bc-link-text">{linkText}</span>
          {remove}
        </div>
      );
    });

    return links;
  }

  render() {
    let display = "flex";
    let re = /^\/marketplace/;
    if (re.exec(this.props.present) !== null) {
      display = "none";
    }

    return (
      <div
        style={{
          marginLeft: "12px",
          marginRight: "12px",
          marginTop: "10px",
          display,
          alignItems: "center",
        }}
      >
        <i
          title="edit"
          className={`glyphicons ${this.state.delete ? "glyphicons-bin" : "glyphicons-history"}`}
          onClick={() => this.setState({ delete: !this.state.delete })}
          style={{
            fontSize: "24px",
            marginRight: "10px",
            color: this.state.delete ? "#b13e31" : "#0078e7",
            cursor: "pointer"
          }}
        />
        <Breadcrumbs maxItems={12} itemsAfterCollapse={4} aria-label="breadcrumb">
          {this.makeLinks(this.state.past)}
        </Breadcrumbs>
      </div>
    );
  }
}

export default ThePast;
