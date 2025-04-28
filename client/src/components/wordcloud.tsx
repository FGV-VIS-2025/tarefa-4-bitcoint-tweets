import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Definimos las interfaces para TypeScript
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
  fontSizeScale = 15,
  colorScheme = d3.schemeCategory10,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Datos de ejemplo en caso de que no se proporcionen palabras
  const defaultWords: WordItem[] = [
    { text: "React", value: 100 },
    { text: "D3", value: 80 },
    { text: "TypeScript", value: 70 },
    { text: "Visualización", value: 60 },
    { text: "JavaScript", value: 55 },
    { text: "Componente", value: 50 },
    { text: "SVG", value: 45 },
    { text: "Web", value: 40 },
    { text: "Desarrollo", value: 35 },
    { text: "Programación", value: 30 },
    { text: "Frontend", value: 25 },
    { text: "Aplicación", value: 20 },
    { text: "UI", value: 15 },
    { text: "UX", value: 10 },
  ];

  // Usar palabras proporcionadas o predeterminadas
  const displayWords = words.length > 0 ? words : defaultWords;

  // Función para actualizar dimensiones según el contenedor
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

    window.addEventListener("resize", updateDimensions);

    // Cleanup
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  // Crear una escala para el tamaño de la fuente basada en el valor
  const fontSize = d3
    .scaleLinear()
    .domain([
      d3.min(displayWords, (d) => d.value) || 0,
      d3.max(displayWords, (d) => d.value) || 1,
    ])
    .range([12, fontSizeScale]);

  // Función para crear el wordcloud
  useEffect(() => {
    if (
      !svgRef.current ||
      displayWords.length === 0 ||
      dimensions.width === 0 ||
      dimensions.height === 0
    )
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Limpiamos el SVG

    // Ajustamos el viewBox para que sea responsive
    svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);

    // Creamos un contenedor para centrar el wordcloud
    const container = svg
      .append("g")
      .attr(
        "transform",
        `translate(${dimensions.width / 2}, ${dimensions.height / 2})`
      );

    // Colores para las palabras
    const color = d3.scaleOrdinal(colorScheme);

    // Calculamos el tamaño del área de visualización
    const visualizationArea =
      Math.min(dimensions.width, dimensions.height) * 0.9;

    // Ajustamos la escala de fuente en función del área disponible
    const scaleFactor = visualizationArea / 800; // Base reference size
    const adjustedFontSizeScale = d3
      .scaleLinear()
      .domain([
        d3.min(displayWords, (d) => d.value) || 0,
        d3.max(displayWords, (d) => d.value) || 1,
      ])
      .range([12 * scaleFactor, fontSizeScale * scaleFactor]);

    // Añadimos las palabras al SVG con posiciones iniciales aleatorias
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
        // Posición inicial aleatoria
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

    // Creamos un layout de fuerza para posicionar las palabras
    const simulation = d3
      .forceSimulation(displayWords)
      .force("center", d3.forceCenter())
      .force(
        "collide",
        d3.forceCollide().radius((d) => adjustedFontSizeScale(d.value) * 1.2)
      )
      .force("x", d3.forceX().strength(0.05))
      .force("y", d3.forceY().strength(0.05))
      .on("tick", () => {
        // Actualizamos la posición de cada palabra
        words
          .attr("transform", (d) => {
            // Limitar posiciones para que las palabras no salgan demasiado de los bordes
            const xLimit = dimensions.width * 0.45;
            const yLimit = dimensions.height * 0.45;
            const x = Math.max(-xLimit, Math.min(xLimit, d.x || 0));
            const y = Math.max(-yLimit, Math.min(yLimit, d.y || 0));
            return `translate(${x},${y})`;
          })
          .attr("text-anchor", "middle");
      });

    // Ejecutar la simulación durante un tiempo limitado
    simulation.alpha(1).restart();

    // Detener la simulación después de algunas iteraciones para mejorar el rendimiento
    setTimeout(() => {
      simulation.stop();
    }, 2000);

    // Limpieza al desmontar
    return () => {
      simulation.stop();
    };
  }, [displayWords, dimensions, fontSizeScale, colorScheme]);

  return (
    <div
      ref={containerRef}
      className="wordcloud-container"
      style={{ width: "100%", height: "100%" }}
    >
      <svg ref={svgRef} width="100%" height="100%" className="wordcloud" />
    </div>
  );
};

// Exportar el componente principal
export default WordCloud;
