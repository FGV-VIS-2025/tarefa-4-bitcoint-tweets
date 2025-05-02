<script>
  import { onMount, createEventDispatcher } from "svelte";
  import * as d3 from "d3";

  // Props
  export let words = [];
  export let fontSizeScale = 30;
  export let colorScheme = d3.schemeCategory10;
  export let fontFamily = "'Montserrat', 'Helvetica Neue', Arial, sans-serif";
  export let animationDuration = 1200;
  export let highlightColor = "#ff6600";
  export let backgroundColor = "transparent";
  export let rotationAngles = [-30, 0, 30]; // Ángulos permitidos para rotación
  
  // Opciones avanzadas
  export let spiralResolution = 0.1; // Menor = más denso
  export let fontWeightMin = 300;
  export let fontWeightMax = 700;
  export let highContrastMode = false; // Para accesibilidad
  export let useGrid = false; // Distribuir en grid en lugar de espiral

  // Referencias y variables
  let svgElement;
  let containerElement;
  let dimensions = { width: 800, height: 600 };
  const dispatch = createEventDispatcher();
  
  // Si no se proporcionan palabras, usar datos por defecto
  $: displayWords = words.length > 0 ? words : [];
  
  // Calcular un rango de tamaños con mejor distribución visual
  $: sizeRange = calculateSizeRange(displayWords, dimensions);
  
  // Para alto contraste
  $: actualColorScheme = highContrastMode 
    ? ["#000000", "#FFFFFF", "#FF0000", "#0000FF", "#FFFF00"] 
    : colorScheme;

  // Actualizar las dimensiones basado en el tamaño del contenedor
  const updateDimensions = () => {
    if (containerElement) {
      const { width, height } = containerElement.getBoundingClientRect();
      dimensions = { width, height };
    }
  };
  
  // Calcular rango de tamaños apropiado para mejor visibilidad
  function calculateSizeRange(words, dims) {
    if (!words || words.length === 0) return [14, fontSizeScale];
    
    // Calcular el área de visualización disponible
    const area = dims.width * dims.height;
    
    // Estimar área ocupada por palabras (aproximado)
    const wordCount = words.length;
    const estimatedDensity = Math.sqrt(area / wordCount) * 0.8;
    
    // Ajustar escala basada en densidad
    const minSize = Math.max(12, estimatedDensity * 0.2);
    const maxSize = Math.min(fontSizeScale, estimatedDensity);
    
    return [minSize, maxSize];
  }

  onMount(() => {
    updateDimensions();
    
    // Configurar un observer para reaccionar a cambios de tamaño
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
      renderWordCloud();
    });
    
    resizeObserver.observe(containerElement);
    renderWordCloud();

    // Configurar event listeners
    window.addEventListener('resize', updateDimensions);

    return () => {
      // Limpieza al desmontar
      if (simulation) {
        simulation.stop();
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
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
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
      .style("background", backgroundColor);

    // Añadir un grupo para exportación más limpia
    const defs = svg.append("defs");
    
    // Gradientes para palabras destacadas
    const gradient = defs.append("linearGradient")
      .attr("id", "word-highlight-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
      
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", highlightColor)
      .attr("stop-opacity", 1);
      
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", d3.color(highlightColor).brighter(0.5))
      .attr("stop-opacity", 1);

    // Crear contenedor para centrar la nube de palabras
    const container = svg
      .append("g")
      .attr("class", "wordcloud-container")
      .attr(
        "transform",
        `translate(${dimensions.width / 2}, ${dimensions.height / 2})`
      );

    // Añadir filtro de sombra sutil para profundidad
    defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("width", "130%")
      .attr("height", "130%")
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 0)
      .attr("stdDeviation", 2)
      .attr("flood-opacity", 0.3);

    // Colores para las palabras con mejor distribución
    const color = d3.scaleOrdinal(actualColorScheme);

    // Calcular el área de visualización
    const visualizationArea = Math.min(dimensions.width, dimensions.height);

    // Ajustar escala de tamaño de fuente basado en el área y palabras
    const scaleFactor = visualizationArea / 250;
    
    // Ordenar palabras por valor para posicionar las más importantes primero
    let sortedWords = [...displayWords].sort((a, b) => b.value - a.value);
    
    // Normalizar valores para mejor distribución visual
    sortedWords = sortedWords.map((d, i) => ({
      ...d,
      index: i, // Preservar orden original
      fontSize: 0 // Inicializar con 0 para animación
    }));

    // Función para calcular tamaño de texto
    const fontSizeScale = d3
      .scaleLog()
      .domain([
        Math.max(1, d3.min(sortedWords, (d) => d.value) || 1), 
        d3.max(sortedWords, (d) => d.value) || 100
      ])
      .range([sizeRange[0] * scaleFactor, sizeRange[1] * scaleFactor])
      .clamp(true);
      
    // Función para determinar peso de fuente
    const fontWeightScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([fontWeightMin, fontWeightMax])
      .clamp(true);

    // Función para calcular la posición de las palabras usando espiral
    function calculateSpiralPosition(d, i) {
      if (useGrid) {
        // Distribuir en grid para un formato más estructurado
        const gridSize = Math.ceil(Math.sqrt(sortedWords.length));
        const x = ((i % gridSize) - gridSize / 2) * (dimensions.width / gridSize / 1.5);
        const y = (Math.floor(i / gridSize) - gridSize / 2) * (dimensions.height / gridSize / 1.8);
        return { x, y };
      } else {
        // Posición en espiral (Arquímedes)
        const ratio = i / sortedWords.length;
        const angle = i * spiralResolution;
        const radius = angle * 10 * scaleFactor;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        return { x, y };
      }
    }

    // Añadir palabras al SVG con posiciones en espiral
    const texts = container
      .selectAll("text")
      .data(sortedWords)
      .enter()
      .append("text")
      .attr("class", "wordcloud-word")
      .style("font-size", d => `${d.fontSize}px`)
      .style("font-family", fontFamily)
      .style("font-weight", d => fontWeightScale(d.value))
      .style("fill", (d, i) => color(i % actualColorScheme.length))
      .style("cursor", "pointer")
      .style("opacity", 0)
      .text(d => d.text)
      .attr("text-anchor", "middle")
      .attr("data-value", d => d.originalValue || d.value)
      .attr("data-word", d => d.text)
      .attr("aria-label", d => `${d.text}: ${d.originalValue || d.value}`)
      .attr("transform", (d, i) => {
        const pos = calculateSpiralPosition(d, i);
        // Rotación aleatoria entre los ángulos permitidos
        const rotation = rotationAngles[Math.floor(Math.random() * rotationAngles.length)];
        d.x = pos.x;
        d.y = pos.y;
        d.rotation = rotation;
        return `translate(${pos.x},${pos.y}) rotate(${rotation})`;
      })
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .style("fill", "url(#word-highlight-gradient)")
          .style("font-size", `${fontSizeScale(d.value) * 1.15}px`)
          .style("filter", "url(#drop-shadow)");
          
        // Mostrar tooltip
        container.append("text")
          .attr("class", "word-tooltip")
          .attr("x", d.x)
          .attr("y", d.y - fontSizeScale(d.value) - 10)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .style("fill", "#333")
          .style("background", "#fff")
          .style("padding", "3px")
          .style("border-radius", "3px")
          .text(`${d.text}: ${d.originalValue || Math.round(d.value)}`);
          
        // Disparar evento
        dispatch("wordHover", { word: d.text, value: d.originalValue || d.value });
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .style("fill", color(d.index % actualColorScheme.length))
          .style("font-size", `${fontSizeScale(d.value)}px`)
          .style("filter", "none");
          
        // Quitar tooltip
        container.selectAll(".word-tooltip").remove();
      })
      .on("click", function(event, d) {
        // Disparar evento de click
        dispatch("wordClick", { word: d.text, value: d.originalValue || d.value });
      });

    // Animación de entrada secuencial
    texts
      .transition()
      .delay((d, i) => i * (animationDuration / sortedWords.length / 2))
      .duration(animationDuration / 2)
      .style("opacity", 1)
      .style("font-size", d => `${fontSizeScale(d.value)}px`)
      .style("filter", "none");

    // Optimizar posiciones usando algoritmo de fuerza
    simulation = d3
      .forceSimulation(sortedWords)
      .force("center", d3.forceCenter(0, 0).strength(0.1))
      .force(
        "collide",
        d3.forceCollide().radius(d => fontSizeScale(d.value) * 0.6)
      )
      .force("x", d3.forceX(0).strength(0.1))
      .force("y", d3.forceY(0).strength(0.1))
      .stop();
      
    // Ejecutar simulación durante un tiempo fijo
    for (let i = 0; i < 300; i++) simulation.tick();

    // Actualizar posiciones inmediatamente después del cálculo
    texts
      .attr("transform", d => {
        // Limitar posiciones para que las palabras no se vayan muy lejos
        const xLimit = dimensions.width * 0.45;
        const yLimit = dimensions.height * 0.45;
        d.x = Math.max(-xLimit, Math.min(xLimit, d.x || 0));
        d.y = Math.max(-yLimit, Math.min(yLimit, d.y || 0));
        return `translate(${d.x},${d.y}) rotate(${d.rotation || 0})`;
      });

    // No se incluyen botones de exportación en esta versión
  }
  
  // No se incluyen funciones de exportación en esta versión
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
    overflow: hidden;
  }

  .wordcloud {
    display: block;
  }
  
  :global(.wordcloud-word:hover) {
    cursor: pointer;
  }
</style>