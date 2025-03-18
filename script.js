// Main entry point and data loading
document.addEventListener('DOMContentLoaded', () => {
    // Define a date parser function using d3's timeParse
    const parseDate = d3.timeParse("%Y-%m-%d");
    
    // Load the CSV file and process the data
    d3.csv("./temperature_daily.csv")
      .then(rawData => {
        // Parse the data
        const data = parseData(rawData, parseDate);
        console.log("Loaded Data:", data);
        
        // Initialize visualizations
        initVisualizations(data);
      })
      .catch(error => console.error("Error loading data:", error));
  });
  
  // Data parsing and transformation
  function parseData(rawData, parseDate) {
    // Parse the date and convert temperature values to numbers
    rawData.forEach(d => {
      d.date = parseDate(d.date);
      d.max_temperature = +d.max_temperature;
      d.min_temperature = +d.min_temperature;
    });
    
    return rawData;
  }
  
  // Initialize all visualizations
  function initVisualizations(data) {
    // Create the aggregated data for the first heatmap
    const processedData = createAggregatedData(data);
    
    // Get the data for the most recent 10 years for the second heatmap
    const maxYear = d3.max(data, d => d.date.getFullYear());
    const filteredData = data.filter(d => d.date.getFullYear() >= maxYear - 9);
    const processedDailyData = createDailyData(filteredData);
    
    // Initialize heatmaps
    const heatmap1 = createYearlyHeatmap(processedData, "#heatmap");
    const heatmap2 = createRecentYearsHeatmap(processedDailyData, filteredData, "#heatmap2");
    
    // Set up event listeners for radio buttons
    setupEventListeners(heatmap1, heatmap2, processedData, filteredData);
  }
  
  // Create aggregated data for the first heatmap
  function createAggregatedData(data) {
    // Aggregate the data by year and month, calculating max and min temperatures
    const aggregatedData = d3.rollup(
      data,
      values => ({
        max: d3.max(values, d => d.max_temperature),
        min: d3.min(values, d => d.min_temperature)
      }),
      d => d.date.getFullYear(),
      d => d.date.getMonth() + 1
    );
  
    // Process aggregated data into a flat array 
    const processedData = [];
    aggregatedData.forEach((months, year) => {
      months.forEach((temps, month) => {
        processedData.push({
          year: +year,
          month: +month,
          max: temps.max,
          min: temps.min
        });
      });
    });
    
    return processedData;
  }
  
  // Create daily data for the second heatmap
  function createDailyData(filteredData) {
    // Create a map of daily data
    const dailyDataMap = d3.rollup(
      filteredData,
      v => v.sort((a, b) => d3.ascending(a.date, b.date)),
      d => d.date.getFullYear(),
      d => d.date.getMonth() + 1
    );
  
    // Process daily data into a flat array
    const processedDailyData = [];
    dailyDataMap.forEach((months, year) => {
      months.forEach((days, month) => {
        processedDailyData.push({
          year: +year,
          month: +month,
          days: days
        });
      });
    });
    
    return processedDailyData;
  }
  
  // Create the yearly heatmap (first visualization)
  function createYearlyHeatmap(processedData, selector) {
    // Set margin and dimensions for the heatmap SVG container
    const margin = { top: 50, right: 30, bottom: 80, left: 80 },
          width = 900 - margin.left - margin.right,
          height = 450 - margin.top - margin.bottom;
    
    // Create the SVG container for the heatmap
    const svg = d3.select(selector)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Create the x and y scales for the heatmap
    const xScale = d3.scaleBand()
      .domain([...new Set(processedData.map(d => d.year))])
      .range([0, width])
      .padding(0.1);
  
    const yScale = d3.scaleBand()
      .domain([...new Set(processedData.map(d => d.month))])
      .range([0, height])
      .padding(0.1);
  
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([
        d3.min(processedData, d => d.min),
        d3.max(processedData, d => d.max)
      ]);
  
    // Create axes for the heatmap 
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    
    svg.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat(d => d3.timeFormat("%B")(new Date(0, d - 1))));
  
    // Create the legend for the color scale
    const legendWidth = 300,
          legendHeight = 10;
  
    const legendGroup = d3.select(selector)
      .select("svg")
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${margin.left}, ${height + margin.top + 20})`);
  
    const defs = legendGroup.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient-1");
  
    // Create gradient stops for the legend
    gradient.selectAll("stop")
      .data(d3.range(0, 1.01, 0.01))
      .enter()
      .append("stop")
      .attr("offset", d => d)
      .attr("stop-color", d => d3.interpolateYlOrRd(d));
   
    // Append the legend rectangle
    legendGroup.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient-1)");
  
    // Create a scale for the legend
    const legendScale = d3.scaleLinear()
      .domain([d3.min(processedData, d => d.min), d3.max(processedData, d => d.max)])
      .range([0, legendWidth]);
  
    // Create axis for the legend  
    const legendAxisGroup = legendGroup.append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(d3.axisBottom(legendScale).ticks(5));
  
    // Add tooltip div if it doesn't exist
    if (!d3.select("body").select(".tooltip").size()) {
      d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("display", "none");
    }
  
    // Function to update the heatmap matrix based on temperature type (max or min)
    function updateMatrix(tempType) {
      const cells = svg.selectAll(".matrix")
        .data(processedData, d => `${d.year}-${d.month}`);
  
      cells.enter()
        .append("rect")
        .attr("class", "matrix")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScale(d.month))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .merge(cells)
        .transition()
        .duration(500)
        .attr("fill", d => colorScale(d[tempType]));
  
      cells.exit().remove();
  
      // Tooltip functionality for displaying temperature info on hover
      svg.selectAll(".matrix")
        .on("mouseover", function(event, d) {
          d3.select(".tooltip")
            .style("display", "block")
            .html(`Date: ${d.year}-${d.month}<br>Max: ${d.max}°C<br>Min: ${d.min}°C`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function(event) {
          d3.select(".tooltip")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(".tooltip").style("display", "none");
        });
    }
  
    // Initialize heatmap with max temperature
    updateMatrix("max");
    
    // Helper function to get extent for a specific temperature type
    function getExtent(tempType) {
      return tempType === "max"
        ? d3.extent(processedData, d => d.max)
        : d3.extent(processedData, d => d.min);
    }
    
    // Return methods to update the visualization
    return {
      updateMatrix,
      updateLegend: function(tempType) {
        legendScale.domain(getExtent(tempType));
        legendAxisGroup.transition()
          .duration(500)
          .call(d3.axisBottom(legendScale).ticks(5));
      }
    };
  }
  
  // Create the recent years heatmap with line charts (second visualization)
  function createRecentYearsHeatmap(processedDailyData, filteredData, selector) {
    // Set margin and dimensions for the SVG container
    const margin = { top: 50, right: 30, bottom: 100, left: 80 },
          width = 900 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;
  
    // Create the SVG container for the heatmap
    const svg = d3.select(selector)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Define scales for the heatmap    
    const years = [...new Set(processedDailyData.map(d => d.year))].sort((a, b) => a - b);
    const months = [...new Set(processedDailyData.map(d => d.month))].sort((a, b) => a - b);
  
    const xScale = d3.scaleBand()
      .domain(years)
      .range([0, width])
      .padding(0.1);
  
    const yScale = d3.scaleBand()
      .domain(months)
      .range([0, height])
      .padding(0.1);
  
    // Global temperature extent for mini charts
    const globalMiniExtent = [
      d3.min(filteredData, d => d.min_temperature),
      d3.max(filteredData, d => d.max_temperature)
    ];
  
    // Create axes for the heatmap
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    
    svg.append("g")
      .call(d3.axisLeft(yScale)
        .tickFormat(d => d3.timeFormat("%B")(new Date(0, d - 1))));
  
    // Create the legend for the color scale
    const legendWidth = 300,
          legendHeight = 10;
  
    const legendGroup = d3.select(selector)
      .select("svg")
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${margin.left}, ${height + margin.top + 20})`);
  
    const defs = legendGroup.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient-2");
  
    // Create gradient stops for the legend
    gradient.selectAll("stop")
      .data(d3.range(0, 1.01, 0.01))
      .enter()
      .append("stop")
      .attr("offset", d => d)
      .attr("stop-color", d => d3.interpolateYlOrRd(d));
  
    legendGroup.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient-2)");
  
    // Create a scale for the legend
    const legendScale = d3.scaleLinear()
      .domain([
        d3.min(filteredData, d => d.min_temperature),
        d3.max(filteredData, d => d.max_temperature)
      ])
      .range([0, legendWidth]);
  
    // Create axis for the legend
    const legendAxisGroup = legendGroup.append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(d3.axisBottom(legendScale).ticks(5));
  
    // Create mini legend group
    const miniLegendGroup = d3.select(selector)
      .select("svg")
      .append("g")
      .attr("class", "mini-legend")
      .attr("transform", `translate(${margin.left}, ${height + margin.top + 60})`);
  
    // Add elements to mini legend group
    miniLegendGroup.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 20)
      .attr("y2", 0)
      .attr("stroke", "green")
      .attr("stroke-width", 2);
    
    miniLegendGroup.append("text")
      .attr("x", 25)
      .attr("y", 5)
      .text("Max Temperature");
    
    miniLegendGroup.append("line")
      .attr("x1", 150)
      .attr("y1", 0)
      .attr("x2", 170)
      .attr("y2", 0)
      .attr("stroke", "blue")
      .attr("stroke-width", 2);
    
    miniLegendGroup.append("text")
      .attr("x", 175)
      .attr("y", 5)
      .text("Min Temperature");
  
    // Function to get global temperature extent based on temperature type
    function getGlobalTempExtent(tempType) {
      return tempType === "max"
        ? d3.extent(filteredData, d => d.max_temperature)
        : d3.extent(filteredData, d => d.min_temperature);
    }
  
    // Function to update the heatmap matrix based on daily temperature data
    function updateMatrix(tempType) {
      const [globalAggMin, globalAggMax] = getGlobalTempExtent(tempType);
      const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([globalAggMin, globalAggMax]);
  
      const cells = svg.selectAll(".cell")
        .data(processedDailyData, d => `${d.year}-${d.month}`);
  
      const cellsEnter = cells.enter()
        .append("g")
        .attr("class", "cell")
        .attr("transform", d => `translate(${xScale(d.year)},${yScale(d.month)})`);
      
      cellsEnter.append("rect")
        .attr("class", "cell-bg")
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth());
  
      cellsEnter.append("path")
        .attr("class", "mini-line-max")
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-width", 1.5);
      
      cellsEnter.append("path")
        .attr("class", "mini-line-min")
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 1.5);
  
      const cellsMerge = cellsEnter.merge(cells);
  
      cellsMerge.select("rect.cell-bg")
        .transition()
        .duration(500)
        .attr("fill", d => {
          const aggVal = tempType === "max"
            ? d3.max(d.days, day => day.max_temperature)
            : d3.min(d.days, day => day.min_temperature);
          return colorScale(aggVal);
        });
  
      cellsMerge.each(function(d) {
        const cellWidth = xScale.bandwidth();
        const cellHeight = yScale.bandwidth();
  
        const xMini = d3.scaleLinear()
          .domain([1, d.days.length])
          .range([0, cellWidth]);
  
        const yMini = d3.scaleLinear()
          .domain(globalMiniExtent)
          .range([cellHeight, 0]);
  
        const lineMax = d3.line()
          .x((_, i) => xMini(i + 1))
          .y(day => yMini(day.max_temperature));
        
        const lineMin = d3.line()
          .x((_, i) => xMini(i + 1))
          .y(day => yMini(day.min_temperature));
  
        d3.select(this).select("path.mini-line-max")
          .transition()
          .duration(500)
          .attr("d", lineMax(d.days));
        
        d3.select(this).select("path.mini-line-min")
          .transition()
          .duration(500)
          .attr("d", lineMin(d.days));
      });
  
      cellsMerge
        .on("mouseover", function(event, d) {
          const [mx] = d3.pointer(event, this);
          const dayIndex = Math.floor((mx / xScale.bandwidth()) * d.days.length);
          const dayData = d.days[dayIndex];
          if(dayData) {
            d3.select(".tooltip")
              .style("display", "block")
              .html(`Date: ${d3.timeFormat("%Y-%m-%d")(dayData.date)}<br>Max: ${dayData.max_temperature}°C<br>Min: ${dayData.min_temperature}°C`);
          }
        })
        .on("mousemove", function(event, d) {
          const [mx] = d3.pointer(event, this);
          const dayIndex = Math.floor((mx / xScale.bandwidth()) * d.days.length);
          const dayData = d.days[dayIndex];
          if(dayData) {
            d3.select(".tooltip")
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          }
        })
        .on("mouseout", function() {
          d3.select(".tooltip").style("display", "none");
        });
  
      cells.exit().remove();
    }
  
    // Initialize the heatmap
    updateMatrix("max");
  
    // Return methods to update the visualization
    return {
      updateMatrix,
      updateLegend: function(tempType) {
        legendScale.domain(getGlobalTempExtent(tempType));
        legendAxisGroup.transition()
          .duration(500)
          .call(d3.axisBottom(legendScale).ticks(5));
      }
    };
  }
  
  // Set up event listeners for temperature type selection
  function setupEventListeners(heatmap1, heatmap2, processedData, filteredData) {
    d3.selectAll("input[name='tempType']").on("change", function () {
      const selectedType = this.value;
      
      // Update both heatmaps
      heatmap1.updateMatrix(selectedType);
      heatmap2.updateMatrix(selectedType);
      
      // Update both legends
      heatmap1.updateLegend(selectedType);
      heatmap2.updateLegend(selectedType);
    });
  }