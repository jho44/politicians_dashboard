import "./styles/App.css";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Charts from "./components/Charts";
import ReactLoading from "react-loading";
import {
  drawLeftRightPie,
  drawNumPostsOverTime,
  drawPolarityOverAllTime,
  drawAttentionWeights,
} from "./util/drawerFuncs";
import "./styles/distrochart.css";
import Timeline from "./components/Timeline";
import { ApplySettingsBtn } from "./components/ApplySettingsBtn";
import { ControlPanel } from "./components/ControlPanel";
import { NewPostPolarity } from "./components/NewPostPolarity";
import { RELATIONSHIPS, MAIN_COLOR } from "./constants";

/**
 * Describes the overall structure of the page and handles children components' states and state setters.
 * @class
 */
function App() {
  const [timelineRelation, setTimelineRelation] = useState({
    value: RELATIONSHIPS[0],
    label: RELATIONSHIPS[0],
  });
  const [openDrawer, setOpenDrawer] = useState(false);
  const [accId, setAccId] = useState();
  const [currGraphTime, setCurrGraphTime] = useState();

  const [dates, setDates] = useState([
    {
      startDate: new Date(),
      endDate: null,
      key: "selection",
    },
  ]);
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null,
  });

  const distrochartRef = useRef();

  const handleCloseClick = () => {
    setOpenDrawer(false);
  };

  const [attnWeightsChartLoading, setAttnWeightsChartLoading] = useState(true);
  const [numPostsOverTimeLoading, setNumPostsOverTimeLoading] = useState(true);
  const [leftRightPostsLoading, setLeftRightPostsLoading] = useState(true);
  const [postPolarityChartLoading, setPostPolarityChartLoading] =
    useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);

  /**
   * Opens/closes the drawer showing all sorts of stats on clicked node (Tweet).
   * Sends asynchronous HTTP requests to the backend to get these stats.
   * The children components of said drawer are in the `frontend/src/components` directory.
   *
   * Drawer's contents will contain data for selected account's:
   *  - number of and polarity score of posts over time -> line chart
   *  - left vs right posts -> pie chart
   *  - post polarity of tweets over time, grouped by quarter of the year -> box plots, violin charts, bean plots
   *
   * @param {String} username The Twitter user that'd just been selected/clicked on in the `Timeline` graph.
   * @param {Number} start The start of the default or user-specified date range on the dataset that should be displayed.
   * @param {Number} end The end of the default or user-specified date range on the dataset that should be displayed.
   * @param {Number} currTime The time corresponding to the clicked node (Tweet).
   */
  const handleNodeClick = (username, start, end, currTime) => {
    setAccId(username);
    setOpenDrawer(true);
    setAttnWeightsChartLoading(true);
    setNumPostsOverTimeLoading(true);
    setLeftRightPostsLoading(true);
    setPostPolarityChartLoading(true);

    fetch(
      `http://localhost:5000/flask?type=attn_weights&username=${username}&curr_time=${currTime}`
    )
      .then((res) => res.json())
      .then((res) => {
        if (!res) {
          document.getElementById("attention-weights").innerHTML =
            "<h3>A tweet was not associated with the node you just clicked.</h3>";
        } else {
          let allPostsHTML = "";
          for (const relationship of RELATIONSHIPS) {
            let html = `<h3>${relationship}</h3>`;
            for (const post of res[relationship]) {
              const rows = drawAttentionWeights(post);
              html += rows;
            }
            allPostsHTML += html;
          }
          document.getElementById("attention-weights").innerHTML = allPostsHTML;
        }
        setAttnWeightsChartLoading(false);
      })
      .catch((err) => console.error(err));

    fetch(
      start && end
        ? `http://localhost:5000/flask?type=num_posts_over_time&username=${username}&start_date=${start}&end_date=${end}`
        : `http://localhost:5000/flask?type=num_posts_over_time&username=${username}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawNumPostsOverTime(res, setCurrGraphTime);
        setNumPostsOverTimeLoading(false);
      })
      .catch((err) => console.error(err));

    fetch(
      start && end
        ? `http://localhost:5000/flask?type=num_left_right_posts&username=${username}&start_date=${start}&end_date=${end}`
        : `http://localhost:5000/flask?type=num_left_right_posts&username=${username}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawLeftRightPie(res);
        setLeftRightPostsLoading(false);
      })
      .catch((err) => console.error(err));

    fetch(`http://localhost:5000/flask?type=post_polarity&username=${username}`)
      .then((res) => res.json())
      .then((res) => {
        drawPolarityOverAllTime(distrochartRef, res);
        setPostPolarityChartLoading(false);
      })
      .catch((err) => console.error(err));
  };

  const [usersList, setUsersList] = useState([]);

  const [selectedUsers, setSelectedUsers] = useState([]);

  const [timelineAux, setTimelineAux] = useState({
    selectedDateTimes: dates,
    timelineRelation: timelineRelation.value,
    users: new Set(selectedUsers.map((x) => x.label)),
  });

  const [selectedTime, setSelectedTime] = useState({
    start: "00:00",
    end: "23:59",
  });

  const handleTimeChange = useCallback((time) => {
    setSelectedTime(time);
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/flask?type=usernames")
      .then((response) => response.json())
      .then((res) => {
        setUsersList(
          res.usernames.map((accId) => ({
            value: accId,
            label: accId,
          }))
        );
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const selectStyles = {
    control: (styles) => ({ ...styles, borderRadius: 0, width: "100%" }),
  };

  return (
    <div className="App centered-column">
      <header className="App-header">
        <p>Politician Twitter Activity</p>
      </header>
      <NewPostPolarity />

      {dateRange.start ? (
        <>
          <ControlPanel
            timelineRelation={timelineRelation}
            setTimelineRelation={setTimelineRelation}
            dateRange={dateRange}
            dates={dates}
            setSelectedUsers={setSelectedUsers}
            setDates={setDates}
            selectStyles={selectStyles}
            selectedTime={selectedTime}
            handleTimeChange={handleTimeChange}
            usersList={usersList}
            selectedUsers={selectedUsers}
          />
          <ApplySettingsBtn
            setTimelineLoading={setTimelineLoading}
            setTimelineAux={setTimelineAux}
            dates={dates}
            selectedUsers={selectedUsers}
            timelineRelation={timelineRelation}
            selectedTime={selectedTime}
            timelineLoading={timelineLoading}
          />
          <Charts
            openDrawer={openDrawer}
            accId={accId}
            distrochartRef={distrochartRef}
            handleCloseClick={handleCloseClick}
            loading={
              attnWeightsChartLoading ||
              numPostsOverTimeLoading ||
              leftRightPostsLoading ||
              postPolarityChartLoading
            }
          />
        </>
      ) : (
        <ReactLoading
          type={"cylon"}
          color={MAIN_COLOR}
          height={"20%"}
          width={"20%"}
        />
      )}
      <Timeline
        loading={timelineLoading}
        setLoading={setTimelineLoading}
        currGraphTime={currGraphTime}
        timelineAux={timelineAux}
        setDateRange={setDateRange}
        openDrawer={openDrawer}
        handleNodeClick={handleNodeClick}
      />
    </div>
  );
}

export default App;
