"use strict";

import React from "react";
import TableBuilder from "../../../shared/table";
import LabelMaker from "../../../shared/label-maker";
import h from "../../helpers";
import _ from "lodash";
import moment from "moment";
import { formSchema, uiSchema } from "./form-schema";

class Table extends React.Component {
  createHeadings() {
    let head = {
      main: [
        {
          value: "Name"
        },
        {
          value: "Age"
        },
        {
          value: "Labels"
        }
      ]
    };

    return head;
  }

  editConfigMap(e, that, raw) {
    let rawData = [];
    delete raw.metadata.resourceVersion;

    _.forEach(raw.data, function(v, k) {
      rawData.push({
        key: k,
        value: v
      });
    });

    h.Vent.emit("layout:form-dialog:open", {
      open: true,
      schema: formSchema.configMaps,
      uiSchema: uiSchema.configMaps,
      title: "Edit Config Map",
      icon: "glyphicons glyphicons-square-edit",
      help: "ConfigMap",
      small: true,
      formData: {
        metadata: raw.metadata,
        type: raw.type,
        data: rawData
      },
      onAction: function(form, callback) {

        let flat = {};
        _.each(form.data, function(item) {
          flat[item.key] = item.value;
        });

        form.data = flat;

        h.fetch({
          type: "post",
          url: h.ns(`/configmaps/${raw.metadata.name}`),
          data: JSON.stringify(form),
          success: function() {
            h.Vent.emit("notification", {
              message: "Save Complete"
            });

            if (callback && typeof callback === "function") {
              return callback();
            }
          },
          error: function(a) {
            h.Vent.emit("request-error:confirm-box", a);

            h.Vent.emit("notification", {
              message: "Error while saving..."
            });

            if (callback && typeof callback === "function") {
              return callback();
            }
          }
        });
      }
    });
  }

  createRow(d) {
    let name = d.metadata.name;
    let created = moment(d.metadata.creationTimestamp).format("YYYY-MM-DD HH:mm:ss");
    let uptime = h.view.helpers.uptime(created);
    let rawTime = moment(created).format("x");
    let labels = "None";

    if (d.metadata.hasOwnProperty("labels")) {
      labels = <LabelMaker scope="config-maps"
        data={d.metadata.labels} uid={d.metadata.uid} />;
    }

    let row = {
      id: name,
      raw: d,
      cells: [
        {
          raw: name,
          value: <strong>{name}</strong>
        },
        {
          raw: rawTime,
          value: <div
            data-balloon={`created: ${created}`}
            data-balloon-pos="up">
            {uptime}
          </div>
        },
        {
          value: labels
        }
      ]
    };

    return row;
  }

  render() {
    return (
      <div>
        <TableBuilder
          id="config-maps-table"
          route={this.props.route}
          className="default-table"
          head={this.createHeadings()}
          body={this.props.data.map((d) => this.createRow(d))}
          hasCheckbox={true}
        />
      </div>
    );
  }
}

export default Table;
