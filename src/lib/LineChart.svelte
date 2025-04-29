<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import * as d3 from 'd3';
  
  // Interfaces
  interface HashtagData {
    hashtag: string;
    date: Date;
    count: number;
  }
  
  // Props
  export let data: HashtagData[] = [];
  
  let chartElement: SVGSVGElement;
  let containerElement: HTMLDivElement;
  let dimensions = { width: 0, height: 0 };
  let tooltip;
  
  // Reactive statement para agrupar los datos
  $: hashtagsGrouped = groupData(data);
  
  function groupData(inputData: HashtagData[]) {
    if (!inputData || inputData.length === 0) return [];
    
    // Agrupar datos por hashtag
    const grouped = d3.group(inputData, d => d.hashtag);
    
    // Convertir Map a Array para compatibilidad con visualización
    return Array.from(grouped, ([key, values]) => ({
      key,
      values
    }));
  }
  
  // Reactive statement para escalas y dominios
  $: scales = calculateScales(data, dimensions);
  
  function calculateScales(inputData: HashtagData[], dims) {
    if (!inputData || inputData.length === 0 || dims.width === 0 || dims.height === 0) {
      return { xScale: null, yScale: null, colorScale: null, margin: null };
    }
    
    const margin = { top: 10, right: 30, bottom: 30, left: 60 };
    const width = dims.width - margin.left - margin.right;
    const height = dims.height - margin.top - margin.bottom;
    
    // Extraer fechas y crear escala de tiempo
    const dates = inputData.map(d => new Date(d.date));
    const xScale = d3.scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([0, width]);
    
    // Crear escala lineal para eje Y
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(inputData, d => d.count) || 0])
      .range([height, 0]);
    
    // Crear escala de color
    const hashtags = Array.from(new Set(inputData.map(d => d.hashtag)));
    const colorScale = d3.scaleOrdinal<string>()
      .domain(hashtags)
      .range(d3.quantize(
        t => d3.interpolateRainbow(t),
        hashtags.length > 0 ? hashtags.length : 1
      ));
    
    return { xScale, yScale, colorScale, margin, width, height };
  }
  
  function findClosestPoint(mouseX, mouseY) {
    if (!scales.xScale || !scales.yScale || !hashtagsGrouped.length) return null;
    
    let closestPoint = null;
    let minDistance = Infinity;
    
    hashtagsGrouped.forEach(group => {
      group.values.forEach(point => {
        const xPos = scales.xScale(new Date(point.date));
        const yPos = scales.yScale(point.count);
        const distance = Math.sqrt(
          Math.pow(xPos - mouseX, 2) + Math.pow(yPos - mouseY, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });
    });
    
    return minDistance < 30 ? closestPoint : null; // 30px umbral para detección
  }
  
  function updateChart() {
    if (!data || data.length === 0 || !chartElement || 
        dimensions.width === 0 || dimensions.height === 0 || 
        !scales.xScale || !scales.yScale || !scales.colorScale) return;
    
    // Limpiar gráfico anterior si existe
    d3.select(chartElement).selectAll("*").remove();
    
    // Crear contenedor SVG
    const svg = d3.select(chartElement)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${scales.margin.left},${scales.margin.top})`);
    
    // Añadir eje X
    svg.append("g")
      .attr("transform", `translate(0,${scales.height})`)
      .call(d3.axisBottom(scales.xScale).ticks(5));
    
    // Añadir eje Y
    svg.append("g")
      .call(d3.axisLeft(scales.yScale));
    
    // Crear div para tooltip
    tooltip = d3.select(containerElement)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "8px")
      .style("padding", "10px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("box-shadow", "0 4px 8px rgba(0,0,0,0.2)");
    
    // Crear área de interacción para tooltip
    svg.append("rect")
      .attr("width", scales.width)
      .attr("height", scales.height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", function(event) {
        const [mouseX, mouseY] = d3.pointer(event);
        const closestPoint = findClosestPoint(mouseX, mouseY);
        
        if (closestPoint) {
          const xPos = scales.xScale(new Date(closestPoint.date));
          const yPos = scales.yScale(closestPoint.count);
          
          // Actualizar contenido y posición del tooltip
          tooltip
            .style("opacity", 1)
            .style("left", `${event.offsetX + 15}px`)
            .style("top", `${event.offsetY - 28}px`)
            .html(`<div style="display: flex; align-items: center; margin-bottom: 4px;">
                   <div style="width: 12px; height: 12px; background-color: ${scales.colorScale(
                     closestPoint.hashtag
                   )}; margin-right: 6px; border-radius: 50%;"></div>
                   <strong>${closestPoint.hashtag}</strong>
                 </div>
                 Date: ${new Date(closestPoint.date).toLocaleDateString()}<br/>
                 Count: ${closestPoint.count}`);
          
          // Añadir círculo resaltado
          svg.selectAll(".hover-circle").remove();
          svg.append("circle")
            .attr("class", "hover-circle")
            .attr("cx", xPos)
            .attr("cy", yPos)
            .attr("r", 5)
            .style("fill", scales.colorScale(closestPoint.hashtag))
            .style("stroke", "#fff")
            .style("stroke-width", 2);
        } else {
          // Ocultar tooltip cuando no está sobre ningún punto
          tooltip.style("opacity", 0);
          svg.selectAll(".hover-circle").remove();
        }
      })
      .on("mouseleave", function() {
        // Ocultar tooltip y resaltado cuando el ratón sale del área
        tooltip.style("opacity", 0);
        svg.selectAll(".hover-circle").remove();
      });
    
    // Crear generador de línea
    const lineGenerator = d3.line<HashtagData>()
      .x(d => scales.xScale(new Date(d.date)))
      .y(d => scales.yScale(d.count));
    
    // Dibujar las líneas
    svg.selectAll(".line")
      .data(hashtagsGrouped)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", d => scales.colorScale(d.key))
      .attr("stroke-width", 1.5)
      .attr("d", d => lineGenerator(d.values));
  }
  
  // Actualizar dimensiones y recalcular gráfico cuando el componente se monta
  onMount(() => {
    if (containerElement) {
      const { width, height } = containerElement.getBoundingClientRect();
      dimensions = { width, height };
    }
  });
  
  // Actualizar gráfico cuando cambian los datos o dimensiones
  $: if (data && dimensions.width > 0 && dimensions.height > 0) {
    // Eliminamos el tooltip anterior si existe
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
    
    updateChart();
  }
</script>

<div bind:this={containerElement} class="w-full h-full relative">
  <svg bind:this={chartElement} width="100%" height="100%"></svg>
</div>