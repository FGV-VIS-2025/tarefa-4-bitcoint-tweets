<script>
  import { onMount } from "svelte";
  import * as d3 from "d3";

  // Props
  export let words = [];
  export let fontSizeScale = 30;
  export let colorScheme = d3.schemeCategory10;

  // Referencias y variables
  let svgElement;
  let containerElement;
  let dimensions = { width: 800, height: 600 };

  // Si no se proporcionan palabras, usar datos por defecto
  $: displayWords = words.length > 0 ? words : [];

  // Actualizar las dimensiones basado en el tamaño del contenedor
  const updateDimensions = () => {
    if (containerElement) {
      const { width, height } = containerElement.getBoundingClientRect();
      dimensions = { width, height };
    }
  };

  onMount(() => {
    updateDimensions();
    renderWordCloud();

    return () => {
      // Limpieza al desmontar
      if (simulation) {
        simulation.stop();
      }
    };
  });

  // Reactivo: cuando cambian palabras o dimensiones, volver a renderizar
  $: if (
    svgElement &&
    displayWords.length > 0 &&
    dimensions.width > 0 &&
    dimensions.height > 0
  ) {
    renderWordCloud();
  }

  let simulation;

  function renderWordCloud() {
    if (
      !svgElement ||
      displayWords.length === 0 ||
      dimensions.width === 0 ||
      dimensions.height === 0
    )
      return;

    const svg = d3.select(svgElement);
    svg.selectAll("*").remove(); // Limpiar el SVG

    // Configurar viewBox responsivo
    svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);

    // Crear contenedor para centrar la nube de palabras
    const container = svg
      .append("g")
      .attr(
        "transform",
        `translate(${dimensions.width / 2}, ${dimensions.height / 2})`
      );

    // Colores para las palabras
    const color = d3.scaleOrdinal(colorScheme);

    // Calcular el área de visualización
    const visualizationArea = Math.min(dimensions.width, dimensions.height);

    // Ajustar escala de tamaño de fuente basado en el área disponible
    const scaleFactor = visualizationArea / 500;
    const adjustedFontSizeScale = d3
      .scaleLinear()
      .domain([
        d3.min(displayWords, (d) => d.value) || 0,
        d3.max(displayWords, (d) => d.value) || 1,
      ])
      .range([14 * scaleFactor, fontSizeScale * scaleFactor]);

    // Añadir palabras al SVG con posiciones iniciales aleatorias
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
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .style("fill", "#ff6600")
          .style("font-size", `${adjustedFontSizeScale(d.value) * 1.2}px`);
      })
      .on("mouseout", function (event, d, i) {
        d3.select(this)
          .transition()
          .duration(200)
          .style("fill", color(d.index ? d.index.toString() : "0"))
          .style("font-size", `${adjustedFontSizeScale(d.value)}px`);
      });

    // Crear layout de fuerza para posicionar palabras
    simulation = d3
      .forceSimulation(displayWords)
      .force("center", d3.forceCenter())
      .force(
        "collide",
        d3.forceCollide().radius((d) => adjustedFontSizeScale(d.value) * 1.2)
      )
      // Aumentado la fuerza para esparcir más las palabras
      .force("x", d3.forceX().strength(0.08))
      .force("y", d3.forceY().strength(0.08))
      .on("tick", () => {
        // Actualizar posición de cada palabra
        words
          .attr("transform", (d) => {
            // Limitar posiciones para que las palabras no se vayan muy lejos de los bordes
            const xLimit = dimensions.width * 0.65;
            const yLimit = dimensions.height * 0.65;
            const x = Math.max(-xLimit, Math.min(xLimit, d.x || 0));
            const y = Math.max(-yLimit, Math.min(yLimit, d.y || 0));
            return `translate(${x},${y})`;
          })
          .attr("text-anchor", "middle");
      });

    // Ejecutar simulación por tiempo limitado
    simulation.alpha(1).restart();

    // Detener simulación después de algunas iteraciones para mejorar rendimiento
    setTimeout(() => {
      simulation.stop();
    }, 2000);
  }
</script>

<div
  bind:this={containerElement}
  class="wordcloud-container"
  style="width: 100%; height: 100%; min-height: 400px;"
>
  <svg bind:this={svgElement} width="100%" height="100%" class="wordcloud"
  ></svg>
</div>

<style>
  .wordcloud-container {
    position: relative;
  }

  .wordcloud {
    display: block;
  }
</style>
