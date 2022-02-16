import "./App.css";
import React, { useEffect, useState, useCallback, useRef } from "react";
import classNames from "classnames";
import Select from "react-select";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import TimeRangeSlider from "react-time-range-slider";
import {
  drawLeftRightPie,
  drawNumPostsOverTime,
  drawPolarityOverAllTime,
} from "./drawerFuncs";
import * as co from "./chartOptions";
import "./distrochart.css";
import Timeline from "./Timeline";
import { RELATIONSHIPS } from "./constants";

function App() {
  const [timelineRelation, setTimelineRelation] = useState(RELATIONSHIPS[0]);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [accId, setAccId] = useState();

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

  const chart1 = useRef();

  // // for getting attention weights
  // fetch('http://localhost:5000/flask', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({stmt: "this is my statement"})
  // })
  // .then(response => response.json())
  // .then(res => {
  //   console.log(res)
  //   setGetMessage(res);
  // })
  // .catch(error => {
  //   console.log(error)
  // });

  const handleCloseClick = () => {
    setOpenDrawer(false);
  };

  /**
   * want function that enables Timeline node click to set both
   * drawer open and drawer's contents
   *
   * drawer's contents will contain data for selected account's:
   *  # posts over time -> line chart
   *  post polarity over time -> line chart
   *  left vs right posts  -> pie chart
   *  min, median, max, mean polarity of all their posts
   *  total # of posts
   *  whom they're most liked by
   *  whom they're most retweeting from
   *  whom they mention most
   *
   *  (to come) attention weights of posts in this time step / user-specified time range
   */
  const handleNodeClick = (accountId, start, end) => {
    setAccId(accountId);
    setOpenDrawer(true);

    fetch(
      start && end
        ? `http://localhost:5000/flask?type=num_posts_over_time&account_id=${accountId}&start_date=${start}&end_date=${end}`
        : `http://localhost:5000/flask?type=num_posts_over_time&account_id=${accountId}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawNumPostsOverTime(res);
      })
      .catch((err) => console.error(err));

    fetch(
      start && end
        ? `http://localhost:5000/flask?type=num_left_right_posts&account_id=${accountId}&start_date=${start}&end_date=${end}`
        : `http://localhost:5000/flask?type=num_left_right_posts&account_id=${accountId}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawLeftRightPie(res);
      })
      .catch((err) => console.error(err));

    fetch(
      `http://localhost:5000/flask?type=post_polarity&account_id=${accountId}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawPolarityOverAllTime(chart1, res);
      })
      .catch((err) => console.error(err));
  };

  const handleRelationshipChange = useCallback(
    (e) => setTimelineRelation(e.target.value),
    []
  );

  useEffect(() => {
    document
      .getElementById("relationship")
      .addEventListener("change", handleRelationshipChange);
    return () => {
      document
        .getElementById("relationship")
        .removeEventListener("change", handleRelationshipChange);
    };
  }, [handleRelationshipChange]);

  const [options, setOptions] = useState([]);

  const [selectedOptions, setSelectedOptions] = useState([]);

  const [timelineAux, setTimelineAux] = useState({
    selectedDateTimes: dates,
    timelineRelation,
    users: new Set(selectedOptions.map((x) => x.label)),
  });

  const [selectedTime, setSelectedTime] = useState({
    start: "00:00",
    end: "23:59",
  });

  const handleTimeChange = useCallback((time) => {
    setSelectedTime(time);
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/flask?type=account_ids")
      .then((response) => response.json())
      .then((res) => {
        setOptions(
          res.account_ids.map((accId) => ({
            value: accId,
            label: accId,
          }))
        );
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <p>Politician Twitter Activity</p>
      </header>
      <button onClick={handleCloseClick}>Close Drawer</button>
      <Select
        isMulti
        name="colors"
        id="desired-users-input"
        options={options}
        className="basic-multi-select"
        classNamePrefix="select"
        value={selectedOptions}
        onChange={(newSelectedOptions) => {
          setSelectedOptions(newSelectedOptions);
        }}
      />
      {dateRange.start && (
        <DateRange
          onChange={(item) => setDates([item.selection])}
          date={dateRange.start}
          ranges={dates}
          minDate={dateRange.start}
          maxDate={dateRange.end}
          shownDate={dateRange.start}
        />
      )}
      <TimeRangeSlider
        disabled={
          !dates[0].startDate ||
          !dates[0].endDate ||
          dates[0].startDate.getFullYear() != dates[0].endDate.getFullYear() ||
          dates[0].startDate.getMonth() != dates[0].endDate.getMonth() ||
          dates[0].startDate.getDay() != dates[0].endDate.getDay()
        }
        format={24}
        maxValue={"23:59"}
        minValue={"00:00"}
        name={"time_range"}
        onChange={handleTimeChange}
        step={15}
        value={selectedTime}
      />
      <select id="relationship" defaultValue={RELATIONSHIPS[0]}>
        {RELATIONSHIPS.map((x) => (
          <option value={x} key={x}>
            {x}
          </option>
        ))}
      </select>

      <button
        onClick={() => {
          setTimelineAux((prevState) => {
            const latestUsers = new Set(selectedOptions.map((x) => x.label));
            if (
              prevState.selectedDateTimes[0].startDate != dates[0].startDate ||
              prevState.selectedDateTimes[0].endDate != dates[0].endDate ||
              prevState.timelineRelation != timelineRelation ||
              prevState.users.size != latestUsers.size
            ) {
              console.log("diff detected");
              const datetimes = dates;
              // if TimeRangeSlider enabled
              if (
                dates[0].startDate &&
                dates[0].endDate &&
                dates[0].startDate.getFullYear() ==
                  dates[0].endDate.getFullYear() &&
                dates[0].startDate.getMonth() == dates[0].endDate.getMonth() &&
                dates[0].startDate.getDay() == dates[0].endDate.getDay()
              ) {
                const startTime = selectedTime.start.split(":");
                datetimes[0].startDate.setHours(startTime[0]);
                datetimes[0].startDate.setMinutes(startTime[1]);

                const endTime = selectedTime.end.split(":");
                datetimes[0].endDate.setHours(endTime[0]);
                datetimes[0].endDate.setMinutes(endTime[1]);
              }
              return {
                selectedDateTimes: dates,
                timelineRelation,
                users: latestUsers,
              };
            }
            console.log("no diff");
            return prevState;
          });
        }}
      >
        Update Settings
      </button>
      <div className={classNames("drawer-wrapper", openDrawer && "open")}>
        <div className={classNames("drawer", openDrawer && "open")}>
          <h2 style={{ marginTop: 0 }}>
            {accId}'s Summarized Twitter Activity
          </h2>
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
            <button onClick={() => co.beeswarmPlot(chart1)}>
              Beeswarm Plot
            </button>
            <button onClick={() => co.scatterPlot(chart1)}>Scatter Plot</button>
            <button onClick={() => co.trendLines(chart1)}>Trend Lines</button>
          </div>
        </div>
      </div>
      <Timeline
        timelineAux={timelineAux}
        setDateRange={setDateRange}
        openDrawer={openDrawer}
        handleNodeClick={handleNodeClick}
      />
    </div>
  );
}

export default App;
