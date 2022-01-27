import "./App.css";
import React, { useEffect, useState, useCallback } from "react";
import classNames from "classnames";
import Select from "react-select";
import { DateRange } from 'react-date-range';
import { addYears } from 'date-fns';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { drawLeftRightPie, drawNumPostsOverTime } from "./drawerFuncs";
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
      key: 'selection'
    }
  ]);
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null,
  });

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
  const handleNodeClick = (accountId) => {
    setAccId(accountId);
    setOpenDrawer(true);

    fetch(
      `http://localhost:5000/flask?type=num_posts_over_time&account_id=${accountId}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawNumPostsOverTime(res);
      })
      .catch((err) => console.error(err));

    fetch(
      `http://localhost:5000/flask?type=num_left_right_posts&account_id=${accountId}`
    )
      .then((res) => res.json())
      .then((res) => {
        drawLeftRightPie(res);
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
      {
        dateRange.start &&
        <DateRange
          onChange={item => setDates([item.selection])}
          date={dateRange.start}
          ranges={dates}
          minDate={dateRange.start}
          maxDate={dateRange.end}
          shownDate={dateRange.start}
          date={dateRange.start}
        />
      }
      <select id="relationship" defaultValue={RELATIONSHIPS[0]}>
        {RELATIONSHIPS.map((x) => (
          <option value={x} key={x}>
            {x}
          </option>
        ))}
      </select>
      <div id="drawer-wrapper">
        <div className={classNames("drawer", openDrawer && "open")}>
          <h2 style={{ marginTop: 0 }}>
            {accId}'s Summarized Twitter Activity
          </h2>
          <div id="num-posts">
            <h3>Number of Tweets over Time</h3>
            <p>
              The color of the line corresponds to the polarity of posts at that
              point in time. The bluer it is, the more liberal-leaning the posts
              there were. The redder it is, the more conservative-leaning the
              posts there were. White signifies a more neutral position.
            </p>
          </div>
          <div id="num-left-right-posts">
            <h3>Number of Left vs Right Tweets</h3>
          </div>
        </div>
        <Timeline
          setDateRange={setDateRange}
          openDrawer={openDrawer}
          handleNodeClick={handleNodeClick}
          timelineRelation={timelineRelation}
          users={new Set(selectedOptions.map((x) => x.label))}
        />
      </div>
    </div>
  );
}

export default App;
