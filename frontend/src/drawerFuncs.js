import makeDistroChart from "./distrochart";
const d3 = window.d3;

const DRAWER_HEIGHT_FACTOR = 3;

export const drawNumPostsOverTime = (data, setCurrGraphTime) => {
  // grouped by minute by server
  // https://bl.ocks.org/gordlea/27370d1eea8464b04538e6d8ced39e89
  var margin = { top: 50, right: 50, bottom: 150, left: 50 },
    width = window.innerWidth - margin.left - margin.right, // Use the window's width
    height =
      document.querySelector(".drawer").clientHeight /
        (DRAWER_HEIGHT_FACTOR + 1) -
      margin.top -
      margin.bottom; // Use the window's height
  var parseTime = d3.utcParse("%m/%d/%Y, %H:%M:%S");

  // 5. X scale will use the timestamps of our data
  var xScale = d3
    .scaleTime()
    .domain([
      parseTime(data.times[0]),
      parseTime(data.times[data.times.length - 1]),
    ]) // input
    .range([0, width]);

  // 6. Y scale will use the randomly generate number
  var yScale = d3
    .scaleLinear()
    .domain([data.range[0], data.range[1]]) // input
    .range([height, 0]); // output

  // 7. d3's line generator
  var line = d3
    .line()
    .x(function (d, i) {
      return xScale(d.x);
    }) // set the x values for the line generator
    .y(function (d, i) {
      return yScale(d.y);
    }); // set the y values for the line generator

  // 8.
  var dataset = data.times.map(function (d, i) {
    return {
      x: parseTime(d),
      y: data.sizes[i],
    };
  });

  // 1. Add the SVG to the page and employ #2
  const existing_svg = d3.select("#num-posts").select("svg");
  if (existing_svg["_groups"][0][0]) existing_svg.remove();

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
  svg
    .append("path")
    .datum(dataset) // 10. Binds data to the line
    .attr("stroke", "url(#line-gradient)")
    .attr("class", "line") // Assign a class for styling
    .attr("d", line); // 11. Calls the line generator

  // 12. Appends a circle for each datapoint
  svg
    .selectAll(".dot")
    .data(dataset)
    .enter()
    .append("circle") // Uses the enter().append() method
    .attr("class", "dot") // Assign a class for styling
    .attr("id", function (d, i) {
      return `dot-${i}`;
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
      d3.select(`#dot-${i}`).attr("class", "focus");
    })
    .on("mouseout", function (d, i) {
      d3.select(`#dot-${i}`).classed("focus", false);
    });
};

export const drawLeftRightPie = (data) => {
  // https://www.d3-graph-gallery.com/graph/pie_basic.html
  var margin = { top: 50, right: 0, bottom: 0, left: 50 },
    width = window.innerWidth - margin.left - margin.right, // Use the window's width
    height =
      document.querySelector(".drawer").clientHeight /
        (DRAWER_HEIGHT_FACTOR * 1.5) -
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

export const drawPolarityOverAllTime = (chart1, data) => {
  var margin = { top: 50, right: 10, bottom: 50, left: 10 },
    width = window.innerWidth - margin.left - margin.right, // Use the window's width
    height =
      document.querySelector(".drawer").clientHeight /
        (DRAWER_HEIGHT_FACTOR + 1) -
      margin.top -
      margin.bottom; // Use the window's height

  chart1.current = makeDistroChart({
    data: data.res,
    xName: "qtr",
    yName: "polarity",
    axisLabels: { xAxis: null, yAxis: "Posts' Quarterly Polarity" },
    selector: "#polarity-over-all-time",
    chartSize: { height, width },
    constrainExtremes: true,
  });

  chart1.current.renderBoxPlot();
  chart1.current.renderDataPlots();
  chart1.current.renderNotchBoxes({ showNotchBox: false });
  chart1.current.renderViolinPlot({ showViolinPlot: false });
};

export const drawAttentionWeights = () => {
  // credit to Patricia for this part's skeleton

  const post = [
    [
      "abortion",
      "access",
      "is",
      "health",
      "care",
      "period",
      "as",
      "co-chair",
      "of",
      "the",
      "pro-choice",
      "caucus",
      "i",
      "will",
      "fight",
      "any",
      "attempt",
      "to",
      "interfere",
      "in",
      "a",
      "woman's",
      "constitutional",
      "right",
      "to",
      "choose",
      "#sotu",
    ],
    [
      "being",
      "pro-life",
      "is",
      "wanting",
      "the",
      "most",
      "for",
      "women",
      "and",
      "their",
      "children",
      "it",
      "is",
      "recognizing",
      "every",
      "person",
      "deserves",
      "a",
      "chance",
      "to",
      "live",
      "#whywemarch",
    ],
  ];

  var trigram_weights = [
    [
      0.11000392350720457, 0.027753256063696836, 0.0, 0.01698094704034859,
      0.00040684266706241375, 0.022323664106730277, 0.0, 0.4905698025174466,
      0.0, 0.0, 0.2888449640949988, 0.016011572708793265, 0.005453279524286329,
      0.0, 0.0, 0.0, 0.001411262989865475, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      0.009968161550774558, 0.0, 0.0, 0.010272323228792273,
    ],
    [
      0.0, 0.07315461940729052, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0739448001194151,
      0.0, 0.0, 0.013475237893787894, 0.0, 0.0, 0.0, 0.0, 0.02260653998362492,
      0.0, 0.0, 0.01404085112697572, 0.0, 0.0, 0.8027779514689058,
    ],
  ];

  var polarity_scores = [
    [
      1.19, -3.98, -0.16, -5.94, -2.34, -0.35, 0.44, 0.39, 0.59, 1.05, -2.65,
      -3.79, 0.92, 1.12, -5.24, 0.98, -2.91, -0.02, -2.24, 0.25, -0.66, -8.36,
      4.22, -0.42, -0.02, -1.4, 3.8,
    ],
    [
      -0.08, 16.87, -0.16, 5.4, 1.05, 1.0, 0.14, -5.04, 0.88, -0.26, -6.58,
      -0.3, -0.16, 1.51, -4.36, -1.4, -4.22, -0.66, -1.29, -0.02, -0.64, 4.92,
    ],
  ];

  var sentence_scores = [-0.369, 1.832];

  const color = "10,180,120";
  const maxNumTokens = Math.max(...trigram_weights.map((x) => x.length));

  let rows = `<tbody><tr style='background-color:#dddddd'><th>Tweet<br />Score</th><th colspan=${maxNumTokens}>Attention Weight</th></tr></tbody><tbody>`;

  for (let k = 0; k < post.length; k++) {
    // each line
    // whole tweet's polarity score + tweet sentence
    rows += "<tr>";

    const tokens = post[k];

    var heat_text = "<td>" + sentence_scores[k] + "</td>";

    for (let i = 0; i < tokens.length; i++) {
      heat_text +=
        "<td><span style='background-color:rgba(" +
        color +
        "," +
        trigram_weights[k][i] * 15 +
        ")'>" +
        tokens[i] +
        "</span></td>";
    }

    rows += heat_text + "</tr><tr>";

    // polarity scores line

    heat_text = "<th>Polarity</th>";
    for (let j = 0; j < polarity_scores[k].length; j++) {
      const score = polarity_scores[k][j];
      heat_text += `<td><span style='font-size:${
        trigram_weights[k][j] * 100 < 7 ? "small" : "16"
      }'>${score}</span></td>`;
    }

    for (let j = tokens.length; j < maxNumTokens; j++) {
      heat_text += "<td />";
    }

    rows += heat_text + "</tr>";
  }
  rows += "</tbody>";
  document.getElementById("attention-weights").innerHTML += rows;
};
