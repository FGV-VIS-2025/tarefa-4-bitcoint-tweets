// @ts-nocheck

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import wordcloudData from "../assets/wordcloud-data.json";

interface WordItem {
  text: string;
  value: number;
}

interface WordCloudProps {
  words?: WordItem[];
  fontSizeScale?: number;
  colorScheme?: string[];
}

const WordCloud: React.FC<WordCloudProps> = ({
  words = [],
  fontSizeScale = 30, // Increased from 15 to make words larger
  colorScheme = d3.schemeCategory10,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Default data to use if no words are provided
  const defaultWords: WordItem[] = useMemo(() => wordcloudData, []);

  // Use provided words or default to example data
  const displayWords = words.length > 0 ? words : defaultWords;

  // Update dimensions based on container size
  const updateDimensions = () => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  };

  // Effect to handle resize and get initial dimensions
  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateDimensions);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  // Create font size scale based on word value
  const fontSize = d3
    .scaleLinear()
    .domain([
      d3.min(displayWords, (d) => d.value) || 0,
      d3.max(displayWords, (d) => d.value) || 1,
    ])
    .range([14, fontSizeScale]); // Increased minimum font size from 12 to 14

  // Effect to create and update the word cloud
  useEffect(() => {
    if (
      !svgRef.current ||
      displayWords.length === 0 ||
      dimensions.width === 0 ||
      dimensions.height === 0
    )
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear the SVG

    // Set responsive viewBox
    svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);

    // Create container to center the word cloud
    const container = svg
      .append("g")
      .attr(
        "transform",
        `translate(${dimensions.width / 2}, ${dimensions.height / 2})`
      );

    // Colors for words
    const color = d3.scaleOrdinal(colorScheme);

    // Calculate visualization area size
    const visualizationArea = Math.min(dimensions.width, dimensions.height);

    // Adjust font size scale based on available area - increased scaling factor
    const scaleFactor = visualizationArea / 500; // Changed from 800 to 500 to make words larger
    const adjustedFontSizeScale = d3
      .scaleLinear()
      .domain([
        d3.min(displayWords, (d) => d.value) || 0,
        d3.max(displayWords, (d) => d.value) || 1,
      ])
      .range([14 * scaleFactor, fontSizeScale * scaleFactor]);

    // Add words to SVG with initial random positions
    const words = container
      .selectAll("text")
      .data(displayWords)
      .enter()
      .append("text")
      .style("font-size", (d) => `${adjustedFontSizeScale(d.value)}px`)
      .style("font-family", "Arial, sans-serif")
      .style("font-weight", (d) => (d.value > 50 ? "bold" : "normal"))
      .style("fill", (_, i) => color(i.toString()))
      .style("cursor", "pointer")
      .text((d) => d.text)
      .attr("text-anchor", "middle")
      .attr("transform", (d) => {
        // Random initial position
        const x = (Math.random() - 0.5) * (dimensions.width * 0.8);
        const y = (Math.random() - 0.5) * (dimensions.height * 0.8);
        return `translate(${x},${y})`;
      })
      .on("mouseover", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .style("fill", "#ff6600")
          .style(
            "font-size",
            (d) => `${adjustedFontSizeScale(d.value) * 1.2}px`
          );
      })
      .on("mouseout", function (_, i) {
        d3.select(this)
          .transition()
          .duration(200)
          .style("fill", color(i.toString()))
          .style("font-size", (d) => `${adjustedFontSizeScale(d.value)}px`);
      });

    // Create force layout to position words
    const simulation = d3
      .forceSimulation(displayWords)
      .force("center", d3.forceCenter())
      .force(
        "collide",
        d3.forceCollide().radius((d) => adjustedFontSizeScale(d.value) * 1.2)
      )
      // Increased force strength to spread words more
      .force("x", d3.forceX().strength(0.08))
      .force("y", d3.forceY().strength(0.08))
      .on("tick", () => {
        // Update position of each word
        words
          .attr("transform", (d) => {
            // Limit positions so words don't go too far outside the borders
            // Increased spread area from 0.45 to 0.65
            const xLimit = dimensions.width * 0.65;
            const yLimit = dimensions.height * 0.65;
            const x = Math.max(-xLimit, Math.min(xLimit, d.x || 0));
            const y = Math.max(-yLimit, Math.min(yLimit, d.y || 0));
            return `translate(${x},${y})`;
          })
          .attr("text-anchor", "middle");
      });

    // Run simulation for limited time
    simulation.alpha(1).restart();

    // Stop simulation after some iterations to improve performance
    setTimeout(() => {
      simulation.stop();
    }, 2000);

    // Cleanup when unmounting
    return () => {
      simulation.stop();
    };
  }, [displayWords, dimensions, fontSizeScale, colorScheme]);

  return (
    <div
      ref={containerRef}
      className="wordcloud-container"
      style={{ width: "100%", height: "100%", minHeight: "400px" }} // Added minHeight to ensure container has space
    >
      <svg ref={svgRef} width="100%" height="100%" className="wordcloud" />
    </div>
  );
};

export default WordCloud;
