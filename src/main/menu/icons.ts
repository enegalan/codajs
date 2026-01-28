import { nativeImage } from 'electron';

export function createThemePreviewIcon(colors: string[]): Electron.NativeImage {
  const width = 100;
  const height = 16;
  const segmentWidth = Math.floor(width / colors.length);

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  const buffer = Buffer.alloc(width * height * 4);
  let offset = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const segmentIndex = Math.floor(x / segmentWidth);
      const color = colors[Math.min(segmentIndex, colors.length - 1)];
      const [r, g, b] = hexToRgb(color);
      buffer[offset++] = b;
      buffer[offset++] = g;
      buffer[offset++] = r;
      buffer[offset++] = 255;
    }
  }

  return nativeImage.createFromBuffer(buffer, { width, height });
}

export function createPlayIcon(): Electron.NativeImage {
  const size = 32;
  const scale = 2;
  const buffer = Buffer.alloc(size * size * 4);
  let offset = 0;

  const x1 = 8;
  const y1 = 4;
  const x2 = 8;
  const y2 = 28;
  const x3 = 24;
  const y3 = 16;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist1 = distanceToLine(x, y, x1, y1, x2, y2);
      const dist2 = distanceToLine(x, y, x2, y2, x3, y3);
      const dist3 = distanceToLine(x, y, x3, y3, x1, y1);

      const inside = isPointInTriangle(x, y, x1, y1, x2, y2, x3, y3);

      if (inside) {
        const minDist = Math.min(dist1, dist2, dist3);
        const alpha = Math.min(255, Math.max(0, 255 - minDist * 2));

        buffer[offset++] = 255;
        buffer[offset++] = 255;
        buffer[offset++] = 255;
        buffer[offset++] = alpha;
      } else {
        buffer[offset++] = 0;
        buffer[offset++] = 0;
        buffer[offset++] = 0;
        buffer[offset++] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size, scaleFactor: scale });
}

export function createStopIcon(): Electron.NativeImage {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  let offset = 0;

  const margin = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x >= margin && x < size - margin && y >= margin && y < size - margin) {
        buffer[offset++] = 255;
        buffer[offset++] = 255;
        buffer[offset++] = 255;
        buffer[offset++] = 255;
      } else {
        buffer[offset++] = 0;
        buffer[offset++] = 0;
        buffer[offset++] = 0;
        buffer[offset++] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

export function createVerticalLayoutIcon(): Electron.NativeImage {
  const size = 32;
  const scale = 2;
  const buffer = Buffer.alloc(size * size * 4);
  let offset = 0;

  const rectWidth = 10;
  const rectHeight = 12;
  const spacing = 2;
  const startX = (size - rectWidth) / 2;
  const topY = (size - (rectHeight * 2 + spacing)) / 2;
  const bottomY = topY + rectHeight + spacing;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inTopRect = x >= startX && x < startX + rectWidth && y >= topY && y < topY + rectHeight;
      const inBottomRect =
        x >= startX && x < startX + rectWidth && y >= bottomY && y < bottomY + rectHeight;

      if (inTopRect || inBottomRect) {
        buffer[offset++] = 255;
        buffer[offset++] = 255;
        buffer[offset++] = 255;
        buffer[offset++] = 255;
      } else {
        buffer[offset++] = 0;
        buffer[offset++] = 0;
        buffer[offset++] = 0;
        buffer[offset++] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size, scaleFactor: scale });
}

export function createHorizontalLayoutIcon(): Electron.NativeImage {
  const size = 32;
  const scale = 2;
  const buffer = Buffer.alloc(size * size * 4);
  let offset = 0;

  const rectWidth = 12;
  const rectHeight = 10;
  const spacing = 2;
  const startY = (size - rectHeight) / 2;
  const leftX = (size - (rectWidth * 2 + spacing)) / 2;
  const rightX = leftX + rectWidth + spacing;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inLeftRect =
        x >= leftX && x < leftX + rectWidth && y >= startY && y < startY + rectHeight;
      const inRightRect =
        x >= rightX && x < rightX + rectWidth && y >= startY && y < startY + rectHeight;

      if (inLeftRect || inRightRect) {
        buffer[offset++] = 255;
        buffer[offset++] = 255;
        buffer[offset++] = 255;
        buffer[offset++] = 255;
      } else {
        buffer[offset++] = 0;
        buffer[offset++] = 0;
        buffer[offset++] = 0;
        buffer[offset++] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size, scaleFactor: scale });
}

function distanceToLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number, yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function isPointInTriangle(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): boolean {
  const d1 = sign(px, py, x1, y1, x2, y2);
  const d2 = sign(px, py, x2, y2, x3, y3);
  const d3 = sign(px, py, x3, y3, x1, y1);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

function sign(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number
): number {
  return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
}
