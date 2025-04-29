// @ts-nocheck

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import * as d3 from "d3";

// Improved TypeScript interfaces
interface HashtagData {
  hashtag: string;
  date: Date;
  count: number;
}

interface LineChartProps {
  data: HashtagData[];
}

interface Dimensions {
  width: number;
  height: number;
}
const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const chartRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  // Memoized function to get container dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  // Effect to handle resize and get initial dimensions
  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [updateDimensions]);

  // Memoize data grouping to avoid recalculation
  const hashtagsGrouped = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group data by hashtag
    const grouped = d3.group(data, (d) => d.hashtag);

    // Convert Map to Array for visualization compatibility
    return Array.from(grouped, ([key, values]) => ({
      key,
      values,
    }));
  }, [data]);

  // Memoize scales and domains
  const { xScale, yScale, colorScale } = useMemo(() => {
    if (
      !data ||
      data.length === 0 ||
      dimensions.width === 0 ||
      dimensions.height === 0
    ) {
      return { xScale: null, yScale: null, colorScale: null, dates: [] };
    }

    const margin = { top: 10, right: 30, bottom: 30, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Extract dates and create time scale
    const dates = data.map((d) => new Date(d.date));
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([0, width]);

    // Create linear scale for y-axis
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count) || 0])
      .range([height, 0]);

    // Create color scale
    const hashtags = Array.from(new Set(data.map((d) => d.hashtag)));
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(hashtags)
      .range(
        d3.quantize(
          (t) => d3.interpolateRainbow(t),
          hashtags.length > 0 ? hashtags.length : 1
        )
      );

    return { xScale, yScale, colorScale, dates, margin };
  }, [data, dimensions.width, dimensions.height]);

  // Memoized function to find closest point to mouse position
  const findClosestPoint = useCallback(
    (mouseX: number, mouseY: number) => {
      if (!xScale || !yScale || !hashtagsGrouped.length) return null;

      let closestPoint: HashtagData | null = null;
      let minDistance = Infinity;

      hashtagsGrouped.forEach((group) => {
        group.values.forEach((point) => {
          const xPos = xScale(new Date(point.date));
          const yPos = yScale(point.count);
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
    },
    [xScale, yScale, hashtagsGrouped]
  );

  // Effect to draw the chart
  useEffect(() => {
    if (
      !data ||
      data.length === 0 ||
      !chartRef.current ||
      dimensions.width === 0 ||
      dimensions.height === 0 ||
      !xScale ||
      !yScale ||
      !colorScale
    )
      return;

    // Clear previous chart if exists
    d3.select(chartRef.current).selectAll("*").remove();

    // Configure margins and dimensions
    const margin = { top: 10, right: 30, bottom: 30, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3
      .select(chartRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5));

    // Add Y axis
    svg.append("g").call(d3.axisLeft(yScale));

    // Create a tooltip div with memoized styles
    const tooltip = d3
      .select(containerRef.current)
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

    // Create the tooltip interaction area
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mouseX, mouseY] = d3.pointer(event);
        const closestPoint = findClosestPoint(mouseX, mouseY);

        if (closestPoint) {
          const xPos = xScale(new Date(closestPoint.date));
          const yPos = yScale(closestPoint.count);

          // Update tooltip content and position with color indicator
          tooltip
            .style("opacity", 1)
            .style("left", `${event.offsetX + 15}px`)
            .style("top", `${event.offsetY - 28}px`)
            .html(`<div style="display: flex; align-items: center; margin-bottom: 4px;">
                     <div style="width: 12px; height: 12px; background-color: ${colorScale(
                       closestPoint.hashtag
                     )}; margin-right: 6px; border-radius: 50%;"></div>
                     <strong>${closestPoint.hashtag}</strong>
                   </div>
                   Date: ${new Date(
                     closestPoint.date
                   ).toLocaleDateString()}<br/>
                   Count: ${closestPoint.count}`);

          // Add highlight circle
          svg.selectAll(".hover-circle").remove();
          svg
            .append("circle")
            .attr("class", "hover-circle")
            .attr("cx", xPos)
            .attr("cy", yPos)
            .attr("r", 5)
            .style("fill", colorScale(closestPoint.hashtag))
            .style("stroke", "#fff")
            .style("stroke-width", 2);
        } else {
          // Hide tooltip when not over any point
          tooltip.style("opacity", 0);
          svg.selectAll(".hover-circle").remove();
        }
      })
      .on("mouseleave", function () {
        // Hide tooltip and highlight when mouse leaves chart area
        tooltip.style("opacity", 0);
        svg.selectAll(".hover-circle").remove();
      });

    // Create line generator once
    const lineGenerator = d3
      .line<HashtagData>()
      .x((d) => xScale(new Date(d.date)))
      .y((d) => yScale(d.count));

    // Draw the lines
    svg
      .selectAll(".line")
      .data(hashtagsGrouped)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d) => colorScale(d.key))
      .attr("stroke-width", 1.5)
      .attr("d", (d) => lineGenerator(d.values));

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [
    data,
    dimensions,
    xScale,
    yScale,
    colorScale,
    hashtagsGrouped,
    findClosestPoint,
  ]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={chartRef} width="100%" height="100%"></svg>
    </div>
  );
};

export default LineChart;
