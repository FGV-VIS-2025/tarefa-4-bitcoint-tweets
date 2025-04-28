import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface HashtagData {
  hashtag: string;
  date: string;
  count: number;
}

interface LineChartProps {
  data: HashtagData[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const chartRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return;

    // Limpiar gráfico anterior si existe
    d3.select(chartRef.current).selectAll("*").remove();

    // Configurar márgenes y dimensiones
    const margin = { top: 10, right: 30, bottom: 30, left: 60 };
    const width = 460 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Crear el contenedor SVG
    const svg = d3
      .select(chartRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Agrupar los data por hashtag
    const hashtagsAgrupados = d3.group(data, (d) => d.hashtag);

    // Convertir Map a Array para compatibilidad con la visualización
    const sumstat = Array.from(hashtagsAgrupados, ([key, values]) => ({
      key,
      values,
    }));

    // Crear escala X (tiempo)
    const fechas = data.map((d) => new Date(d.fecha));
    const x = d3
      .scaleTime()
      .domain(d3.extent(fechas) as [Date, Date])
      .range([0, width]);

    // Añadir eje X
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5));

    // Añadir eje Y
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.cantidad) || 0])
      .range([height, 0]);

    svg.append("g").call(d3.axisLeft(y));

    // Paleta de colores
    const hashtags = Array.from(new Set(data.map((d) => d.hashtag)));
    const color = d3
      .scaleOrdinal<string>()
      .domain(hashtags)
      .range([
        "#e41a1c",
        "#377eb8",
        "#4daf4a",
        "#984ea3",
        "#ff7f00",
        "#ffff33",
        "#a65628",
        "#f781bf",
        "#999999",
      ]);

    // Dibujar las líneas
    svg
      .selectAll(".line")
      .data(sumstat)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d) => color(d.key))
      .attr("stroke-width", 1.5)
      .attr("d", (d) => {
        return d3
          .line<HashtagData>()
          .x((d) => x(new Date(d.fecha)))
          .y((d) => y(d.cantidad))(d.values);
      });

    // Añadir leyenda
    const legend = svg
      .selectAll(".legend")
      .data(hashtags)
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0,${i * 20})`);

    legend
      .append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", (d) => color(d));

    legend
      .append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text((d) => d);
  }, [data]);

  return (
    <div className="w-full h-full">
      <svg ref={chartRef}></svg>
    </div>
  );
};

export default LineChart;
