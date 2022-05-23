import React from "react";
import * as co from "../util/chartOptions";
import classNames from "classnames";
import Carousel, { CarouselItem } from "./Carousel";
import ReactLoading from "react-loading";
import { MAIN_COLOR } from "../constants";

/**
 * The stats charts for a given user/Tweet.
 * | Chart Description | Chart Type |
 * | ----------- | ----------- |
 * | number of and polarity score of posts over time | line chart |
 * | left vs right posts | pie chart |
 * | post polarity of tweets over time, grouped by quarter of the year | box plots, violin charts, bean plots |
 *
 * @function
 * @param {Boolean} openDrawer Whether the drawer is open.
 * @param {String} accId The selected/clicked user's Twitter ID.
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @param {Function} handleCloseClick Closes the drawer when clicked.
 * @param {Boolean} loading If the stats charts are in the process of being rendered, `loading` is true and the stats charts are replaced by a loading icon.
 * @returns {Component}
 */
function Charts({
  openDrawer,
  accId,
  distrochartRef,
  handleCloseClick,
  loading,
}) {
  return (
    <div className={classNames("drawer-wrapper", openDrawer && "open")}>
      <div className={classNames("drawer", openDrawer && "open")}>
        <div style={{ width: "95vw", textAlign: "right" }}>
          <img
            src={"/blackCloseIcon.png"}
            onClick={handleCloseClick}
            style={{ width: "1.5rem", cursor: "pointer" }}
          />
        </div>
        {loading && (
          <div
            style={{ display: "flex", justifyContent: "center", width: "100%" }}
          >
            <ReactLoading
              type={"cylon"}
              color={MAIN_COLOR}
              height={"20%"}
              width={"20%"}
            />
          </div>
        )}
        <div style={{ visibility: loading ? "hidden" : "visible" }}>
          <h2 style={{ marginTop: 0 }}>
            {accId}'s Summarized Twitter Activity
          </h2>
          <Carousel>
            <CarouselItem>
              <div id="num-posts">
                <h3>Number of Tweets over Specified Time Frame</h3>
                <p>
                  The color of the line corresponds to the polarity of posts at
                  that point in time.
                </p>
                <p>
                  The bluer it is, the more liberal-leaning the posts there
                  were. The redder it is, the more conservative-leaning the
                  posts there were. White signifies a more neutral position.
                </p>
              </div>
            </CarouselItem>
            <CarouselItem>
              <div id="num-left-right-posts">
                <h3>
                  Number of Left vs Right Tweets over Specified Time Frame
                </h3>
              </div>
            </CarouselItem>
            <CarouselItem
              styles={{ flexDirection: "column", alignItems: "flex-start" }}
            >
              <div>
                <h3>Posts' Polarity over All Time</h3>
                <div id="polarity-over-all-time" />
                <div className="chart-options">
                  <p>Show: </p>
                  <button onClick={() => co.boxPlot(distrochartRef)}>
                    Box Plot
                  </button>
                  <button onClick={() => co.notchedBoxPlot(distrochartRef)}>
                    Notched Box Plot
                  </button>
                  <button onClick={() => co.violinPlotUnbound(distrochartRef)}>
                    Violin Plot Unbound
                  </button>
                  <button onClick={() => co.violinPlotClamp(distrochartRef)}>
                    Violin Plot Clamp to Data
                  </button>
                  <button onClick={() => co.beanPlot(distrochartRef)}>
                    Bean Plot
                  </button>
                  <button onClick={() => co.beeswarmPlot(distrochartRef)}>
                    Beeswarm Plot
                  </button>
                  <button onClick={() => co.scatterPlot(distrochartRef)}>
                    Scatter Plot
                  </button>
                  <button onClick={() => co.trendLines(distrochartRef)}>
                    Trend Lines
                  </button>
                </div>
              </div>
            </CarouselItem>
          </Carousel>
          <div id="attention-weights" />
        </div>
      </div>
    </div>
  );
}

export default Charts;
