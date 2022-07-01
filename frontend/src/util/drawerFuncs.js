import makeDistroChart from "./distrochart";
import { ATTN_COLOR } from "../constants";
const d3 = window.d3;

const DRAWER_HEIGHT_FACTOR = 2;

/**
 * Functions for rendering stats charts in drawer.
 * @module
 */

const helperForDrawNumPostsOverTime = (
  relationType,
  data,
  setCurrGraphTime,
  svg,
  line,
  style,
  xScale,
  yScale
) => {
  var parseTime = d3.utcParse("%m/%d/%Y, %H:%M:%S");

  // 8.
  var dataset = data.times.map(function (d, i) {
    return {
      x: parseTime(d),
      y: data.sizes[i],
    };
  });

  const stops = data.stops.map((stop, ind) => ({
    offset: `${stop}%`,
    color: data.colors[ind],
  }));

  // Set the gradient
  svg
    .append("linearGradient")
    .attr("id", "line-gradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", "0%")
    .attr("y1", 0)
    .attr("x2", "100%")
    .attr("y2", 0)
    .selectAll("stop")
    .data(stops)
    .enter()
    .append("stop")
    .attr("offset", function (d) {
      return d.offset;
    })
    .attr("stop-color", function (d) {
      return d.color;
    });

  // 9. Append the path, bind the data, and call the line generator
  if (style === "SOLID_LINE") {
    svg
      .append("path")
      .datum(dataset) // 10. Binds data to the line
      .attr("stroke", "url(#line-gradient)")
      .attr("class", "line") // Assign a class for styling
      .attr("d", line) // 11. Calls the line generator
      .attr("id", `${relationType}-line`);
  } else {
    svg
      .append("path")
      .datum(dataset)
      .attr("stroke", style["color"])
      .attr("class", "line")
      .style("stroke-dasharray", style["lineType"]) // for dashed lines
      .attr("d", line)
      .attr("id", `${relationType}-line`);
  }

  // 12. Appends a circle for each datapoint
  svg
    .selectAll(".dot")
    .data(dataset)
    .enter()
    .append("circle") // Uses the enter().append() method
    .attr("class", `dot dot-${relationType}`) // Assign a class for styling
    .attr("id", function (d, i) {
      return `dot-${relationType}-${i}`;
    })
    .attr("cx", function (d) {
      return xScale(d.x);
    })
    .attr("cy", function (d) {
      return yScale(d.y);
    })
    .attr("r", 4)
    .on("click", function (d) {
      setCurrGraphTime(d.x);
    })
    .on("mouseover", function (d, i) {
      d3.select(`.dot-${relationType}-${i}`).attr("class", "focus");
    })
    .on("mouseout", function (d, i) {
      d3.select(`.dot-${relationType}-${i}`)
        .classed("focus", false)
        .attr("class", "dot");
    });
};

/**
 * Draws line chart for number of Tweets the selected/clicked user has postde over the default or user-specified date range.
 * Code skeleton from [here](https://bl.ocks.org/gordlea/27370d1eea8464b04538e6d8ced39e89).
 * Creating labels for the pie segments came from [here](https://observablehq.com/@d3/pie-chart).
 * @function
 * @param {Object} data
 * @param {Array} data.colors Each element looks like '#7878FF'. Each color depends on the average overall Tweet polarity scores within a time step for a certain user. Blue corresponds to very liberal-leaning posts and red corresponds to very conservative-leaning posts.
 * @param {Array} data.range: A 2-element array that consists of [Least number of tweets posted within a day by a certain user, Greatest number of tweets posted within a day by a certain user].
 * @param {Array} data.sizes Radii of each point on the line chart, each corresponding to how many posts a user tweets within a single time step.
 * @param {Array} data.stops Real numbers from 0 to 100 that mark what percentages of the x-axis the color of the line chart should change at. E.g., [0, 11.2, 45.6, 100]
 * @param {Array} data.times Datetime strings of the form 'MM/DD/YYYY, hh:mm:ss' that each correspond to a point on the line chart.
 * @param {Function} setCurrGraphTime When user clicks on a point in the line chart, this function moves the `Timeline` to the time instance corresponding to that point on the line chart.
 */
export const drawNumPostsOverTime = (data, setCurrGraphTime) => {
  // 1. Add the SVG to the page and employ #2
  const existing_svg = d3.select("#num-posts").select("svg");
  if (existing_svg["_groups"][0][0]) existing_svg.remove();

  for (const relationType in data) {
    const existing_checkboxes = d3.select(`.checkboxes-${relationType}`);
    if (existing_checkboxes["_groups"][0][0]) existing_checkboxes.remove();
  }

  var margin = { top: 50, right: 100, bottom: 150, left: 100 },
    width = window.innerWidth - margin.left - margin.right, // Use the window's width
    height =
      document.documentElement.clientHeight / DRAWER_HEIGHT_FACTOR -
      margin.top -
      margin.bottom; // Use the window's height
  var parseTime = d3.utcParse("%m/%d/%Y, %H:%M:%S");

  // 5. X scale will use the timestamps of our data
  var xScale = d3
    .scaleTime()
    .domain([
      parseTime(data["allPosts"].times[0]),
      parseTime(data["allPosts"].times[data["allPosts"].times.length - 1]),
    ]) // input
    .range([0, width]);

  // 6. Y scale will use the randomly generate number
  var yScale = d3
    .scaleLinear()
    .domain([data["allPosts"].range[0], data["allPosts"].range[1]]) // input
    .range([height, 0]); // output

  // turn num posts lines on/off
  for (const relationType in data) {
    d3.select("#num-posts")
      .append("div")
      .attr("class", `checkboxes-${relationType}`);
    d3.select(`.checkboxes-${relationType}`)
      .append("input")
      .attr("type", "checkbox")
      .attr("checked", true)
      .attr("value", `${relationType}-line`)
      .on("change", function () {
        d3.select(`#${this.value}.line`).style(
          "visibility",
          d3.select(`.checkboxes-${relationType} > input`).property("checked")
            ? "visible"
            : "hidden"
        );

        d3.selectAll(`.dot-${relationType}`).style(
          "visibility",
          d3.select(`.checkboxes-${relationType} > input`).property("checked")
            ? "visible"
            : "hidden"
        );
      });
    d3.select(`.checkboxes-${relationType}`).append("label").text(relationType);
    // d3.select("#num-posts").append("br");
  }

  var svg = d3
    .select("#num-posts")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("overflow", "visible")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // 3. Call the x axis in a group tag
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale).tickFormat(d3.utcFormat("%m/%d/%Y, %H:%M")))
    .selectAll(".x-axis text") // https://bl.ocks.org/d3noob/ecf9e1ddeb48d0c4fbb29d03c08660bb
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)"); // Create an axis component with d3.axisBottom

  // 4. Call the y axis in a group tag
  svg.append("g").attr("class", "y axis").call(d3.axisLeft(yScale)); // Create an axis component with d3.axisLeft

  // 7. d3's line generator
  var line = d3
    .line()
    .x(function (d, i) {
      return xScale(d.x);
    }) // set the x values for the line generator
    .y(function (d, i) {
      return yScale(d.y);
    }); // set the y values for the line generator

  for (const relationType in data) {
    let style;
    if (relationType === "allPosts") {
      style = "SOLID_LINE";
    } else if (relationType === "mentions") {
      style = {
        lineType: "3, 3",
        color: "purple",
      };
    } else {
      style = {
        lineType: "5, 5, 5, 5, 5, 5, 10, 5, 10, 5, 10, 5",
        color: "green",
      };
    }
    helperForDrawNumPostsOverTime(
      relationType,
      data[relationType],
      setCurrGraphTime,
      svg,
      line,
      style,
      xScale,
      yScale
    );
  }
};

/**
 * Draws pie chart for number of Tweets that're liberal-leaning vs conservative-leaning for a selected/clicked user (over the default or user-specified date range).
 * Code skeleton from [here](https://www.d3-graph-gallery.com/graph/pie_basic.html).
 * @function
 * @param {Object} data
 * @param {Number} data.num_left The number of tweets by a user that were deemed liberal-leaning by Patricia's model (within the default/user-specified date range).
 * @param {Number} data.num_right The number of tweets by a user that were deemed conservative-leaning by Patricia's model (within the default/user-specified date range).
 */
export const drawLeftRightPie = (data) => {
  var margin = { top: 50, right: 0, bottom: 0, left: 50 },
    width = window.innerWidth - margin.left - margin.right, // Use the window's width
    height =
      document.documentElement.clientHeight / DRAWER_HEIGHT_FACTOR -
      margin.top -
      margin.bottom; // Use the window's height
  // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
  const radius = Math.min(width, height) / 2 - margin.top;

  const existing_svg = d3.select("#num-left-right-posts").select("svg");
  if (existing_svg["_groups"][0][0]) existing_svg.remove();

  // append the svg object to the div called '#num-left-right-posts'
  const svg = d3
    .select("#num-left-right-posts")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const raw_data = {
    "liberal-leaning": data.num_left,
    "conservative-leaning": data.num_right,
  };

  // set the color scale
  const color = d3.scaleOrdinal().range(["#0000FF", "#FF0000"]);

  // Compute the position of each group on the pie:
  const pie = d3.pie().value(function (d) {
    return d[1];
  });
  const data_ready = pie(Object.entries(raw_data));

  // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
  svg
    .selectAll("whatever")
    .data(data_ready)
    .join("path")
    .attr("d", d3.arc().innerRadius(0).outerRadius(radius))
    .attr("fill", function (d) {
      return color(d.data[1]);
    })
    .attr("stroke", "black")
    .style("stroke-width", "2px")
    .style("opacity", 0.7);

  // creating labels on pie segments
  // Copyright 2021 Observable, Inc.
  // Released under the ISC license.
  // https://observablehq.com/@d3/pie-chart
  const labelRadius = radius * 0.5; // center radius of labels
  const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);
  svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(data_ready)
    .join("text")
    .attr("transform", (d) => `translate(${arcLabel.centroid(d)})`)
    .selectAll("tspan")
    .data((d) => {
      return d.data;
    })
    .join("tspan")
    .attr("x", 0)
    .attr("y", (_, i) => `${i * 1.1}em`)
    .attr("font-weight", (_, i) => (i ? null : "bold"))
    .text((d) => d);
};

/**
 * Draws distrochart for selected/clicked user's Tweet over all time of the default or user-specified date range.
 * Check out the `util/distrochart.js` file for more details.
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @param {Object} data The polarity and quarter data of a certain user's Tweets over the whole dataset's date range.
 * @param {Array} data.res
 * @param {Float} data.res.polarity The political polarity that a tweet is classified to have by Patricia's model.
 * @param {("Q1"|"Q2"|"Q3"|"Q4")} data.res.qtr What quarter of the year that a tweet was posted.
 */
export const drawPolarityOverAllTime = (distrochartRef, data) => {
  const width = window.innerWidth, // Use the window's width
    height = document.documentElement.clientHeight / DRAWER_HEIGHT_FACTOR;

  distrochartRef.current = makeDistroChart({
    data: data.res,
    xName: "qtr",
    yName: "polarity",
    axisLabels: { xAxis: "2020 Quarters", yAxis: "Posts' Quarterly Polarity" },
    selector: "#polarity-over-all-time",
    chartSize: { height, width },
    constrainExtremes: true,
    margin: {
      top: 20,
      bottom: 50,
      left: width / 5,
      right: width / 5,
    },
  });

  distrochartRef.current.renderBoxPlot();
  distrochartRef.current.renderDataPlots();
  distrochartRef.current.renderNotchBoxes({ showNotchBox: false });
  distrochartRef.current.renderViolinPlot({ showViolinPlot: false });
};

/**
 * Renders, in tabular form, the polarity scores for a Tweet's tokens and for the Tweet as a whole.
 * Code skeleton provided by Patricia.
 * @function
 * @param {Object} data
 * @param {Array} data.attention The weights of each token in a certain Tweet.
 * @param {String} data.processedTweet How the Tweet has been preprocessed by Patricia's model.
 * @param {String} data.rawTweet The styled HTML string of the original Tweet. Generated the HTML string by following [this article](https://developer.twitter.com/en/docs/twitter-for-websites/embedded-tweets/overview).
 * @param {Array} data.tokenPolarities The political polarity score of each token in a certain Tweet.
 * @param {Number} data.tweetId The Tweet's ID.
 * @param {Number} data.tweetScore The overall Tweet's political polarity score.
 */
export const drawAttentionWeights = (data) => {
  if (!data["attention"])
    return `<div class="centered-column"><div style="padding-bottom: 1rem">${data["rawTweet"]}</div><div>Unfortunately, the model couldn't figure out a classification for this tweet.</div></div>`;

  const { rawTweet, attention, tweetScore, processedTweet, tokenPolarities } =
    data;

  const words = processedTweet.split(" ");
  const maxNumTokens = attention.length;

  let rows = `<div class="centered-column">${rawTweet}</div><div id="table-scroll"><table><tbody><tr style='background-color:#dddddd'><th>Tweet<br />Score</th><th colspan=${maxNumTokens}>Attention Weight</th></tr></tbody><tbody>`;

  // whole tweet's polarity score + tweet sentence
  rows += "<tr>";

  var heat_text = `<td>${tweetScore}</td>`;

  for (let i = 0; i < words.length; i++) {
    heat_text += `<td><span style='background-color:rgba(${ATTN_COLOR}, ${
      attention[i] * 15
    })'>${words[i]}</span></td>`;
  }

  rows += heat_text + "</tr><tr>";

  // polarity scores line
  heat_text = "<th>Polarity</th>";
  for (let j = 0; j < tokenPolarities.length; j++) {
    const score = tokenPolarities[j];
    heat_text += `<td><span style='font-size:${
      tokenPolarities[j] * 100 < 7 ? "small" : "16"
    }'>${score}</span></td>`;
  }

  for (let j = words.length; j < maxNumTokens; j++) {
    heat_text += "<td />";
  }

  rows += heat_text + "</tr>";

  rows += "</table></tbody></div>";
  return rows;
};
