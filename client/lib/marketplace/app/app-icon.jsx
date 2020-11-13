import React from "react";

class AppIcon extends React.Component {
  render() {
    const formats = {
      "card": "carousel-app-icon",
      "table": "mp-app-icon",
      "search": "mp-app-icon-hc"
    };

    let format = formats[this.props.format];
    let icon = this.props.icon;

    let category = this.props.category || false;
    let appIcon = <i className={`glyphicons glyphicons-picture ${format}-i`} />;

    if (icon && icon.length > 0) {
      appIcon = (
        <img
          className={format}
          src={icon}
          onError={
            (e) => {
              e.target.src = "/assets/images/marketplace/icons/no-app-icon.png";
            }
          }
        />
      );
    } else {
      if (category) {
        appIcon = <i className={`csicon csicon-mp-${category.replace(".", "-")} ${format}-i`} />;
      }
    }

    return appIcon;
  }
}

export default AppIcon;
