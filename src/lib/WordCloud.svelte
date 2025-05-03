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
  // export let rotationAngles = [-30, -15, 0, 15, 30]; // Más variedad de ángulos
  export let tooltipPosition = "header"; // Puede ser "header", "footer" o "hover"
  
  // Opciones avanzadas
  export let spiralResolution = 0.1; // Menor = más denso
  export let fontWeightMin = 300;
  export let fontWeightMax = 700;
  export let highContrastMode = false; // Para accesibilidad
  export let useGrid = false; // Distribuir en grid en lugar de espiral
  export let padding = 5; // Espacio entre palabras
  export let showTooltip = false; // Permitir deshabilitar tooltips
  export let enableTransitions = true; // Permitir deshabilitar animaciones para mejor rendimiento
  export let adaptiveColors = true; // Colores que se ajustan al tamaño/importancia
  export let enableShadows = true; // Permite deshabilitar sombras para mejor rendimiento
  export let scaleOnHover = false; // Deshabilitar el escalado en hover por defecto para evitar problemas de posicionamiento

  // Referencias y variables
  let svgElement;
  let containerElement;
  let tooltipElement;
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
      dimensions = { width: Math.max(300, width), height: Math.max(300, height) };
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
    
    if (containerElement) {
      resizeObserver.observe(containerElement);
    }
    
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
    
    // Gradientes para palabras destacadas (mejorados)
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

    // Añadir elemento para el tooltip de cabecera/pie
    if (showTooltip && tooltipPosition !== "hover") {
      svg.append("text")
        .attr("class", "wordcloud-tooltip")
        .attr("x", dimensions.width / 2)
        .attr("y", tooltipPosition === "header" ? 40 : dimensions.height - 20)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("font-family", fontFamily)
        .style("fill", "#333")
        .style("opacity", 0)
        .text("");
    }

    // Crear contenedor para centrar la nube de palabras
    const container = svg
      .append("g")
      .attr("class", "wordcloud-container")
      .attr(
        "transform",
        `translate(${dimensions.width / 2}, ${dimensions.height / 2})`
      );

    // Añadir filtro de sombra sutil para profundidad
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
        
      // Filtro más intenso para hover
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

    // Crear escala de colores más vibrante
    const baseColorScale = d3.scaleOrdinal(actualColorScheme);
    
    // Función de color adaptativa para mejorar visualmente la nube
    const getColor = (d, i) => {
      if (!adaptiveColors) return baseColorScale(i % actualColorScheme.length);
      
      // Ajustar saturación y brillo basado en importancia
      const normalizedValue = d.value / d3.max(displayWords, w => w.value);
      const baseColor = d3.hsl(baseColorScale(i % actualColorScheme.length));
      
      // Mayor importancia = más saturado
      baseColor.s = Math.min(1, baseColor.s + normalizedValue * 0.3);
      // Mayor importancia = ligeramente más oscuro para contraste
      baseColor.l = Math.max(0.3, Math.min(0.7, baseColor.l - normalizedValue * 0.2));
      
      return baseColor.toString();
    };

    // Calcular el área de visualización
    const visualizationArea = Math.min(dimensions.width, dimensions.height);

    // Ajustar escala de tamaño de fuente basado en el área y palabras
    const scaleFactor = visualizationArea / 180;
    
    // Ordenar palabras por valor para posicionar las más importantes primero
    let sortedWords = [...displayWords].sort((a, b) => b.value - a.value);
    
    // Normalizar valores para mejor distribución visual
    sortedWords = sortedWords.map((d, i) => ({
      ...d,
      index: i, // Preservar orden original
      fontSize: 0, // Inicializar con 0 para animación
      // Asegurar que siempre haya un valor original
      originalValue: d.originalValue !== undefined ? d.originalValue : d.value
    }));

    // Función para calcular tamaño de texto
    const fontSizeScale = d3
      .scalePow()
      .exponent(0.8) // Mejor escala visual para palabras grandes/pequeñas
      .domain([
        Math.max(1, d3.min(sortedWords, (d) => d.value) || 1), 
        d3.max(sortedWords, (d) => d.value) || 100
      ])
      .range([sizeRange[0] * scaleFactor, sizeRange[1] * scaleFactor])
      .clamp(true);
      
    // Función para determinar peso de fuente
    const fontWeightScale = d3
      .scaleLinear()
      .domain([0, d3.max(sortedWords, d => d.value) || 100])
      .range([fontWeightMin, fontWeightMax])
      .clamp(true);

    // Función para calcular la posición de las palabras
    function calculatePosition(d, i) {
      if (useGrid) {
        // Distribuir en grid para un formato más estructurado
        const gridSize = Math.ceil(Math.sqrt(sortedWords.length));
        const x = ((i % gridSize) - gridSize / 2) * (dimensions.width / gridSize / 1.5);
        const y = (Math.floor(i / gridSize) - gridSize / 2) * (dimensions.height / gridSize / 1.8);
        return { x, y };
      } else {
        // Espiral de Arquímedes mejorada con ajustes de espacio
        // Usamos un valor fijo para la secuencia en lugar de índices para mayor estabilidad
        const t = (i * spiralResolution) * (1 + Math.min(0.5, i / sortedWords.length)); // Ajuste más estable
        const radius = (1 + 5 * t) * scaleFactor;
        const x = radius * Math.cos(t);
        const y = radius * Math.sin(t);
        return { x, y };
      }
    }

    // Crear elemento tooltip tipo hover que sigue al cursor
    if (showTooltip && tooltipPosition === "hover") {
      tooltipElement = svg.append("g")
        .attr("class", "hover-tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none");
      
      tooltipElement.append("rect")
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("width", 10) // Se actualizará dinámicamente
        .attr("height", 24)
        .style("fill", "#333")
        .style("opacity", 0.9);
        
      tooltipElement.append("text")
        .attr("x", 5)
        .attr("y", 16)
        .style("font-size", "12px")
        .style("font-family", fontFamily)
        .style("font-weight", "bold")
        .style("fill", "#fff")
        .text("");
    }

    // Función para manejar hover en palabras
    function handleMouseOver(event, d) {
      // Destacar palabra con efectos más estables
      d3.select(this)
        .transition()
        .duration(enableTransitions ? 200 : 0)
        .style("fill", "url(#word-highlight-gradient)")
        .style("filter", enableShadows ? "url(#hover-shadow)" : "none")
        // Opcionalmente escalar si está activado, pero con SVG transform para mayor estabilidad
        .attr("transform", function() {
          if (scaleOnHover) {
            const currentTransform = d3.select(this).attr("transform");
            // Solo aplicar escala si está habilitada, sin modificar la posición
            if (currentTransform && currentTransform.includes("translate")) {
              // Extraer la parte de translación y mantenerla
              const translatePart = currentTransform.match(/translate\([^)]+\)/)[0];
              const rotatePart = currentTransform.match(/rotate\([^)]+\)/)?.[0] || "";
              return `${translatePart} ${rotatePart} scale(1.05)`;
            }
          }
          return d3.select(this).attr("transform");
        });
        
      // Mostrar información en el tooltip
      if (showTooltip) {
        if (tooltipPosition === "hover") {
          // Actualizar tooltip flotante
          const tooltipText = `${d.text}: ${d.originalValue || Math.round(d.value)}`;
          const tooltipTextElement = tooltipElement.select("text");
          tooltipTextElement.text(tooltipText);
          
          // Ajustar tamaño del rectángulo
          const textBBox = tooltipTextElement.node().getBBox();
          tooltipElement.select("rect")
            .attr("width", textBBox.width + 10);
            
          // Posicionar tooltip cerca del cursor
          const [mouseX, mouseY] = d3.pointer(event, svg.node());
          tooltipElement
            .attr("transform", `translate(${mouseX + 10},${mouseY - 30})`)
            .transition()
            .duration(enableTransitions ? 200 : 0)
            .style("opacity", 1);
        } else {
          // Tooltip fijo en header/footer
          svg.select(".wordcloud-tooltip")
            .text(`${d.text}: ${d.originalValue || Math.round(d.value)}`)
            .transition()
            .duration(enableTransitions ? 200 : 0)
            .style("opacity", 1);
        }
      }
        
      // Disparar evento
      dispatch("wordHover", { word: d.text, value: d.originalValue || d.value });
    }
    
    // Función para manejar mouseout
    function handleMouseOut(event, d) {
      // Restaurar palabra a su estado original
      d3.select(this)
        .transition()
        .duration(enableTransitions ? 200 : 0)
        .style("fill", getColor(d, d.index))
        .style("filter", enableShadows ? "url(#drop-shadow)" : "none")
        // Restaurar transformación original
        .attr("transform", function() {
          // Eliminar cualquier escala que se haya aplicado en hover
          const originalTransform = `translate(${d.x},${d.y}) rotate(${d.rotation || 0})`;
          return originalTransform;
        });
        
      // Ocultar tooltip
      if (showTooltip) {
        if (tooltipPosition === "hover") {
          tooltipElement
            .transition()
            .duration(enableTransitions ? 200 : 0)
            .style("opacity", 0);
        } else {
          svg.select(".wordcloud-tooltip")
            .transition()
            .duration(enableTransitions ? 200 : 0)
            .style("opacity", 0);
        }
      }
    }
    
    // Función para manejar movimiento del ratón (para tooltip flotante)
    function handleMouseMove(event) {
      if (showTooltip && tooltipPosition === "hover" && tooltipElement) {
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        tooltipElement.attr("transform", `translate(${mouseX + 10},${mouseY - 30})`);
      }
    }

    // Añadir palabras al SVG
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
        // Rotación variable entre los ángulos permitidos
        // const rotation = rotationAngles[Math.floor(Math.random() * rotationAngles.length)];
        const rotation = 0;
        d.x = pos.x;
        d.y = pos.y;
        d.rotation = rotation;
        return `translate(${pos.x},${pos.y}) rotate(${rotation})`;
      })
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("mousemove", handleMouseMove)
      .on("click", function(event, d) {
        // Disparar evento de click
        dispatch("wordClick", { word: d.text, value: d.originalValue || d.value });
      });

    // Animación de entrada secuencial para palabras
    texts
      .transition()
      .delay((d, i) => enableTransitions ? i * (animationDuration / sortedWords.length / 2) : 0)
      .duration(enableTransitions ? animationDuration / 2 : 0)
      .style("opacity", 1)
      .style("font-size", d => `${fontSizeScale(d.value)}px`);

    // Optimizar posiciones usando algoritmo de fuerza para evitar solapamientos
    simulation = d3
      .forceSimulation(sortedWords)
      .force("center", d3.forceCenter(0, 0).strength(0.05)) // Reducir fuerza para mejor estabilidad
      .force(
        "collide",
        d3.forceCollide().radius(d => {
          // Añadir margen extra para evitar interacciones problemáticas
          return fontSizeScale(d.value) * (0.7 + padding / 10);
        }).strength(0.8) // Aumentar fuerza de colisión para mejor separación
      )
      .force("x", d3.forceX(d => d.x * 0.4).strength(0.03)) // Ajustar para más estabilidad
      .force("y", d3.forceY(d => d.y * 0.4).strength(0.03)) // Ajustar para más estabilidad
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
      
    // Añadir borde decorativo sutil al SVG (opcional)
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

  // Función para seleccionar una palabra programáticamente
  export function highlightWord(wordText) {
    if (!svgElement) return;
    
    const wordElement = d3.select(svgElement)
      .select(`text[data-word="${wordText}"]`);
      
    if (!wordElement.empty()) {
      // Trigger el evento mouseover
      const wordData = wordElement.datum();
      wordElement.node().__on[0].value.call(wordElement.node(), null, wordData);
    }
  }
</script>

<div
  bind:this={containerElement}
  class="wordcloud-container"
  style="width: 100%; height: 100%; min-height: 400px;"
>
  <svg bind:this={svgElement} width="100%" height="100%" class="wordcloud"></svg>
</div>

<style>
  .wordcloud-container {
    position: relative;
    overflow: hidden;
    border-radius: 8px; /* Bordes redondeados */
  }

  .wordcloud {
    display: block;
  }
  
  :global(.wordcloud-word) {
    /* Quitamos la transición del transform que está causando el problema */
    transition: opacity 0.2s ease-out;
  }
  
  :global(.wordcloud-word:hover) {
    cursor: pointer;
    /* Eliminamos el transform que estaba causando el comportamiento errático */
  }
</style>