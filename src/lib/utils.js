function hashtagToColor(hashtag) {
  // Convertir el hashtag a una suma simple de valores ASCII
  let hashSum = 0;
  for (let i = 0; i < hashtag.length; i++) {
    hashSum += hashtag.charCodeAt(i);
  }
  
  // Usar el valor hash para generar componentes de color HSL
  // Hue: 0-360 (tonalidad del color)
  // Saturation: 60-100% (intensidad del color)
  // Lightness: 35-65% (brillo, evitando extremos demasiado oscuros o claros)
  const hue = hashSum % 360;
  const saturation = 60 + (hashSum % 40); // Entre 60% y 100%
  const lightness = 35 + (hashSum % 30);  // Entre 35% y 65%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}