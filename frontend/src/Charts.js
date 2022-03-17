import React from "react";
import * as co from "./chartOptions";
import classNames from "classnames";

export default function Charts({
  openDrawer,
  accId,
  chart1,
  handleCloseClick,
}) {
  return (
    <div className={classNames("drawer-wrapper", openDrawer && "open")}>
      <div className={classNames("drawer", openDrawer && "open")}>
        <button onClick={handleCloseClick}>Close Drawer</button>
        <h2 style={{ marginTop: 0 }}>{accId}'s Summarized Twitter Activity</h2>
        <div id="num-posts">
          <h3>Number of Tweets over Specified Time Frame</h3>
          <p>
            The color of the line corresponds to the polarity of posts at that
            point in time. The bluer it is, the more liberal-leaning the posts
            there were. The redder it is, the more conservative-leaning the
            posts there were. White signifies a more neutral position.
          </p>
        </div>
        <div id="num-left-right-posts">
          <h3>Number of Left vs Right Tweets over Specified Time Frame</h3>
        </div>
        <div>
          <h3>Posts' Polarity over All Time</h3>
          <div id="polarity-over-all-time" />
        </div>
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
          <button onClick={() => co.beeswarmPlot(chart1)}>Beeswarm Plot</button>
          <button onClick={() => co.scatterPlot(chart1)}>Scatter Plot</button>
          <button onClick={() => co.trendLines(chart1)}>Trend Lines</button>
        </div>
        <table id="attention-weights"></table>
      </div>
    </div>
  );
}
