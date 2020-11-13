import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import resourceMetadata from "./manifests/resource-metadata";
import _ from "lodash";

const useStyles = makeStyles(() => ({
  accordian: {
    boxShadow: "none",
    border: "1px solid #c9c9c9",
    marginBottom: "10px !important",
    borderRadius: "5px"
  },
  accordianSummary: {
    height: "24px"
  },
  accordianTitle: {
    color: "#414141",
    display: "flex",
    alignItems: "center",
    fontSize: "16px",
    width: "300px"
  },
  chips: {
    display: "flex",
    flexWrap: "wrap"
  },
  chip: {
    margin: "0 10px 10px 0",
    boxShadow: "0 2px 4px rgba(0,0,0,.1)",
    backgroundColor: "#fff",
    color: "#000",
    padding: "8px 10px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "12px",
    userSelect: "none",
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignContent: "center",
    columnGap: "10px",
    width: "230px",
    border: "1px solid #d4d4d4"
  },
  chipLabel: {
    display: "flex",
    alignItems: "center"
  },
  leftIcon: {
    fontSize: "20px",
    color: "#3277e4"
  },
  rightIcon: {
    fontSize: "20px",
  },
  clearIcon: {
    fontSize: "24px",
    color: "#717171",
    marginLeft: "4px",
    marginTop: "-2px"
  },
  kindCount: {
    color: "#37444c",
    padding: "2px 12px",
    marginLeft: "10px",
    background: "#d5d5d5",
    border: "1px solid #d5d5d5",
    borderRadius: "8px"
  }
}));

export default function ChipFilter(props) {
  const classes = useStyles();
  const [activeChips, setActiveChips] = React.useState(props.activeKinds);

  const toggleChip = (chip) => {
    let chips = Array.from(activeChips);
    if (chips.includes(chip)) {
      chips.splice(chips.indexOf(chip), 1);
    } else {
      chips.push(chip);
    }

    setActiveChips(chips);
    props.action(chips);
  };

  const clearChips = (e) => {
    e.stopPropagation();
    setActiveChips([]);
    props.action([]);
  };

  let chips = Object.keys(props.data).length > 0 ?
    Object.keys(props.data).map((key) => {
      let noIcon = "glyphicons glyphicons-package";
      let resourceIcon = _.get(resourceMetadata, `${key}.icon`, noIcon);
      let opacity = 0.4;
      let eyeIcon = "glyphicons glyphicons-eye-off";
      if (activeChips.includes(key)) {
        opacity = activeChips.includes(key) ? 1 : opacity;
        eyeIcon = "glyphicons glyphicons-eye";
      }

      if (activeChips.length === 0) {
        eyeIcon = "glyphicons glyphicons-eye";
      }

      return (
        <div
          key={key}
          className={classes.chip}
          onClick={() => toggleChip(key)}
          style={{
            opacity
          }}
        >
          <i className={`${resourceIcon} ${classes.leftIcon}`} />
          <span className={classes.chipLabel}>{`${key} (${props.data[key]})`}</span>
          <i className={`${eyeIcon} ${classes.rightIcon}`} />
        </div>
      );
    }) : null;

  let kindCount = activeChips.length === 0 ? "all" : activeChips.length;
  let clearIcon = activeChips.length > 0 ? (
    <i
      className={`glyphicons glyphicons-clean animated fadeIn ${classes.clearIcon}`}
      onClick={(e) => clearChips(e)}
      aria-label="clear filter"
    />
  ) : null;

  return (
    <div>
      <Accordion TransitionProps={{ unmountOnExit: true }} className={classes.accordian}>
        <AccordionSummary
          className={classes.accordianSummary}
          expandIcon={<i className="glyphicons glyphicons-chevron-down" />}
          aria-controls="panel-content"
          id="panel-header"
          disabled={props.disabled}
        >
          <div className={classes.accordianTitle}>
            Kinds <span className={classes.kindCount}>{kindCount}</span>
            {clearIcon}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <div className={classes.chips}>
            {chips}
          </div>
        </AccordionDetails>
      </Accordion>
    </div>
  );
}
