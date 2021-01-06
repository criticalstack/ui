import React from "react";
import h from "../../helpers";
import MenuItem from "@material-ui/core/MenuItem";
import ListSubheader from '@material-ui/core/ListSubheader';
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import mappings from "./mappings";
import MyResponsiveLine from "../../../shared/nivo-databiz/line";

class ContainerSwoll extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      pod: props.pod,
      container: props.container,
      data: [],
      plot: [],
      type: "totals",
      kind: "classifications",
      classes: [],
      group: "Files"
    };
  }

  componentDidMount() {
    this.getSwollData();
    this.processMappings(mappings);
  };

  handleChange(e) {
    this.setState({
      kind: e.target.value,
    }, () => {
      this.setState({
        plot: this.processData(this.state.data.Metrics)
      });
    });
  };

  handleSelectChange(e) {
    this.setState({
      type: e.target.value
    }, () => {
      this.setState({
        plot: this.processData(this.state.data.Metrics)
      });
    });
  };

  processData(data) {
    const type = this.state.type;
    const kind = this.state.kind;
    let result = Object.keys(data[kind]).map((key) => {
      let entry = {
        id: key,
        data: []
      };
      data[kind][key][type].map((plot) => {
        entry.data.push({
          x: plot.timestamp,
          y: Number(plot.value)
        });

      });

    console.log(this.state.type);
      return entry;
    });

      console.log(result);
    return result;
  }

  processMappings(data) {
    let self = this;
     const classes = Object.keys(data);
       classes.forEach((k) => {
      let group = data[k];
       console.log(Object.keys(group));
       Object.keys(group).forEach((c) => {
        console.log(group[c]);
       });
     });

    self.setState({
      classes: classes
    });
  };

  getSwollData() {
    let self = this;
    let pod = self.props.pod;
    let container = self.props.container;

    let ns = window.localStorage["csos-namespace"];

    let swTotalRateUrl = `/swoll/metrics/namespaces/${ns}/pods/${pod}/containers/${container}`;

    self.tmpRequest = h.fetch({
      dataType: "json",
      endpoint: swTotalRateUrl,
      resUrl: false,
      success: function(data) {
        self.tmpRequest = null;

        if (data.context.result) {
          data = data.context.result;
        }
        const plot = self.processData(data.Metrics);
        self.setState({
          data,
          plot
        });
      }
    });
  };



  render() {
    let data = this.state.plot;
    let classes = this.state.classes.map((classCat) => {
        return(
          <>
          <ListSubheader>{classCat}</ListSubheader>
          </>
        );
    });

    let classOptions = this.state.kind === "classifications" ?
      <FormControl className="s-options">
        <Select value={this.state.type} onChange={(e) => this.handleSelectChange(e)}>
          <MenuItem value={"totals"}>Totals</MenuItem>
          <MenuItem value={"errors"}>Errors</MenuItem>
        </Select>
      </FormControl> 
      : this.state.kind === "syscalls" ?
      <FormControl className="s-options">
        <Select value="FileSystem">
          {classes} 
        </Select>
      </FormControl>
      : "";

    return (
      <div className="container-swoll-parent">
        <RadioGroup
          className="r-options"
          row aria-label="grouping"
          name="grouping"
          defaultValue="classifications"
          onChange={(e) => this.handleChange(e)}
      >
          <FormControlLabel value="classifications" control={<Radio />} label="Classifications" labelPlacement="end" />
          <FormControlLabel value="errors" control={<Radio />} label="Errors" />
          <FormControlLabel value="syscalls" control={<Radio />} label="System calls" />
        </RadioGroup>
      {classOptions}
        <MyResponsiveLine data={data} />
      </div>
    );
  }
}

export default ContainerSwoll;
