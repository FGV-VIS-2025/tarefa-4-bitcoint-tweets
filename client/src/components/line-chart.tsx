import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface HashtagData {
  hashtag: string;
  date: Date;
  count: number;
}

interface LineChartProps {
  data: HashtagData[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const chartRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Función para obtener las dimensiones del contenedor padre
  const updateDimensions = () => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  };

  // Efecto para manejar el resize y obtener dimensiones iniciales
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
  }, []);

  // Efecto para dibujar el gráfico
  useEffect(() => {
    if (
      !data ||
      data.length === 0 ||
      !chartRef.current ||
      dimensions.width === 0 ||
      dimensions.height === 0
    )
      return;

    // Limpiar gráfico anterior si existe
    d3.select(chartRef.current).selectAll("*").remove();

    // Configurar márgenes y dimensiones
    const margin = { top: 10, right: 30, bottom: 30, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Crear el contenedor SVG
    const svg = d3
      .select(chartRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
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
    const fechas = data.map((d) => new Date(d.date));
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
      .domain([0, d3.max(data, (d) => d.count) || 0])
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
          .x((d) => x(new Date(d.date)))
          .y((d) => y(d.count))(d.values);
      });
  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={chartRef} width="100%" height="100%"></svg>
    </div>
  );
};

export default LineChart;
