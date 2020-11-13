import React from "react";
import ResourceGutter from "./resource-gutter";
import resourceMetadata from "../manifests/resource-metadata";
import _ from "lodash";
import Button from "@material-ui/core/Button";
import NoResult from "../no-result";
import ContextMenu from "../context-menu";
import ChipFilter from "../chip-filter";
import Linker from "../charts/linker";

class CardLayout extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      gutter: {
        enabled: props.gutter || false,
        open: true
      },
      hasMenu: true,
      matches: props.data,
      filter: CSOS.localStorage.resources.data().filter || "",
      layout: CSOS.localStorage.resources.data().layout || "ungrouped",
      contextMenu: {
        open: false,
        data: [],
        schema: {},
        x: 0,
        y: 0,
        type: props.id,
        route: props.route,
        selected: 0,
        id: false
      },
      kinds: {},
      activeKinds: CSOS.localStorage.resources.data().activeKinds || [],
      errorCount: 0,
      errors: []
    };
  }

  componentDidMount() {
    self.timeoutFocus = window.setTimeout(
      () => {
        this.filter.focus();
      },
      500
    );

    this.setState({
      kinds: this.getKinds(this.props.data)
    });

    this.updateErrors();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.data !== this.props.data) {
      let data = this.props.data;
      let kinds = this.getKinds(data);

      if (this.state.filter === "") {
        this.setState({
          matches: data,
          kinds
        });
      } else {
        this.setState({
          matches: this.state.matches,
          kinds
        });
      }
    }

    if (this.state.activeKinds !== prevState.activeKinds) {
      this.updateErrors();
    }

    if (this.state.filter !== prevState.filter) {
      this.updateErrors();
    }

    if (this.state.matches !== prevState.matches) {
      this.updateErrors();
    }
  }

  componentWillUnmount() {
    window.clearInterval(self.timeoutFocus);
  }

  updateErrors() {
    let errorCount = 0;
    let rc = Array.from(document.getElementsByClassName("resource"));
    let errors = [];

    rc.map((c, i) => {
      let error = _.get(rc, `[${i}].dataset.error`);
      let uid = _.get(rc, `[${i}].dataset.uid`);
      if (error === "error") {
        errorCount++;
        errors.push(uid);
      }
    });

    this.setState({
      errorCount,
      errors
    });
  }

  chipFilterAction(chips) {
    CSOS.localStorage.resources.replace({
      activeKinds: chips
    });

    this.setState({
      activeKinds: chips
    });
    this.updateErrors();
  }

  getKinds(data) {
    if (data.length === 0) {
      return {};
    }

    let sorted = _.sortBy(data, "kind");
    let kinds = _.countBy(sorted, (d) => d.kind);
    return kinds;
  }

  renderContextMenu(e, data) {
    e.preventDefault();
    e.stopPropagation();
    let type = _.get(resourceMetadata, `${data.kind}.menu`, "generic-menu");
    let route = _.get(resourceMetadata, `${data.kind}.route`, false);

    this.setState({
      contextMenu: {
        open: true,
        data: data,
        menu: false,
        schema: this.props.hasOwnProperty("schema") ? this.props.schema : {},
        x: e.clientX,
        y: e.clientY,
        type,
        route,
        selected: 0,
        expansion: false,
        id: e.currentTarget.id,
        callback: () => {
          let contextMenu = this.state.contextMenu;
          contextMenu.id = false;
          this.setState({
            contextMenu: contextMenu
          });
        }
      }
    });

    return false;
  }

  noData() {
    let defaultIcon = "glyphicons glyphicons-palette-package";
    let icon = this.props.hasOwnProperty("icon") ? this.props.icon : defaultIcon;

    return <NoResult
      title="No Results"
      body="No results were found"
      icon={icon}
      status="warning"
    />;
  }

  handleLayout(layout) {
    if (layout !== "errors") {
      CSOS.localStorage.resources.update({
        layout: layout
      });
    }

    this.setState({
      layout
    });

    this.updateErrors();
  }

  handleFilter(e) {
    let needle = e.target.value;
    let matches = this.filterData(needle);

    CSOS.localStorage.resources.update({
      filter: needle
    });

    this.setState({
      matches: matches,
      filter: needle
    });
  }

  clearFilter() {
    CSOS.localStorage.resources.update({
      filter: ""
    });

    this.setState({
      filter: "",
      matches: this.props.data
    });
  }

  filterData(needle) {
    let data = this.props.data;
    let matches = [];
    matches = data.filter((d) => {
      let filter = _.get(d, "metadata.name", "");

      if (filter.toString().toLowerCase().indexOf(needle.toLowerCase()) > -1) {
        return d;
      }
    });

    return matches;
  };

  render() {
    let layoutOptions = {
      grouped: ["kind", "metadata.name"],
      ungrouped: ["metadata.name"]
    };

    let layout = this.state.layout;
    let sortBy = _.get(layoutOptions, layout, ["metadata.name"]);
    let data = this.state.filter === ""
      ? _.sortBy(this.state.matches, sortBy)
      : _.sortBy(this.filterData(this.state.filter), sortBy);

    let kindCounts = _.countBy(data, (d) => d.kind);
    let lastIndex = "";

    let cards = data.filter((d) => {
      if (this.props.hasOwnProperty("disableKindFilter")) {
        return true;
      };

      let activeKinds = this.state.activeKinds;

      if (layout === "errors") {
        if (this.state.errors.includes(d.metadata.uid)) {
          if (activeKinds.length === 0 || activeKinds.includes(d.kind)) {
            return true;
          }
        }
        return false;
      }

      if (activeKinds.length === 0 || activeKinds.includes(d.kind)) {
        return true;
      }

      return false;
    }).map((d, i) => {
      let header = null;
      let curIndex = d.kind;
      let titles = this.props.hasOwnProperty("layout") ? this.props.layout : true;

      // this will be influenced by RBAC at some point
      let isLocked = this.state.gutter.enabled;

      if (layout === "grouped" && titles) {
        if (curIndex !== lastIndex) {
          let count = kindCounts[curIndex];
          header = (
            <div key={`header-${i}`}className="resource-section-title">{curIndex} ({count})</div>
          );
        }
        lastIndex = curIndex;
      }

      let card = React.cloneElement(
        this.props.card,
        {
          key: i,
          data: d,
          onContextMenu: this.renderContextMenu.bind(this),
          isLocked: isLocked
        }
      );

      return [
        header,
        card
      ];
    });

    let resourceGutter = this.state.gutter.enabled ? <ResourceGutter /> : null;

    let buttons = (
      <div style={{
          display: "flex"
        }}
      >
       <Button
        title="show errors"
        disableFocusRipple={true}
        disableRipple={true}
        variant="contained"
        onClick={() => this.handleLayout("errors")}
        className={`dialog-button btn-action-error${layout === "errors" ? " active" : ""}`}
      >
        <i className="glyphicons glyphicons-triangle-empty-alert dialog-button-icon btn-action-error" />
        <div
          style={{
            position: "absolute",
            top: "-1px",
            right: "4px",
            fontSize: "10px"
          }}
        >
          {this.state.errorCount}
        </div>
      </Button>
        <Button
          title="ungroup resources"
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          onClick={() => this.handleLayout("ungrouped")}
          className={`dialog-button btn-action${layout === "ungrouped" ? " active" : ""}`}
        >
          <i className="glyphicons glyphicons-sort-alphabetically dialog-button-icon btn-action" />
        </Button>
        <Button
          title="group resources"
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          onClick={() => this.handleLayout("grouped")}
          className={`dialog-button btn-action${layout === "grouped" ? " active" : ""}`}
        >
          <i className="glyphicons glyphicons-thumbnails-list dialog-button-icon btn-action" />
        </Button>
      </div>
    );

    let layoutControls = this.props.hasOwnProperty("layout") ? null : buttons;
    let chipFilter = this.props.hasOwnProperty("chipFilter") ?
      <ChipFilter
        name="Resource Kinds"
        data={this.state.kinds}
        activeKinds={this.state.activeKinds}
        action={(chips) => this.chipFilterAction(chips)}
        disabled={this.state.layout === "flow" ? true : false}
      /> : null;

    const create = this.props.hasOwnProperty("create") ?
      <div
        className="settings-options">
        <Button
          disableFocusRipple={true}
          disableRipple={true}
          variant="contained"
          className="dialog-button btn-create"
          onClick={this.props.create}
        >
          <i className="glyphicons glyphicons-plus dialog-button-icon btn-create" />
          Create
        </Button>
      </div> : null;

    let controls = (
      <div className="controls-parent">
        <div className="controls-left">
          {chipFilter}
          {create}
        </div>
        <div className="controls-right">
          <div className="controls-actions">
            {layoutControls}
          </div>
          <div className="controls-input">
            <div
              className="controls-filter-clear"
              onClick={() => this.clearFilter()}
            >
              <i className="glyphicons glyphicons-clean" />
            </div>
            <input
              ref={(node) => {
                this.filter = node;
              }}
              className="controls-filter-input"
              type="text"
              placeholder="Filter"
              onChange={(e) => this.handleFilter(e)}
              value={this.state.filter}
              aria-label="Enter filter text"
            />
            <i className="glyphicons glyphicons-filter controls-filter-icon"></i>
          </div>
        </div>
      </div>
    );

    let menu = this.state.hasMenu ? <ContextMenu args={this.state.contextMenu} /> : null;
    let content;

    if (cards.length === 0) {
      content = this.noData();
    } else {
      content = this.state.layout === "flow"
        ? <Linker data={cards} links={this.props.metadata} />
        : cards;
    }

    return (
      <>
        {menu}
        {controls}
        {resourceGutter}
        {content}
      </>
    );
  }
}

export default CardLayout;
