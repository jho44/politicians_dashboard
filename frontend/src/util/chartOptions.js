/**
 * Util functions for the Posts' Polarity over All Time graph in the drawer. Majority of code from [here](http://bl.ocks.org/asielen/92929960988a8935d907e39e60ea8417).
 * @module
 */

/**
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @returns {void}
 */
function boxPlot(distrochartRef) {
  if (!distrochartRef.current) return;
  distrochartRef.current.violinPlots.hide();
  distrochartRef.current.boxPlots.show({ reset: true });
  distrochartRef.current.notchBoxes.hide();
  distrochartRef.current.dataPlots.change({
    showPlot: false,
    showBeanLines: false,
  });
}

/**
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @returns {void}
 */
function notchedBoxPlot(distrochartRef) {
  if (!distrochartRef.current) return;
  distrochartRef.current.violinPlots.hide();
  distrochartRef.current.notchBoxes.show({ reset: true });
  distrochartRef.current.boxPlots.show({
    reset: true,
    showBox: false,
    showOutliers: true,
    boxWidth: 20,
    scatterOutliers: true,
  });
  distrochartRef.current.dataPlots.change({
    showPlot: false,
    showBeanLines: false,
  });
}

/**
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @returns {void}
 */
function violinPlotUnbound(distrochartRef) {
  if (!distrochartRef.current) return;
  distrochartRef.current.violinPlots.show({ reset: true, clamp: 0 });
  distrochartRef.current.boxPlots.show({
    reset: true,
    showWhiskers: false,
    showOutliers: false,
    boxWidth: 10,
    lineWidth: 15,
    colors: ["#555"],
  });
  distrochartRef.current.notchBoxes.hide();
  distrochartRef.current.dataPlots.change({
    showPlot: false,
    showBeanLines: false,
  });
}

/**
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @returns {void}
 */
function violinPlotClamp(distrochartRef) {
  if (!distrochartRef.current) return;
  distrochartRef.current.violinPlots.show({ reset: true, clamp: 1 });
  distrochartRef.current.boxPlots.show({
    reset: true,
    showWhiskers: false,
    showOutliers: false,
    boxWidth: 10,
    lineWidth: 15,
    colors: ["#555"],
  });
  distrochartRef.current.notchBoxes.hide();
  distrochartRef.current.dataPlots.change({
    showPlot: false,
    showBeanLines: false,
  });
}

/**
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @returns {void}
 */
function beanPlot(distrochartRef) {
  if (!distrochartRef.current) return;
  distrochartRef.current.violinPlots.show({
    reset: true,
    width: 75,
    clamp: 0,
    resolution: 30,
    bandwidth: 50,
  });
  distrochartRef.current.dataPlots.show({
    showBeanLines: true,
    beanWidth: 15,
    showPlot: false,
    colors: ["#555"],
  });
  distrochartRef.current.boxPlots.hide();
  distrochartRef.current.notchBoxes.hide();
}

/**
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @returns {void}
 */
function beeswarmPlot(distrochartRef) {
  if (!distrochartRef.current) return;
  distrochartRef.current.violinPlots.hide();
  distrochartRef.current.dataPlots.show({
    showPlot: true,
    plotType: "beeswarm",
    showBeanLines: false,
    colors: null,
  });
  distrochartRef.current.notchBoxes.hide();
  distrochartRef.current.boxPlots.hide();
}

/**
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @returns {void}
 */
function scatterPlot(distrochartRef) {
  if (!distrochartRef.current) return;
  distrochartRef.current.violinPlots.hide();
  distrochartRef.current.dataPlots.show({
    showPlot: true,
    plotType: 40,
    showBeanLines: false,
    colors: null,
  });
  distrochartRef.current.notchBoxes.hide();
  distrochartRef.current.boxPlots.hide();
}

/**
 * @function
 * @param {Ref} distrochartRef State of the Posts' Polarity over All Time chart.
 * @returns {void}
 */
function trendLines(distrochartRef) {
  if (!distrochartRef.current) return;
  if (distrochartRef.current.dataPlots.options.showLines) {
    distrochartRef.current.dataPlots.change({ showLines: false });
  } else {
    distrochartRef.current.dataPlots.change({
      showLines: ["median", "quartile1", "quartile3"],
    });
  }
}

export {
  boxPlot,
  notchedBoxPlot,
  violinPlotUnbound,
  violinPlotClamp,
  beanPlot,
  beeswarmPlot,
  scatterPlot,
  trendLines,
};
