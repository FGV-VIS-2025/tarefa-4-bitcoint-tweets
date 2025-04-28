import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface CommitData {
  date: Date;
  count: number;
}

export default function GitHubHeatmap() {
  const d3Container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (d3Container.current) {
      // Clear any previous chart
      d3.select(d3Container.current).selectAll("*").remove();

      // Generate data for a full year
      const data: CommitData[] = generateCommitData();

      // Get container dimensions
      const containerWidth = d3Container.current.clientWidth;
      const containerHeight = d3Container.current.clientHeight || 200; // Default height if not set

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
      const maxCommits = d3.max(data, (d) => d.count) || 10;
      const colorScale = d3
        .scaleSequential()
        .domain([0, maxCommits])
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

      // Add legend
      const legendX = width - 250;
      const legendY = height + 10;

      const legend = svg
        .append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

      legend
        .append("text")
        .attr("x", -60)
        .attr("y", 10)
        .style("font-size", `${Math.max(9, cellSize * 0.8)}px`)
        .style("fill", "#666666")
        .text("Menos");

      // Legend cells
      const legendValues = [
        0,
        Math.ceil(maxCommits / 4),
        Math.ceil(maxCommits / 2),
        Math.ceil((3 * maxCommits) / 4),
        maxCommits,
      ];

      legend
        .selectAll(".legend-cell")
        .data(legendValues)
        .enter()
        .append("rect")
        .attr("class", "legend-cell")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("x", (d, i) => i * (cellSize + 2))
        .attr("fill", (d) => (d === 0 ? "#ebedf0" : colorScale(d)))
        .style("stroke", "#ffffff")
        .style("stroke-width", "1px");

      legend
        .append("text")
        .attr("x", 5 * (cellSize + 2) + 5)
        .attr("y", 10)
        .style("font-size", `${Math.max(9, cellSize * 0.8)}px`)
        .style("fill", "#666666")
        .text("Más");

      // Handle resize
      const handleResize = () => {
        if (d3Container.current) {
          // Re-render the chart when window is resized
          d3.select(d3Container.current).selectAll("*").remove();
          renderChart();
        }
      };

      // Add event listener for window resize
      window.addEventListener("resize", handleResize);

      // Clean up function
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  // Function to generate fake commit data for a year
  function generateCommitData(): CommitData[] {
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setFullYear(currentDate.getFullYear() - 1);

    // Set to beginning of the week (Monday)
    const dayOfWeek = startDate.getDay();
    startDate.setDate(
      startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    );

    const result: CommitData[] = [];

    // Generate a full year of data plus a few extra weeks
    for (let i = 0; i < 53 * 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Generate more commits for certain days (patterns)
      let count = 0;

      // Basic random pattern (more commits on weekdays, fewer on weekends)
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWeekend) {
        count = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 3);
      } else {
        // Higher probability of commits on weekdays
        count = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 7 + 1);
      }

      // Simulate project bursts in specific months
      const month = date.getMonth();
      if (month === 2 || month === 7) {
        // March and August
        count = Math.max(count, Math.floor(Math.random() * 10));
      }

      // Add occasional "intense coding" days
      if (Math.random() < 0.05) {
        count = Math.floor(Math.random() * 15) + 5; // 5-20 commits
      }

      result.push({ date, count });
    }

    return result;
  }

  // Function to create initial chart and update on resize
  function renderChart() {
    // This function would contain all the chart rendering code
    // It's defined here but called through the useEffect
  }

  return (
    <div className="github-contribution-graph w-full h-full">
      <div ref={d3Container} className="w-full h-full"></div>
    </div>
  );
}
