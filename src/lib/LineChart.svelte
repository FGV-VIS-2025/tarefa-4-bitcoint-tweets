<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";

  // Data interfaces
  interface TimelinePoint {
    date: string;
    count: number;
  }

  interface HashtagData {
    hashtag: string;
    timeline: TimelinePoint[];
  }

  // Props
  export let data: HashtagData[] = [];
  export let chartTitle: string = "Hashtag Trends Over Time";
  export let xAxisLabel: string = "Months of the Year 2022";
  export let yAxisLabel: string = "Number of Tweets (log scale)"; // Updated to indicate logarithmic scale

  let chartElement: SVGSVGElement;
  let containerElement: HTMLDivElement;
  let dimensions = { width: 0, height: 0 };
  let tooltip;

  // Group data by hashtag - no longer needed as data is already grouped
  $: hashtagsGrouped = data.slice(0, 50);

  // Generate a deterministic color for a hashtag using string hashing
  function hashStringToColor(str: string) {
    // Simple string hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert hash to RGB values with good color separation
    // Using HSL for better visual distinction
    const h = Math.abs(hash % 360);
    const s = 70 + Math.abs((hash >> 8) % 30); // 70-100% saturation
    const l = 35 + Math.abs((hash >> 16) % 30); // 35-65% lightness

    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  // Calculate scales and domains
  $: scales = calculateScales(data.slice(0, 50), dimensions);

  function calculateScales(inputData: HashtagData[], dims) {
    if (
      !inputData ||
      inputData.length === 0 ||
      dims.width === 0 ||
      dims.height === 0
    ) {
      return { xScale: null, yScale: null, margin: null };
    }

    // Define margins with more space for title and legend
    const margin = { top: 40, right: 120, bottom: 50, left: 70 };
    const width = dims.width - margin.left - margin.right;
    const height = dims.height - margin.top - margin.bottom;

    // Flatten timeline data to find min/max dates and counts
    const allTimelinePoints: TimelinePoint[] = [];
    inputData.forEach((hashtag) => {
      hashtag.timeline.forEach((point) => {
        allTimelinePoints.push(point);
      });
    });

    // Get year from data or default to 2022
    let startDate, endDate;

    if (allTimelinePoints.length > 0) {
      try {
        // Parse all dates to find min and max
        const dates = allTimelinePoints
          .map((point) => {
            const parsedDate = new Date(point.date);
            if (isNaN(parsedDate.getTime())) {
              console.error("Invalid date format:", point.date);
              return null;
            }
            return parsedDate;
          })
          .filter((d) => d !== null);

        if (dates.length > 0) {
          // Use regular loop instead of spread operator to prevent stack overflow
          let minTime = dates[0].getTime();
          let maxTime = dates[0].getTime();

          for (let i = 1; i < dates.length; i++) {
            const time = dates[i].getTime();
            if (time < minTime) minTime = time;
            if (time > maxTime) maxTime = time;
          }

          startDate = new Date(minTime);
          endDate = new Date(maxTime);
        } else {
          // Fallback to default
          startDate = new Date(2022, 0, 1); // January 1st
          endDate = new Date(2022, 1, 28); // February 28th
        }
      } catch (error) {
        console.error("Error calculating date range:", error);
        // Default: January to February 2022
        startDate = new Date(2022, 0, 1); // January 1st
        endDate = new Date(2022, 1, 28); // February 28th
      }
    } else {
      // Default: January to February 2022
      startDate = new Date(2022, 0, 1); // January 1st
      endDate = new Date(2022, 1, 28); // February 28th
    }

    const xScale = d3
      .scaleTime()
      .domain([startDate, endDate])
      .range([0, width]);

    // Find minimum count for log scale (must be > 0)
    let minCount =
      d3.min(allTimelinePoints, (d) => (d.count > 0 ? d.count : null)) || 1;
    // Use a minimum threshold to avoid issues with very small values
    minCount = Math.max(0.1, minCount);

    // Create logarithmic scale for y-axis
    const yScale = d3
      .scaleLog() // Changed to logarithmic scale
      .domain([minCount, d3.max(allTimelinePoints, (d) => d.count) || 10])
      .range([height, 0])
      .nice(); // Rounds the domain to nice values

    return { xScale, yScale, margin, width, height };
  }

  function findClosestPoint(mouseX, mouseY) {
    if (!scales.xScale || !scales.yScale || !hashtagsGrouped.length)
      return null;

    let closestPoint = null;
    let minDistance = Infinity;
    let closestHashtag = null;

    hashtagsGrouped.forEach((hashtag) => {
      hashtag.timeline.forEach((point) => {
        if (point.count <= 0) return;

        const xPos = scales.xScale(new Date(point.date));
        const yPos = scales.yScale(point.count);
        const distance = Math.sqrt(
          Math.pow(xPos - mouseX, 2) + Math.pow(yPos - mouseY, 2),
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
          closestHashtag = hashtag.hashtag;
        }
      });
    });

    return minDistance < 40
      ? { ...closestPoint, hashtag: closestHashtag }
      : null;
  }

  function updateChart() {
    if (
      !data ||
      data.length === 0 ||
      !chartElement ||
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      !scales.xScale ||
      !scales.yScale
    )
      return;

    // Clear previous chart
    d3.select(chartElement).selectAll("*").remove();

    // Create SVG container
    const svg = d3
      .select(chartElement)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr(
        "transform",
        `translate(${scales.margin.left},${scales.margin.top})`,
      );

    // Create month formatter
    const monthFormat = d3.timeFormat("%B");
    const dayFormat = d3.timeFormat("%b %d"); // Format for daily view

    // Determine if we're showing days or months based on date range
    const dateRange = scales.xScale.domain();
    const diffDays = Math.ceil(
      (dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 60 * 60 * 24),
    );
    const showDays = diffDays <= 60; // Show days if the range is 60 days or less

    // Add x-axis with appropriate ticks
    svg
      .append("g")
      .attr("transform", `translate(0,${scales.height})`)
      .call(
        d3
          .axisBottom(scales.xScale)
          .tickFormat((d) => (showDays ? dayFormat(d) : monthFormat(d)))
          .ticks(showDays ? d3.timeDay.every(5) : d3.timeMonth.every(1)), // Adjust tick frequency
      );

    // Add x-axis label
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", scales.width / 2)
      .attr("y", scales.height + 35)
      .style("font-size", "12px")
      .text(xAxisLabel);

    // Add y-axis with logarithmic ticks
    svg.append("g").call(
      d3.axisLeft(scales.yScale).tickFormat((d) => {
        // Format ticks to be more readable for logarithmic scale
        if (d === 1 || d === 10 || d === 100 || d === 1000 || d === 10000) {
          return d.toString();
        } else if (d < 10) {
          return d.toFixed(1);
        }
        return d.toFixed(0);
      }),
    );

    // Add y-axis label
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -scales.height / 2)
      .style("font-size", "12px")
      .text(yAxisLabel);

    // Add chart title
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", scales.width / 2)
      .attr("y", -15)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(chartTitle);

    // Create tooltip
    tooltip = d3
      .select(containerElement)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "8px")
      .style("padding", "10px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("box-shadow", "0 4px 8px rgba(0,0,0,0.2)");

    // Add interaction area for tooltip
    svg
      .append("rect")
      .attr("width", scales.width)
      .attr("height", scales.height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mouseX, mouseY] = d3.pointer(event);
        const closestPoint = findClosestPoint(mouseX, mouseY);

        if (closestPoint) {
          const xPos = scales.xScale(new Date(closestPoint.date));
          const yPos = scales.yScale(closestPoint.count);
          const hashtagColor = hashStringToColor(closestPoint.hashtag);

          // Update tooltip content and position
          tooltip
            .style("opacity", 1)
            .style("left", `${event.offsetX + 15}px`)
            .style("top", `${event.offsetY - 28}px`)
            .html(`<div style="display: flex; align-items: center; margin-bottom: 4px;">
                 <div style="width: 12px; height: 12px; background-color: ${hashtagColor}; margin-right: 6px; border-radius: 50%;"></div>
                 <strong>${closestPoint.hashtag}</strong>
               </div>
               Date: ${new Date(closestPoint.date).toLocaleDateString()}<br/>
               Count: ${closestPoint.count}`);

          // Add highlight circle
          svg.selectAll(".hover-circle").remove();
          svg
            .append("circle")
            .attr("class", "hover-circle")
            .attr("cx", xPos)
            .attr("cy", yPos)
            .attr("r", 5)
            .style("fill", hashtagColor)
            .style("stroke", "#fff")
            .style("stroke-width", 2);
        } else {
          tooltip.style("opacity", 0);
          svg.selectAll(".hover-circle").remove();
        }
      })
      .on("mouseleave", function () {
        tooltip.style("opacity", 0);
        svg.selectAll(".hover-circle").remove();
      });

    // Create line generator - adapted for logarithmic scale
    const lineGenerator = (d) => {
      // Filter out any invalid dates or values <= 0 (invalid for log scale)
      const validPoints = d.timeline.filter((p) => {
        const date = new Date(p.date);
        return !isNaN(date.getTime()) && p.count > 0;
      });

      return d3
        .line()
        .x((p) => scales.xScale(new Date(p.date)))
        .y((p) => scales.yScale(p.count))
        .defined((p) => {
          const date = new Date(p.date);
          return !isNaN(date.getTime()) && p.count > 0;
        })(validPoints);
    };

    // Draw lines with deterministic colors
    svg
      .selectAll(".line")
      .data(hashtagsGrouped)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d) => hashStringToColor(d.hashtag))
      .attr("stroke-width", 1.5)
      .attr("d", lineGenerator);

    // Add legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${scales.width + 20}, 0)`);

    // Only show top 10 hashtags in legend if there are many
    const legendData = hashtagsGrouped.slice(0, 15);

    legend
      .selectAll(".legend-item")
      .data(legendData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`)
      .call((g) => {
        g.append("circle")
          .attr("r", 5)
          .attr("fill", (d) => hashStringToColor(d.hashtag));

        g.append("text")
          .attr("x", 10)
          .attr("y", 5)
          .attr("font-size", "10px")
          .text((d) =>
            d.hashtag.length > 15
              ? d.hashtag.substring(0, 15) + "..."
              : d.hashtag,
          );
      });

    if (hashtagsGrouped.length > 10) {
      legend
        .append("text")
        .attr("y", 15 * 20 + 10)
        .attr("font-size", "10px")
        .attr("font-style", "italic")
        .text(`+ ${hashtagsGrouped.length - 10} more`);
    }

    // Add faint grid lines for better readability
    svg
      .append("g")
      .attr("class", "grid y-grid")
      .call(d3.axisLeft(scales.yScale).tickSize(-scales.width).tickFormat(""))
      .style("stroke", "#e0e0e0")
      .style("stroke-opacity", 0.1);

    // Add appropriate dividers as vertical grid lines
    const gridTicks = showDays ? d3.timeDay.every(1) : d3.timeMonth.every(1);

    svg
      .append("g")
      .attr("class", "grid x-grid")
      .call(
        d3
          .axisBottom(scales.xScale)
          .tickSize(scales.height)
          .tickFormat("")
          .ticks(gridTicks),
      )
      .attr("transform", `translate(0,0)`)
      .style("stroke", "#e0e0e0")
      .style("stroke-opacity", 0.1);
  }

  // Update dimensions and recalculate chart when component mounts
  onMount(() => {
    if (containerElement) {
      const { width, height } = containerElement.getBoundingClientRect();
      dimensions = { width, height };
    }
  });

  // Update chart when data or dimensions change
  $: if (data && dimensions.width > 0 && dimensions.height > 0) {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }

    updateChart();
  }
</script>

<div bind:this={containerElement} class="w-full h-full relative">
  <svg bind:this={chartElement} width="100%" height="100%"></svg>
</div>
