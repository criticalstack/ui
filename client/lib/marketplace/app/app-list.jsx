import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
import h from "../../helpers";
import { Link } from "react-router-dom";
import AppTable from "./app-table";
import AppIcon from "./app-icon.jsx";
import Tooltip from "react-tooltip";
import Backdrop from "../../../shared/backdrop";
import NoResult from "../../../shared/no-result";

class AppSlides extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeIndex: props.activeIndex,
      activeLetter: ""
    };
  }

  handleCardClick(e) {
    h.Vent.emit("marketplace:app:actions", {
      action: e.currentTarget.getAttribute("data-action"),
      appId: e.currentTarget.getAttribute("data-appid"),
      value: e.currentTarget.getAttribute("data-value")
    });
  }

  render() {
    let data = this.props.data;
    let index = this.props.activeIndex;
    let len = this.props.data.length;
    let spread = this.props.spread;
    let format = this.props.format;

    let bodyClass = "carousel-section-body";
    let indexes = [];
    let slideData = [];

    if (format === "grid") {
      bodyClass = `carousel-grid-body-${spread}`;
      spread = len;
    }

    for (let i = 0; i < spread; i++) {
      let thisIndex = index + i;
      if (thisIndex < len) {
        indexes.push(thisIndex);
      } else {
        indexes.push(thisIndex - len);
      }
    }

    for (let i = 0; i < indexes.length; i++) {
      let s = indexes[i];
      let app = data[s];
      let v = app.versions[0];
      let deployments = _.get(app, "Deployments", []);
      let isInstalled = deployments.length > 0 ? true : false;
      let hasUpdates = false;

      deployments.map(function(deployment) {
        if (deployment.version < v.version) {
          hasUpdates = true;
        }
      });

      let appCategories = _.get(app, "Categories", []);
      let icon = _.get(v, "icon", false);
      let appIcon = <AppIcon format="card" icon={icon} category={appCategories[0]} />;
      let appLink = `/marketplace/app/${app.metadata.name}`;
      // let userCount = _.get(app, "UserCount", 0);
      // let isBookmarked = _.get(app, "Bookmarked", false);
      // let isFavorite = _.get(app, "Favorite", false);
      // let favoriteCount = _.get(app, "FavoriteCount", 0);
      // let favoriteClass = isFavorite ? "carousel-app-favorite animated rubberBand" : "";
      let helm = true;

      // backdrop args
      let seed = app.metadata.name;
      let bannerColors = _.get(app, "BannerColors", []);

      if (helm) {
        bannerColors = [];
      }

      let xColors = bannerColors;
      let yColors = bannerColors;

      let description = v.description;
      let fadeOut = "";

      if (description.length > 90) {
        fadeOut = <div className="content-fade-bottom"></div>;
      }

      let card = (
        <div id={`${app.metadata.name}-${i}-parent`} key={`${app.metadata.name}-${i}-parent`}>
          <Tooltip
            id={`${data[s].name}-${i}-tooltip-u`}
            effect="float"
            position="top"
          >
           A newer version is available
          </Tooltip>
          <div className="carousel-app-card">
            {isInstalled ?
              <div className="ribbon installed">
                <span>Installed</span>
              </div> : ""
            }
            <div className="carousel-app-header">
              <Backdrop
                width={270}
                height={65}
                seed={seed}
                xColors={xColors}
                yColors={yColors}
              />
              <div className="carousel-app-icon-parent">
                <img
                  className="carousel-app-icon-hc"
                  src="/assets/images/marketplace/icons/app-icon-parent.svg"
                />
                {appIcon}
              </div>
              {hasUpdates !== false ?
                <Link
                  to={{
                    pathname: appLink,
                    state: {
                      data: app
                    }
                  }}
                >
                  <i
                    data-tip
                    data-for={`${data[s].name}-${i}-tooltip-u`}
                    className="glyphicons glyphicons-cloud-alert carousel-app-header-update"
                  />
                </Link> : ""
              }
              {
                // <div
                  // data-action="bookmarked"
                  // data-appid={app.metadata.name}
                  // data-value={!isBookmarked}
                  // onClick={(e) => this.handleCardClick(e)}
                  // className="carousel-app-header-bookmark"
                // >
                  // <i
                    // className="glyphicons glyphicons-bookmark carousel-app-header-bookmark"
                  // />
                  // {isBookmarked !== false ?
                      // <i
                        // className="glyphicons glyphicons-bookmark carousel-app-header-bookmark-added animated rubberBand"
                      // /> : ""
                  // }
                // </div>
              }
            </div>
            <div className="carousel-app-body">
              <div className="carousel-app-name">
                {app.appName}
              </div>
              <div className="carousel-app-line">
              </div>
              <div className="carousel-app-description">
                {description}
                {fadeOut}
              </div>
              <Link
                className="carousel-app-button"
                to={{
                  pathname: appLink,
                  state: {
                    data: app
                  }
                }}
              >
                Learn More
              </Link>
            </div>
            {
              // <div className="carousel-app-footer">
                // <div className="carousel-stamp">
                  // <i className="glyphicons glyphicons-user-group" />
                  // {userCount}
                // </div>
                // <div
                  // data-action="favorite"
                  // data-appid={app.metadata.name}
                  // data-value={!isFavorite}
                  // onClick={(e) => this.handleCardClick(e)}
                  // className="carousel-stamp"
                  // style={{cursor: "pointer"}}
                // >
                  // <i className={`glyphicons glyphicons-star ${favoriteClass}`} />
                  // {favoriteCount}
                // </div>
                // <div className="carousel-stamp">
                  // <i className="csicon csicon-deployments" />
                  // {deployments.length}
                // </div>
              // </div>
            }
          </div>
        </div>
      );

      slideData.push(card);
    }

    return (
      <div
        className="carousel-slides"
        style={{
          marginLeft: len < 5 ? "-20px" : "unset"
        }}
      >
        <div className={bodyClass}>
          {slideData}
        </div>
      </div>
    );
  }
}

class FeaturedSlides extends React.Component {
  constructor(props) {
    super(props);
  }

  handleClick(e) {
    let pathname = this.props.location.hasOwnProperty("pathname")
      ? this.props.location.pathname
      : false;

    if (!pathname) {
      return false;
    }

    let feature = pathname.split("/")[2];
    let appId = e.target.id;

    h.Vent.emit("link", `/marketplace/feature/${feature}/category/${appId}`);
  }

  render() {
    let index = this.props.activeIndex;
    let len = this.props.data.length - 1;

    let slideData;
    let indexes = [];

    if (index === 0) {
      indexes.push(len, 0, 1);
    } else if (index === len) {
      indexes.push((len - 1), len, 0);
    } else {
      indexes.push((index - 1), index, (index + 1));
    }

    slideData = (
      <div className={`carousel-image-group animated ${this.props.carouselReverse ? "carouselReverse" : "carouselForward"}`}
      >
        {indexes.map((s, i) =>
          <div
            className={i !== 1
              ? "carousel-image-edge"
              : "carousel-image-focus"
            }
            key={i}
            style={{
              backgroundImage: `url(${this.props.data[s].hero})`
            }}
          >
            {i === 1
              ? <div
                  id={this.props.data[s].appId}
                  className="mp-app-button learn-more"
                  onClick={(e) => this.handleClick(e)}
                >
                  SHOW ME
                </div>
              : ""
            }
          </div>
        )}
      </div>
    );

    return (
      <div className="carousel-slides">
        <div key={index} className="carousel-slide">
          {slideData}
        </div>
      </div>
    );
  }
}

class AppList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeIndex: 0,
      playing: JSON.parse(localStorage.getItem("playing")),
      format: CSOS.localStorage["marketplace-layout"].data()[props.id] || "carousel",
      carouselReverse: false
    };
  }

  componentDidMount() {
    if (this.state.playing === null) {
      this.playSlides();
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    let format = nextProps.hasOwnProperty("format")
      ? nextProps.format
      : false;

    if (format) {
      this.setState({
        format: format
      });
    }
  }

  componentDidUpdate(prevState) {
    if (this.state.playing !== prevState.playing) {
      localStorage.setItem("playing", this.state.playing);
    }
  }

  componentWillUnmount() {
    this.stopSlides();
  }

  playSlides() {
    if (this.props.format === "featured") {
      this.playId = window.setInterval(() => this.goToNextSlide(), 5000);
      this.setState({
        playing: true
      });
    }
  }

  stopSlides() {
    window.clearInterval(this.playId);
    this.setState({
      playing: false
    });
  }

  resetSlidesInterval() {
    if (this.props.format === "featured" && this.state.playing === true) {
      window.clearInterval(this.playId);
      this.playId = window.setInterval(() => this.goToNextSlide(), 5000);
    }
  }

  toggleType(e) {
    e.preventDefault();
    e.stopPropagation();
    let type = e.target.id;
    let feature = e.target.getAttribute("data-feature") || false;

    if (feature) {
      if (window.localStorage.hasOwnProperty("csos-marketplace-layout")) {
        CSOS.localStorage["marketplace-layout"].update({
          [feature]: type
        });
      }
    }

    this.setState({
      format: type
    });
  }

  goToSlide(index) {
    this.setState({
      activeIndex: index
    });

    this.resetSlidesInterval();
  }

  goToPrevSlide() {
    let index = this.state.activeIndex;
    let slidesLength = this.props.data.length;

    if (index < 1) {
      index = slidesLength;
    }

    --index;

    this.setState({
      activeIndex: index,
      carouselReverse: true
    });

    this.resetSlidesInterval();
  }

  goToNextSlide() {
    let index = this.state.activeIndex;
    let slidesLength = this.props.data.length - 1;

    if (index === slidesLength) {
      index = -1;
    }

    ++index;

    this.setState({
      activeIndex: index,
      carouselReverse: false
    });

    this.resetSlidesInterval();
  }

  makeCardNavigators(data, format, indicatorsClass, indicatorClass) {
    let self = this;
    let slideControl = "";

    if (format === "featured") {
      slideControl = this.state.playing
        ? <li className="mp-toggle-autoplay"
          onClick={() => this.stopSlides()}
          data-balloon="Pause"
          data-balloon-pos="up"
        >
          <i className="glyphicons glyphicons-pause" />
        </li>
        : <li className="mp-toggle-autoplay"
          onClick={() => this.playSlides()}
          data-balloon="Play"
          data-balloon-pos="up"
        >
          <i className="glyphicons glyphicons-play" />
        </li>;
    }

    if (format === "featured") {
      return (
        <ul className={indicatorsClass}>
          {slideControl}
          {data.map((slide, index) =>
            <li
              key={index}
              className={
                index === self.state.activeIndex
                  ? `${indicatorClass} ${indicatorClass}-active`
                  : `${indicatorClass}`
              }
              onClick={() => self.goToSlide(index)}
            >
            </li>
          )}
        </ul>
      );
    } else {
      let lastIndex = "";

      return (
        <ul className={indicatorsClass}>
          {data.map(function(n, i) {
            let curIndex = n.appName[0].toLowerCase();
            let clickIndex = i;
            let indexChar = curIndex !== lastIndex ? curIndex : false;
            lastIndex = curIndex;

            if (indexChar !== false) {
              return (
                <li
                  key={n.Name}
                  className={
                    clickIndex === self.state.activeIndex || data[self.state.activeIndex].appName[0].toLowerCase() === curIndex
                      ? `${indicatorClass}-active`
                      : `${indicatorClass}`
                  }
                  onClick={() => self.goToSlide(i)}
                >
                  {indexChar}
                </li>
              );
            }
          })}
        </ul>
      );
    }
  }

  render() {
    let data = this.props.data;
    let format = CSOS.localStorage["marketplace-layout"].data()[this.props.id] || this.state.format;
    let disable = [false, false, false];
    let location = this.props.hasOwnProperty("location")
      ? this.props.location
      : false;
    let spread = this.props.spread;
    let title = this.state.title;
    let subTitle = this.state.subTitle;
    let activeIndex = this.state.activeIndex;
    let showHeader = format === "featured"
      ? false
      : true;
    let carouselReverse = this.state.carouselReverse;

    if (data.length < 5 && format !== "table") {
      format = "grid";
    }

    if (spread < 3 && format === "table") {
      format = "grid";
      disable[2] = true;
    }

    if (data.length < 5) {
      disable[0] = true;
    }

    if (spread < 3) {
      disable[2] = true;
    }

    let sectionWidths = {
      2: "580px",
      3: "890px",
      4: "1200px",
      5: "1510px"
    };

    let sectionWidth = _.get(sectionWidths, spread, "100%");

    if (this.props.id === "featured") {
      format = "featured";
    }

    let slideTypes = {
      "carousel": <AppSlides
        format="carousel"
        title={title}
        subTitle={subTitle}
        data={data}
        activeIndex={activeIndex}
        spread={spread}
        carouselReverse={carouselReverse}
      />,
      "grid": <AppSlides
        format="grid"
        title={title}
        subTitle={subTitle}
        data={data}
        activeIndex={activeIndex}
        spread={spread}
      />,
      "featured": <FeaturedSlides
        data={data}
        activeIndex={activeIndex}
        location={location}
        carouselReverse={carouselReverse}
      />,
      "table": <AppTable
        title={title}
        subTitle={subTitle}
        data={data}
        spread={spread}
        id={this.props.id}
      />
    };

    let slides = slideTypes[format];

    let showIndicators = false;
    let showArrows = false;
    let arrowClass = "carousel-arrow";
    let indicatorsClass = "carousel-indicators";
    let indicatorClass = "carousel-indicator";

    switch (format) {
      case "carousel":
        arrowClass = "carousel-arrow-inline";
        indicatorsClass = "carousel-indicators-inline";
        indicatorClass = "carousel-indicator-inline";
        showIndicators = true;
        showArrows = true;
        break;
      case "featured":
        arrowClass = "carousel-arrow";
        indicatorsClass = "carousel-indicators";
        indicatorClass = "carousel-indicator";
        showIndicators = true;
        showArrows = true;
        break;
      default:
        arrowClass = "";
        indicatorsClass = "";
        indicatorClass = "";
        showIndicators = false;
        showArrows = false;
    }

    let cardNavigators = showIndicators
      ? this.makeCardNavigators(data, format, indicatorsClass, indicatorClass)
      : null;

    let formats = [
      {
        id: "carousel",
        icon: "glyphicons glyphicons-squares"
      },
      {
        id: "grid",
        icon: "glyphicons glyphicons-thumbnails-small"
      },
      {
        id: "table",
        icon: "glyphicons glyphicons-list"
      }
    ];

    let formatSwitches = formats.map((f, i) => {
      let disabled = disable[i] ? "disabled" : "";

      return (
        <i
          aria-label={f.id}
          key={f.id}
          id={f.id}
          data-tip
          data-for={`${this.props.id}-${f.id}`}
          data-feature={this.props.id}
          className={`${f.icon} ${f.id === format ? "mp-toggle-active" : "mp-toggle"} ${disabled}`}
        >
          <Tooltip
            id={`${this.props.id}-${f.id}`}
            effect="float"
            position="top"
          >
            {f.id}
          </Tooltip>
        </i>
      );
    });

    let emptyMessage = this.props.hasOwnProperty("emptyMessage")
      ? this.props.emptyMessage
      : "No Apps found";

    let emptyIcon = this.props.hasOwnProperty("emptyIcon")
      ? this.props.emptyIcon
      : "glyphicons glyphicons-cloud";

    let noResult = (
      <div
        className="mp-section-content"
        style={{
          marginTop: "20px",
          width: sectionWidth,
          background: "rgb(255, 255, 255)",
          borderRadius: "5px",
          paddingBottom: "40px",
          boxShadow: "0 0 8px 0 rgba(0,0,0,.16)"
        }}
      >
        <NoResult
          title="No Apps found"
          body={emptyMessage}
          icon={emptyIcon}
          addClass="app"
          appClass="dark"
          style={{marginTop: "50px"}}
        />
      </div>
    );

    return (
      <div
        id={this.props.id}
        className="mp-section-parent"
       >
        <div className="mp-section">
          {showHeader ?
            <div className="mp-section-title">
              <div className="mp-title-text">
                {this.props.title}
              </div>
              <div className="mp-subtitle-text">
                {this.props.subTitle}
              </div>
              <div
                className="mp-format-toggle"
                onClick={e => this.toggleType(e)}
              >
              {formatSwitches}
              </div>
            </div> : ""
          }

          {data.length > 0 ?
            <div
              className="mp-section-content"
              style={{
                width: sectionWidth
              }}
            >

            {showArrows ?
              <div
                className={`${arrowClass}-left`}
                onClick={e => this.goToPrevSlide(e)}
              >
                <i className="glyphicons glyphicons-chevron-left" />
              </div> : ""
            }

            {slides}

            {showArrows ?
              <div
                className={`${arrowClass}-right`}
                onClick={e => this.goToNextSlide(e)}
              >
                <i className="glyphicons glyphicons-chevron-right" />
              </div> : ""
          }
          </div> : noResult
          }
        </div>

        {cardNavigators}

      </div>
    );
  }
}

export default AppList;
