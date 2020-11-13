import React from "react";
import h from "../../lib/helpers";

const RBACContext = React.createContext();

class RBACProvider extends React.Component {

  constructor() {
    super();

    this.state = {
      access: {},
      csAccess: {}
    };

    this.fetchAccess = this.fetchAccess.bind(this);
  }

  componentDidMount() {

    this.fetchAccess(this.props.namespace);

    if (this.props.namespace !== "critical-stack") {
      this.fetchCSAccess();
    }
  }

  fetchAccess(namespace) {
    let self = this;
    h.fetch({
      resUrl: false,
      endpoint: `/rbac/namespaces/${namespace}/access`,
      success: function(data) {
        self.setState({
          access: data.context.result,
         ...(namespace === "critical-stack" ? {csAccess: data.context.result} : {}),
        });
      }
    });
  }

  fetchCSAccess() {
    let self = this;
    h.fetch({
      resUrl: false,
      endpoint: "/rbac/namespaces/critical-stack/access",
      success: function(data) {
        self.setState({
          csAccess: data.context.result
        });
      }
    });
  }

  render() {
    return (
      <RBACContext.Provider
        value={{
          access: this.state.access,
          csAccess: this.state.csAccess,
          fetchAccess: this.fetchAccess
        }}
      >
        {this.props.children}
      </RBACContext.Provider>
    );
  }
}

const RBACConsumer = RBACContext.Consumer;

export { RBACContext, RBACProvider, RBACConsumer };
