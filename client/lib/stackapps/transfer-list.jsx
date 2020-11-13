import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import { createMuiTheme } from "@material-ui/core/styles";
import CSOSTheme from "../../shared/themes/csos";
import CsTooltip from "../../shared/cs-tooltip";
import _ from "lodash";

const theme = createMuiTheme(CSOSTheme);
const styles = {
  root: {
    margin: "auto"
  },
  card: {
    marginBottom: "20px",
    boxShadow: "unset",
    border: "2px solid #c9c9c9"
  },
  cardWarn: {
    marginBottom: "20px",
    boxShadow: "unset",
    border: "2px solid #eb9fa0"
  },
  cardHeader: {
    backgroundColor: "#f4f4f4",
    padding: theme.spacing(1, 2)
  },
  cardHeaderWarn: {
    backgroundColor: "#f4f4f4",
    padding: theme.spacing(1, 2),
  },
  listItem: {
    marginBottom: "8px",
    border: "2px solid #c9c9c9",
    width: "95%",
    borderRadius: "10px",
    minHeight: "70px"
  },
  listItemWarn: {
    marginBottom: "8px",
    border: "2px solid rgba(204, 0, 0, 0.4)",
    width: "95%",
    borderRadius: "10px",
    minHeight: "70px"
  },
  listItemStackValue: {
    marginBottom: "8px",
    border: "2px solid #673ab7",
    width: "95%",
    borderRadius: "10px",
    minHeight: "70px"
  },
  full: {
    width: "350px",
    height: "368px",
    backgroundColor: theme.palette.background.paper,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  button: {
    margin: theme.spacing(0.5, 0)
  },
  emptyIcon: {
    color: "#f4f4f4",
    fontSize: "18rem",
    display: "flex",
    justifyContent: "center"
  },
  help: {
    height: "50px",
    width: "300px"
  }
};

class TransferList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      checked: [],
      left: props.args.data.a,
      right: [],
      hidden: props.args.data.b,
      showHidden: false,
      hasStackValue: false,
      reconciled: []
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.reconciled.length > 0) {
      return true;
    }
    if (this.state.showHidden !== nextState.showHidden) {
      return true;
    }

    if (this.state.checked !== nextState.checked) {
      return true;
    }

    if (this.props.args.data.a === nextProps.args.data.a) {
      return false;
    }
  }

  not(a, b) {
    return a.filter((value) => b.indexOf(value) === -1);
  }

  intersection(a, b) {
    return a.filter((value) => b.indexOf(value) !== -1);
  }

  union(a, b) {
    return [...a, ...this.not(b, a)];
  }

  handleToggle(value) {
    const currentIndex = this.state.checked.indexOf(value);
    const newChecked = [...this.state.checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    this.setState({
      checked: newChecked
    });
  };

  stackValueCheck() {
    let hits = 0;
    this.state.right.map((uid) => {
      let resource = this.props.args.metadata[uid];

      if (resource.potentialStackValue && resource.kind === "Secret") {
        if (_.findIndex(this.state.reconciled, uid) === -1) {
          hits++;
        }
      }
    });

    if (hits > 0) {
      return true;
    }
    return false;
  }

  stackValueReconcile(value, form) {
    let reconciled = this.state.reconciled;
    reconciled.push({
      [value]: {
        form
      }
    });

    this.setState({ reconciled });
  }

  handleCheckedRight(key) {
    const left = this.state[key];
    const checked = this.state.checked;
    const leftChecked = this.intersection(checked, left);
    const newRight = this.state.right.concat(leftChecked);

    this.setState({
      right: newRight,
      [key]: this.not(left, leftChecked),
      checked: this.not(checked, leftChecked)
    }, () => {
      this.props.args.action(newRight, this.stackValueCheck());
    });
  };

  handleCheckedLeft() {
    const right = this.state.right;
    const left = this.state.left;
    const origLeft = this.props.args.data.a;
    let newLeft = [];
    const hidden = this.state.hidden;
    let newHidden = [];
    const checked = this.state.checked;
    const rightChecked = this.intersection(checked, right);
    let reconciled = this.state.reconciled;

    rightChecked.map((uid) => {
      let index = _.findIndex(reconciled, uid);
      if (index !== -1) {
        reconciled.splice(index, 1);
      }

      if (origLeft.includes(uid)) {
        newLeft.push(uid);
      } else {
        newHidden.push(uid);
      }
    });

    const newRight = this.not(right, rightChecked);

    this.setState({
      left: left.concat(newLeft),
      hidden: hidden.concat(newHidden),
      right: newRight,
      checked: this.not(checked, rightChecked),
      reconciled
    }, () => {
      this.props.args.action(newRight, this.stackValueCheck());
    });
  };

  handleToggleAll(items) {
    if (this.numberOfChecked(items) === items.length) {
      this.setState({
        checked: this.not(this.state.checked, items),
      });
    } else {
      this.setState({
        checked: this.union(this.state.checked, items)
      });
    }
  };

  numberOfChecked(items) {
    return this.intersection(this.state.checked, items).length;
  }

  customList(title, items, type, key) {
    const classes = this.props.classes;
    const cardClass = key === "hidden" ? "cardWarn" : "card";
    const headerClass = key === "hidden" ? "cardHeaderWarn" : "cardHeader";
    const icons = {
      left: "glyphicons glyphicons-palette-package",
      hidden: "glyphicons glyphicons-palette-package",
      stackapp: "glyphicons glyphicons-layers",
      stackvalue: "glyphicons glyphicons-layers-cogwheel"
    };

    const noData = (
      <div
        className={classes[type]}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <i className={`${classes.emptyIcon} ${icons[key]}`} />
      </div>
    );

    let list = items.length > 0 ? this.makeList(items, type, key) : noData;

    return (
      <Card className={classes[cardClass]}>
        <CardHeader
          className={classes[headerClass]}
          avatar={
           <Checkbox
            onClick={() => this.handleToggleAll(items)}
            checked={this.numberOfChecked(items) === items.length && items.length !== 0}
            indeterminate={this.numberOfChecked(items) !== items.length && this.numberOfChecked(items) !== 0}
            disabled={items.length === 0}
            inputProps={{ "aria-label": "all items selected" }}
          />
          }
          title={title}
          subheader={`${this.numberOfChecked(items)}/${items.length} selected`}
        />
        <Divider />
        {list}
      </Card>
    );
  };

  makeList(items, type, key) {
    const args = this.props.args;
    const classes = this.props.classes;
    const list = (
      <List className={classes[type]} dense component="div" role="list">
        {items.map((value, i) => {
          const labelId = `transfer-list-all-item-${value}-label`;
          const icon = args.metadata[value].icon;
          const primary = args.metadata[value].name;
          let secondary = args.metadata[value].kind;
          const potentialStackValue = args.metadata[value].potentialStackValue;
          const ignore = args.metadata[value].ignore;
          let actionIcon = null;
          let itemClass = "listItem";

          if (ignore && !potentialStackValue) {
            itemClass = "listItemWarn";
            actionIcon = (
              <ListItemIcon style={{minWidth: "35px"}}>
                <i
                  className="glyphicons glyphicons-bell-ringing"
                  style={{
                    fontSize: "30px",
                    color: "#eb9fa0"
                  }} />
              </ListItemIcon>
            );
          }

          if (potentialStackValue) {
            // effects in right zone only
            if (key === "stackapp") {
              let reconciled = this.state.reconciled;
              let isReconciled = _.find(reconciled, value, false);
              let formData = {};
              let svIcon = secondary === "Secret"
                ? "glyphicons glyphicons-layers-cogwheel"
                : "glyphicons glyphicons-cogwheel";
              let iconColor = "#666";

              // check if we have configured this
              if (isReconciled) {
                svIcon = "glyphicons glyphicons-cogwheel";
                formData = _.get(isReconciled[value], "form", {});
                secondary = `${secondary} -> StackValue`;
              } else if (secondary === "Secret") {
                itemClass = "listItemStackValue";
                iconColor = "#673AB7";
              }

              actionIcon = (
                <ListItemIcon style={{minWidth: "35px"}}>
                  <CsTooltip
                    text="Configure"
                    action={(e) => {
                      e.stopPropagation();
                      const callback = (v, form) => {
                        this.stackValueReconcile(v, form);
                        return false;
                      };
                      args.stackValueAction(value, formData, callback);
                    }}
                    icon={svIcon}
                    style={{
                      fontSize: "30px",
                      color: iconColor,
                      padding: "12px"
                    }}
                  />
                </ListItemIcon>
              );
            }
          }

          return (
            <ListItem
              disableGutters={true}
              className={classes[itemClass]}
              key={`${value}-${i}`}
              role="listitem"
              button
              onClick={() => this.handleToggle(value)}
            >
              <ListItemIcon style={{minWidth: "35px"}}>
                <Checkbox
                  checked={this.state.checked.indexOf(value) !== -1}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ "aria-labelledby": labelId }}
                />
              </ListItemIcon>
              <ListItemIcon style={{minWidth: "35px"}}>
                <i className={icon} style={{fontSize: "24px"}} />
              </ListItemIcon>
              <ListItemText id={labelId} primary={primary} secondary={secondary} />
              {actionIcon}
            </ListItem>
          );
        })}
      </List>
    );

    return list;
  }

  render() {
    const classes = this.props.classes;
    const left = this.state.showHidden ? this.state.hidden : this.state.left;
    const key = this.state.showHidden ? "hidden" : "left";
    const right = this.state.right;
    const checked = this.state.checked;
    const leftChecked = this.intersection(checked, left);
    const rightChecked = this.intersection(checked, right);
    const hasStackValue = this.stackValueCheck();

    return (
      <div>
        <Grid container spacing={2} justify="center" alignItems="center" className={classes.root}>
          <Grid item>
            <Grid container className={classes.help}>
              <FormControl
                aria-label="show advanced resources"
                name="show advanced resources"
                style={{
                  flexDirection: "row"
                }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={this.state.showHidden}
                      onChange={() => {
                        this.setState({
                          showHidden: !this.state.showHidden
                        });
                      }}
                    />
                  }
                  label="Show advanced resources"
                />
              </FormControl>
            </Grid>
            <Grid container>
              {this.customList(this.state.showHidden ? "Resources (danger zone)" : "Resources", left, "full", key)}
            </Grid>
          </Grid>
          <Grid item>
            <Grid container direction="column" alignItems="center">
              <Button
                variant="contained"
                size="small"
                className="dialog-button dialog-button-transfer btn-create"
                disabled={leftChecked.length === 0}
                onClick={() => this.handleCheckedRight(key)}
                aria-label="move selected right"
              >
               <i className="glyphicons glyphicons-chevron-right" />
              </Button>
              <Button
                variant="contained"
                size="small"
                className="dialog-button dialog-button-transfer btn-create"
                disabled={rightChecked.length === 0}
                onClick={() => this.handleCheckedLeft()}
                aria-label="move selected left"
              >
                <i className="glyphicons glyphicons-chevron-left" />
              </Button>
            </Grid>
          </Grid>
          <Grid item>
            <Grid container className={classes.help}>
              {hasStackValue ? (
                <div className="animated fadeIn">
                  <i
                    style={{
                      fontSize: "24px",
                      marginTop: "-2px",
                      color: "#2879ff",
                      marginRight: "5px"
                    }}
                    class="glyphicons glyphicons-circle-empty-info"
                  />
                  Items with the
                  <i
                    aria-label="StackValue icon"
                    title="Configure StackValue"
                    className="glyphicons glyphicons-layers-cogwheel"
                    style={{
                      fontSize: "24px",
                      color: "#673AB7",
                      marginTop: "-1px",
                      marginRight: "5px",
                      marginLeft: "5px"
                    }}
                  />
                  icon must be reconciled before creation.
                </div>
              ) : null}
            </Grid>
            <Grid container>
              {this.customList("StackApp", right, "full", "stackapp")}
            </Grid>
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default withStyles(styles)(TransferList);
