import "./App.css";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Charts from "./Charts";
import Select from "react-select";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import TimeRangeSlider from "react-time-range-slider";
import ReactLoading from "react-loading";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  drawLeftRightPie,
  drawNumPostsOverTime,
  drawPolarityOverAllTime,
  drawAttentionWeights,
} from "./drawerFuncs";
import "./distrochart.css";
import Timeline from "./Timeline";
import { RELATIONSHIPS, MAIN_COLOR } from "./constants";

const RELATIONSHIP_OPTIONS = RELATIONSHIPS.map((x) => ({
  value: x,
  label: x,
}));

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

  const chart1 = useRef();

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
        ? `http://localhost:5000/flask?type=attn_weights&account_id=${accountId}&start_date=${start}&end_date=${end}`
        : `http://localhost:5000/flask?type=attn_weights&account_id=${accountId}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawAttentionWeights(res);
      })
      .catch((err) => console.error(err));

    fetch(
      start && end
        ? `http://localhost:5000/flask?type=num_posts_over_time&account_id=${accountId}&start_date=${start}&end_date=${end}`
        : `http://localhost:5000/flask?type=num_posts_over_time&account_id=${accountId}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawNumPostsOverTime(res, setCurrGraphTime);
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

  const [options, setOptions] = useState([]);

  const [selectedOptions, setSelectedOptions] = useState([]);

  const [timelineAux, setTimelineAux] = useState({
    selectedDateTimes: dates,
    timelineRelation: timelineRelation.value,
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

  const selectStyles = {
    control: (styles) => ({ ...styles, borderRadius: 0, width: "100%" }),
  };

  return (
    <div className="App centered-column">
      <header className="App-header">
        <p>Politician Twitter Activity</p>
      </header>
      {dateRange.start ? (
        <>
          <div style={{ display: "flex", width: "100%" }}>
            <div style={{ width: "50%" }} className="center">
              <div className="card">
                <DateRange
                  onChange={(item) => setDates([item.selection])}
                  date={dateRange.start}
                  ranges={dates}
                  minDate={dateRange.start}
                  maxDate={dateRange.end}
                  shownDate={dateRange.start}
                />
              </div>
            </div>
            <div
              className="center"
              style={{ flexDirection: "column", width: "50%", margin: "10%" }}
            >
              <Select
                placeholder="Select Users..."
                isMulti
                name="colors"
                id="desired-users-input"
                options={options}
                className="basic-multi-select card"
                classNamePrefix="select"
                value={selectedOptions}
                onChange={(newSelectedOptions) => {
                  setSelectedOptions(newSelectedOptions);
                }}
                styles={selectStyles}
              />

              <Select
                className="basic-single card"
                classNamePrefix="select"
                name="colors"
                id="relationship"
                value={timelineRelation}
                options={RELATIONSHIP_OPTIONS}
                onChange={(newSelectedOptions) => {
                  console.log(newSelectedOptions.value);
                  setTimelineRelation(newSelectedOptions);
                }}
                styles={selectStyles}
              />

              <div style={{ width: "80%" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <p>{selectedTime.start}</p>
                  <p>{selectedTime.end}</p>
                </div>
                <TimeRangeSlider
                  disabled={
                    !dates[0].startDate ||
                    !dates[0].endDate ||
                    dates[0].startDate.getFullYear() !==
                      dates[0].endDate.getFullYear() ||
                    dates[0].startDate.getMonth() !==
                      dates[0].endDate.getMonth() ||
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
              </div>
            </div>
          </div>
          <button
            className="btn"
            style={{ marginTop: "2rem", marginBottom: "1rem" }}
            onClick={() => {
              setTimelineAux((prevState) => {
                const latestUsers = new Set(
                  selectedOptions.map((x) => x.label)
                );
                if (
                  prevState.selectedDateTimes[0].startDate !=
                    dates[0].startDate ||
                  prevState.selectedDateTimes[0].endDate != dates[0].endDate ||
                  prevState.timelineRelation != timelineRelation.value ||
                  prevState.users.size != latestUsers.size
                ) {
                  console.log("diff detected");
                  const startDate = new Date(dates[0].startDate);
                  const endDate = new Date(dates[0].endDate);
                  // if TimeRangeSlider enabled
                  if (
                    dates[0].startDate &&
                    dates[0].endDate &&
                    dates[0].startDate.getFullYear() ==
                      dates[0].endDate.getFullYear() &&
                    dates[0].startDate.getMonth() ==
                      dates[0].endDate.getMonth() &&
                    dates[0].startDate.getDay() == dates[0].endDate.getDay()
                  ) {
                    const startTime = selectedTime.start.split(":");
                    startDate.setUTCHours(startTime[0]);
                    startDate.setUTCMinutes(startTime[1]);

                    const endTime = selectedTime.end.split(":");
                    endDate.setUTCHours(endTime[0]);
                    endDate.setUTCMinutes(endTime[1]);
                  }
                  return {
                    selectedDateTimes: [{ startDate, endDate }],
                    timelineRelation: timelineRelation.value,
                    users: latestUsers,
                  };
                }
                console.log("no diff");
                return prevState;
              });
            }}
          >
            <div className="centered-column">
              <CheckCircleOutlineIcon
                fontSize="large"
                style={{ marginBottom: "0.5rem" }}
              />
              APPLY SETTINGS
            </div>
          </button>
          <Charts
            openDrawer={openDrawer}
            accId={accId}
            chart1={chart1}
            handleCloseClick={handleCloseClick}
          />
        </>
      ) : (
        <ReactLoading
          type={"bubbles"}
          color={MAIN_COLOR}
          height={"20%"}
          width={"20%"}
        />
      )}
      <Timeline
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
