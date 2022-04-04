import React from "react";
import * as co from "./chartOptions";
import classNames from "classnames";
import Carousel, { CarouselItem } from "./Carousel";
import closeIcon from "./blackCloseIcon.png";

export default function Charts({
  openDrawer,
  accId,
  chart1,
  handleCloseClick,
}) {
  return (
    <div className={classNames("drawer-wrapper", openDrawer && "open")}>
      <div className={classNames("drawer", openDrawer && "open")}>
        <div style={{ width: "95vw", textAlign: "right" }}>
          <img
            src={closeIcon}
            onClick={handleCloseClick}
            style={{ width: "1.5rem", cursor: "pointer" }}
          />
        </div>
        <h2 style={{ marginTop: 0 }}>{accId}'s Summarized Twitter Activity</h2>
        <Carousel>
          <CarouselItem>
            <div id="num-posts">
              <h3>Number of Tweets over Specified Time Frame</h3>
              <p>
                The color of the line corresponds to the polarity of posts at
                that point in time.
              </p>
              <p>
                The bluer it is, the more liberal-leaning
                the posts there were. The redder it is, the more
                conservative-leaning the posts there were. White signifies a
                more neutral position.
              </p>
            </div>
          </CarouselItem>
          <CarouselItem>
            <div id="num-left-right-posts">
              <h3>Number of Left vs Right Tweets over Specified Time Frame</h3>
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
                <button onClick={() => co.boxPlot(chart1)}>Box Plot</button>
                <button onClick={() => co.notchedBoxPlot(chart1)}>
                  Notched Box Plot
                </button>
                <button onClick={() => co.violinPlotUnbound(chart1)}>
                  Violin Plot Unbound
                </button>
                <button onClick={() => co.violinPlotClamp(chart1)}>
                  Violin Plot Clamp to Data
                </button>
                <button onClick={() => co.beanPlot(chart1)}>Bean Plot</button>
                <button onClick={() => co.beeswarmPlot(chart1)}>
                  Beeswarm Plot
                </button>
                <button onClick={() => co.scatterPlot(chart1)}>
                  Scatter Plot
                </button>
                <button onClick={() => co.trendLines(chart1)}>Trend Lines</button>
              </div>
            </div>
          </CarouselItem>
        </Carousel>
        <div id="attention-weights" />
      </div>
    </div>
  );
}
