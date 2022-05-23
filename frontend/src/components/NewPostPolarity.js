import React, { useState } from "react";
import { drawAttentionWeights } from "../util/drawerFuncs";
import "../styles/App.css";

/**
 * Section where user can input some text to be run through Patricia's
 * TIMME model and classify the polarity of each token and the whole tweet.
 * @function
 * @returns {Component}
 */
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
        if (res) {
          res["rawTweet"] = newTweet;
          const rows = drawAttentionWeights(res);
          document.getElementById("new-attention-weights").innerHTML = rows;
        } else {
          document.getElementById(
            "new-attention-weights"
          ).innerHTML = `<div class="centered-column"><div style="padding-bottom: 1rem">${newTweet}</div><div>Unfortunately, the model couldn't figure out a classification for your tweet. Try another?</div></div>`;
        }
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
