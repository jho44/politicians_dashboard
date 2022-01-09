import React, { useEffect, useCallback, useState } from "react";
import "./Timeline.css";
const d3 = window.d3;

const COEFF = 1000 * 60; // for time step

const Timeline = ({ type }) => {
  const width = window.innerWidth;
  const height = window.innerHeight / 2;

  const margin = { top:0, left:20, bottom:0, right:20 };

  const chartWidth = width - (margin.left+margin.right);
  const chartHeight = height - (margin.top+margin.bottom);

  let simulation, node, link, labels;

  // https://www.dofactory.com/javascript/design-patterns/singleton
  const Singleton = (function() {
    let instance;

    async function createInstance() {
      const nodes = {};

      return d3.csv(`http://localhost:5000/flask`)
        .then(function(rows) {
          return rows.map((d) => {
            const thisMinute = Math.round(d.timestamp / COEFF) * COEFF;
            nodes[`${d.account_id}.${thisMinute}`] = {
              label: +d.account_id,
              time: thisMinute,
            }

            // link with whom they're liked by
            if (d.liked_by) {
              nodes[`${+d.liked_by}.${thisMinute}`] = {
                label: +d.liked_by,
                time: thisMinute,
              };

              nodes[`${d.account_id}.${thisMinute}`].collapsed = true;
              nodes[`${d.account_id}.${thisMinute}`].liked_by = +d.liked_by;

              return {
                time: thisMinute,
                source: nodes[`${d.account_id}.${thisMinute}`],
                target: nodes[`${d.liked_by}.${thisMinute}`],
              };
            }
            return null
          });
        })
        .then(function(links) {
          return { nodes: Object.values(nodes), nodeKeys: Object.keys(nodes) };
        });
    }

    return {
      getInstance: async function () {
        if (!instance) {
          instance = await createInstance();
        }
        return instance;
      }
    };
  })();

  const GlobalAdaptor = (function() {
    let instance;

    async function createInstance() {
      const instance1 = await Singleton.getInstance();
      const {links, nodes} = instance1;
      return new Adaptor(links, nodes);
    }

    return {
      getInstance: async function () {
        if (!instance) {
          instance = await createInstance();
        }
        return instance;
      }
    };
  })();

  class Adaptor {
    constructor(links, nodes) {
      this.activeChildLinks = {};
      this.activeChildNodes = {};
      this.parentNodes = [];
      this.parentLabels = new Set();
    }

    get nodes() {
      const kids = new Set(Object.values(this.activeChildNodes).flat());
      return this.parentNodes.concat(Array.from(kids));
    }

    get links() {
      return Object.values(this.activeChildLinks);
    }

    /*
      Upon moving slider, finds posts created at the nearest minute to the
      slider's current time h.
    */
    async update(h) {
      const nearestMin = Math.round(h / COEFF) * COEFF;
      console.log(nearestMin)

      const instance = await Singleton.getInstance();

      this.parentNodes = instance.nodes.filter(function(d) {
        return d.time == nearestMin && d.liked_by; // only show nodes that have a liked_by
      });

      this.parentLabels = new Set(this.parentNodes.map((x) => x.label));

      this.activeChildNodes = {};
      this.activeChildLinks = {};

      return { nodes: this.parentNodes, links: [] };
    }

    async addChildrenOf(d) {
      const { nodes, nodeKeys } = await Singleton.getInstance();
      console.log(d.label, d.liked_by)

      if (d.label == d.liked_by) {
        this.activeChildLinks[d.label] = {
          source: d,
          target: d,
        };
        return;
      }

      const childIndex = nodeKeys.indexOf(`${d.liked_by}.${d.time}`);
      /*
        problem when the liked_by node is a parent node with a liked_by of its own in the same time step
        a
          liked_by: b
        b
          liked_by: a
        only if the liked_by node isn't already existing in this current instance of time as a parent node
        do we want to create a new node
      */

      if (!this.activeChildNodes[d.liked_by]) {
        this.activeChildNodes[d.label] = nodes[childIndex];

        this.activeChildLinks[d.label] = {
          source: d,
          target: nodes[childIndex],
        };
      } else {
        this.activeChildLinks[d.label] = {
          source: d,
          target: this.activeChildNodes[d.liked_by],
        };
      }
    }

    removeChildrenOf(nodeLabel) {
      delete this.activeChildNodes[nodeLabel];
      delete this.activeChildLinks[nodeLabel];
    }
  }

  const drawChart = useCallback((activeNodes, activeLinks) => {
    simulation = d3.forceSimulation(activeNodes)
    .force("link", d3.forceLink(activeLinks).id(function(d) { return d.index }).distance(200))
    .force("center", d3.forceCenter(chartWidth / 2, chartHeight / 2))
    .on("tick", ticked);

    // https://bl.ocks.org/d3noob/5141278
    // build the arrow.
    d3.select(".chart").append("svg:defs").selectAll("marker")
        .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .attr("fill", "#999")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    updateChart(activeNodes, activeLinks);

    function ticked() {
      link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

      node
        .attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
    }
  }, []);

  const drawSlider = useCallback(async () => {
    const {nodes, links} = await Singleton.getInstance();
    var moving = false;
    var timer = null;
    var currentValue = 0;
    var targetValue = width;
    var startDate = new Date(nodes[nodes.length-1].time),
      endDate = new Date(nodes[0].time);

    var playButton = d3.select("#play-button");

    var x = d3.scaleTime()
        .domain([startDate, endDate])
        .range([0, targetValue])
        .clamp(true);

    var slider = d3.select("#slider-section").append("g")
        .attr("class", "slider")

    async function update(h) {
      // update position and text of label according to slider scale
      handle.attr("cx", x(h));
      label
        .attr("x", x(h))
        .text(d3.timeFormat("%b %d %Y")(h));

      const adaptor = await GlobalAdaptor.getInstance();
      const { nodes, links } = await adaptor.update(h) // have adaptor return the new nodes and new links
      // redraw plot
      drawChart(nodes, links);
    }

    slider.append("line")
        .attr("class", "track")
        .attr("x1", x.range()[0])
        .attr("x2", x.range()[1])
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-inset")
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt(); })
            .on("start drag", function() {
              currentValue = d3.event.x;
              update(x.invert(currentValue));
            })
        );

    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + 18 + ")")
        .selectAll("text")
        .data(x.ticks(10))
        .enter()
        .append("text")
        .attr("x", x)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .text(function(d) { return  d3.timeFormat("%m/%d %H:%M")(d); });

    var handle = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr("r", 9);

    var label = slider.append("text")
        .attr("class", "label")
        .attr("text-anchor", "middle")
        .text(d3.timeFormat("%b %d %Y")(startDate))
        .attr("transform", "translate(0," + (-25) + ")")

    const sliderWidth = d3.select('.slider').node().getBoundingClientRect().width;
    slider.attr("transform", `translate(${(width - sliderWidth*0.8) / 2 + margin.right},${height/5}) scale(0.8)`);

    playButton
      .on("click", function() {
      var button = d3.select(this);
      if (button.text() == "Pause") {
        moving = false;
        clearInterval(timer);
        // timer = 0;
        button.text("Play");
      } else {
        moving = true;
        timer = setInterval(step, 100);
        button.text("Pause");
      }
    }, []);

    function step() {
      update(x.invert(currentValue));
      currentValue = currentValue + (targetValue/151);
      if (currentValue > targetValue) {
        moving = false;
        currentValue = 0;
        clearInterval(timer);
        // timer = 0;
        playButton.text("Play");
      }
    }
  }, [GlobalAdaptor, Singleton, drawChart, height, margin.left, width]);

  function updateChart(activeNodes, activeLinks) {
    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    async function click(d) {
      if (d3.event.defaultPrevented) return; // ignore drag

      if (d.liked_by) {
        const adaptor = await GlobalAdaptor.getInstance();
        if (d.collapsed) { // want to show its neighbors
          await adaptor.addChildrenOf(d);
        } else { // want to hide its neighbors
          adaptor.removeChildrenOf(d.label);
        }
        d.collapsed = !d.collapsed;
        updateChart(adaptor.nodes, adaptor.links);
      }
    }

    link = d3.select(".chart")
      .attr("marker-end", "url(#end)")
      .selectAll("line.link")
      .data(activeLinks);

    link.exit().remove();

    const linkEnter = link.enter()
      .append('line')
      .attr('class', 'link');

    link = linkEnter.merge(link);

    node = d3.select(".chart")
      .selectAll(".nodes")
      .data(activeNodes, function(d) { return `${d.label}.${d.time}`; });

    node.exit().remove();

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "nodes")
      .on("mouseover", function(d) {
        if (labels["_groups"][0][d.index]["label"] == d.label)
          d3.select(labels["_groups"][0][d.index]).style("visibility","visible")
        else {
          let desiredIndex;
          Array.from(labels["_groups"][0], function(x, ind) {
            if (x.__data__.label == d.label) desiredIndex = ind;
          });
          d3.select(labels["_groups"][0][desiredIndex]).style("visibility","visible")
        }})
      .on("mouseout", function(d) {
        if (labels["_groups"][0][d.index]["label"] == d.label)
          d3.select(labels["_groups"][0][d.index]).style("visibility","hidden")
        else {
          let desiredIndex;
          Array.from(labels["_groups"][0], function(x, ind) {
            if (x.__data__.label == d.label) desiredIndex = ind;
          });
          d3.select(labels["_groups"][0][desiredIndex]).style("visibility","hidden")
        }})
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

    nodeEnter.append("circle")
      .attr("r", 10)
      .on("click", click);

    nodeEnter.append("text")
      .text(function(d) {
        return d.label;
      })
      .attr('x', 6)
      .attr('y', 3)
      .attr('class', 'mylabel')
      .style("visibility", "hidden");

    labels = d3.select(".chart").selectAll("text.mylabel");

    node = nodeEnter.merge(node);
    simulation.nodes(activeNodes);
    simulation.force('link').links(activeLinks);
  }

  useEffect(() => {
    drawSlider();
    drawChart([], []);
  }, [drawSlider, drawChart]); // Redraw chart if data changes

  return (
    <div id="graph">
      <div id="btn-section">
        <button id="play-button">Play</button>
      </div>
      <svg
        id="slider-section"
        preserveAspectRatio="xMinYMin meet"
        viewBox={`0 0 ${width} ${height}`}
      >
      </svg>

      <div className="chart-container" id="container">
        <svg
          className="chart"
          preserveAspectRatio="xMinYMin meet"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        ></svg>
      </div>
    </div>
  );
};

export default Timeline;