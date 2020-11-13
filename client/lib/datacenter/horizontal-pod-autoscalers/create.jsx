import h from "../../helpers";
import Session from "../../helpers/session";
import _ from "lodash";
import { formSchema, uiSchema } from "./schemas/hpa";

export default () => {
  h.Vent.emit("layout:form-dialog:open", {
    open: true,
    exData: [
      "deployments",
      "replicasets",
      "statefulsets"
    ],
    exDataAction: function(exData, schema) {
      let deployments = exData.deployments;
      let replicaSets = exData.replicasets;
      let statefulSets = exData.statefulsets;
      let deploymentNames = [];
      let replicaSetNames = [];
      let statefulSetNames = [];

      _.forEach(deployments, function(x) {
        deploymentNames.push(x.metadata.name);
      });

      schema.dependencies.workload.oneOf[0].properties.deploymentName.enum = deploymentNames;

      _.forEach(replicaSets, function(x) {
        replicaSetNames.push(x.metadata.name);
      });

      schema.dependencies.workload.oneOf[1].properties.replicaSetName.enum = replicaSetNames;

      _.forEach(statefulSets, function(x) {
        statefulSetNames.push(x.metadata.name);
      });

      schema.dependencies.workload.oneOf[2].properties.statefulSetName.enum = statefulSetNames;

      return schema;
    },
    schema: formSchema,
    uiSchema: uiSchema,
    title: "Create HorizontalPodAutoscaler",
    icon: "csicon csicon-autoscale",
    help: "HorizontalPodAutoscaler",
    small: true,
    onAction: function(form, callback) {
      let metrics = [];

      if (form.enableCPU) {
        metrics.push(
          {
            "type": "Resource",
            "resource": {
              "name": "cpu",
              "target": {
                "type": "Utilization",
                "averageUtilization": form.targetCPU
              }
            }
          }
        );
      }

      if (form.enableMemory) {
        metrics.push(
          {
            "type": "Resource",
            "resource": {
              "name": "memory",
              "target": {
                "type": "Utilization",
                "averageUtilization": form.targetMemory
              }
            }
          }
        );
      }

      let v2body = {
        "kind": "HorizontalPodAutoscaler",
        "apiVersion": "autoscaling/v2beta2",
        "metadata": {
          "name": form.deploymentName || form.replicaSetName || form.statefulSetName,
          "namespace": Session.namespace()
        },
        "spec": {
          "scaleTargetRef": {
            "apiVersion": "apps/v1",
            "kind": form.workload,
            "name": form.deploymentName || form.replicaSetName || form.statefulSetName
          },
          "minReplicas": form.minReplicas,
          "maxReplicas": form.maxReplicas,
          "metrics": metrics
        }
      };

      h.fetch({
        method: "post",
        endpoint: h.ns("/horizontalpodautoscalers"),
        body: JSON.stringify(v2body),
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
};
