"use strict";

import React from "react";
import ReactDOM from "react-dom";
import Checkbox from "@material-ui/core/Checkbox";
import _ from "lodash";
import NoResult from "./no-result";
import h from "../lib/helpers";
import { withRouter } from "react-router";
import ContextMenu from "./context-menu";
import HoverMenu from "./hover-menu";

class TableBuilder extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      checkBoxOpenFill: "#fff",
      checkBoxFillHeader: "#798994",
      checkBoxFill: "#B6C1CA",
      closeAllOnOpen: false,
      hasOnRowClick: false,
      hasCheckbox: props.hasCheckbox,
      rows: {},
      matches: props.body,
      sortIndex: false,
      reversedSort: false,
      filter: "",
      checkBoxes: props.hasOwnProperty("isSelected") ? props.isSelected : {},
      checksCreated: false,
      range: {
        low: 0,
        high: CSOS.localStorage.tables.data().rows - 1 || 4,
        limit: CSOS.localStorage.tables.data().rows || 50
      },
      contextMenu: {
        open: false,
        data: [],
        x: 0,
        y: 0,
        type: props.id,
        route: props.route,
        selected: 0,
        id: false
      },
      menuIsVisible: false
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.body !== this.props.body) {
      let data = this.props.body;
      if (this.state.filter === "") {
        if (this.state.sortIndex !== false) {
          data = this.sortData(data, this.state.sortIndex);
          if (this.state.reversedSort) {
            data = data.reverse();
          }
        }
        this.setState({
          matches: data
        });
      } else {
        data = this.filterData(data, this.state.filter);
        this.setState({
          matches: data
        });
      }
    }
  }

  componentDidMount() {
    let self = this;

    self.setState({
      hasOnRowClick: self.props.hasOnRowClick || false,
      closeOnOpen: self.props.closeOnOpen || false
    });

    // do not bind events for sub-tables
    if (!self.props.subTable) {
      h.Vent.addListener("table:reset:checkboxes", function() {
        self.setState({
          checkBoxes: {}
        });
      });

      // option to stop searchbar from automatically being focused on page load
      if (!self.props.preventSearchFocus) {
        self.timeoutFocus = window.setTimeout(
          () => {
            this.search.focus();
          },
          500
        );
      }

      if (self.props.hasOwnProperty("userNamespaceTable")) {
        h.Vent.addListener("root:table:selected:namespace", function(callback) {
          let store = {
            all: false,
            items: []
          };

          _.forOwn(self.state.checkBoxes, function(value, key) {
            if (key !== "all") {
              if (value) {
                store.items.push(key);
              }
            }
          });

          return callback(store);
        });
      }

      // this gets bound to the id of the table
      h.Vent.addListener(`root:table:select:action:${this.props.id}`, function(params) {
        let selected = 0;

        _.forOwn(self.state.checkBoxes, function(value, key) {
          if (key !== "all" && value === true) {
            selected++;
          }
        });

        let ess = selected > 1 ? "s" : "";

        if (_.keys(self.state.checkBoxes) <= 0) {
          h.Vent.emit("notification", {
            message: "No items selected"
          });

          self.setState({
            checkBoxes: {}
          });

          return;
        }

        // data request
        if (params.hasOwnProperty("sendBack")) {
          let store = [];
          _.forOwn(self.state.checkBoxes, function(value, key) {
            if (key !== "all" && value) {
              store.push(key);
            }
          });

          if (params.hasOwnProperty("done") && typeof params.done === "function") {
            let data = self.dataRequest(params.key, store);
            params.done(data);
          }

          self.setState({
            checkBoxes: {}
          });

          return false;
        }

        let title = params.hasOwnProperty("title")
          ? params.title
          : `You will be performing this action on ${selected} item${ess}`;

        let primaryAction = params.hasOwnProperty("primaryAction")
          ? params.primaryAction
          : "delete";

        h.Vent.emit("layout:confirm:open", {
          open: true,
          title: title,
          message: "Are you sure you wish to continue?",
          primaryAction: primaryAction,
          onAction: function() {
            let store = {
              all: false,
              items: []
            };

            if (params.hasOwnProperty("notification") && params.notification.hasOwnProperty("message")) {
              h.Vent.emit("notification", {
                message: params.notification.message
              });
            }

            _.forOwn(self.state.checkBoxes, function(value, key) {
              if (key !== "all") {
                if (value && (params.hasOwnProperty("action") && typeof params.action === "function")) {
                  store.items.push(key);
                  params.action(key, store);
                }
              }
            });

            if (params.hasOwnProperty("done") && typeof params.done === "function") {
              params.done(store);
            }

            h.Vent.emit("layout:confirm:close");

            self.setState({
              checkBoxes: {}
            });

          }
        });
      });

      self.updateParentCount();
    }
  }

  componentWillUnmount() {
    let self = this;
    window.clearInterval(self.timeoutFocus);

    h.Vent.removeAllListeners("root:table:selected:namespace");

    if (!self.props.subTable) {
      h.Vent.emit("content:title:update:count", 0);
      h.Vent.removeAllListeners("table:reset:checkboxes");
      h.Vent.removeAllListeners(`root:table:select:action:${this.props.id}`);
    }

    if (self.websocket) {
      h.log.info("closing websocket");

      self.websocket.onopen = self.websocket.onmessage = self.websocket.onerror = self.websocket.onclose = null;

      if (self.websocket.readyState < 2) {
        self.websocket.close();
      }

      self.websocket = null;
    }
  }

  dataRequest(key, items) {
    let data = [];
    data = items.map((item) => {
      let entry = _.find(this.state.matches, {
        raw: {
          [key]: item
        }
      });

      if (typeof entry === "object") {
        return entry.raw;
      }
      return [];
    });

    return data;
  }

  expandRow(row, e) {
    let self = this;
    let stopClick = e.target.getAttribute("data-disable-click");
    let className = e.target.parentNode.className;
    // return if they click on a menu action
    if (className === "MuiIconButton-label") {
      return false;
    }

    // mui components can have multiple
    // generated children that don't have classes
    // we can stop propagation with this.
    // making sure that we use classes on what
    // we make :)
    if (className === "") {
      return false;
    }

    if (stopClick === "true") {
      return false;
    }

    if (e.target.getAttribute("data-type") === "menu") {
      return false;
    }

    if (e.target.type === "checkbox") {
      return false;
    }

    if (!self.state.hasOnRowClick) {
      return false;
    }

    if (row.hasOwnProperty("link")) {
      self.props.history.push(row.link);
      return false;
    }

    let rows = self.state.rows;

    if (self.state.closeOnOpen) {
      rows = {};
      rows[row.id] = self.state.rows[row.id] ? true : false;
    }

    if (rows.hasOwnProperty(row.id) && rows[row.id]) {
      // already open so toggle it closed
      rows[row.id] = false;
    } else {
      // not open so set row to open
      rows[row.id] = true;
    }

    self[row.id].scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    self.setState({
      rows: rows
    });
  }

  expandRowRender(row) {
    let self = this;

    if (!self.state.hasOnRowClick) {
      return null;
    }

    if (!self.state.rows.hasOwnProperty(row.id) || !self.state.rows[row.id]) {
      return null;
    }

    if (!self.props.hasOwnProperty("onRowClickRenderFunction")) {
      return null;
    }

    if (!_.isFunction(self.props.onRowClickRenderFunction)) {
      return null;
    }

    return self.props.onRowClickRenderFunction(row);
  }

  rowOpen(id) {
    let self = this;

    if (!self.state.rows.hasOwnProperty(id) || !self.state.rows[id]) {
      return false;
    }

    return true;
  }

  sortData(data, id) {
    let sortedData;

    sortedData = _.sortBy(data, function(o) {
      if (o.cells[id]) {
        if (o.cells[id].hasOwnProperty("raw")) {
          return o.cells[id].raw;
        } else if (o.cells[id].hasOwnProperty("value")) {
          return o.cells[id].value;
        }
      }
    });

    return sortedData;
  }

  sortTable(id) {
    let matches = this.state.matches;
    let sorted;
    let reversedSort = this.state.reversedSort;

    if (id === this.state.sortIndex) {
      sorted = matches.reverse();
      reversedSort = !reversedSort;
    } else {
      sorted = this.sortData(matches, id);
    }

    this.setState({
      matches: sorted,
      sortIndex: id,
      reversedSort
    });
  }

  toggleCheck(e) {
    let self = this;
    let items = self.state.checkBoxes;
    let id = e.target.value;

    if (id === "_all_") {
      let all;

      if (items.all) {
        items = {};

        // allow rows to be locked.
        _.each(self.state.matches, function(row) {
          if (row.hasOwnProperty("locked") && row.locked === true) {
            items[row.id] = true;
          }
        });

        self.setState({
          checkBoxes: items
        });

        return false;

      } else {

        all = true;
      }

      items = {};
      items.all = all;

      _.each(self.state.matches, function(row) {
        items[row.id] = items.all;
      });

      self.setState({
        checkBoxes: items
      });

      return false;
    }

    if (items[id]) {
      items[id] = false;
    } else {
      items[id] = true;
    }

    // reset
    // if items change and all is true
    // the all selection changed
    if (items.all) {
      items.all = false;
    }

    self.setState({
      checkBoxes: items
    });

    return false;
  }

  // Pagination
  addPagination(rowCount) {
    let self = this;
    let counts = [5, 10, 20, 50, 100];

    let disabled = rowCount > CSOS.localStorage.tables.data().rows ? "" : "disable";

    return (
      <div>
        <select
          value={self.state.range.limit}
          aria-label="Slelect number of items to display"
          onChange={self.alterLimit.bind(self)}
          className="table-pagination-count">
          {counts.map(function(c) {
            return (
              <option key={c} value={c}>{c}</option>
            );
          })}
        </select>

        <i
          className={`glyphicons glyphicons-rewind table-pagination-icon ${disabled}`}
          onClick={self.previousPage.bind(self)}
        />

        <i
          onClick={self.nextPage.bind(self)}
          className={`glyphicons glyphicons-forward table-pagination-icon ${disabled}`}
        />
      </div>
    );
  }

  previousPage() {
    let self = this;
    let range = self.state.range;
    let newLow = range.low <= 0 ? range.low = 0 : range.low - range.limit;
    let newHigh = range.low <= 0 ? range.limit : range.high - range.limit;

    if (range.low === 0) {
      return;
    }

    self.setState({
      range: {
        low: newLow,
        high: newHigh,
        limit: range.limit
      }
    });
  }

  nextPage() {
    let self = this;
    let range = self.state.range;
    let max = self.state.matches.length;

    if ((range.high + 1) >= max) {
      return;
    }

    self.setState({
      range: {
        low: range.low + range.limit,
        high: range.high + range.limit,
        limit: range.limit
      }
    });
  }

  alterLimit(e) {
    let self = this;
    let range = self.state.range;
    let value = Number(e.target.value);
    let max = self.state.matches.length;

    if (value >= max) {
      range = {
        low: 0,
        high: value - 1,
        limit: value
      };
    } else {
      range = {
        low: range.low,
        high: range.low + value - 1,
        limit: value
      };
    }

    self.setState({
      range: range
    });

    CSOS.localStorage.tables.update({
      rows: value
    });
  }

  // end Pagination

  filterData(data, needle) {
    let matches = [];

    // behavior:
    // 1) check for an explicit filter in the row object. an array of values to match on
    // 2) if neither of the above are defined look for a resource name in the metadata
    //
    // perhaps a later feature:
    // allow prefixed filters. ex: metadata.<key>.<key>=<value>

    matches = data.filter((row) => {
      let filter = row.hasOwnProperty("filter") ? row.filter : "";

      if (filter === "") {
        filter = _.get(row, "raw.metadata.name", "");
      }

      if (filter.toString().toLowerCase().indexOf(needle.toLowerCase()) > -1) {
        return row;
      }
    });


    if (this.state.sortIndex !== false) {
      matches = this.sortData(matches, this.state.sortIndex);
      if (this.state.reversedSort) {
        matches = matches.reverse();
      }
    }

    return matches;
  }

  handleFilter(e) {
    let needle = e.target.value;

    let matches = this.filterData(this.props.body, needle);

    let range = this.state.range;
    range.low = 0;

    this.setState({
      matches: matches,
      filter: needle,
      range: range
    });
  }

  clearFilter() {
    this.setState({
      filter: "",
      matches: this.props.body
    });
  }

  noData() {
    return <NoResult
      title="No Results"
      body="No results were found"
      icon="glyphicons glyphicons-table"
      status="warning"
    />;
  }

  updateParentCount() {
    h.Vent.emit("content:title:update:count", this.state.matches.length);
  }

  renderContextMenu(e, row) {
    e.preventDefault();
    e.stopPropagation();

    let cb = Object.assign({}, this.state.checkBoxes);
    if (cb.hasOwnProperty("all")) {
      delete cb.all;
    }

    let selected = 0;

    if (e.currentTarget.classList.contains("row-active")) {
      e.currentTarget.classList.remove("row-active");
    }

    Object.keys(cb).map((k) => {
      if (cb[k]) {
        selected++;
      }
    });

    this.setState({
      contextMenu: {
        open: true,
        data: row.raw,
        menu: _.get(row, "menu", false),
        x: e.clientX,
        y: e.clientY,
        type: this.props.id,
        route: this.props.route,
        selected: selected,
        expansion: this.props.hasCheckbox,
        id: e.currentTarget.id,
        callback: () => {
          let contextMenu = this.state.contextMenu;
          contextMenu.id = false;
          contextMenu.open = false;
          this.setState({
            contextMenu: contextMenu
          });
        }
      }
    });

    return false;
  }

  render() {
    let self = this;
    let pagination = self.props.hasOwnProperty("pagination") ? false : true;
    let paginationControl = "";
    let rowLow = self.state.matches.length !== 0 ? self.state.range.low + 1 : 0;
    let rowHigh = pagination ? self.state.range.high + 1 : self.state.matches.length;

    let rowCount = 0;
    _.each(self.state.matches, function(r) {
      if (r.hasOwnProperty("ignore")) {
        if (!r.ignore) {
          rowCount++;
        }
      } else {
        rowCount++;
      }
    });

    if (rowHigh >= rowCount) {
      rowHigh = rowCount;
    }

    if (!self.props.subTable && pagination) {
      paginationControl = (
        <div className="table-pagination-notifier">
          <span className="table-pagination-viewing">
            viewing {rowLow} to {rowHigh} of {rowCount}
          </span>
          <span className="table-pagination-control">
            {self.addPagination(rowCount)}
          </span>
        </div>
      );
    }

    let tableControls = (
      <div className="table-controls">
        {!self.props.subTable ?
          <div className="table-filter">
            <div
              className="table-filter-clear"
              onClick={() => this.clearFilter()}
            >
              <i className="glyphicons glyphicons-clean" />
            </div>
            <input
              ref={(node) => {
                this.search = node;
              }}
              className="table-filter-input"
              type="text"
              placeholder="Filter"
              onChange={(e) => this.handleFilter(e)}
              value={this.state.filter}
              aria-label="Enter filter text"
            />
            <i className="glyphicons glyphicons-filter table-filter-icon"></i>
          </div> : ""
        }
        {paginationControl}
      </div>
    );

    let tbody = [];

    for (let r = self.state.range.low; r < rowHigh; r++) {
      let row = self.state.matches[r];

      if (row.hasOwnProperty("ignore") && row.ignore) {
        continue;
      }

      let type = this.props.id.replace("-table", "");
      let menuIcon = this.state.menuIsVisible === r
        ? <HoverMenu data={row.raw} type={type} variant="row" />
        : null;

      let cells = [];
      for (let c = 0; c < row.cells.length; c++) {
        let cell = row.cells[c];
        let cellClass = ["default-table-td"];
        if (cell.hasOwnProperty("className")) {
          cellClass.push(cell.className.split(" "));
        }

        cells.push(
          <td
            className={cellClass.join(" ")}
            key={`${self.props.id}-td-${c}`}
            style={cell.style}
            data-disable-click={cell.disableClick}>
            {cell.value}
            {c === row.cells.length - 1 ? menuIcon : null}
          </td>
        );
      }

      let isDisabled = "";
      let isLocked = false;
      let isOpen = self.rowOpen(row.id) ? "row-open" : "row-closed";
      let contextActive = self.state.contextMenu.id === `row-${r}` ? " row-active" : "";
      let rowId = row.id;

      if (row.hasOwnProperty("disabled") && row.disabled === true) {
        isDisabled = " row-disabled";
      }

      if (row.hasOwnProperty("locked") && row.locked === true) {
        isLocked = true;
      }

      let cmClick = (e) => this.renderContextMenu(e, row);
      let noContextMenu = this.props.hasOwnProperty("noContextMenu");
      let rowCursor = noContextMenu ? "default" : "context-menu";


      if (noContextMenu) {
        cmClick = () => {};
        contextActive = "";
      }

      tbody.push(
        <tr
          id={`row-${r}`}
          ref={node => {
            this[rowId] = node;
          }}
          className={`${isOpen}${isDisabled}${contextActive}`}
          onContextMenu={cmClick}
          onClick={self.expandRow.bind(self, row)}
          onMouseOver={() => self.setState({ menuIsVisible: r })}
          onMouseLeave={() => self.setState({ menuIsVisible: false })}
          key={`${self.props.id}-tr-${r}`}
          style={{
            cursor: rowCursor
          }}
        >

          {self.props.hasOnRowClick && !self.props.subTable && (
            <td
              className="default-table-td"
              style={{
                padding: 0,
                textAlign: "center",
                fontSize: 18,
                background: "#37444c",
                borderBottom: "#37444c",
                cursor: "pointer"
              }}
            >
              <i className="glyphicons glyphicons-chevron-down subtable-caret"/>
            </td>
          )}

          {self.state.hasCheckbox ? (
            <td
              style={{
                width: "66px"
              }}
              data-disable-click={true}
              key={`${self.props.id}-cb-${r}`}>
              <Checkbox
                className="table-checkbox"
                inputProps={{"aria-label": "Table checkbox row"}}
                disableRipple={true}
                key={row.id}
                checked={self.state.checkBoxes[row.id] || false}
                value={row.id.toString()}
                disabled={isLocked}
                onChange={(e) => self.toggleCheck(e)}
              />
            </td>
            ) : null}

            {cells}

          </tr>,
          self.expandRowRender(row)
      );
    }

    let table = (
      <div className="table-parent">
        <ContextMenu args={this.state.contextMenu} />
        <div className="table-wrapper" >
          <table
            className={this.props.className}
            id={this.props.id}>
            <thead>
              {
                this.props.hasOwnProperty("subtableTitle") && (
                  <tr
                    className="subtable-title">
                    <th
                      colSpan="100%"
                      style={{
                        textAlign: "center",
                        fontSize: ".9em"
                      }}
                    >
                      {self.props.subtableTitle}
                    </th>
                  </tr>
                )
              }
              <tr>
                {self.props.hasOnRowClick && !self.props.subTable && (
                  <th
                    style={{
                      width: "40px",
                      background: "#1d2428",
                      borderBottom: "#1d2428",
                      color: "#fff"
                    }}
                  >
                    <i className="glyphicons glyphicons-more-vertical" />
                  </th>
                )}

                {self.state.hasCheckbox ? (
                  <th style={{
                    width: "66px"
                  }}>
                  <Checkbox
                    className="table-checkbox"
                    inputProps={{"aria-label": "Table checkbox all"}}
                    disableRipple={true}
                    key={"table-select-all"}
                    checked={self.state.checkBoxes.all || false}
                    value="_all_"
                    onChange={(e) => self.toggleCheck(e)}
                  />
                </th>
                ) : null}

                {self.props.head.main.map(function(item, i) {
                  let headerClass = ["default-header-cell"];

                  if (item.hasOwnProperty("className")) {
                    headerClass.push(item.className.split(" "));
                  }

                  return (
                    <th
                      onClick={!item.disableClick ? () => self.sortTable(i) : null}
                      key={`${self.props.id}-${i}`}
                      className={headerClass.join(" ")}
                      data-index={i}
                      style={item.style}>
                      {item.value}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {tbody}
            </tbody>

          </table>
        </div>
      </div>
    );

    return (
      <div>
        {tableControls}
        { rowCount === 0 ? self.noData() : table }
      </div>
    );
  }
}

export default withRouter(TableBuilder);
