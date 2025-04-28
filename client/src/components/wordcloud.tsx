import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

// Definimos las interfaces para TypeScript
interface WordItem {
  text: string;
  value: number;
}

interface WordCloudProps {
  words: WordItem[];
  width?: number;
  height?: number;
  fontSizeScale?: number;
  colorScheme?: string[];
}

const WordCloud: React.FC<WordCloudProps> = ({
  words = [],
  width = 800,
  height = 600,
  fontSizeScale = 15,
  colorScheme = d3.schemeCategory10,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

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
    if (!svgRef.current || displayWords.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Limpiamos el SVG

    // Creamos un contenedor para centrar el wordcloud
    const container = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Colores para las palabras
    const color = d3.scaleOrdinal(colorScheme);

    // Creamos un layout de fuerza para posicionar las palabras
    const simulation = d3
      .forceSimulation(displayWords)
      .force("center", d3.forceCenter())
      .force(
        "collide",
        d3.forceCollide().radius((d) => fontSize(d.value) * 2)
      )
      .force("x", d3.forceX().strength(0.05))
      .force("y", d3.forceY().strength(0.05))
      .on("tick", () => {
        // Actualizamos la posición de cada palabra
        words
          .attr("transform", (d) => `translate(${d.x},${d.y})`)
          .attr("text-anchor", "middle");
      })
      .on("end", () => {
        console.log("Simulation ended");
      });

    // Añadimos las palabras al SVG
    const words = container
      .selectAll("text")
      .data(displayWords)
      .enter()
      .append("text")
      .style("font-size", (d) => `${fontSize(d.value)}px`)
      .style("fill", (_, i) => color(i.toString()))
      .text((d) => d.text)
      .attr("text-anchor", "middle")
      .attr("transform", (d) => {
        // Posición inicial aleatoria
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        return `translate(${x},${y})`;
      });

    // Ejecutar la simulación durante un tiempo limitado
    simulation.alpha(0.5).restart();

    // Limpieza al desmontar
    return () => {
      simulation.stop();
    };
  }, [displayWords, width, height, fontSizeScale, colorScheme, fontSize]);

  return (
    <div className="wordcloud-container">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="wordcloud"
      />
    </div>
  );
};

// Componente de demostración con datos de ejemplo
const WordCloudDemo = () => {
  // Datos de ejemplo para la demostración
  const sampleWords: WordItem[] = [
    { text: "React", value: 100 },
    { text: "JavaScript", value: 85 },
    { text: "TypeScript", value: 80 },
    { text: "D3.js", value: 75 },
    { text: "Visualización", value: 70 },
    { text: "Componente", value: 65 },
    { text: "Frontend", value: 60 },
    { text: "SVG", value: 55 },
    { text: "Web", value: 50 },
    { text: "Desarrollo", value: 45 },
    { text: "Programación", value: 40 },
    { text: "UI", value: 35 },
    { text: "UX", value: 30 },
    { text: "Aplicación", value: 25 },
    { text: "Datos", value: 20 },
    { text: "Análisis", value: 15 },
    { text: "Interfaz", value: 10 },
    { text: "Usuario", value: 5 },
  ];

  return (
    <WordCloud
      words={sampleWords}
      width={600}
      height={400}
      fontSizeScale={25}
      colorScheme={d3.schemeCategory10 as string[]}
    />
  );
};

export default WordCloudDemo;
