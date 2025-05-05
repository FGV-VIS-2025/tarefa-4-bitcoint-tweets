<script>
  import { onMount, createEventDispatcher } from "svelte";
  import * as d3 from "d3";

  // Props
  export let sliceLimit = 35;
  export let words = [];
  export let title = `Top ${sliceLimit} Most Frequent Tweet Keywords`;
  export let fontSizeScale = 30;
  export let colorScheme = d3.schemeCategory10;
  export let fontFamily = "'Montserrat', 'Helvetica Neue', Arial, sans-serif";
  export let animationDuration = 1200;
  export let highlightColor = "#ff6600";
  export let backgroundColor = "transparent";

  // Opciones avanzadas
  export let fontWeightMin = 300;
  export let fontWeightMax = 700;
  export let highContrastMode = false; // Para accesibilidad
  export let useGrid = false; // Distribuir en grid en lugar de espiral
  export let padding = 8; // Aumentado el espacio entre palabras
  export let enableTransitions = true;
  export let adaptiveColors = true;
  export let enableShadows = true;
  export let scaleOnHover = false;
  export let showBorder = true;
  export let showLegend = false;
  export let showStatistics = false;
  export let maxOverlapIterations = 200; // Nueva opción para controlar iteraciones anti-solapamiento

  // Referencias y variables
  let svgElement;
  let containerElement;
  let dimensions = { width: 600, height: 600 };
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

    // Ajustar densidad basada en la cantidad de palabras
    let densityFactor = 1;
    if (wordCount > 50) densityFactor = 0.9;
    if (wordCount > 100) densityFactor = 0.8;
    if (wordCount > 200) densityFactor = 0.7;

    const estimatedDensity = Math.sqrt(area / wordCount) * 0.7 * densityFactor;
    const minSize = Math.max(10, estimatedDensity * 0.18);
    const maxSize = Math.min(fontSizeScale, estimatedDensity * 0.9);

    return [minSize, maxSize];
  }

  onMount(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
      renderWordCloud();
    });

    if (containerElement) {
      resizeObserver.observe(containerElement);
    }

    renderWordCloud();
    window.addEventListener('resize', updateDimensions);

    return () => {
      if (simulation) {
        simulation.stop();
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
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
    const scaleFactor = visualizationArea / 200; // Ajustado para mejor escalabilidad

    // Limitar el número de palabras si hay demasiadas para evitar sobrecarga visual
    let maxWordsToShow = displayWords.length;
    if (displayWords.length > 200) {
      maxWordsToShow = 200;
      console.warn(`Limitando a ${maxWordsToShow} palabras para mejor rendimiento`);
    }

    let sortedWords = [...displayWords]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWordsToShow);

    sortedWords = sortedWords.map((d, i) => ({
      ...d,
      index: i,
      fontSize: 0,
      originalValue: d.originalValue !== undefined ? d.originalValue : d.value
    }));

    const fontSizeScale = d3
      .scalePow()
      .exponent(0.7) // Mejor distribución de tamaños
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

    // Calcular tamaños de texto para mejor distribución
    sortedWords.forEach(word => {
      word.fontSize = fontSizeScale(word.value);
    });

    function calculatePosition(d, i) {
      if (useGrid) {
        const gridSize = Math.ceil(Math.sqrt(sortedWords.length));
        const x = ((i % gridSize) - gridSize / 2) * (dimensions.width / gridSize / 1.3);
        const y = (Math.floor(i / gridSize) - gridSize / 2) * (dimensions.height / gridSize / 1.5);
        return { x, y };
      } else {
        // Distribución Fibonacci para mejor espaciado
        const phi = (1 + Math.sqrt(5)) / 2;
        const angle = i * phi * Math.PI * 2;

        // Ajustar radio basado en cantidad de palabras
        const wordCountFactor = Math.min(1, 50 / sortedWords.length);
        const radiusBase = (0.5 + Math.sqrt(i) * 0.4) * scaleFactor * visualizationArea / 350;

        // Palabras más importantes más cerca del centro
        const importanceFactor = 1 - (d.value / (d3.max(sortedWords, w => w.value) || 1)) * 0.3;
        const radius = radiusBase * importanceFactor * (1 + wordCountFactor);

        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        return { x, y };
      }
    }

    function handleMouseOver(event, d) {
      const element = d3.select(this);
      element
        .transition()
        .duration(enableTransitions ? 200 : 0)
        .style("fill", "url(#word-highlight-gradient)")
        .style("filter", enableShadows ? "url(#hover-shadow)" : "none")
        .attr("transform", function() {
          if (scaleOnHover) {
            const currentTransform = element.attr("transform");
            if (currentTransform && currentTransform.includes("translate")) {
              const translatePart = currentTransform.match(/translate\([^)]+\)/)[0];
              const rotatePart = currentTransform.match(/rotate\([^)]+\)/)?.[0] || "";
              return `${translatePart} ${rotatePart} scale(1.05)`;
            }
          }
          return element.attr("transform");
        });

      // Mover el elemento al final del contenedor para que esté encima de los otros
      element.raise();

      dispatch("wordHover", { word: d.text, value: d.originalValue || d.value });
    }

    function handleMouseOut(event, d) {
      const element = d3.select(this);
      element
        .transition()
        .duration(enableTransitions ? 200 : 0)
        .style("fill", getColor(d, d.index))
        .style("filter", enableShadows ? "url(#drop-shadow)" : "none")
        .attr("transform", function() {
          const originalTransform = `translate(${d.x},${d.y}) rotate(${d.rotation || 0})`;
          return originalTransform;
        });
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

    // Calcular el tamaño aproximado de cada elemento de texto para colisiones
    sortedWords.forEach(word => {
      const textElement = container.select(`text[data-word="${word.text}"]`).node();
      if (textElement) {
        const bbox = textElement.getBBox();
        word.width = bbox.width;
        word.height = bbox.height;
      } else {
        // Estimación si no podemos obtener el tamaño real
        word.width = word.text.length * (word.fontSize * 0.6);
        word.height = word.fontSize * 1.2;
      }
    });

    // Mejorar la simulación para evitar solapamientos
    simulation = d3
      .forceSimulation(sortedWords)
      .force("center", d3.forceCenter(0, 0).strength(0.01)) // Reducir fuerza central
      .force(
        "collide",
        d3.forceCollide().radius(d => {
          // Radio más grande para evitar solapamientos
          return (d.width + d.height) * 0.28 + padding;
        }).strength(0.98).iterations(6) // Fuerza muy alta y más iteraciones
      )
      .force("radial", d3.forceRadial(
        d => {
          const normalizedValue = d.value / d3.max(sortedWords, w => w.value);
          const baseRadius = Math.min(dimensions.width, dimensions.height) * 0.35;
          return baseRadius * (0.1 + (1 - normalizedValue) * 0.7) - (d.width + d.height) * 0.25;
        },
        0, 0
      ).strength(0.18)) // Fuerza radial ajustada
      .force("x", d3.forceX(d => d.x * 0.2).strength(0.01)) // Mantener posición inicial suavemente
      .force("y", d3.forceY(d => d.y * 1).strength(0.01))
      .stop();

    // Más iteraciones para resolver la simulación
    for (let i = 0; i < 900; i++) {
      simulation.tick();

      // Verificar y ajustar posiciones en cada iteración, no solo periódicamente
      sortedWords.forEach(word => {
        // Calcular el radio máximo teniendo en cuenta el tamaño de la palabra
        // para evitar que se salga de los bordes
        const maxDistance = Math.min(dimensions.width, dimensions.height) * 0.45 -
                          Math.max(word.width, word.height) / 3;

        const distanceFromCenter = Math.sqrt(word.x * word.x + word.y * word.y);

        if (distanceFromCenter > maxDistance) {
          const factor = maxDistance / distanceFromCenter;
          word.x *= factor;
          word.y *= factor;
        }
      });
    }

    // Algoritmo adicional para resolver solapamientos persistentes
    function wordsOverlap(a, b) {
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      const widthOverlap = (a.width + b.width) * 0.4; // Factor de tolerancia
      const heightOverlap = (a.height + b.height) * 0.8; // Factor de tolerancia

      return dx < widthOverlap && dy < heightOverlap;
    }

    // Verificación manual anti-solapamiento
    let iterations = 0;
    let overlapFound = true;

    while (overlapFound && iterations < maxOverlapIterations) {
      overlapFound = false;
      iterations++;

      for (let i = 0; i < sortedWords.length; i++) {
        const wordA = sortedWords[i];

        for (let j = i + 1; j < sortedWords.length; j++) {
          const wordB = sortedWords[j];

          if (wordsOverlap(wordA, wordB)) {
            overlapFound = true;

            // Calcular vector entre palabras
            const dx = wordB.x - wordA.x || 0.1; // Evitar división por cero
            const dy = wordB.y - wordA.y || 0.1;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;

            // Determinar cuánto mover cada palabra
            const minDistance = (wordA.width + wordB.width + wordA.height + wordB.height) * 0.25 + padding;
            const moveAmount = (minDistance - distance + 2) / 2; // +2 para un poco de margen extra

            // Ajustar palabras en dirección opuesta
            const moveX = (dx / distance) * moveAmount;
            const moveY = (dy / distance) * moveAmount;

            // Palabra más pequeña se mueve más
            const totalWeight = wordA.value + wordB.value;
            const weightFactorA = wordB.value / totalWeight;
            const weightFactorB = wordA.value / totalWeight;

            wordA.x -= moveX * weightFactorA * 1.2;
            wordA.y -= moveY * weightFactorA * 1.2;
            wordB.x += moveX * weightFactorB * 1.2;
            wordB.y += moveY * weightFactorB * 1.2;

            // Mantener dentro de límites
            const maxRadius = Math.min(dimensions.width, dimensions.height) * 0.48;
            [wordA, wordB].forEach(word => {
              const maxX = Math.min(dimensions.width, dimensions.height) * 0.7 - word.width / 2;
              const maxY = Math.min(dimensions.width, dimensions.height) * 0.45 - word.height / 2;

              // Mantener dentro de los límites X
              if (Math.abs(word.x) > maxX) {
                word.x = Math.sign(word.x) * maxX;
              }

              // Mantener dentro de los límites Y
              if (Math.abs(word.y) > maxY) {
                word.y = Math.sign(word.y) * maxY;
              }
            });
          }
        }
      }
    }

    // Actualizar posiciones de texto
    texts
      .attr("transform", d => {
        return `translate(${d.x},${d.y}) rotate(${d.rotation || 0})`;
      });

    // Animación de entrada
    texts
      .transition()
      .delay((d, i) => enableTransitions ? i * (animationDuration / sortedWords.length / 2) : 0)
      .duration(enableTransitions ? animationDuration / 2 : 0)
      .style("opacity", 1)
      .style("font-size", d => `${d.fontSize}px`);

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
      <div class="title-with-tooltip">
        <div class="tooltip-container">
          <div class="info-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" stroke="#141B34" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M10.0239 10.0107H12.0048V16.9917M11.2514 7.26758H12.7509" stroke="#141B34" stroke-width="1.5"/>
            </svg>
          </div>
          <div class="tooltip-text">
            CloudWorld displays the most frequently used words in tweets containing the hashtags shown in the Line Chart
          </div>
        </div>
        <h2 class="wordcloud-title">{title}</h2>
      </div>
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
    padding: 5px 10px;
    text-align: center;
  }

  .title-with-tooltip {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    gap: 8px;
  }

  .wordcloud-title {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: #333;
  }

  .tooltip-container {
    position: relative;
    display: inline-block;
  }

  .info-icon {
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .tooltip-text {
    visibility: hidden;
    position: absolute;
    width: 250px;
    background-color: #333;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 8px;
    z-index: 10;
    top: -5px;
    left: 125%;
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 12px;
    font-weight: normal;
  }

  .tooltip-text::after {
    content: "";
    position: absolute;
    top: 50%;
    right: 100%;
    margin-top: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent #333 transparent transparent;
  }

  .tooltip-container:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
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

  :global(.wordcloud-word) {
    transition: opacity 0.2s ease-out;
    position: relative;
  }

  :global(.wordcloud-word:hover) {
    cursor: pointer;
  }

  :global(.highlight-group) {
    pointer-events: all;
  }
</style>