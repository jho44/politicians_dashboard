import "./App.css";
import React, { useEffect, useState } from "react";
import classNames from "classnames";
import Timeline from "./Timeline";

function App() {
  const [timelineData, setTimelineData] = useState(null);
  const [openDrawer, setOpenDrawer] = useState(false);

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

  const handleClick = () => {
    setOpenDrawer(!openDrawer);
  };

  return (
    <div className="App">
      <header className="App-header">
        <p>React + Flask Tutorial</p>
      </header>
      <button onClick={handleClick}>Open Drawer</button>
      <div id="drawer-wrapper">
        <div className={classNames("drawer", openDrawer && "open")}>
          Dummy Drawer
        </div>
        <Timeline openDrawer={openDrawer} />
        {/* <div className="timeline" style={{backgroundColor: "white"}}>Timeline</div> */}
      </div>
    </div>
  );
}

export default App;
