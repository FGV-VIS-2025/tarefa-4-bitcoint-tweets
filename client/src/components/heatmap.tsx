import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface HashtagData {
  hashtag: string;
  date: Date;
  count: number;
}

type HeatMapProps = {
  initialData: HashtagData[];
};

export default function HeatMap({ initialData }: HeatMapProps) {
  const d3Container = useRef<HTMLDivElement>(null);

  console.log("initialData", initialData);

  useEffect(() => {
    if (d3Container.current) {
      // Clear any previous chart
      d3.select(d3Container.current).selectAll("*").remove();

      // Generate data for a full year
      const data: HashtagData[] = initialData;

      // Get container dimensions
      const containerWidth = d3Container.current.clientWidth;
      const containerHeight = d3Container.current.clientHeight || 200;

      // Set dimensions and margins
      const cellSize = Math.floor(containerWidth / 55); // Adapt cell size to container width
      const cellMargin = Math.max(1, Math.floor(cellSize / 6));
      const fullCellSize = cellSize + cellMargin;

      const margin = { top: 20, right: 30, bottom: 20, left: 40 };
      const width = containerWidth - margin.left - margin.right;
      const height = Math.min(
        containerHeight - margin.top - margin.bottom,
        7 * fullCellSize
      );

      // Create color scale based on contribution count
      const maxHashtagCount = d3.max(data, (d) => d.count) || 10;
      const colorScale = d3
        .scaleSequential()
        .domain([0, maxHashtagCount])
        .interpolator(d3.interpolateGreens);

      // Create SVG with responsive dimensions
      const svg = d3
        .select(d3Container.current)
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .style("background-color", "#ffffff") // Light mode background
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Get full date range
      const dateExtent = d3.extent(data, (d) => d.date) as [Date, Date];
      const startDate = dateExtent[0];
      const endDate = dateExtent[1];

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
        .style("font-size", `${Math.max(9, cellSize * 0.8)}px`)
        .style("fill", "#666666") // Dark gray for light mode
        .attr("x", (d) => {
          // Calculate the week number from the start date
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

      // Add day of week labels
      const days = ["Mon", "Wed", "Fri"];
      const dayIndexes = [0, 2, 4]; // Monday is 0, Wednesday is 2, Friday is 4

      svg
        .selectAll(".day")
        .data(dayIndexes)
        .enter()
        .append("text")
        .attr("class", "day")
        .style("font-size", `${Math.max(9, cellSize * 0.8)}px`)
        .style("fill", "#666666")
        .attr("x", -25)
        .attr("y", (d) => d * fullCellSize + fullCellSize / 2 + 3) // Centered with the cell
        .style("text-anchor", "start")
        .text((d, i) => days[i]);

      // Create week groups
      const weeks = svg
        .selectAll(".week")
        .data(d3.range(0, 53)) // 53 weeks in a year
        .enter()
        .append("g")
        .attr("class", "week")
        .attr("transform", (d) => `translate(${d * fullCellSize}, 0)`);

      // Create day cells within each week
      weeks
        .selectAll(".day-cell")
        .data((weekNum) => {
          // For each week, return the data for all 7 days
          return d3.range(7).map((dayNum) => {
            // Calculate the date for this cell
            const cellDate = new Date(startDate);
            cellDate.setDate(cellDate.getDate() + weekNum * 7 + dayNum);

            // Find the data for this date
            const matchingData = data.find(
              (d) =>
                d.date.getDate() === cellDate.getDate() &&
                d.date.getMonth() === cellDate.getMonth() &&
                d.date.getFullYear() === cellDate.getFullYear()
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
        .attr("rx", 2) // Rounded corners
        .attr("ry", 2)
        .attr("y", (d) => {
          const dayOfWeek = d.date.getDay();
          const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday is 0
          return adjustedDay * fullCellSize;
        })
        .attr("fill", (d) => (d.count > 0 ? colorScale(d.count) : "#ebedf0")) // Light gray for empty cells
        .style("stroke", "#ffffff")
        .style("stroke-width", "1px")
        .append("title") // Tooltip on hover
        .text((d) => {
          const options = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          } as const;
          const dateStr = d.date.toLocaleDateString("es-ES", options);
          return `${d.count} contribuciones el ${dateStr}`;
        });

      return () => {};
    }
  }, [initialData]);

  return (
    <div className="github-contribution-graph w-full h-full">
      <div ref={d3Container} className="w-full h-full"></div>
    </div>
  );
}
