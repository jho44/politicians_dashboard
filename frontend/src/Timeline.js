import React, { useEffect, useCallback, useMemo, useRef } from "react";
import classNames from "classnames";
import "./Timeline.css";
import { RELATIONSHIPS } from "./constants";

const d3 = window.d3;

const COEFF = 1000 * 60; // for time step

const Timeline = ({ openDrawer, handleNodeClick, timelineRelation, users }) => {
  const width = window.innerWidth;
  const height = window.innerHeight / 2;

  const margin = { top: 0, left: 20, bottom: 0, right: 20 };

  const chartWidth = width - (margin.left + margin.right);
  const chartHeight = height - (margin.top + margin.bottom);

  let simulation, node, link, labels;

  const GlobalAdaptor = useRef();
  const propertyName = useRef("retweet_from");
  const usersSize = useRef(0);

  // for keeping track of nodes and links between user input changes
  const activeChildLinks = useRef({});
  const activeChildNodes = useRef({});
  const parentNodes = useRef([]);
  const parentLabels = useRef(new Set());
  const currTime = useRef(0);

  const inst = useMemo(() => {
    const nodes = {};

    return d3
      .csv("http://localhost:5000/flask?type=whole")
      .then(function (rows) {
        rows.forEach((d) => {
          const thisMinute = Math.round(d.timestamp / COEFF) * COEFF;
          nodes[`${d.account_id}.${thisMinute}`] = {
            label: d.account_id,
            time: thisMinute,
          };

          // link with whom they have a certain relationship with
          const relationship = d[propertyName.current];

          if (relationship) {
            const relations = relationship.split(",");

            /**
             * different csvs have different dtypes for the same columns
             * specifically, some are ints while others are floats that look like xxxx.0
             * and others are strings meant to rep lists of ints
             * doing this mapping to int_relations just standardizes everything
             */
            const int_relations = relations.map((relator) => {
              const relation = relator.split(".")[0];
              nodes[`${relation}.${thisMinute}`] = {
                label: relation,
                time: thisMinute,
              };
              return relation;
            });

            nodes[`${d.account_id}.${thisMinute}`].collapsed = true;
            nodes[`${d.account_id}.${thisMinute}`][propertyName.current] =
              int_relations;
          }
        });
      })
      .then(function () {
        return { nodes: Object.values(nodes), nodeKeys: Object.keys(nodes) };
      });
  }, [timelineRelation]);

  useEffect(() => {
    class Adaptor {
      constructor() {
        this.activeChildLinks = activeChildLinks.current;
        this.activeChildNodes = activeChildNodes.current;
        this.parentNodes = parentNodes.current;
        this.parentLabels = parentLabels.current;
        this.time = currTime.current;
      }

      get currTime() {
        return this.time;
      }

      get nodes() {
        const kids = new Set(Object.values(this.activeChildNodes).flat());
        return this.parentNodes.concat(Array.from(kids));
      }

      get links() {
        return Object.values(this.activeChildLinks).flat();
      }

      /*
        Upon moving slider, finds posts created at the nearest minute to the
        slider's current time h.
      */
      async update(h) {
        const nearestMin = Math.round(h / COEFF) * COEFF;
        this.time = nearestMin;
        currTime.current = nearestMin;
        console.log(nearestMin);

        const instance = await inst;

        this.parentNodes = instance.nodes.filter(function (d) {
          const relation = d[propertyName.current];
          const currNodesWithRelation = d.time == nearestMin && relation; // only show nodes that have a relationship

          if (users.size) {
            // filter users
            return currNodesWithRelation && users.has(d.label);
          } else return currNodesWithRelation;
        });

        this.parentLabels = new Set(this.parentNodes.map((x) => x.label));

        this.activeChildNodes = {};
        this.activeChildLinks = {};

        parentNodes.current = this.parentNodes;
        parentLabels.current = this.parentLabels;
        activeChildLinks.current = this.activeChildLinks;
        activeChildNodes.current = this.activeChildNodes;

        return { nodes: this.parentNodes, links: [] };
      }

      async addChildrenOf(d) {
        const { nodes, nodeKeys } = await inst;
        const relation = d[propertyName.current];
        console.log(d.label, relation);

        relation.forEach((childId) => {
          if (d.label == childId) {
            const newLink = {
              source: d,
              target: d,
            };

            if (!this.activeChildLinks[d.label]) {
              this.activeChildLinks[d.label] = [newLink];
            } else {
              this.activeChildLinks[d.label].push(newLink);
            }
            return;
          }
          const childIndex = nodeKeys.indexOf(`${childId}.${d.time}`);

          /*
            problem when the liked_by node is a parent node with a liked_by of its own in the same time step
            a
              liked_by: b
            b
              liked_by: a
            only if the liked_by node isn't already existing in this current instance of time as a parent node
            do we want to create a new node
          */

          if (!this.activeChildNodes[childId]) {
            if (!this.activeChildNodes[d.label])
              this.activeChildNodes[d.label] = [nodes[childIndex]];
            else this.activeChildNodes[d.label].push(nodes[childIndex]);

            const newLink = {
              source: d,
              target: nodes[childIndex],
            };

            if (!this.activeChildLinks[d.label]) {
              this.activeChildLinks[d.label] = [newLink];
            } else {
              this.activeChildLinks[d.label].push(newLink);
            }
          } else {
            const newLink = {
              source: d,
              target: this.activeChildNodes[childId],
            };

            if (!this.activeChildLinks[d.label]) {
              this.activeChildLinks[d.label] = [newLink];
            } else {
              this.activeChildLinks[d.label].push(newLink);
            }
          }
        });

        activeChildLinks.current = this.activeChildLinks;
        activeChildNodes.current = this.activeChildNodes;
      }

      removeChildrenOf(nodeLabel) {
        delete this.activeChildNodes[nodeLabel];
        delete this.activeChildLinks[nodeLabel];
        activeChildLinks.current = this.activeChildLinks;
        activeChildNodes.current = this.activeChildNodes;
      }
    }

    GlobalAdaptor.current = (function () {
      let instance;

      async function createInstance() {
        const instance1 = await inst;
        const { nodes } = instance1;
        return new Adaptor(nodes);
      }

      return {
        getInstance: async function () {
          if (!instance) {
            instance = await createInstance();
          }
          return instance;
        },
      };
    })();
  }, [inst, timelineRelation, users.size]);

  const drawChart = useCallback(
    (activeNodes, activeLinks) => {
      simulation = d3
        .forceSimulation(activeNodes)
        .force(
          "link",
          d3
            .forceLink(activeLinks)
            .id(function (d) {
              return d.index;
            })
            .distance(200)
        )
        .force("center", d3.forceCenter(chartWidth / 2, chartHeight / 2))
        .on("tick", ticked);

      // http://bl.ocks.org/d3noob/5141278
      // build the arrow.
      d3.select(".chart")
        .append("svg:defs")
        .selectAll("marker")
        .data(["end"]) // Different link/path types can be defined here
        .enter()
        .append("svg:marker") // This section adds in the arrows
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
          .attr("x1", function (d) {
            return d.source.x;
          })
          .attr("y1", function (d) {
            return d.source.y;
          })
          .attr("x2", function (d) {
            return d.target.x;
          })
          .attr("y2", function (d) {
            return d.target.y;
          });

        node.attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
      }
    },
    [users.size]
  );

  const drawSlider = useCallback(async () => {
    const { nodes } = await inst;
    var moving = false;
    var timer = null;
    var currentValue = 0;
    var targetValue = width;
    var startDate = new Date(nodes[nodes.length - 1].time),
      endDate = new Date(nodes[0].time);

    var playButton = d3.select("#play-button");

    var x = d3
      .scaleTime()
      .domain([startDate, endDate])
      .range([0, targetValue])
      .clamp(true);

    d3.select("#slider-section > g").remove();
    var slider = d3
      .select("#slider-section")
      .append("g")
      .attr("class", "slider");

    async function update(h) {
      // update position and text of label according to slider scale
      handle.attr("cx", x(h));
      label.attr("x", x(h)).text(d3.timeFormat("%b %d %Y")(h));

      const adaptor = await GlobalAdaptor.current.getInstance();
      const { nodes, links } = await adaptor.update(h); // have adaptor return the new nodes and new links
      // redraw plot
      console.log("draw D");
      drawChart(nodes, links);
    }

    slider
      .append("line")
      .attr("class", "track")
      .attr("x1", x.range()[0])
      .attr("x2", x.range()[1])
      .select(function () {
        return this.parentNode.appendChild(this.cloneNode(true));
      })
      .attr("class", "track-inset")
      .select(function () {
        return this.parentNode.appendChild(this.cloneNode(true));
      })
      .attr("class", "track-overlay")
      .call(
        d3
          .drag()
          .on("start.interrupt", function () {
            slider.interrupt();
          })
          .on("start drag", function () {
            currentValue = d3.event.x;
            update(x.invert(currentValue));
          })
      );

    slider
      .insert("g", ".track-overlay")
      .attr("class", "ticks")
      .attr("transform", "translate(0," + 18 + ")")
      .selectAll("text")
      .data(x.ticks(10))
      .enter()
      .append("text")
      .attr("x", x)
      .attr("y", 10)
      .attr("text-anchor", "middle")
      .text(function (d) {
        return d3.timeFormat("%m/%d %H:%M")(d);
      });

    var handle = slider
      .insert("circle", ".track-overlay")
      .attr("class", "handle")
      .attr("r", 9);

    var label = slider
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .text(d3.timeFormat("%b %d %Y")(startDate))
      .attr("transform", "translate(0," + -25 + ")");

    const sliderWidth = d3
      .select(".slider")
      .node()
      .getBoundingClientRect().width;
    slider.attr(
      "transform",
      `translate(${(width - sliderWidth * 0.8) / 2 + margin.right},${
        height / 5
      }) scale(0.8)`
    );

    playButton.on(
      "click",
      function () {
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
      },
      []
    );

    function step() {
      update(x.invert(currentValue));
      currentValue = currentValue + targetValue / 151;
      if (currentValue > targetValue) {
        moving = false;
        currentValue = 0;
        clearInterval(timer);
        // timer = 0;
        playButton.text("Play");
      }
    }
  }, [drawChart, height, width, margin.right, inst]);

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

    link = d3
      .select(".chart")
      .attr("marker-end", "url(#end)")
      .selectAll("line.link")
      .data(activeLinks);

    link.exit().remove();

    const linkEnter = link.enter().append("line").attr("class", "link");

    link = linkEnter.merge(link);

    node = d3
      .select(".chart")
      .selectAll(".nodes")
      .data(activeNodes, function (d) {
        return `${d.label}.${d.time}`;
      });

    node.exit().remove();

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "nodes")
      .on("mouseover", function (d) {
        if (labels["_groups"][0][d.index]["label"] == d.label)
          d3.select(labels["_groups"][0][d.index]).style(
            "visibility",
            "visible"
          );
        else {
          let desiredIndex;
          Array.from(labels["_groups"][0], function (x, ind) {
            if (x.__data__.label == d.label) desiredIndex = ind;
          });
          d3.select(labels["_groups"][0][desiredIndex]).style(
            "visibility",
            "visible"
          );
        }
      })
      .on("mouseout", function (d) {
        if (labels["_groups"][0][d.index]["label"] == d.label)
          d3.select(labels["_groups"][0][d.index]).style(
            "visibility",
            "hidden"
          );
        else {
          let desiredIndex;
          Array.from(labels["_groups"][0], function (x, ind) {
            if (x.__data__.label == d.label) desiredIndex = ind;
          });
          d3.select(labels["_groups"][0][desiredIndex]).style(
            "visibility",
            "hidden"
          );
        }
      })
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    nodeEnter.append("circle").attr("r", 10).on("click", click);

    nodeEnter
      .append("text")
      .text(function (d) {
        return d.label;
      })
      .attr("x", 6)
      .attr("y", 3)
      .attr("class", "mylabel")
      .style("visibility", "hidden");

    labels = d3.select(".chart").selectAll("text.mylabel");

    node = nodeEnter.merge(node);
    simulation.nodes(activeNodes);
    simulation.force("link").links(activeLinks);
  }

  async function click(d) {
    if (d3.event.defaultPrevented) return; // ignore drag
    handleNodeClick(d.label);

    const relation = d[propertyName.current];
    if (relation) {
      const adaptor = await GlobalAdaptor.current.getInstance();
      if (d.collapsed) {
        // want to show its neighbors
        await adaptor.addChildrenOf(d);
      } else {
        // want to hide its neighbors
        adaptor.removeChildrenOf(d.label);
      }
      d.collapsed = !d.collapsed;
      updateChart(adaptor.nodes, adaptor.links);
    }
  }

  useEffect(() => {
    const relation =
      timelineRelation === RELATIONSHIPS[0]
        ? "mention"
        : timelineRelation === RELATIONSHIPS[1]
        ? "retweet_from"
        : "liked_by";

    if (relation != propertyName.current) {
      propertyName.current = relation;
      drawSlider();
      console.log("draw A");
      drawChart([], []);
    } else if (users.size != usersSize.current) {
      usersSize.current = users.size;
      GlobalAdaptor.current
        .getInstance()
        .then((adaptor) => {
          const time = adaptor.currTime;
          return adaptor.update(time); // have adaptor return the new nodes and new links
        })
        .then(({ nodes, links }) => {
          // redraw plot
          console.log("draw B");
          drawChart(nodes, links);
        });
    } else {
      if (!d3.select("#slider-section > g")._groups[0][0]) {
        drawSlider();
        console.log("draw C");
        drawChart([], []);
      }
    }
  }, [drawSlider, drawChart, timelineRelation, users.size]); // Redraw chart if data changes

  return (
    <div id="graph" className={classNames("timeline", openDrawer && "moveup")}>
      <div id="btn-section">
        <button id="play-button">Play</button>
      </div>
      <svg
        id="slider-section"
        preserveAspectRatio="xMinYMin meet"
        viewBox={`0 0 ${width} ${height}`}
      ></svg>

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
