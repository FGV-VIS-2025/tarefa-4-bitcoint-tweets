<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  
  // Interfaces
  interface HashtagData {
    hashtag: string;
    date: Date;
    count: number;
  }
  
  // Props
  export let data: HashtagData[] = [];
  export let chartTitle: string = "Hashtag Trends Over Time";
  export let xAxisLabel: string = "Months of the Year 2022";
  export let yAxisLabel: string = "Number of Tweets";
  
  let chartElement: SVGSVGElement;
  let containerElement: HTMLDivElement;
  let dimensions = { width: 0, height: 0 };
  let tooltip;
  
  // Group data by hashtag
  $: hashtagsGrouped = groupData(data);
  
  function groupData(inputData: HashtagData[]) {
    if (!inputData || inputData.length === 0) return [];
    
    const grouped = d3.group(inputData, d => d.hashtag);
    return Array.from(grouped, ([key, values]) => ({
      key,
      values
    }));
  }
  
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
  $: scales = calculateScales(data, dimensions);
  
  function calculateScales(inputData: HashtagData[], dims) {
    if (!inputData || inputData.length === 0 || dims.width === 0 || dims.height === 0) {
      return { xScale: null, yScale: null, margin: null };
    }
    
    // Define margins with more space for title and legend
    const margin = { top: 40, right: 120, bottom: 50, left: 70 };
    const width = dims.width - margin.left - margin.right;
    const height = dims.height - margin.top - margin.bottom;
    
    // Get year from data
    const year = inputData.length > 0 ? new Date(inputData[0].date).getFullYear() : 2022;
    
    // Create time scale for x-axis with all months visible
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st
    
    const xScale = d3.scaleTime()
      .domain([startDate, endDate])
      .range([0, width]);
    
    // Create linear scale for y-axis
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(inputData, d => d.count) || 0])
      .range([height, 0]);
    
    return { xScale, yScale, margin, width, height };
  }
  
  function findClosestPoint(mouseX, mouseY) {
    if (!scales.xScale || !scales.yScale || !hashtagsGrouped.length) return null;
    
    let closestPoint = null;
    let minDistance = Infinity;
    
    hashtagsGrouped.forEach(group => {
      group.values.forEach(point => {
        const xPos = scales.xScale(new Date(point.date));
        const yPos = scales.yScale(point.count);
        const distance = Math.sqrt(
          Math.pow(xPos - mouseX, 2) + Math.pow(yPos - mouseY, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });
    });
    
    return minDistance < 30 ? closestPoint : null; // 30px threshold for detection
  }
  
  function updateChart() {
    if (!data || data.length === 0 || !chartElement || 
        dimensions.width === 0 || dimensions.height === 0 || 
        !scales.xScale || !scales.yScale) return;
    
    // Clear previous chart
    d3.select(chartElement).selectAll("*").remove();
    
    // Create SVG container
    const svg = d3.select(chartElement)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${scales.margin.left},${scales.margin.top})`);
    
    // Create month formatter
    const monthFormat = d3.timeFormat("%B");
    
    // Add x-axis with all months
    svg.append("g")
      .attr("transform", `translate(0,${scales.height})`)
      .call(d3.axisBottom(scales.xScale)
        .tickFormat(d => monthFormat(d))
        .ticks(d3.timeMonth.every(1)) // Show every month
      );
    
    // Add x-axis label
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", scales.width / 2)
      .attr("y", scales.height + 35)
      .style("font-size", "12px")
      .text(xAxisLabel);
    
    // Add y-axis
    svg.append("g")
      .call(d3.axisLeft(scales.yScale));
    
    // Add y-axis label
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -scales.height / 2)
      .style("font-size", "12px")
      .text(yAxisLabel);
    
    // Add chart title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", scales.width / 2)
      .attr("y", -15)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(chartTitle);
    
    // Create tooltip
    tooltip = d3.select(containerElement)
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
    svg.append("rect")
      .attr("width", scales.width)
      .attr("height", scales.height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", function(event) {
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
          svg.append("circle")
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
      .on("mouseleave", function() {
        tooltip.style("opacity", 0);
        svg.selectAll(".hover-circle").remove();
      });
    
    // Create line generator
    const lineGenerator = d3.line<HashtagData>()
      .x(d => scales.xScale(new Date(d.date)))
      .y(d => scales.yScale(d.count));
    
    // Draw lines with deterministic colors
    svg.selectAll(".line")
      .data(hashtagsGrouped)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", d => hashStringToColor(d.key))
      .attr("stroke-width", 1.5)
      .attr("d", d => lineGenerator(d.values));
    
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${scales.width + 20}, 0)`);
    
    // Only show top 10 hashtags in legend if there are many
    const legendData = hashtagsGrouped.slice(0, 10);
    
    legend.selectAll(".legend-item")
      .data(legendData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`)
      .call(g => {
        g.append("circle")
          .attr("r", 5)
          .attr("fill", d => hashStringToColor(d.key));
        
        g.append("text")
          .attr("x", 10)
          .attr("y", 5)
          .attr("font-size", "10px")
          .text(d => d.key.length > 15 ? d.key.substring(0, 15) + '...' : d.key);
      });
    
    if (hashtagsGrouped.length > 10) {
      legend.append("text")
        .attr("y", 10 * 20 + 10)
        .attr("font-size", "10px")
        .attr("font-style", "italic")
        .text(`+ ${hashtagsGrouped.length - 10} more`);
    }
    
    // Add faint grid lines for better readability
    svg.append("g")
      .attr("class", "grid y-grid")
      .call(
        d3.axisLeft(scales.yScale)
          .tickSize(-scales.width)
          .tickFormat("")
      )
      .style("stroke", "#e0e0e0")
      .style("stroke-opacity", 0.05);
      
    // Add month dividers as vertical grid lines
    svg.append("g")
      .attr("class", "grid x-grid")
      .call(
        d3.axisBottom(scales.xScale)
          .tickSize(scales.height)
          .tickFormat("")
          .ticks(d3.timeMonth.every(1))
      )
      .attr("transform", `translate(0,0)`)
      .style("stroke", "#e0e0e0")
      .style("stroke-opacity", 0.05);
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