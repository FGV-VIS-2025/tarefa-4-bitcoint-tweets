<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";

  interface MonthPoint {
    month: string;
    count: number;
  }

  interface HashtagData {
    hashtag: string;
    months: MonthPoint[];
    total: number;
  }

  export let filteredData: HashtagData[] = [];
  export let chartTitle: string = "Hashtag Trends by Month in 2022";
  export let xAxisLabel: string = "Months of the Year";
  export let yAxisLabel: string = "Number of Tweets (log scale)";

  let chartElement: SVGSVGElement;
  let containerElement: HTMLDivElement;
  let dimensions = { width: 0, height: 0 };
  let tooltip;

  $: data = filteredData.slice(0, 50);

  function hashStringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    const s = 70 + Math.abs((hash >> 8) % 30);
    const l = 35 + Math.abs((hash >> 16) % 30);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  $: scales = calculateScales(data, dimensions);

  const monthOrder = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const shortMonths = [
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

  function calculateScales(inputData: HashtagData[], dims) {
    if (
      !inputData ||
      inputData.length === 0 ||
      dims.width === 0 ||
      dims.height === 0
    ) {
      return { xScale: null, yScale: null, margin: null };
    }

    const margin = { top: 40, right: 120, bottom: 50, left: 70 };
    const width = dims.width - margin.left - margin.right;
    const height = dims.height - margin.top - margin.bottom;

    const allMonthPoints: MonthPoint[] = [];
    inputData.forEach((hashtag) => {
      hashtag.months.forEach((point) => {
        allMonthPoints.push(point);
      });
    });

    const xScale = d3
      .scaleBand()
      .domain(monthOrder)
      .range([0, width])
      .padding(0.1);

    let minCount =
      d3.min(allMonthPoints, (d) => (d.count > 0 ? d.count : null)) || 1;
    minCount = Math.max(0.1, minCount);

    const yScale = d3
      .scaleLog()
      .domain([minCount, d3.max(allMonthPoints, (d) => d.count) || 10])
      .range([height, 0])
      .nice();

    return { xScale, yScale, margin, width, height };
  }

  function findClosestPoint(mouseX, mouseY) {
    if (!scales.xScale || !scales.yScale || !data.length) return null;

    let closestPoint = null;
    let minDistance = Infinity;
    let closestHashtag = null;

    data.forEach((hashtag) => {
      hashtag.months.forEach((point) => {
        if (point.count <= 0) return;

        const xPos = scales.xScale(point.month) + scales.xScale.bandwidth() / 2;
        const yPos = scales.yScale(point.count);
        const distance = Math.sqrt(
          Math.pow(xPos - mouseX, 2) + Math.pow(yPos - mouseY, 2)
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

    d3.select(chartElement).selectAll("*").remove();

    const svg = d3
      .select(chartElement)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr(
        "transform",
        `translate(${scales.margin.left},${scales.margin.top})`
      );

    svg
      .append("g")
      .attr("transform", `translate(0,${scales.height})`)
      .call(d3.axisBottom(scales.xScale).tickFormat((d, i) => shortMonths[i]));

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", scales.width / 2)
      .attr("y", scales.height + 35)
      .style("font-size", "12px")
      .text(xAxisLabel);

    const yAxis = d3
      .axisLeft(scales.yScale)
      .ticks(5, d3.format(",.0f"))
      .tickFormat((d) => {
        const value = d.valueOf();
        if (value >= 10000) return d3.format(".0f")(value);
        if (value >= 1000) return d3.format(",.0f")(value);
        if (value >= 100) return d3.format(".0f")(value);
        if (value >= 10) return d3.format(".1f")(value);
        if (value >= 1) return value.toString();
        return d3.format(".1f")(value);
      });

    svg.append("g").call(yAxis);

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -scales.height / 2)
      .style("font-size", "12px")
      .text(yAxisLabel);

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", scales.width / 2)
      .attr("y", -15)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(chartTitle);

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
          // Dim all lines and points
          d3.selectAll(".line").style("opacity", 0.15);
          d3.selectAll(".dot").style("opacity", 0.15);

          // Highlight current line and points
          d3.select(`.line-${closestPoint?.hashtag}`).style("opacity", 1);
          d3.selectAll(`.dot-${closestPoint?.hashtag}`).style("opacity", 1);

          const xPos =
            scales.xScale(closestPoint.month) + scales.xScale.bandwidth() / 2;
          const yPos = scales.yScale(closestPoint.count);
          const hashtagColor = hashStringToColor(closestPoint.hashtag);

          tooltip
            .style("opacity", 1)
            .style("left", `${event.offsetX + 15}px`)
            .style("top", `${event.offsetY - 28}px`)
            .html(`<div style="display: flex; align-items: center; margin-bottom: 4px;">
                 <div style="width: 12px; height: 12px; background-color: ${hashtagColor}; margin-right: 6px; border-radius: 50%;"></div>
                 <strong>${closestPoint.hashtag}</strong>
               </div>
               Month: ${closestPoint.month}<br/>
               Count: ${closestPoint.count}`);

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
        d3.selectAll(".line").style("opacity", 1);
        d3.selectAll(".dot").style("opacity", 1);
      });

    const lineGenerator = (d) => {
      const validPoints = d.months.filter((p) => p.count > 0);
      validPoints.sort(
        (a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
      );
      const points = validPoints.map((p) => ({
        x: scales.xScale(p.month) + scales.xScale.bandwidth() / 2,
        y: scales.yScale(p.count),
      }));
      if (points.length < 2) return null;
      const linePath = d3
        .line<{ x: number; y: number }>()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveCardinal.tension(0.5));
      return linePath(points);
    };

    svg
      .selectAll(".line")
      .data(data)
      .join("path")
      .attr("fill", "none")
      .attr("class", (d) => `line line-${d.hashtag}`)
      .attr("stroke", (d) => hashStringToColor(d.hashtag))
      .attr("stroke-width", 2)
      .attr("d", lineGenerator);

    data.forEach((hashtag) => {
      const validPoints = hashtag.months.filter((p) => p.count > 0);

      svg
        .selectAll(`.dot-${hashtag.hashtag}`)
        .data(validPoints)
        .join("circle")
        .attr("class", `dot dot-${hashtag.hashtag}`)
        .attr(
          "cx",
          (d) => scales.xScale(d.month) + scales.xScale.bandwidth() / 2
        )
        .attr("cy", (d) => scales.yScale(d.count))
        .attr("r", 3)
        .attr("fill", hashStringToColor(hashtag.hashtag));
    });

    const legend = svg
      .append("g")
      .attr("transform", `translate(${scales.width + 20}, 0)`);

    const legendData = data.slice(0, 15);

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
              : d.hashtag
          );
      });

    if (data.length > 10) {
      legend
        .append("text")
        .attr("y", 15 * 20 + 10)
        .attr("font-size", "10px")
        .attr("font-style", "italic")
        .text(`+ ${data.length - 10} more`);
    }

    svg
      .append("g")
      .attr("class", "grid y-grid")
      .call(d3.axisLeft(scales.yScale).tickSize(-scales.width).tickFormat(""))
      .style("stroke", "#e0e0e0")
      .style("stroke-opacity", 0.1);

    svg
      .append("g")
      .attr("class", "grid x-grid")
      .selectAll("line")
      .data(monthOrder)
      .join("line")
      .attr("x1", (d) => scales.xScale(d) + scales.xScale.bandwidth() / 2)
      .attr("x2", (d) => scales.xScale(d) + scales.xScale.bandwidth() / 2)
      .attr("y1", 0)
      .attr("y2", scales.height)
      .style("stroke", "#e0e0e0")
      .style("stroke-opacity", 0.1);
  }

  onMount(() => {
    if (containerElement) {
      const { width, height } = containerElement.getBoundingClientRect();
      dimensions = { width, height };
    }
  });

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
