const d3 = window.d3;

export const drawNumPostsOverTime = (data) => {
  // grouped by minute by server
  // https://bl.ocks.org/gordlea/27370d1eea8464b04538e6d8ced39e89
  // 2. Use the margin convention practice
  var margin = { top: 50, right: 50, bottom: 50, left: 50 },
    width = window.innerWidth - margin.left - margin.right, // Use the window's width
    height =
      document.querySelector(".drawer").clientHeight / 2 -
      margin.top -
      margin.bottom; // Use the window's height

  var parseTime = d3.timeParse("%m/%d/%Y, %H:%M:%S");

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
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%m/%d/%Y, %H:%M")))
    .selectAll(".x-axis text") // https://bl.ocks.org/d3noob/ecf9e1ddeb48d0c4fbb29d03c08660bb
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)"); // Create an axis component with d3.axisBottom

  // 4. Call the y axis in a group tag
  svg.append("g").attr("class", "y axis").call(d3.axisLeft(yScale)); // Create an axis component with d3.axisLeft

  // 9. Append the path, bind the data, and call the line generator
  svg
    .append("path")
    .datum(dataset) // 10. Binds data to the line
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
    .attr("r", 5)
    .on("mouseover", function (d, i) {
      d3.select(`#dot-${i}`).attr("class", "focus");
    })
    .on("mouseout", function (d, i) {
      d3.select(`#dot-${i}`).classed("focus", false);
    });
};
