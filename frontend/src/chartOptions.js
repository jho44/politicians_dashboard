function boxPlot(chart1) {
  if (!chart1.current) return;
  chart1.current.violinPlots.hide();
  chart1.current.boxPlots.show({ reset: true });
  chart1.current.notchBoxes.hide();
  chart1.current.dataPlots.change({ showPlot: false, showBeanLines: false });
}
function notchedBoxPlot(chart1) {
  if (!chart1.current) return;
  chart1.current.violinPlots.hide();
  chart1.current.notchBoxes.show({ reset: true });
  chart1.current.boxPlots.show({
    reset: true,
    showBox: false,
    showOutliers: true,
    boxWidth: 20,
    scatterOutliers: true,
  });
  chart1.current.dataPlots.change({ showPlot: false, showBeanLines: false });
}
function violinPlotUnbound(chart1) {
  if (!chart1.current) return;
  chart1.current.violinPlots.show({ reset: true, clamp: 0 });
  chart1.current.boxPlots.show({
    reset: true,
    showWhiskers: false,
    showOutliers: false,
    boxWidth: 10,
    lineWidth: 15,
    colors: ["#555"],
  });
  chart1.current.notchBoxes.hide();
  chart1.current.dataPlots.change({ showPlot: false, showBeanLines: false });
}

function violinPlotClamp(chart1) {
  if (!chart1.current) return;
  chart1.current.violinPlots.show({ reset: true, clamp: 1 });
  chart1.current.boxPlots.show({
    reset: true,
    showWhiskers: false,
    showOutliers: false,
    boxWidth: 10,
    lineWidth: 15,
    colors: ["#555"],
  });
  chart1.current.notchBoxes.hide();
  chart1.current.dataPlots.change({ showPlot: false, showBeanLines: false });
}
function beanPlot(chart1) {
  if (!chart1.current) return;
  chart1.current.violinPlots.show({
    reset: true,
    width: 75,
    clamp: 0,
    resolution: 30,
    bandwidth: 50,
  });
  chart1.current.dataPlots.show({
    showBeanLines: true,
    beanWidth: 15,
    showPlot: false,
    colors: ["#555"],
  });
  chart1.current.boxPlots.hide();
  chart1.current.notchBoxes.hide();
}
function beeswarmPlot(chart1) {
  if (!chart1.current) return;
  chart1.current.violinPlots.hide();
  chart1.current.dataPlots.show({
    showPlot: true,
    plotType: "beeswarm",
    showBeanLines: false,
    colors: null,
  });
  chart1.current.notchBoxes.hide();
  chart1.current.boxPlots.hide();
}
function scatterPlot(chart1) {
  if (!chart1.current) return;
  chart1.current.violinPlots.hide();
  chart1.current.dataPlots.show({
    showPlot: true,
    plotType: 40,
    showBeanLines: false,
    colors: null,
  });
  chart1.current.notchBoxes.hide();
  chart1.current.boxPlots.hide();
}
function trendLines(chart1) {
  if (!chart1.current) return;
  if (chart1.current.dataPlots.options.showLines) {
    chart1.current.dataPlots.change({ showLines: false });
  } else {
    chart1.current.dataPlots.change({
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
