<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";

  interface TimeLineItem {
    date: string;
    count: number;
  }

  interface HashtagItem {
    hashtag: string;
    timeline: TimeLineItem[];
  }

  interface CountByDateType {
    date: Date;
    count: number;
  }

  export let data: HashtagItem[] = [];
  export let title: string = "Tweet Activity over the Year 2022";

  let d3Container: HTMLDivElement;

  $: countByDate = getCountByDate(data);

  function getCountByDate(data: HashtagItem[]): CountByDateType[] {
    const countMap = new Map<string, number>();
    
    data.forEach(item => {
      const { timeline } = item;
      
      if (timeline) {
        const timelineItems = Array.isArray(timeline) ? timeline : [timeline];
        
        timelineItems.forEach(timeItem => {
          if (timeItem && timeItem.date) {
            const dateStr = timeItem.date;
            const count = timeItem.count || 0;
            
            const currentCount = countMap.get(dateStr) || 0;
            countMap.set(dateStr, currentCount + count);
          }
        });
      }
    });
    
    const result: CountByDateType[] = [];
    countMap.forEach((count, dateStr) => {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        result.push({ date, count });
      }
    });
    
    return result;
  }

  function createHeatMap(data: CountByDateType[]) {
    if (!d3Container) return;

    d3.select(d3Container).selectAll("*").remove();
    if (!data || data.length === 0) {
      console.warn("No data available for the heatmap");
      return;
    }
  
    // Get container dimensions
    const containerWidth = d3Container.clientWidth || 800;
    const containerHeight = d3Container.clientHeight || 320;

    // Set dimensions and margins
    const cellSize = Math.floor(containerWidth / 55); // Adapt cell size to container width
    const cellMargin = Math.max(1, Math.floor(cellSize / 6));
    const fullCellSize = cellSize + cellMargin;

    const margin = { top: 40, right: 30, bottom: 50, left: 40 };

    // Create color scale based on contribution count
    const maxCount = d3.max(data, (d) => d.count) || 10;
    const colorScale = d3
      .scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateGreens);

    // Create SVG with responsive dimensions
    const svg = d3
      .select(d3Container)
      .append("svg")
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .style("background-color", "#ffffff") // Light mode background
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add title
    svg
      .append("text")
      .attr("x", (containerWidth - margin.left - margin.right) / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .style("fill", "#333333")
      .text(title);

    // Get full date range
    const dateExtent = d3.extent(data, (d) => d.date) as [Date, Date];
    let startDate: Date, endDate: Date;

    if (dateExtent[0] && dateExtent[1]) {
      startDate = d3.timeWeek.floor(dateExtent[0]);
      endDate = d3.timeWeek.ceil(dateExtent[1]);
    } else {
      // Fallback to one year of data
      endDate = new Date();
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate = d3.timeWeek.floor(startDate);
      endDate = d3.timeWeek.ceil(endDate);
    }

    // Format months along the top
    const months = d3.timeMonths(
      d3.timeMonth.floor(startDate),
      d3.timeMonth.ceil(endDate)
    );

    // Add month labels
    svg
      .selectAll(".month")
      .data(months)
      .enter()
      .append("text")
      .attr("class", "month")
      .style("font-size", `${Math.max(9, cellSize * 0.45)}px`)
      .style("fill", "#666666")
      .attr("x", (d) => {
        const firstDayOfMonth = d;
        const weekNum = Math.floor(
          (firstDayOfMonth.getTime() - startDate.getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        );
        return weekNum * fullCellSize;
      })
      .attr("y", -5)
      .text((d) => {
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return monthNames[d.getMonth()];
      });

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    svg
      .selectAll(".day")
      .data(days)
      .enter()
      .append("text")
      .attr("class", "day")
      .style("font-size", `${Math.max(9, cellSize * 0.35)}px`)
      .style("font-weight", "500")
      .style("fill", "#666666")
      .attr("x", -25)
      .attr("y", (d, i) => i * fullCellSize + fullCellSize / 2 + 3)
      .style("text-anchor", "start")
      .text((d) => d);

    // Create week groups
    const weeks = svg
      .selectAll(".week")
      .data(d3.range(0, 53))
      .enter()
      .append("g")
      .attr("class", "week")
      .attr("transform", (d) => `translate(${d * fullCellSize}, 0)`);

    weeks
      .selectAll(".day-cell")
      .data((weekNum) => {
        return d3.range(7).map((dayNum) => {
          const cellDate = new Date(startDate);
          cellDate.setDate(cellDate.getDate() + weekNum * 7 + dayNum);

          if (cellDate > endDate) {
            return { date: cellDate, count: null };
          }
          const matchingData = data.find(
            (d) =>
              d.date.getFullYear() === cellDate.getFullYear() &&
              d.date.getMonth() === cellDate.getMonth() &&
              d.date.getDate() === cellDate.getDate()
          );

          return {
            date: cellDate,
            count: matchingData ? matchingData.count : 0,
          };
        });
      })
      .enter()
      .append("rect")
      .attr("class", "day-cell")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("y", (d) => {
        const dayOfWeek = d.date.getDay();
        return dayOfWeek * fullCellSize;
      })
      .attr("fill", (d) => {
        if (d.count === null) return "transparent";
        return d.count > 0 ? colorScale(d.count) : "#ebedf0";
      })
      .style("stroke", "#ffffff")
      .style("stroke-width", "1px")
      .append("title")
      .text((d) => {
        const options = {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        };
        const dateStr = d.date.toLocaleDateString("en-US", options);
        return `${d.count} tweets on ${dateStr}`;
      });

    // Add legend
    const legendWidth = 150;
    const legendHeight = 15;
    const legendX =
      (containerWidth - margin.left - margin.right - legendWidth) / 2;
    const legendY = containerHeight - margin.top - margin.bottom + 40;

    // Create gradient for legend
    const defs = svg.append("defs");
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "color-scale-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    // Add color stops to gradient
    const stops = [0, 0.25, 0.5, 0.75, 1];
    stops.forEach((stop) => {
      linearGradient
        .append("stop")
        .attr("offset", `${stop * 100}%`)
        .attr("stop-color", colorScale(stop * maxCount));
    });

    // Add gradient rectangle
    svg
      .append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#color-scale-gradient)")
      .style("stroke", "#ccc")
      .style("stroke-width", "0.5px");

    // Add legend text
    svg
      .append("text")
      .attr("x", legendX)
      .attr("y", legendY - 5)
      .style("text-anchor", "start")
      .style("font-size", "12px")
      .style("fill", "#666666")
      .text(0);

    svg
      .append("text")
      .attr("x", legendX + legendWidth)
      .attr("y", legendY - 5)
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .style("fill", "#666666")
      .text(maxCount);
  }

  $: if (d3Container && countByDate) {
    createHeatMap(countByDate);
  }

  onMount(() => {
    setTimeout(() => {
      if (d3Container && countByDate) {
        createHeatMap(countByDate);
      }
    }, 50);

    const handleResize = () => {
      if (d3Container && countByDate) {
        createHeatMap(countByDate);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });
</script>

<div class="w-full h-full">
  <div bind:this={d3Container} class="w-full h-full"></div>
</div>