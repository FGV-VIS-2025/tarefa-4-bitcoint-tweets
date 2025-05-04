<script>
  import { onMount, createEventDispatcher } from "svelte";
  import * as d3 from "d3";

  // Props
  export let words = [];
  export let title = "Sentence analysis of tweets"; // Título para el componente
  export let fontSizeScale = 30;
  export let colorScheme = d3.schemeCategory10;
  export let fontFamily = "'Montserrat', 'Helvetica Neue', Arial, sans-serif";
  export let animationDuration = 1200;
  export let highlightColor = "#ff6600";
  export let backgroundColor = "transparent";
  // Removed tooltipPosition prop since tooltips are removed
  
  // Opciones avanzadas
  //export let spiralResolution = 0.1; // Menor = más denso
  export let fontWeightMin = 300;
  export let fontWeightMax = 700;
  export let highContrastMode = false; // Para accesibilidad
  export let useGrid = false; // Distribuir en grid en lugar de espiral
  export let padding = 5; // Espacio entre palabras
  // Removed showTooltip prop
  export let enableTransitions = true; // Permitir deshabilitar animaciones para mejor rendimiento
  export let adaptiveColors = true; // Colores que se ajustan al tamaño/importancia
  export let enableShadows = true; // Permite deshabilitar sombras para mejor rendimiento
  export let scaleOnHover = false; // Deshabilitar el escalado en hover por defecto
  export let showBorder = true; // Mostrar borde decorativo
  export let showLegend = false; // Mostrar leyenda de colores
  export let showStatistics = false; // Mostrar estadísticas básicas

  // Referencias y variables
  let svgElement;
  let containerElement;
  // Removed tooltipElement
  let dimensions = { width: 600, height: 600 };
  // Removed hoveredWord
  // Removed tooltipVisible
  // Removed tooltipX and tooltipY
  const dispatch = createEventDispatcher();
  
  $: displayWords = words.length > 0 ? words : [];
  
  $: sizeRange = calculateSizeRange(displayWords, dimensions);
  
  $: actualColorScheme = highContrastMode 
    ? ["#000000", "#FFFFFF", "#FF0000", "#0000FF", "#FFFF00"] 
    : colorScheme;

  const updateDimensions = () => {
    if (containerElement) {
      const { width, height } = containerElement.getBoundingClientRect();
      dimensions = { width: Math.max(300, width), height: Math.max(300, height) };
    }
  };
  
  function calculateSizeRange(words, dims) {
    if (!words || words.length === 0) return [14, fontSizeScale];
    
    const area = dims.width * dims.height;
    const wordCount = words.length;
    const estimatedDensity = Math.sqrt(area / wordCount) * 0.8;
    const minSize = Math.max(12, estimatedDensity * 0.2);
    const maxSize = Math.min(fontSizeScale, estimatedDensity);
    
    return [minSize, maxSize];
  }

  // Removed handleGlobalMouseMove function

  onMount(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
      renderWordCloud();
    });
    
    if (containerElement) {
      resizeObserver.observe(containerElement);
    }
    // Removed mousemove event listener
    
    renderWordCloud();
    window.addEventListener('resize', updateDimensions);

    return () => {
      if (simulation) {
        simulation.stop();
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
      // Removed mousemove event listener cleanup
    };
  });
  $: if (
    svgElement &&
    displayWords.length > 0 &&
    dimensions.width > 0 &&
    dimensions.height > 0
  ) {
    renderWordCloud();
  }

  let simulation;

  function calculateStatistics(words) {
    if (!words || words.length === 0) return null;
    
    return {
      count: words.length,
      maxFrequency: d3.max(words, d => d.value),
      minFrequency: d3.min(words, d => d.value),
      avgFrequency: d3.mean(words, d => d.value).toFixed(2),
      medianFrequency: d3.median(words, d => d.value)
    };
  }

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
    svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
      .style("background", backgroundColor);
    const defs = svg.append("defs");
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

    // Removed tooltip header/footer SVG element

    const container = svg
      .append("g")
      .attr("class", "wordcloud-container")
      .attr(
        "transform",
        `translate(${dimensions.width / 2}, ${dimensions.height / 2})`
      );

    if (enableShadows) {
      defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("width", "130%")
        .attr("height", "130%")
        .append("feDropShadow")
        .attr("dx", 0)
        .attr("dy", 1)
        .attr("stdDeviation", 2)
        .attr("flood-opacity", 0.3);
        
      defs.append("filter")
        .attr("id", "hover-shadow")
        .attr("width", "130%")
        .attr("height", "130%")
        .append("feDropShadow")
        .attr("dx", 0)
        .attr("dy", 2)
        .attr("stdDeviation", 3)
        .attr("flood-opacity", 0.5);
    }

    const baseColorScale = d3.scaleOrdinal(actualColorScheme);
    const getColor = (d, i) => {
      if (!adaptiveColors) return baseColorScale(i % actualColorScheme.length);
      const normalizedValue = d.value / d3.max(displayWords, w => w.value);
      const baseColor = d3.hsl(baseColorScale(i % actualColorScheme.length));
      baseColor.s = Math.min(1, baseColor.s + normalizedValue * 0.3);
      baseColor.l = Math.max(0.3, Math.min(0.7, baseColor.l - normalizedValue * 0.2));
      
      return baseColor.toString();
    };
    const visualizationArea = Math.min(dimensions.width, dimensions.height);
    const scaleFactor = visualizationArea / 180;
    let sortedWords = [...displayWords].sort((a, b) => b.value - a.value);
    sortedWords = sortedWords.map((d, i) => ({
      ...d,
      index: i, // Preservar orden original
      fontSize: 0, // Inicializar con 0 para animación
      originalValue: d.originalValue !== undefined ? d.originalValue : d.value
    }));

    const fontSizeScale = d3
      .scalePow()
      .exponent(0.8) // Mejor escala visual para palabras grandes/pequeñas
      .domain([
        Math.max(1, d3.min(sortedWords, (d) => d.value) || 1), 
        d3.max(sortedWords, (d) => d.value) || 100
      ])
      .range([sizeRange[0] * scaleFactor, sizeRange[1] * scaleFactor])
      .clamp(true);
      
    const fontWeightScale = d3
      .scaleLinear()
      .domain([0, d3.max(sortedWords, d => d.value) || 100])
      .range([fontWeightMin, fontWeightMax])
      .clamp(true);

    function calculatePosition(d, i) {
      if (useGrid) {
        const gridSize = Math.ceil(Math.sqrt(sortedWords.length));
        const x = ((i % gridSize) - gridSize / 2) * (dimensions.width / gridSize / 1.5);
        const y = (Math.floor(i / gridSize) - gridSize / 2) * (dimensions.height / gridSize / 1.8);
        return { x, y };
      } else {
        const phi = (1 + Math.sqrt(5)) / 2; // Número áureo para mejor distribución
        const angle = i * phi * Math.PI * 2; // Rotación basada en proporción áurea
        const radiusGrowthFactor = Math.min(dimensions.width, dimensions.height) / 800;
        const radius = (0.8 + Math.sqrt(i) * 0.35) * scaleFactor * radiusGrowthFactor * (visualizationArea / 400);
        const distributionFactor = Math.min(1, i / (sortedWords.length * 0.8));
        const x = radius * Math.cos(angle) * (1 + distributionFactor * 0.2);
        const y = radius * Math.sin(angle) * (1 + distributionFactor * 0.2);
        
        return { x, y };
      }
    }

    function handleMouseOver(event, d) {
      d3.select(this)
        .transition()
        .duration(enableTransitions ? 200 : 0)
        .style("fill", "url(#word-highlight-gradient)")
        .style("filter", enableShadows ? "url(#hover-shadow)" : "none")
        .attr("transform", function() {
          if (scaleOnHover) {
            const currentTransform = d3.select(this).attr("transform");
            if (currentTransform && currentTransform.includes("translate")) {
              const translatePart = currentTransform.match(/translate\([^)]+\)/)[0];
              const rotatePart = currentTransform.match(/rotate\([^)]+\)/)?.[0] || "";
              return `${translatePart} ${rotatePart} scale(1.05)`;
            }
          }
          return d3.select(this).attr("transform");
        });
      
      // Removed tooltip code
      
      dispatch("wordHover", { word: d.text, value: d.originalValue || d.value });
    }

    // Removed tooltipText, tooltipVisible, tooltipX, tooltipY variables
    // Removed hideTooltip function
    
    function handleMouseOut(event, d) {
      d3.select(this)
        .transition()
        .duration(enableTransitions ? 200 : 0)
        .style("fill", getColor(d, d.index))
        .style("filter", enableShadows ? "url(#drop-shadow)" : "none")
        .attr("transform", function() {
          const originalTransform = `translate(${d.x},${d.y}) rotate(${d.rotation || 0})`;
          return originalTransform;
        });
        
      // Removed tooltip code
    }

    const texts = container
      .selectAll("text")
      .data(sortedWords)
      .enter()
      .append("text")
      .attr("class", "wordcloud-word")
      .style("font-size", d => `${d.fontSize}px`)
      .style("font-family", fontFamily)
      .style("font-weight", d => fontWeightScale(d.value))
      .style("fill", (d, i) => getColor(d, i))
      .style("cursor", "pointer")
      .style("opacity", 0)
      .style("filter", enableShadows ? "url(#drop-shadow)" : "none")
      .text(d => d.text)
      .attr("text-anchor", "middle")
      .attr("data-value", d => d.originalValue || d.value)
      .attr("data-word", d => d.text)
      .attr("aria-label", d => `${d.text}: ${d.originalValue || d.value}`)
      .attr("transform", (d, i) => {
        const pos = calculatePosition(d, i);
        const rotation = 0;
        d.x = pos.x;
        d.y = pos.y;
        d.rotation = rotation;
        return `translate(${pos.x},${pos.y}) rotate(${rotation})`;
      })
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", function(event, d) {
        dispatch("wordClick", { word: d.text, value: d.originalValue || d.value });
      });

    texts
      .transition()
      .delay((d, i) => enableTransitions ? i * (animationDuration / sortedWords.length / 2) : 0)
      .duration(enableTransitions ? animationDuration / 2 : 0)
      .style("opacity", 1)
      .style("font-size", d => `${fontSizeScale(d.value)}px`);

    simulation = d3
      .forceSimulation(sortedWords)
      .force("center", d3.forceCenter(0, 0).strength(0.03)) // Fuerza central muy suave
      .force(
        "collide",
        d3.forceCollide().radius(d => {
          return fontSizeScale(d.value) * (0.8 + padding / 10);
        }).strength(0.85).iterations(3) // Mayor fuerza de colisión y más iteraciones para mejor separación
      )
      .force("radial", d3.forceRadial(
        d => {
          const normalizedValue = d.value / d3.max(sortedWords, w => w.value);
          const baseRadius = Math.min(dimensions.width, dimensions.height) * 0.35;
          return baseRadius * (0.2 + (1 - normalizedValue) * 0.8);
        }, 
        0, 0
      ).strength(0.08)) // Fuerza suave pero efectiva
      .force("x", d3.forceX(d => d.x * 0.6).strength(0.02)) // Mantener cerca de posición inicial
      .force("y", d3.forceY(d => d.y * 0.6).strength(0.02)) // Mantener cerca de posición inicial
      .force("y-border-top", d3.forceY(dimensions.height * 0.1).strength(d => {
        return d.y < -dimensions.height * 0.35 ? 0.1 : 0;
      }))
      .stop();
      
    for (let i = 0; i < 500; i++) {
      simulation.tick();
      if (i % 50 === 0) {
        sortedWords.forEach(word => {
          const maxDistance = Math.min(dimensions.width, dimensions.height) * 0.4;
          const distanceFromCenter = Math.sqrt(word.x * word.x + word.y * word.y);
          
          if (distanceFromCenter > maxDistance) {
            const factor = maxDistance / distanceFromCenter;
            word.x *= factor * 0.9;
            word.y *= factor * 0.9;
          }
          if (word.y < -dimensions.height * 0.3) {
            word.y *= 0.85; // Empujar más hacia el centro
          }
        });
      }
    }

    texts
      .attr("transform", d => {
        const xLimit = dimensions.width * 0.45;
        const yLimit = dimensions.height * 0.45;
        d.x = Math.max(-xLimit, Math.min(xLimit, d.x || 0));
        d.y = Math.max(-yLimit, Math.min(yLimit, d.y || 0));
        return `translate(${d.x},${d.y}) rotate(${d.rotation || 0})`;
      });
      
    if (showBorder) {
      svg.append("rect")
        .attr("x", 2)
        .attr("y", 2)
        .attr("width", dimensions.width - 4)
        .attr("height", dimensions.height - 4)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("fill", "none")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.3);
    }
    
    if (showLegend) {
      const legendHeight = 30;
      const legendPadding = 10;
      const legend = svg.append("g")
        .attr("class", "wordcloud-legend")
        .attr("transform", `translate(${legendPadding}, ${dimensions.height - legendHeight - legendPadding})`);
      
      const minValue = d3.min(sortedWords, d => d.value);
      const maxValue = d3.max(sortedWords, d => d.value);
      const valueRange = maxValue - minValue;
      const legendSegments = 5;
      
      const legendScale = d3.scaleLinear()
        .domain([0, legendSegments - 1])
        .range([minValue, maxValue]);
      
      for (let i = 0; i < legendSegments; i++) {
        const segmentWidth = (dimensions.width - 2 * legendPadding) / legendSegments;
        const legendValue = Math.round(legendScale(i));
        
        legend.append("rect")
          .attr("x", i * segmentWidth)
          .attr("y", 0)
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", getColor({value: legendValue}, i % actualColorScheme.length));
        
        legend.append("text")
          .attr("x", i * segmentWidth + 20)
          .attr("y", 12)
          .attr("font-size", "10px")
          .attr("font-family", fontFamily)
          .text(() => {
            if (i === 0) return `Min: ${minValue}`;
            if (i === legendSegments - 1) return `Max: ${maxValue}`;
            return Math.round(legendScale(i));
          });
      }
    }
    
    if (showStatistics) {
      const stats = calculateStatistics(sortedWords);
      if (stats) {
        const statsBox = svg.append("g")
          .attr("class", "wordcloud-stats")
          .attr("transform", `translate(${dimensions.width - 150}, 15)`);
        statsBox.append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 140)
          .attr("height", 85)
          .attr("fill", "#f8f8f8")
          .attr("opacity", 0.8)
          .attr("rx", 5);
        statsBox.append("text")
          .attr("x", 5)
          .attr("y", 15)
          .attr("font-size", "10px")
          .attr("font-weight", "bold")
          .attr("font-family", fontFamily)
          .text("Estadísticas");
        const statData = [
          {label: "Total palabras:", value: stats.count},
          {label: "Máx. frecuencia:", value: stats.maxFrequency},
          {label: "Mín. frecuencia:", value: stats.minFrequency},
          {label: "Media:", value: stats.avgFrequency}
        ];
        
        statData.forEach((stat, i) => {
          statsBox.append("text")
            .attr("x", 5)
            .attr("y", 30 + i * 15)
            .attr("font-size", "9px")
            .attr("font-family", fontFamily)
            .text(`${stat.label} ${stat.value}`);
        });
      }
    }
  }

  export function highlightWord(wordText) {
    if (!svgElement) return;
    
    const wordElement = d3.select(svgElement)
      .select(`text[data-word="${wordText}"]`);
      
    if (!wordElement.empty()) {
      const wordData = wordElement.datum();
      wordElement.node().__on[0].value.call(wordElement.node(), null, wordData);
    }
  }
  
  export function exportAsSVG() {
    if (!svgElement) return null;
    const svgCopy = svgElement.cloneNode(true);
    const svgData = new XMLSerializer().serializeToString(svgCopy);
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    return URL.createObjectURL(svgBlob);
  }
  
  export function getStatistics() {
    return calculateStatistics(displayWords);
  }
</script>

<div class="wordcloud-wrapper">
  {#if title}
    <div class="wordcloud-header">
      <h2 class="wordcloud-title">{title}</h2>
    </div>
  {/if}
  
  <div
    bind:this={containerElement}
    class="wordcloud-container"
    style="width: 100%; height: 100%; min-height: 400px;"
  >
    <svg bind:this={svgElement} width="100%" height="100%" class="wordcloud"></svg>
  </div>
</div>

<style>
  .wordcloud-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .wordcloud-header {
    padding: 10px 15px;
    text-align: center;
  }
  
  .wordcloud-title {
    margin: 0 0 5px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .wordcloud-container {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    flex-grow: 1;
  }

  .wordcloud {
    display: block;
  }
  
  /* Removed all tooltip-related CSS */
  
  :global(.wordcloud-word) {
    transition: opacity 0.2s ease-out;
  }
  
  :global(.wordcloud-word:hover) {
    cursor: pointer;
  }
</style>