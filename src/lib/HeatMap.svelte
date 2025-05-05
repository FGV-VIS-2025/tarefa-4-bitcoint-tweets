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

    data.forEach((item) => {
      const { timeline } = item;

      if (timeline) {
        const timelineItems = Array.isArray(timeline) ? timeline : [timeline];

        timelineItems.forEach((timeItem) => {
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

    const containerWidth = d3Container.clientWidth || 1200;
    const containerHeight = d3Container.clientHeight || 400;

    const firstDayOf2022 = new Date(2022, 0, 1);
    const lastDayOf2022 = new Date(2022, 11, 31);
    const startDayOfWeek = firstDayOf2022.getDay();
    const endDayOfWeek = lastDayOf2022.getDay();

    const startDate = new Date(firstDayOf2022);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const endDate = new Date(lastDayOf2022);
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));

    const diffInTime = endDate.getTime() - startDate.getTime();
    const diffInDays = diffInTime / (1000 * 3600 * 24);
    const numberOfWeeks = Math.ceil(diffInDays / 7);

    const margin = { top: 40, right: 100, bottom: 30, left: 60 };

    const legendWidth = 14;
    const legendGap = 16;
    const totalLegendSpace = legendWidth + legendGap + 60;

    const availableWidth =
      containerWidth - margin.left - margin.right - totalLegendSpace;
    const availableHeight = containerHeight - margin.top - margin.bottom;

    const cellSize = Math.min(
      Math.floor(availableWidth / numberOfWeeks),
      Math.floor(availableHeight / 8)
    );

    const cellMargin = Math.max(1, Math.floor(cellSize / 6));
    const fullCellSize = cellSize + cellMargin;

    const maxCount = d3.max(data, (d) => d.count) || 10;
    const colorScale = d3
      .scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateGreens);

    const svgWidth = Math.max(
      containerWidth,
      numberOfWeeks * fullCellSize +
        margin.left +
        margin.right +
        totalLegendSpace
    );

    const svg = d3
      .select(d3Container)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", containerHeight)
      .style("background-color", "#ffffff");

    const svgChart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    svgChart
      .append("text")
      .attr("x", availableWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .style("fill", "#333333")
      .text(title);

    const months = d3.timeMonths(
      new Date(2022, 0, 1),
      new Date(2022, 11, 31)
    );

    svgChart
      .selectAll(".month")
      .data(months)
      .enter()
      .append("text")
      .attr("class", "month")
      .style("font-size", `${Math.max(11, cellSize * 0.45)}px`)
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

    svgChart
      .selectAll(".day")
      .data(days)
      .enter()
      .append("text")
      .attr("class", "day")
      .style("font-size", `${Math.max(10, cellSize * 0.35)}px`)
      .style("font-weight", "500")
      .style("fill", "#666666")
      .attr("x", -25)
      .attr("y", (d, i) => i * fullCellSize + fullCellSize / 2 + 3)
      .style("text-anchor", "end")
      .text((d) => d);

    const weeks = svgChart
      .selectAll(".week")
      .data(d3.range(0, numberOfWeeks))
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

          let count = 0;
          if (cellDate.getFullYear() === 2022) {
            const matchingData = data.find(
              (d) =>
                d.date.getFullYear() === cellDate.getFullYear() &&
                d.date.getMonth() === cellDate.getMonth() &&
                d.date.getDate() === cellDate.getDate()
            );
            count = matchingData ? matchingData.count : 0;
          }

          return {
            date: cellDate,
            count: count,
            isInYear: cellDate.getFullYear() === 2022,
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
        if (!d.isInYear) return "#e8e8e8";
        return colorScale(d.count);
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

    const legendHeight = 160;
    const legendX = numberOfWeeks * fullCellSize + legendGap;
    const legendY = 10;

    const defs = svg.append("defs");
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "color-scale-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    const stops = [0, 0.25, 0.5, 0.75, 1];
    stops.forEach((stop) => {
      linearGradient
        .append("stop")
        .attr("offset", `${stop * 100}%`)
        .attr("stop-color", colorScale(stop * maxCount));
    });

    svgChart
      .append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#color-scale-gradient)")
      .style("stroke", "#ccc")
      .style("stroke-width", "0.5px");

    svgChart
      .append("text")
      .attr("x", legendX + legendWidth + 5)
      .attr("y", legendY + legendHeight + 4)
      .style("text-anchor", "start")
      .style("font-size", "14px")
      .style("fill", "#666666")
      .text("0");

    svgChart
      .append("text")
      .attr("x", legendX + legendWidth + 5)
      .attr("y", legendY + 4)
      .style("text-anchor", "start")
      .style("font-size", "14px")
      .style("fill", "#666666")
      .text(maxCount);
  }

  onMount(() => {
    createHeatMap(countByDate);

    const handleResize = () => {
      if (d3Container) {
        createHeatMap(countByDate);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  $: if (d3Container) {
    createHeatMap(countByDate);
  }
</script>

<div class="w-full h-full">
  <div bind:this={d3Container} class="w-full h-full"></div>
</div>