import React from "react";
import Select from "react-select";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import TimeRangeSlider from "react-time-range-slider";
import { RELATIONSHIPS } from "../constants";

const RELATIONSHIP_OPTIONS = RELATIONSHIPS.map((x) => ({
  value: x,
  label: x,
}));

/**
 * Consists of the settings/filters users can impose on the displayed dataset:
 *  - date range
 *  - interested users
 *  - interested relation/edge type
 *  - time range within a day
 * @function
 * @param {("MENTION"|"RETWEET FROM")} timelineRelation What edge type `Timeline` chart should display.
 * @param {Function} setTimelineRelation Sets the edge type that the `Timeline` chart should display.
 * @param {Object} dateRange The date range of the whole dataset.
 * @param {Array} dates What date range of the dataset should be displayed.
 * @param {Function} setSelectedUsers Sets the Twitter users that should be displayed.
 * @param {Function} setDates Sets the date range of the dataset that should be displayed.
 * @param {Object} selectStyles An Object for the `Select` components' styles.
 * @param {Object} selectedTime The time range within a day of the dataset that should be displayed.
 * @param {Callback} handleTimeChange Sets the start and end times of the desired time range within a day of thee dataset that should be displayed.
 * @param {Array} usersList All users in the dataset.
 * @param {Set} selectedUsers The Twitter users that the user is interested in seeing data about.
 * @returns {Component}
 */
export const ControlPanel = ({
  timelineRelation,
  setTimelineRelation,
  dateRange,
  dates,
  setSelectedUsers,
  setDates,
  selectStyles,
  selectedTime,
  handleTimeChange,
  usersList,
  selectedUsers,
}) => {
  return (
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
          options={usersList}
          className="basic-multi-select card"
          classNamePrefix="select"
          value={selectedUsers}
          onChange={(newSelectedUsers) => {
            setSelectedUsers(newSelectedUsers);
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
          onChange={(newSelectedUsers) => {
            setTimelineRelation(newSelectedUsers);
          }}
          styles={selectStyles}
        />

        <div style={{ width: "80%" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <p>{selectedTime.start}</p>
            <p>{selectedTime.end}</p>
          </div>
          <TimeRangeSlider
            disabled={
              !dates[0].startDate ||
              !dates[0].endDate ||
              dates[0].startDate.getFullYear() !==
                dates[0].endDate.getFullYear() ||
              dates[0].startDate.getMonth() !== dates[0].endDate.getMonth() ||
              dates[0].startDate.getDate() !== dates[0].endDate.getDate()
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
  );
};
