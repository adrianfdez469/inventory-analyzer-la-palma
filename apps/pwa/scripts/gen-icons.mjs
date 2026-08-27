// Generador de iconos PWA sin dependencias externas (solo node:zlib).
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

const BG = [0x0f, 0x17, 0x2a]; // slate-950
const BARS = [
  [0x16, 0x5b, 0x33], // verde oscuro
  [0x22, 0xc5, 0x5e], // verde medio (emerald-500)
  [0x86, 0xef, 0xac], // verde claro
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** Dibuja el logo (fondo redondeado + 3 barras crecientes + línea base) en un buffer RGB */
function drawLogo(size, { rounded, maskableSafeArea }) {
  const px = new Uint8Array(size * size * 3);
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    px[i] = color[0];
    px[i + 1] = color[1];
    px[i + 2] = color[2];
  };

  const radius = rounded ? Math.round(size * 0.18) : 0;
  const insideRoundedRect = (x, y) => {
    if (radius === 0) return true;
    const corners = [
      [radius, radius],
      [size - radius, radius],
      [radius, size - radius],
      [size - radius, size - radius],
    ];
    for (const [cx, cy] of corners) {
      const inCornerBox =
        (cx === radius && x < radius) || (cx === size - radius && x > size - radius);
      const inCornerBoxY =
        (cy === radius && y < radius) || (cy === size - radius && y > size - radius);
      if (inCornerBox && inCornerBoxY) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > radius * radius) return false;
      }
    }
    return true;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (insideRoundedRect(x, y)) set(x, y, BG);
    }
  }

  // Contenido centrado; para maskable, mantener el contenido en el 60% central (safe area).
  const scale = maskableSafeArea ? 0.6 : 0.86;
  const contentSize = size * scale;
  const offset = (size - contentSize) / 2;

  const barCount = 3;
  const barGap = contentSize * 0.12;
  const barWidth = (contentSize - barGap * (barCount - 1)) / barCount;
  const baseY = offset + contentSize; // línea base
  const heights = [0.4, 0.7, 1.0].map((h) => h * contentSize * 0.85);

  // Línea base
  const baseThickness = Math.max(2, Math.round(size * 0.012));
  for (let t = 0; t < baseThickness; t++) {
    for (let x = Math.round(offset); x < Math.round(offset + contentSize); x++) {
      set(x, Math.round(baseY) - t, BARS[1]);
    }
  }

  for (let b = 0; b < barCount; b++) {
    const x0 = Math.round(offset + b * (barWidth + barGap));
    const x1 = Math.round(x0 + barWidth);
    const barHeight = heights[b];
    const y0 = Math.round(baseY - barHeight - baseThickness);
    const y1 = Math.round(baseY - baseThickness);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        set(x, y, BARS[b]);
      }
    }
  }

  return px;
}

function encodePNG(size, px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB (sin transparencia)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    raw.set(px.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }
  const idatData = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function generate(fileName, size, opts) {
  const px = drawLogo(size, opts);
  const png = encodePNG(size, px);
  writeFileSync(path.join(outDir, fileName), png);
  console.log(`✓ ${fileName} (${size}x${size})`);
}

generate("pwa-192.png", 192, { rounded: true, maskableSafeArea: false });
generate("pwa-512.png", 512, { rounded: true, maskableSafeArea: false });
generate("maskable-512.png", 512, { rounded: false, maskableSafeArea: true });
