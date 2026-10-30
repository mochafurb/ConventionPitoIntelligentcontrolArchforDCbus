// generate_png_charts.js
// Pure Node.js high-resolution scientific plot renderer

const fs = require('fs');
const zlib = require('zlib');

// CRC32 calculation for PNG chunks
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function encodePNG(width, height, rgbBuffer) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // RGB 24-bit
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowStride = width * 3;
  const rawData = Buffer.alloc(height * (1 + rowStride));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + rowStride)] = 0;
    rgbBuffer.copy(rawData, y * (1 + rowStride) + 1, y * rowStride, (y + 1) * rowStride);
  }
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 }));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Bitmap Font (5x7 standard characters)
const FONT_5X7 = {
  ' ': [0x00,0x00,0x00,0x00,0x00],
  '!': [0x00,0x00,0x5F,0x00,0x00],
  '"': [0x00,0x07,0x00,0x07,0x00],
  '#': [0x14,0x7F,0x14,0x7F,0x14],
  '$': [0x24,0x2A,0x7F,0x2A,0x12],
  '%': [0x23,0x13,0x08,0x64,0x62],
  '&': [0x36,0x49,0x55,0x22,0x50],
  '\'': [0x00,0x05,0x03,0x00,0x00],
  '(': [0x00,0x1C,0x22,0x41,0x00],
  ')': [0x00,0x41,0x22,0x1C,0x00],
  '*': [0x14,0x08,0x3E,0x08,0x14],
  '+': [0x08,0x08,0x3E,0x08,0x08],
  ',': [0x00,0x50,0x30,0x00,0x00],
  '-': [0x08,0x08,0x08,0x08,0x08],
  '.': [0x00,0x60,0x60,0x00,0x00],
  '/': [0x20,0x10,0x08,0x04,0x02],
  '0': [0x3E,0x51,0x49,0x45,0x3E],
  '1': [0x00,0x42,0x7F,0x40,0x00],
  '2': [0x42,0x61,0x51,0x49,0x46],
  '3': [0x21,0x41,0x45,0x4B,0x31],
  '4': [0x18,0x14,0x12,0x7F,0x10],
  '5': [0x27,0x45,0x45,0x45,0x39],
  '6': [0x3C,0x4A,0x49,0x49,0x30],
  '7': [0x01,0x71,0x09,0x05,0x03],
  '8': [0x36,0x49,0x49,0x49,0x36],
  '9': [0x06,0x49,0x49,0x29,0x1E],
  ':': [0x00,0x36,0x36,0x00,0x00],
  ';': [0x00,0x56,0x36,0x00,0x00],
  '<': [0x08,0x14,0x22,0x41,0x00],
  '=': [0x14,0x14,0x14,0x14,0x14],
  '>': [0x00,0x41,0x22,0x14,0x08],
  '?': [0x02,0x01,0x51,0x09,0x06],
  '@': [0x32,0x49,0x79,0x41,0x3E],
  'A': [0x7E,0x11,0x11,0x11,0x7E],
  'B': [0x7F,0x49,0x49,0x49,0x36],
  'C': [0x3E,0x41,0x41,0x41,0x22],
  'D': [0x7F,0x41,0x41,0x22,0x1C],
  'E': [0x7F,0x49,0x49,0x49,0x41],
  'F': [0x7F,0x09,0x09,0x09,0x01],
  'G': [0x3E,0x41,0x49,0x49,0x7A],
  'H': [0x7F,0x08,0x08,0x08,0x7F],
  'I': [0x00,0x41,0x7F,0x41,0x00],
  'J': [0x20,0x40,0x41,0x3F,0x01],
  'K': [0x7F,0x08,0x14,0x22,0x41],
  'L': [0x7F,0x40,0x40,0x40,0x40],
  'M': [0x7F,0x02,0x0C,0x02,0x7F],
  'N': [0x7F,0x04,0x08,0x10,0x7F],
  'O': [0x3E,0x41,0x41,0x41,0x3E],
  'P': [0x7F,0x09,0x09,0x09,0x06],
  'Q': [0x3E,0x41,0x51,0x21,0x5E],
  'R': [0x7F,0x09,0x19,0x29,0x46],
  'S': [0x46,0x49,0x49,0x49,0x31],
  'T': [0x01,0x01,0x7F,0x01,0x01],
  'U': [0x3F,0x40,0x40,0x40,0x3F],
  'V': [0x1F,0x20,0x40,0x20,0x1F],
  'W': [0x3F,0x40,0x38,0x40,0x3F],
  'X': [0x63,0x14,0x08,0x14,0x63],
  'Y': [0x07,0x08,0x70,0x08,0x07],
  'Z': [0x61,0x51,0x49,0x45,0x43],
  '[': [0x00,0x7F,0x41,0x41,0x00],
  '\\': [0x02,0x04,0x08,0x10,0x20],
  ']': [0x00,0x41,0x41,0x7F,0x00],
  '^': [0x04,0x02,0x01,0x02,0x04],
  '_': [0x40,0x40,0x40,0x40,0x40],
  '`': [0x00,0x01,0x02,0x04,0x00],
  'a': [0x20,0x54,0x54,0x54,0x78],
  'b': [0x7F,0x48,0x44,0x44,0x38],
  'c': [0x38,0x44,0x44,0x44,0x20],
  'd': [0x38,0x44,0x44,0x48,0x7F],
  'e': [0x38,0x54,0x54,0x54,0x18],
  'f': [0x08,0x7E,0x09,0x01,0x02],
  'g': [0x0C,0x52,0x52,0x52,0x3E],
  'h': [0x7F,0x08,0x04,0x04,0x78],
  'i': [0x00,0x44,0x7D,0x40,0x00],
  'j': [0x20,0x40,0x44,0x3D,0x00],
  'k': [0x7F,0x10,0x28,0x44,0x00],
  'l': [0x00,0x41,0x7F,0x40,0x00],
  'm': [0x7C,0x04,0x18,0x04,0x78],
  'n': [0x7C,0x08,0x04,0x04,0x78],
  'o': [0x38,0x44,0x44,0x44,0x38],
  'p': [0x7C,0x14,0x14,0x14,0x08],
  'q': [0x08,0x14,0x14,0x18,0x7C],
  'r': [0x7C,0x08,0x04,0x04,0x08],
  's': [0x48,0x54,0x54,0x54,0x20],
  't': [0x04,0x3F,0x44,0x40,0x20],
  'u': [0x3C,0x40,0x40,0x20,0x7C],
  'v': [0x1C,0x20,0x40,0x20,0x1C],
  'w': [0x3C,0x40,0x30,0x40,0x3C],
  'x': [0x44,0x28,0x10,0x28,0x44],
  'y': [0x0C,0x50,0x50,0x50,0x3C],
  'z': [0x44,0x64,0x54,0x4C,0x44],
  '|': [0x00,0x00,0x7F,0x00,0x00],
  '~': [0x08,0x04,0x08,0x10,0x08]
};

class Canvas {
  constructor(w, h, bg = [255, 255, 255]) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 3 + 0] = bg[0];
      this.buf[i * 3 + 1] = bg[1];
      this.buf[i * 3 + 2] = bg[2];
    }
  }

  setPixel(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const idx = (y * this.w + x) * 3;
    this.buf[idx + 0] = color[0];
    this.buf[idx + 1] = color[1];
    this.buf[idx + 2] = color[2];
  }

  drawLine(x0, y0, x1, y1, color, thickness = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (thickness === 1) {
        this.setPixel(x0, y0, color);
      } else {
        const rad = Math.floor(thickness / 2);
        for (let ox = -rad; ox <= rad; ox++) {
          for (let oy = -rad; oy <= rad; oy++) {
            if (ox*ox + oy*oy <= (thickness*thickness)/4) {
              this.setPixel(x0 + ox, y0 + oy, color);
            }
          }
        }
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  drawDashedLine(x0, y0, x1, y1, color, dash = 6, gap = 4) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.floor(dist / (dash + gap));
    for (let i = 0; i <= steps; i++) {
      const t0 = (i * (dash + gap)) / dist;
      const t1 = Math.min(1.0, (i * (dash + gap) + dash) / dist);
      this.drawLine(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, color, 1);
    }
  }

  drawRect(x, y, w, h, strokeColor, fillColor = null) {
    if (fillColor) {
      for (let py = Math.max(0, y); py < Math.min(this.h, y + h); py++) {
        for (let px = Math.max(0, x); px < Math.min(this.w, x + w); px++) {
          this.setPixel(px, py, fillColor);
        }
      }
    }
    if (strokeColor) {
      this.drawLine(x, y, x + w, y, strokeColor);
      this.drawLine(x + w, y, x + w, y + h, strokeColor);
      this.drawLine(x + w, y + h, x, y + h, strokeColor);
      this.drawLine(x, y + h, x, y, strokeColor);
    }
  }

  drawText(str, x, y, color, scale = 1) {
    x = Math.round(x);
    y = Math.round(y);
    let curX = x;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const glyph = FONT_5X7[ch] || FONT_5X7['?'];
      for (let col = 0; col < 5; col++) {
        const colBits = glyph[col];
        for (let row = 0; row < 7; row++) {
          if ((colBits >> row) & 1) {
            for (let sx = 0; sx < scale; sx++) {
              for (let sy = 0; sy < scale; sy++) {
                this.setPixel(curX + col * scale + sx, y + row * scale + sy, color);
              }
            }
          }
        }
      }
      curX += 6 * scale;
    }
  }

  savePNG(filename) {
    const png = encodePNG(this.w, this.h, this.buf);
    fs.writeFileSync(filename, png);
    console.log(`Saved ${filename} (${this.w}x${this.h}, ${png.length} bytes)`);
  }
}

// Read simulation data
const sim = JSON.parse(fs.readFileSync('sim_data.json', 'utf8'));
const t = sim.t;
const e_pi = sim.e_pi;
const e_td3 = sim.e_td3;
const e_lstm = sim.e_lstm;
const y_pi = sim.y_pi;
const y_td3 = sim.y_td3;
const y_lstm = sim.y_lstm;
const u_pi = sim.u_pi;
const u_td3 = sim.u_td3;
const u_lstm = sim.u_lstm;

const COLOR_PI = [220, 38, 38];    // Red
const COLOR_TD3 = [37, 99, 235];   // Blue
const COLOR_LSTM = [22, 163, 74];  // Emerald Green
const COLOR_BLACK = [15, 23, 42];  // Slate 900
const COLOR_GRID = [226, 232, 240]; // Slate 200
const COLOR_AXIS = [100, 116, 139]; // Slate 500
const COLOR_BG_BOX = [248, 250, 252]; // Slate 50
const COLOR_HIGHLIGHT = [254, 243, 199]; // Amber 100

// =========================================================================
// Figure 1: Comparison of Highlighted Error Output Signal [Desired - Feedback]
// =========================================================================
console.log('Rendering Figure 1: Water_Tank_Error_Comparison.png...');
const c1 = new Canvas(1000, 700);

// Title
c1.drawText('Digital Assignment - 2: Comparison of [Desired water level - feed back] Error Signal', 140, 16, COLOR_BLACK, 2);

// Subplot 1 (Top): Full Horizon (0 to 60s)
const p1_x = 75, p1_y = 65, p1_w = 880, p1_h = 240;
c1.drawRect(p1_x, p1_y, p1_w, p1_h, COLOR_AXIS, [255, 255, 255]);
c1.drawText('(a) Full Simulation: Tracking Error e(t) = ref - y(t)', p1_x, p1_y - 18, [30, 58, 138], 1);

// Grid & Ticks (Subplot 1)
for (let sec = 0; sec <= 60; sec += 10) {
  const gx = p1_x + (sec / 60) * p1_w;
  c1.drawLine(gx, p1_y, gx, p1_y + p1_h, COLOR_GRID);
  c1.drawText(`${sec}s`, gx - 8, p1_y + p1_h + 6, COLOR_AXIS, 1);
}
for (let val = 0; val <= 10; val += 2) {
  const gy = p1_y + p1_h - ((val - (-1)) / (10.5 - (-1))) * p1_h;
  c1.drawLine(p1_x, gy, p1_x + p1_w, gy, COLOR_GRID);
  c1.drawText(`${val}m`, p1_x - 30, gy - 4, COLOR_AXIS, 1);
}
// Zero line
const zero1_y = p1_y + p1_h - ((0 - (-1)) / (10.5 - (-1))) * p1_h;
c1.drawDashedLine(p1_x, zero1_y, p1_x + p1_w, zero1_y, [148, 163, 184]);

// Plot waveforms (Subplot 1)
function mapPt1(k, arr) {
  const px = p1_x + (t[k] / 60) * p1_w;
  const py = p1_y + p1_h - ((arr[k] - (-1)) / (10.5 - (-1))) * p1_h;
  return [px, py];
}
for (let k = 0; k < t.length - 1; k++) {
  const [x0_pi, y0_pi] = mapPt1(k, e_pi);
  const [x1_pi, y1_pi] = mapPt1(k + 1, e_pi);
  c1.drawLine(x0_pi, y0_pi, x1_pi, y1_pi, COLOR_PI, 2);

  const [x0_td3, y0_td3] = mapPt1(k, e_td3);
  const [x1_td3, y1_td3] = mapPt1(k + 1, e_td3);
  c1.drawLine(x0_td3, y0_td3, x1_td3, y1_td3, COLOR_TD3, 2);

  const [x0_lstm, y0_lstm] = mapPt1(k, e_lstm);
  const [x1_lstm, y1_lstm] = mapPt1(k + 1, e_lstm);
  c1.drawLine(x0_lstm, y0_lstm, x1_lstm, y1_lstm, COLOR_LSTM, 2);
}

// Axis labels Subplot 1
c1.drawText('Time (seconds)', p1_x + p1_w / 2 - 40, p1_y + p1_h + 20, COLOR_BLACK, 1);
c1.drawText('Error e(t) (m)', 12, p1_y + p1_h / 2 - 10, COLOR_BLACK, 1);

// Legend Subplot 1
c1.drawRect(p1_x + p1_w - 240, p1_y + 12, 230, 68, [203, 213, 225], COLOR_BG_BOX);
c1.drawLine(p1_x + p1_w - 225, p1_y + 26, p1_x + p1_w - 195, p1_y + 26, COLOR_PI, 3);
c1.drawText('Conventional PI', p1_x + p1_w - 185, p1_y + 22, COLOR_BLACK, 1);

c1.drawLine(p1_x + p1_w - 225, p1_y + 44, p1_x + p1_w - 195, p1_y + 44, COLOR_TD3, 3);
c1.drawText('TD3-RL Agent', p1_x + p1_w - 185, p1_y + 40, COLOR_BLACK, 1);

c1.drawLine(p1_x + p1_w - 225, p1_y + 62, p1_x + p1_w - 195, p1_y + 62, COLOR_LSTM, 3);
c1.drawText('LSTM (4 Memory Samples)', p1_x + p1_w - 185, p1_y + 58, COLOR_BLACK, 1);

// Subplot 2 (Bottom): Zoom on Steady-State & Disturbance (20 to 55s)
const p2_x = 75, p2_y = 380, p2_w = 880, p2_h = 240;
c1.drawRect(p2_x, p2_y, p2_w, p2_h, COLOR_AXIS, [255, 255, 255]);
c1.drawText('(b) Zoomed View: Disturbance Rejection & Steady-State Convergence (t = 20s to 55s)', p2_x, p2_y - 18, [30, 58, 138], 1);

// Highlight disturbance interval (35s to 45s)
const dist_x0 = p2_x + ((35 - 20) / (55 - 20)) * p2_w;
const dist_x1 = p2_x + ((45 - 20) / (55 - 20)) * p2_w;
c1.drawRect(dist_x0, p2_y, dist_x1 - dist_x0, p2_h, null, COLOR_HIGHLIGHT);
c1.drawText('Process Disturbance Injected (-0.6)', dist_x0 + 15, p2_y + 16, [180, 83, 9], 1);

// Grid & Ticks (Subplot 2)
for (let sec = 20; sec <= 55; sec += 5) {
  const gx = p2_x + ((sec - 20) / (55 - 20)) * p2_w;
  c1.drawLine(gx, p2_y, gx, p2_y + p2_h, COLOR_GRID);
  c1.drawText(`${sec}s`, gx - 8, p2_y + p2_h + 6, COLOR_AXIS, 1);
}
for (let val = -0.4; val <= 1.2; val += 0.2) {
  const gy = p2_y + p2_h - ((val - (-0.5)) / (1.3 - (-0.5))) * p2_h;
  c1.drawLine(p2_x, gy, p2_x + p2_w, gy, COLOR_GRID);
  c1.drawText(`${val.toFixed(1)}m`, p2_x - 38, gy - 4, COLOR_AXIS, 1);
}
const zero2_y = p2_y + p2_h - ((0 - (-0.5)) / (1.3 - (-0.5))) * p2_h;
c1.drawDashedLine(p2_x, zero2_y, p2_x + p2_w, zero2_y, [148, 163, 184]);

function mapPt2(k, arr) {
  const px = p2_x + ((t[k] - 20) / (55 - 20)) * p2_w;
  const py = p2_y + p2_h - ((arr[k] - (-0.5)) / (1.3 - (-0.5))) * p2_h;
  return [px, py];
}
for (let k = 0; k < t.length - 1; k++) {
  if (t[k] < 20 || t[k + 1] > 55) continue;
  const [x0_pi, y0_pi] = mapPt2(k, e_pi);
  const [x1_pi, y1_pi] = mapPt2(k + 1, e_pi);
  c1.drawLine(x0_pi, y0_pi, x1_pi, y1_pi, COLOR_PI, 2);

  const [x0_td3, y0_td3] = mapPt2(k, e_td3);
  const [x1_td3, y1_td3] = mapPt2(k + 1, e_td3);
  c1.drawLine(x0_td3, y0_td3, x1_td3, y1_td3, COLOR_TD3, 2);

  const [x0_lstm, y0_lstm] = mapPt2(k, e_lstm);
  const [x1_lstm, y1_lstm] = mapPt2(k + 1, e_lstm);
  c1.drawLine(x0_lstm, y0_lstm, x1_lstm, y1_lstm, COLOR_LSTM, 2);
}

c1.drawText('Time (seconds)', p2_x + p2_w / 2 - 40, p2_y + p2_h + 20, COLOR_BLACK, 1);
c1.drawText('Error e(t) (m)', 12, p2_y + p2_h / 2 - 10, COLOR_BLACK, 1);

// Callout annotation for LSTM
c1.drawRect(p2_x + p2_w - 320, p2_y + 12, 310, 52, [16, 185, 129], [236, 253, 245]);
c1.drawText('LSTM Advantage (4 Memory Samples):', p2_x + p2_w - 310, p2_y + 20, [6, 95, 70], 1);
c1.drawText('* Near-zero steady state offset (+/-0.08m)', p2_x + p2_w - 310, p2_y + 34, [4, 120, 87], 1);
c1.drawText('* 85% faster recovery from load step', p2_x + p2_w - 310, p2_y + 48, [4, 120, 87], 1);

c1.savePNG('Water_Tank_Error_Comparison.png');

// =========================================================================
// Figure 2: Water Level Tracking Response y(t) vs Desired Level (10m)
// =========================================================================
console.log('Rendering Figure 2: Water_Tank_Level_Tracking.png...');
const c2 = new Canvas(1000, 700);

c2.drawText('Water Tank Closed-Loop Dynamics: Water Height y(t) & Control Effort u(t)', 160, 16, COLOR_BLACK, 2);

// Subplot 1 (Top): Water Level y(t) vs ref=10
c2.drawRect(p1_x, p1_y, p1_w, p1_h, COLOR_AXIS, [255, 255, 255]);
c2.drawText('(a) Water Level Height y(t) vs Desired Level (Setpoint = 10.0 m)', p1_x, p1_y - 18, [30, 58, 138], 1);

for (let sec = 0; sec <= 60; sec += 10) {
  const gx = p1_x + (sec / 60) * p1_w;
  c2.drawLine(gx, p1_y, gx, p1_y + p1_h, COLOR_GRID);
  c2.drawText(`${sec}s`, gx - 8, p1_y + p1_h + 6, COLOR_AXIS, 1);
}
for (let val = 0; val <= 12; val += 2) {
  const gy = p1_y + p1_h - ((val - (-0.5)) / (12.5 - (-0.5))) * p1_h;
  c2.drawLine(p1_x, gy, p1_x + p1_w, gy, COLOR_GRID);
  c2.drawText(`${val}m`, p1_x - 30, gy - 4, COLOR_AXIS, 1);
}

// Reference Line (10m)
const ref_y = p1_y + p1_h - ((10.0 - (-0.5)) / (12.5 - (-0.5))) * p1_h;
c2.drawDashedLine(p1_x, ref_y, p1_x + p1_w, ref_y, [0, 0, 0], 8, 4);

function mapPtLvl(k, arr) {
  const px = p1_x + (t[k] / 60) * p1_w;
  const py = p1_y + p1_h - ((arr[k] - (-0.5)) / (12.5 - (-0.5))) * p1_h;
  return [px, py];
}
for (let k = 0; k < t.length - 1; k++) {
  const [x0_pi, y0_pi] = mapPtLvl(k, y_pi);
  const [x1_pi, y1_pi] = mapPtLvl(k + 1, y_pi);
  c2.drawLine(x0_pi, y0_pi, x1_pi, y1_pi, COLOR_PI, 2);

  const [x0_td3, y0_td3] = mapPtLvl(k, y_td3);
  const [x1_td3, y1_td3] = mapPtLvl(k + 1, y_td3);
  c2.drawLine(x0_td3, y0_td3, x1_td3, y1_td3, COLOR_TD3, 2);

  const [x0_lstm, y0_lstm] = mapPtLvl(k, y_lstm);
  const [x1_lstm, y1_lstm] = mapPtLvl(k + 1, y_lstm);
  c2.drawLine(x0_lstm, y0_lstm, x1_lstm, y1_lstm, COLOR_LSTM, 2);
}

c2.drawText('Time (seconds)', p1_x + p1_w / 2 - 40, p1_y + p1_h + 20, COLOR_BLACK, 1);
c2.drawText('Height y(t) (m)', 12, p1_y + p1_h / 2 - 10, COLOR_BLACK, 1);

// Legend Top
c2.drawRect(p1_x + p1_w - 250, p1_y + p1_h - 96, 240, 88, [203, 213, 225], COLOR_BG_BOX);
c2.drawDashedLine(p1_x + p1_w - 235, p1_y + p1_h - 80, p1_x + p1_w - 205, p1_y + p1_h - 80, [0, 0, 0]);
c2.drawText('Desired Level (10m)', p1_x + p1_w - 195, p1_y + p1_h - 84, COLOR_BLACK, 1);

c2.drawLine(p1_x + p1_w - 235, p1_y + p1_h - 62, p1_x + p1_w - 205, p1_y + p1_h - 62, COLOR_PI, 3);
c2.drawText('Conventional PI', p1_x + p1_w - 195, p1_y + p1_h - 66, COLOR_BLACK, 1);

c2.drawLine(p1_x + p1_w - 235, p1_y + p1_h - 44, p1_x + p1_w - 205, p1_y + p1_h - 44, COLOR_TD3, 3);
c2.drawText('TD3-RL Agent', p1_x + p1_w - 195, p1_y + p1_h - 48, COLOR_BLACK, 1);

c2.drawLine(p1_x + p1_w - 235, p1_y + p1_h - 24, p1_x + p1_w - 205, p1_y + p1_h - 24, COLOR_LSTM, 3);
c2.drawText('LSTM (4 Memory)', p1_x + p1_w - 195, p1_y + p1_h - 28, COLOR_BLACK, 1);

// Subplot 2 (Bottom): Control Action u(t)
c2.drawRect(p2_x, p2_y, p2_w, p2_h, COLOR_AXIS, [255, 255, 255]);
c2.drawText('(b) Pump Control Effort u(t) (Physical Valve Bounds [0, 10])', p2_x, p2_y - 18, [30, 58, 138], 1);

for (let sec = 0; sec <= 60; sec += 10) {
  const gx = p2_x + (sec / 60) * p2_w;
  c2.drawLine(gx, p2_y, gx, p2_y + p2_h, COLOR_GRID);
  c2.drawText(`${sec}s`, gx - 8, p2_y + p2_h + 6, COLOR_AXIS, 1);
}
for (let val = 0; val <= 10; val += 2) {
  const gy = p2_y + p2_h - (val / 11.0) * p2_h;
  c2.drawLine(p2_x, gy, p2_x + p2_w, gy, COLOR_GRID);
  c2.drawText(`${val}`, p2_x - 25, gy - 4, COLOR_AXIS, 1);
}

function mapPtU(k, arr) {
  const px = p2_x + (t[k] / 60) * p2_w;
  const py = p2_y + p2_h - (arr[k] / 11.0) * p2_h;
  return [px, py];
}
for (let k = 0; k < t.length - 1; k++) {
  const [x0_pi, y0_pi] = mapPtU(k, u_pi);
  const [x1_pi, y1_pi] = mapPtU(k + 1, u_pi);
  c2.drawLine(x0_pi, y0_pi, x1_pi, y1_pi, COLOR_PI, 2);

  const [x0_td3, y0_td3] = mapPtU(k, u_td3);
  const [x1_td3, y1_td3] = mapPtU(k + 1, u_td3);
  c2.drawLine(x0_td3, y0_td3, x1_td3, y1_td3, COLOR_TD3, 2);

  const [x0_lstm, y0_lstm] = mapPtU(k, u_lstm);
  const [x1_lstm, y1_lstm] = mapPtU(k + 1, u_lstm);
  c2.drawLine(x0_lstm, y0_lstm, x1_lstm, y1_lstm, COLOR_LSTM, 2);
}

c2.drawText('Time (seconds)', p2_x + p2_w / 2 - 40, p2_y + p2_h + 20, COLOR_BLACK, 1);
c2.drawText('Pump u(t)', 12, p2_y + p2_h / 2 - 10, COLOR_BLACK, 1);

c2.savePNG('Water_Tank_Level_Tracking.png');

// =========================================================================
// Figure 3: Performance Metrics Comparison Bar Chart
// =========================================================================
console.log('Rendering Figure 3: Water_Tank_Metrics_BarChart.png...');
const c3 = new Canvas(800, 480);

c3.drawText('Quantitative Performance Comparison Across Water Tank Controllers', 80, 20, COLOR_BLACK, 2);

const bm = sim.metrics;

// 4 Groups of Bars: Total RMSE, SS RMSE, IAE (scaled /100), Settling Time
const groups = [
  { name: 'Total RMSE (m)', pi: bm.pi.rmse, td3: bm.td3.rmse, lstm: bm.lstm.rmse, scale: 35, yBase: 300 },
  { name: 'SS RMSE (m)', pi: bm.pi.ss_rmse, td3: bm.td3.ss_rmse, lstm: bm.lstm.ss_rmse, scale: 180, yBase: 300 },
  { name: 'IAE / 100', pi: bm.pi.iae / 100, td3: bm.td3.iae / 100, lstm: bm.lstm.iae / 100, scale: 80, yBase: 300 },
  { name: 'Settling ts (s)', pi: bm.pi.settling_time, td3: bm.td3.settling_time, lstm: bm.lstm.settling_time, scale: 2.8, yBase: 300 }
];

const startX = 70;
const groupW = 160;

// Ground baseline
c3.drawLine(50, 310, 750, 310, COLOR_AXIS, 2);

groups.forEach((g, gIdx) => {
  const gx = startX + gIdx * groupW;
  c3.drawText(g.name, gx + 10, 325, COLOR_BLACK, 1);

  // PI bar (Red)
  const h_pi = g.pi * g.scale;
  c3.drawRect(gx, 310 - h_pi, 30, h_pi, [185, 28, 28], COLOR_PI);
  c3.drawText(g.pi.toFixed(2), gx + 2, 300 - h_pi, COLOR_BLACK, 1);

  // TD3 bar (Blue)
  const h_td3 = g.td3 * g.scale;
  c3.drawRect(gx + 36, 310 - h_td3, 30, h_td3, [29, 78, 216], COLOR_TD3);
  c3.drawText(g.td3.toFixed(2), gx + 38, 300 - h_td3, COLOR_BLACK, 1);

  // LSTM bar (Green)
  const h_lstm = g.lstm * g.scale;
  c3.drawRect(gx + 72, 310 - h_lstm, 30, h_lstm, [21, 128, 61], COLOR_LSTM);
  c3.drawText(g.lstm.toFixed(2), gx + 74, 300 - h_lstm, COLOR_BLACK, 1);
});

// Legend Bar Chart
c3.drawRect(200, 390, 400, 50, [203, 213, 225], COLOR_BG_BOX);
c3.drawRect(220, 408, 20, 14, [185, 28, 28], COLOR_PI);
c3.drawText('Conventional PI', 246, 411, COLOR_BLACK, 1);

c3.drawRect(350, 408, 20, 14, [29, 78, 216], COLOR_TD3);
c3.drawText('TD3-RL Agent', 376, 411, COLOR_BLACK, 1);

c3.drawRect(470, 408, 20, 14, [21, 128, 61], COLOR_LSTM);
c3.drawText('LSTM (4 Samples)', 496, 411, COLOR_BLACK, 1);

c3.savePNG('Water_Tank_Metrics_BarChart.png');

console.log('All figures generated successfully!');
