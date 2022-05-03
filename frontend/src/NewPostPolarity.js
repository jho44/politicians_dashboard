import React, { useState } from "react";
import { drawAttentionWeights } from "./drawerFuncs";
import "./App.css";

export const NewPostPolarity = () => {
  const [newTweet, setNewTweet] = useState("");
  function handleChange(e) {
    setNewTweet(e.target.value);
  }

  function handleClick() {
    fetch("http://localhost:5000/flask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tweet: newTweet }),
    })
      .then((response) => response.json())
      .then((res) => {
        res["rawTweet"] = newTweet;
        const rows = drawAttentionWeights(res);
        document.getElementById("new-attention-weights").innerHTML = rows;
      })
      .catch((error) => {
        console.log(error);
      });
  }

  return (
    <div className="card" id="new-post-polarity">
      <h2>See what polarity score your tweet would generate with our model!</h2>
      <input onChange={handleChange} placeholder="Penny for your thoughts." />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          id="polarity-btn"
          onClick={handleClick}
          disabled={!newTweet.length}
          style={{
            opacity: newTweet.length ? 1 : 0.5,
            cursor: newTweet.length ? "pointer" : "not-allowed",
          }}
        >
          Try
        </button>
      </div>
      <div id="new-attention-weights" />
    </div>
  );
};
