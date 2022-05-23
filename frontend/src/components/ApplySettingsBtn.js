import React from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import "../styles/App.css";

/**
 * Clicking on this rerenders the Timeline component such that it shows the info that the user constrains in the Control Panel.
 * @function
 * @param {Function} setTimelineLoading Displays loading bar as timeline rerenders with new data.
 * @param {Function} setTimelineAux Sets state for new user-specified dashbaord settings.
 * @param {Array} dates What default or user-defined date range is currently being imposed on displayed dataset.
 * @param {Array} selectedUsers What default or user-defined list of Twitter users is currently being imposed on displayed dataset.
 * @param {("MENTIONS"|"RETWEET FROM")} timelineRelation What edge type is currently being imposed on displayed dataset.
 * @param {String} selectedTime If `dates` spans over just one day, then this is the time range within that day that is imposed on displayed dataset. E.g. "12:34".
 * @param {Boolean} timelineLoading Whether the `Timeline` is loading. If it's loading, then this button is disabled.
 * @returns {Component} "Apply Settings" button component
 */
export const ApplySettingsBtn = ({
  setTimelineLoading,
  setTimelineAux,
  dates,
  selectedUsers,
  timelineRelation,
  selectedTime,
  timelineLoading,
}) => {
  function handleClick() {
    setTimelineLoading(true);
    setTimelineAux((prevState) => {
      const latestUsers = new Set(selectedUsers.map((x) => x.label));
      if (
        prevState.selectedDateTimes[0].startDate !== dates[0].startDate ||
        prevState.selectedDateTimes[0].endDate !== dates[0].endDate ||
        prevState.timelineRelation !== timelineRelation.value ||
        prevState.users.size !== latestUsers.size
      ) {
        console.log("diff detected");
        const startDate = new Date(dates[0].startDate);
        const endDate = new Date(dates[0].endDate);
        // if TimeRangeSlider enabled
        if (
          dates[0].startDate &&
          dates[0].endDate &&
          dates[0].startDate.getFullYear() === dates[0].endDate.getFullYear() &&
          dates[0].startDate.getMonth() === dates[0].endDate.getMonth() &&
          dates[0].startDate.getDay() === dates[0].endDate.getDay()
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
  }

  return (
    <button
      className="btn"
      style={{
        opacity: timelineLoading ? 0.5 : 1,
        cursor: timelineLoading ? "not-allowed" : "pointer",
      }}
      onClick={handleClick}
      disabled={timelineLoading}
    >
      <div className="centered-column">
        <CheckCircleOutlineIcon
          fontSize="large"
          style={{ marginBottom: "0.5rem" }}
        />
        APPLY SETTINGS
      </div>
    </button>
  );
};
