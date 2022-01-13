import "./App.css";
import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { drawNumPostsOverTime } from "./drawerFuncs";
import Timeline from "./Timeline";

function App() {
  const [timelineData, setTimelineData] = useState(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [accId, setAccId] = useState();

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
  };

  return (
    <div className="App">
      <header className="App-header">
        <p>React + Flask Tutorial</p>
      </header>
      <button onClick={handleCloseClick}>Close Drawer</button>
      <div id="drawer-wrapper">
        <div className={classNames("drawer", openDrawer && "open")}>
          <h2 style={{ marginTop: 0 }}>
            {accId}'s Summarized Twitter Activity
          </h2>
          <div id="num-posts">
            <h3>Number of Posts over Time</h3>
          </div>
        </div>
        <Timeline openDrawer={openDrawer} handleNodeClick={handleNodeClick} />
        {/* <div className="timeline" style={{backgroundColor: "white"}}>Timeline</div> */}
      </div>
    </div>
  );
}

export default App;
