import './App.css';
import React, { useEffect, useState } from 'react';
import Timeline from "./Timeline";

function App() {
  const [timelineData, setTimelineData] = useState(null);

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

  return (
    <div className="App">
      <header className="App-header">
        <p>React + Flask Tutorial</p>
      </header>
      <Timeline />
    </div>
  );
}

export default App;