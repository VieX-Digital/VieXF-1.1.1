export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function updateThemeColors(primaryHex: string) {
    document.documentElement.style.setProperty("--color-vie-primary", primaryHex);
    document.documentElement.style.setProperty("--color-vie-primary-hover", primaryHex);
    
    const hsl = hexToHSL(primaryHex);
    // Shift hue by 60 degrees for a distinct but related secondary color
    const secH = (hsl.h + 60) % 360;
    const secColor = `hsl(${secH}, ${hsl.s}%, ${hsl.l}%)`;
    
    document.documentElement.style.setProperty("--color-vie-gradient-secondary", secColor);
}
