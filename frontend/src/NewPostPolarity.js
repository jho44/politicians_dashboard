import React, { useState } from "react";
import { drawAttentionWeights } from "./drawerFuncs";
import "./App.css";

export const NewPostPolarity = () => {
  const [newTweet, setNewTweet] = useState("");
  function handleChange(e) {
    setNewTweet(e.target.value);
  }

  function handleClick() {
    fetch('http://localhost:5000/flask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({tweet: newTweet })
    })
    .then(response => response.json())
    .then(res => {
      res['raw_tweet'] = newTweet;
      const rows = drawAttentionWeights(res);
      document.getElementById("new-attention-weights").innerHTML = rows;
    })
    .catch(error => {
      console.log(error)
    });
  }

  return (
    <div className="card" id="new-post-polarity">
      <input onChange={handleChange} placeholder="See what polarity score your tweet would generate with our model!" />
      <button id="polarity-btn" onClick={handleClick}>Try</button>
      <div id="new-attention-weights" />
    </div>
  );
};