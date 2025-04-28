import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function BarChartDemo() {
  const d3Container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificamos que el contenedor exista
    if (d3Container.current) {
      console.log("rendering");

      // Limpiar cualquier gráfico previo
      d3.select(d3Container.current).selectAll("*").remove();

      // Configuración de dimensiones y márgenes
      const margin = { top: 20, right: 30, bottom: 40, left: 50 };
      const width = 600 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      // Datos de ejemplo con interfaz tipada
      interface DataItem {
        name: string;
        value: number;
      }

      const data: DataItem[] = [
        { name: "Enero", value: 30 },
        { name: "Febrero", value: 45 },
        { name: "Marzo", value: 25 },
        { name: "Abril", value: 60 },
        { name: "Mayo", value: 40 },
        { name: "Junio", value: 80 },
      ];

      // Crear el SVG con tipado seguro
      const svg = d3
        .select(d3Container.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Escala X con tipado explícito
      const x = d3
        .scaleBand<string>()
        .domain(data.map((d) => d.name))
        .range([0, width])
        .padding(0.2);

      // Escala Y con tipado explícito
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.value) || 0])
        .nice()
        .range([height, 0]);

      // Añadir eje X
      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

      // Añadir eje Y
      svg.append("g").call(d3.axisLeft(y));

      // Añadir título Y
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .text("Valor");

      // Crear barras con tipado seguro
      svg
        .selectAll<SVGRectElement, DataItem>(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.name) || 0)
        .attr("y", (d) => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", (d) => height - y(d.value))
        .attr("fill", "#4682b4")
        .on("mouseover", function () {
          d3.select(this).attr("fill", "#1e5b94");
        })
        .on("mouseout", function () {
          d3.select(this).attr("fill", "#4682b4");
        });

      // Añadir etiquetas de valor con tipado seguro
      svg
        .selectAll<SVGTextElement, DataItem>(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", (d) => (x(d.name) || 0) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.value) - 5)
        .attr("text-anchor", "middle")
        .text((d) => d.value);
    }
  }, []);
  return <div className="d3-container" ref={d3Container} />;
}
