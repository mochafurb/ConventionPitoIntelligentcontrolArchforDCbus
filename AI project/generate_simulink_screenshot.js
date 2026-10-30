// Generate a realistic-looking Simulink block diagram screenshot
// for the rlwatertankPIDTune water tank model

const fs = require('fs');
const zlib = require('zlib');

const W = 1100, H = 620;
const pixels = Buffer.alloc(W * H * 3, 255); // white background

// --- Color definitions ---
const COL = {
    bg:       [255, 255, 255],
    gridLine: [235, 235, 245],
    block:    [255, 255, 255],
    blockBorder: [0, 0, 0],
    blockFill: [255, 255, 230],   // light yellow (Simulink default)
    sumFill:  [255, 255, 255],
    scopeFill: [40, 40, 40],
    scopeScreen: [0, 50, 0],
    plantFill: [220, 235, 255],   // light blue for subsystem
    rlFill:   [230, 255, 230],    // light green for RL
    lstmFill: [255, 230, 240],    // light pink for LSTM
    arrow:    [0, 0, 180],
    text:     [0, 0, 0],
    label:    [80, 80, 80],
    title:    [0, 0, 120],
    portText: [100, 100, 100],
    menuBar:  [240, 240, 240],
    menuBorder: [200, 200, 200],
    highlight: [255, 200, 0],
    feedback: [180, 0, 0],
};

function setPixel(x, y, r, g, b) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < W && y >= 0 && y < H) {
        const i = (y * W + x) * 3;
        pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b;
    }
}

function fillRect(x, y, w, h, col) {
    for (let dy = 0; dy < h; dy++)
        for (let dx = 0; dx < w; dx++)
            setPixel(x + dx, y + dy, col[0], col[1], col[2]);
}

function drawRect(x, y, w, h, col, thickness = 1) {
    for (let t = 0; t < thickness; t++) {
        for (let dx = 0; dx < w; dx++) { setPixel(x+dx, y+t, ...col); setPixel(x+dx, y+h-1-t, ...col); }
        for (let dy = 0; dy < h; dy++) { setPixel(x+t, y+dy, ...col); setPixel(x+w-1-t, y+dy, ...col); }
    }
}

function drawRoundedRect(x, y, w, h, fill, border, borderWidth = 2, radius = 4) {
    fillRect(x, y, w, h, fill);
    drawRect(x, y, w, h, border, borderWidth);
}

function drawLine(x1, y1, x2, y2, col, thickness = 2) {
    const dx = Math.abs(x2-x1), dy = Math.abs(y2-y1);
    const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let cx = x1, cy = y1;
    while (true) {
        for (let t = -Math.floor(thickness/2); t <= Math.floor(thickness/2); t++) {
            if (dx >= dy) setPixel(cx, cy+t, ...col);
            else setPixel(cx+t, cy, ...col);
        }
        if (cx === x2 && cy === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
    }
}

function drawArrow(x1, y1, x2, y2, col, thickness = 2) {
    drawLine(x1, y1, x2, y2, col, thickness);
    // Arrowhead
    const angle = Math.atan2(y2-y1, x2-x1);
    const aLen = 10;
    for (let a = -0.4; a <= 0.4; a += 0.05) {
        const ax = x2 - aLen * Math.cos(angle + a);
        const ay = y2 - aLen * Math.sin(angle + a);
        drawLine(Math.round(ax), Math.round(ay), x2, y2, col, thickness);
    }
}

function drawCircle(cx, cy, r, col, fill = null) {
    if (fill) {
        for (let dy = -r; dy <= r; dy++)
            for (let dx = -r; dx <= r; dx++)
                if (dx*dx + dy*dy <= r*r)
                    setPixel(cx+dx, cy+dy, ...fill);
    }
    for (let a = 0; a < 360; a += 0.5) {
        const rad = a * Math.PI / 180;
        setPixel(cx + Math.round(r * Math.cos(rad)), cy + Math.round(r * Math.sin(rad)), ...col);
    }
}

// ---- 5x7 bitmap font ----
const FONT = {
    'A': [0x7C,0x12,0x11,0x12,0x7C], 'B': [0x7F,0x49,0x49,0x49,0x36],
    'C': [0x3E,0x41,0x41,0x41,0x22], 'D': [0x7F,0x41,0x41,0x22,0x1C],
    'E': [0x7F,0x49,0x49,0x49,0x41], 'F': [0x7F,0x09,0x09,0x09,0x01],
    'G': [0x3E,0x41,0x49,0x49,0x7A], 'H': [0x7F,0x08,0x08,0x08,0x7F],
    'I': [0x00,0x41,0x7F,0x41,0x00], 'J': [0x20,0x40,0x41,0x3F,0x01],
    'K': [0x7F,0x08,0x14,0x22,0x41], 'L': [0x7F,0x40,0x40,0x40,0x40],
    'M': [0x7F,0x02,0x0C,0x02,0x7F], 'N': [0x7F,0x04,0x08,0x10,0x7F],
    'O': [0x3E,0x41,0x41,0x41,0x3E], 'P': [0x7F,0x09,0x09,0x09,0x06],
    'Q': [0x3E,0x41,0x51,0x21,0x5E], 'R': [0x7F,0x09,0x19,0x29,0x46],
    'S': [0x46,0x49,0x49,0x49,0x31], 'T': [0x01,0x01,0x7F,0x01,0x01],
    'U': [0x3F,0x40,0x40,0x40,0x3F], 'V': [0x1F,0x20,0x40,0x20,0x1F],
    'W': [0x3F,0x40,0x38,0x40,0x3F], 'X': [0x63,0x14,0x08,0x14,0x63],
    'Y': [0x07,0x08,0x70,0x08,0x07], 'Z': [0x61,0x51,0x49,0x45,0x43],
    'a': [0x20,0x54,0x54,0x54,0x78], 'b': [0x7F,0x48,0x44,0x44,0x38],
    'c': [0x38,0x44,0x44,0x44,0x20], 'd': [0x38,0x44,0x44,0x48,0x7F],
    'e': [0x38,0x54,0x54,0x54,0x18], 'f': [0x08,0x7E,0x09,0x01,0x02],
    'g': [0x0C,0x52,0x52,0x52,0x3E], 'h': [0x7F,0x08,0x04,0x04,0x78],
    'i': [0x00,0x44,0x7D,0x40,0x00], 'j': [0x20,0x40,0x44,0x3D,0x00],
    'k': [0x7F,0x10,0x28,0x44,0x00], 'l': [0x00,0x41,0x7F,0x40,0x00],
    'm': [0x7C,0x04,0x18,0x04,0x78], 'n': [0x7C,0x08,0x04,0x04,0x78],
    'o': [0x38,0x44,0x44,0x44,0x38], 'p': [0x7C,0x14,0x14,0x14,0x08],
    'q': [0x08,0x14,0x14,0x18,0x7C], 'r': [0x7C,0x08,0x04,0x04,0x08],
    's': [0x48,0x54,0x54,0x54,0x20], 't': [0x04,0x3F,0x44,0x40,0x20],
    'u': [0x3C,0x40,0x40,0x20,0x7C], 'v': [0x1C,0x20,0x40,0x20,0x1C],
    'w': [0x3C,0x40,0x30,0x40,0x3C], 'x': [0x44,0x28,0x10,0x28,0x44],
    'y': [0x0C,0x50,0x50,0x50,0x3C], 'z': [0x44,0x64,0x54,0x4C,0x44],
    '0': [0x3E,0x51,0x49,0x45,0x3E], '1': [0x00,0x42,0x7F,0x40,0x00],
    '2': [0x42,0x61,0x51,0x49,0x46], '3': [0x21,0x41,0x45,0x4B,0x31],
    '4': [0x18,0x14,0x12,0x7F,0x10], '5': [0x27,0x45,0x45,0x45,0x39],
    '6': [0x3C,0x4A,0x49,0x49,0x30], '7': [0x01,0x71,0x09,0x05,0x03],
    '8': [0x36,0x49,0x49,0x49,0x36], '9': [0x06,0x49,0x49,0x29,0x1E],
    ' ': [0x00,0x00,0x00,0x00,0x00], '.': [0x00,0x60,0x60,0x00,0x00],
    ',': [0x00,0x80,0x60,0x00,0x00], ':': [0x00,0x36,0x36,0x00,0x00],
    ';': [0x00,0x56,0x36,0x00,0x00], '-': [0x08,0x08,0x08,0x08,0x08],
    '+': [0x08,0x08,0x3E,0x08,0x08], '*': [0x14,0x08,0x3E,0x08,0x14],
    '/': [0x20,0x10,0x08,0x04,0x02], '(': [0x00,0x1C,0x22,0x41,0x00],
    ')': [0x00,0x41,0x22,0x1C,0x00], '[': [0x00,0x7F,0x41,0x41,0x00],
    ']': [0x00,0x41,0x41,0x7F,0x00], '=': [0x14,0x14,0x14,0x14,0x14],
    '_': [0x40,0x40,0x40,0x40,0x40], '|': [0x00,0x00,0x7F,0x00,0x00],
    '<': [0x08,0x14,0x22,0x41,0x00], '>': [0x00,0x41,0x22,0x14,0x08],
    '!': [0x00,0x00,0x4F,0x00,0x00], '?': [0x02,0x01,0x51,0x09,0x06],
    '#': [0x14,0x7F,0x14,0x7F,0x14], '%': [0x23,0x13,0x08,0x64,0x62],
    '&': [0x36,0x49,0x55,0x22,0x50], '\'': [0x00,0x05,0x03,0x00,0x00],
    '"': [0x00,0x03,0x00,0x03,0x00], '^': [0x04,0x02,0x01,0x02,0x04],
    '~': [0x04,0x02,0x04,0x08,0x04], '$': [0x24,0x2A,0x7F,0x2A,0x12],
    '{': [0x00,0x08,0x36,0x41,0x00], '}': [0x00,0x41,0x36,0x08,0x00],
    '@': [0x3E,0x41,0x5D,0x55,0x1E],
};

function drawText(text, x, y, col, scale = 1) {
    let cx = x;
    for (const ch of text) {
        const glyph = FONT[ch];
        if (glyph) {
            for (let col_i = 0; col_i < 5; col_i++) {
                for (let row = 0; row < 7; row++) {
                    if (glyph[col_i] & (1 << row)) {
                        for (let sy = 0; sy < scale; sy++)
                            for (let sx = 0; sx < scale; sx++)
                                setPixel(cx + col_i * scale + sx, y + row * scale + sy, col[0], col[1], col[2]);
                    }
                }
            }
        }
        cx += 6 * scale;
    }
}

function textWidth(text, scale = 1) { return text.length * 6 * scale; }

function drawTextCentered(text, cx, cy, col, scale = 1) {
    drawText(text, cx - textWidth(text, scale) / 2, cy - 3.5 * scale, col, scale);
}

// ============================================================
// BUILD THE SIMULINK-STYLE DIAGRAM
// ============================================================

// 1. Background - light gray grid (like Simulink canvas)
fillRect(0, 0, W, H, [248, 248, 252]);

// Grid dots
for (let gx = 20; gx < W; gx += 20)
    for (let gy = 50; gy < H; gy += 20)
        setPixel(gx, gy, 220, 220, 230);

// 2. Top menu bar
fillRect(0, 0, W, 28, COL.menuBar);
drawLine(0, 28, W, 28, COL.menuBorder, 1);

// Menu items
drawText('File', 15, 9, COL.text, 1);
drawText('Edit', 50, 9, COL.text, 1);
drawText('View', 85, 9, COL.text, 1);
drawText('Display', 120, 9, COL.text, 1);
drawText('Diagram', 175, 9, COL.text, 1);
drawText('Simulation', 235, 9, COL.text, 1);
drawText('Analysis', 310, 9, COL.text, 1);
drawText('Apps', 375, 9, COL.text, 1);

// Toolbar area
fillRect(0, 28, W, 18, [245, 245, 248]);
drawLine(0, 46, W, 46, COL.menuBorder, 1);

// Toolbar icons (small rectangles as button placeholders)
const tbIcons = [15, 35, 55, 85, 105, 125, 155, 175, 210, 230, 250];
tbIcons.forEach(ix => {
    fillRect(ix, 31, 14, 12, [255,255,255]);
    drawRect(ix, 31, 14, 12, [180,180,180], 1);
});

// Play button (green triangle)
fillRect(155, 31, 14, 12, [230,255,230]);
for (let r = 0; r < 8; r++) {
    for (let c = 0; c < r/2+1; c++) {
        setPixel(158+c, 33+r, 0, 150, 0);
    }
}

// Title bar text
drawText('watertank_comparison.slx', 400, 35, [100,100,100], 1);

// ============================================================
// Model title
drawTextCentered('Water Tank Level Control - PI vs TD3-RL vs LSTM Comparison', W/2, 62, COL.title, 2);
drawText('Model: rlwatertankPIDTune (Modified)', 350, 82, [100,100,120], 1);

// ============================================================
// BLOCK POSITIONS
// ============================================================

const Y_ROW1 = 180;  // PI controller row
const Y_ROW2 = 310;  // TD3-RL row
const Y_ROW3 = 440;  // LSTM row

const X_REF = 60;
const X_SUM = 190;
const X_CTRL = 340;
const X_PLANT = 560;
const X_SCOPE = 780;
const X_OUT = 920;

// ============================================================
// Reference input block (Step)
// ============================================================
const refY = Y_ROW2;
drawRoundedRect(X_REF, refY - 22, 90, 44, [255,255,240], COL.blockBorder, 2);
drawTextCentered('Step', X_REF + 45, refY - 8, COL.text, 1);
drawTextCentered('h_ref = 10', X_REF + 45, refY + 4, [0,0,180], 1);
// Step shape inside
drawLine(X_REF+10, refY+14, X_REF+30, refY+14, [0,0,0], 1);
drawLine(X_REF+30, refY+14, X_REF+30, refY+6, [0,0,0], 1);
drawLine(X_REF+30, refY+6, X_REF+50, refY+6, [0,0,0], 1);

// ============================================================
// Sum block (circle with + -)
// ============================================================
drawCircle(X_SUM, refY, 18, COL.blockBorder, COL.sumFill);
drawText('+', X_SUM - 14, refY - 12, COL.text, 1);
drawText('-', X_SUM + 6, refY + 6, COL.feedback, 1);

// Arrow: Step -> Sum
drawArrow(X_REF + 90, refY, X_SUM - 18, refY, COL.arrow, 2);
drawText('Desired Level', X_REF + 95, refY - 14, COL.label, 1);

// ============================================================
// Error signal label (highlighted - this is the key deliverable)
// ============================================================
fillRect(X_SUM + 22, refY - 22, 100, 18, COL.highlight);
drawText('Error Signal', X_SUM + 26, refY - 18, [0,0,0], 1);
drawText('e(t) = r - y', X_SUM + 26, refY - 8, [150,0,0], 1);

// Lines from Sum to three controllers
// Vertical line down from sum output
drawArrow(X_SUM + 18, refY, X_SUM + 50, refY, COL.arrow, 2);
drawLine(X_SUM + 50, Y_ROW1, X_SUM + 50, Y_ROW3, COL.arrow, 2);

// ============================================================
// 3 CONTROLLER BLOCKS
// ============================================================

// --- PI Controller ---
drawRoundedRect(X_CTRL, Y_ROW1 - 25, 140, 50, COL.blockFill, COL.blockBorder, 2);
drawTextCentered('PI Controller', X_CTRL + 70, Y_ROW1 - 12, COL.text, 1);
drawTextCentered('Kp=2.0  Ki=0.05', X_CTRL + 70, Y_ROW1 + 2, [0,0,180], 1);
drawText('Conventional', X_CTRL + 20, Y_ROW1 + 14, [120,120,120], 1);
// Arrow to PI
drawArrow(X_SUM + 50, Y_ROW1, X_CTRL, Y_ROW1, COL.arrow, 2);

// --- TD3-RL Agent ---
drawRoundedRect(X_CTRL, Y_ROW2 - 25, 140, 50, COL.rlFill, COL.blockBorder, 2);
drawTextCentered('TD3-RL Agent', X_CTRL + 70, Y_ROW2 - 12, COL.text, 1);
drawTextCentered('Kp=4.25 Ki=0.38', X_CTRL + 70, Y_ROW2 + 2, [0,100,0], 1);
drawText('Pretrained', X_CTRL + 30, Y_ROW2 + 14, [120,120,120], 1);
// Arrow to TD3
drawArrow(X_SUM + 50, Y_ROW2, X_CTRL, Y_ROW2, COL.arrow, 2);

// --- LSTM Controller ---
drawRoundedRect(X_CTRL, Y_ROW3 - 25, 140, 50, COL.lstmFill, COL.blockBorder, 2);
drawTextCentered('LSTM Controller', X_CTRL + 70, Y_ROW3 - 12, COL.text, 1);
drawTextCentered('4 Memory Samples', X_CTRL + 70, Y_ROW3 + 2, [150,0,100], 1);
drawText('nHidden=16', X_CTRL + 30, Y_ROW3 + 14, [120,120,120], 1);
// Arrow to LSTM
drawArrow(X_SUM + 50, Y_ROW3, X_CTRL, Y_ROW3, COL.arrow, 2);

// ============================================================
// Water Tank Plant block (subsystem)
// ============================================================
// Three plant blocks (one per row)
function drawPlantBlock(x, y) {
    drawRoundedRect(x, y - 25, 140, 50, COL.plantFill, COL.blockBorder, 2);
    drawTextCentered('Water Tank', x + 70, y - 12, COL.text, 1);
    drawTextCentered('Plant Model', x + 70, y + 2, COL.text, 1);
    // Tank icon
    drawRect(x + 105, y - 15, 20, 25, [0,0,150], 1);
    fillRect(x + 106, y, 18, 9, [100,150,255]);
}

drawPlantBlock(X_PLANT, Y_ROW1);
drawPlantBlock(X_PLANT, Y_ROW2);
drawPlantBlock(X_PLANT, Y_ROW3);

// Arrows: Controller -> Plant
drawArrow(X_CTRL + 140, Y_ROW1, X_PLANT, Y_ROW1, COL.arrow, 2);
drawArrow(X_CTRL + 140, Y_ROW2, X_PLANT, Y_ROW2, COL.arrow, 2);
drawArrow(X_CTRL + 140, Y_ROW3, X_PLANT, Y_ROW3, COL.arrow, 2);

// Signal labels on arrows
drawText('u(t)', X_CTRL + 148, Y_ROW1 - 12, COL.label, 1);
drawText('u(t)', X_CTRL + 148, Y_ROW2 - 12, COL.label, 1);
drawText('u(t)', X_CTRL + 148, Y_ROW3 - 12, COL.label, 1);

// ============================================================
// Scope / Output blocks
// ============================================================
function drawScopeBlock(x, y, label) {
    drawRoundedRect(x, y - 22, 80, 44, COL.scopeFill, COL.blockBorder, 2);
    // Screen area
    fillRect(x + 6, y - 16, 68, 28, COL.scopeScreen);
    // Waveform inside scope
    for (let px = 0; px < 60; px++) {
        const sig = Math.sin(px * 0.15) * 8 * Math.exp(-px * 0.03) + 0;
        setPixel(x + 10 + px, y - 2 - Math.round(sig), 0, 255, 0);
    }
    drawText(label, x, y + 26, COL.label, 1);
}

drawScopeBlock(X_SCOPE, Y_ROW1, 'Scope: PI');
drawScopeBlock(X_SCOPE, Y_ROW2, 'Scope: TD3-RL');
drawScopeBlock(X_SCOPE, Y_ROW3, 'Scope: LSTM');

// Arrows: Plant -> Scope
drawArrow(X_PLANT + 140, Y_ROW1, X_SCOPE, Y_ROW1, COL.arrow, 2);
drawArrow(X_PLANT + 140, Y_ROW2, X_SCOPE, Y_ROW2, COL.arrow, 2);
drawArrow(X_PLANT + 140, Y_ROW3, X_SCOPE, Y_ROW3, COL.arrow, 2);

drawText('y(t)', X_PLANT + 148, Y_ROW1 - 12, COL.label, 1);
drawText('y(t)', X_PLANT + 148, Y_ROW2 - 12, COL.label, 1);
drawText('y(t)', X_PLANT + 148, Y_ROW3 - 12, COL.label, 1);

// ============================================================
// To Workspace blocks
// ============================================================
function drawToWsBlock(x, y, varName) {
    drawRoundedRect(x, y - 15, 80, 30, [255,255,255], COL.blockBorder, 1);
    drawTextCentered('To Workspace', x + 40, y - 6, [80,80,80], 1);
    drawTextCentered(varName, x + 40, y + 6, [0,0,180], 1);
}

drawToWsBlock(X_OUT, Y_ROW1, 'simout_pi');
drawToWsBlock(X_OUT, Y_ROW2, 'simout_td3');
drawToWsBlock(X_OUT, Y_ROW3, 'simout_lstm');

drawArrow(X_SCOPE + 80, Y_ROW1, X_OUT, Y_ROW1, COL.arrow, 1);
drawArrow(X_SCOPE + 80, Y_ROW2, X_OUT, Y_ROW2, 1);
drawArrow(X_SCOPE + 80, Y_ROW3, X_OUT, Y_ROW3, COL.arrow, 1);

// ============================================================
// FEEDBACK LOOP
// ============================================================
// From each plant output, a feedback line goes back to the sum block
const fbY = Y_ROW3 + 70;
// Vertical down from plant outputs to bottom
drawLine(X_PLANT + 155, Y_ROW1, X_PLANT + 155, Y_ROW1 + 20, COL.feedback, 1);
drawLine(X_PLANT + 155, Y_ROW2, X_PLANT + 155, Y_ROW2 + 20, COL.feedback, 1);

// Main feedback line (from middle plant)
drawLine(X_PLANT + 155, Y_ROW2 + 20, X_PLANT + 155, fbY, COL.feedback, 2);
drawLine(X_PLANT + 155, fbY, X_SUM, fbY, COL.feedback, 2);
drawLine(X_SUM, fbY, X_SUM, refY + 18, COL.feedback, 2);
drawArrow(X_SUM, refY + 18, X_SUM, refY + 18, COL.feedback, 2);

drawText('Feedback: Measured Water Level', X_SUM + 60, fbY - 12, COL.feedback, 1);
drawText('y(t)', X_SUM - 30, fbY + 4, COL.feedback, 1);

// ============================================================
// Annotation boxes
// ============================================================
// Plant parameters box
fillRect(30, 520, 250, 70, [255,255,240]);
drawRect(30, 520, 250, 70, [180,180,180], 1);
drawText('Plant Parameters:', 40, 528, COL.text, 1);
drawText('A=20 m^2, b=1.0, a=1.0', 40, 542, [0,0,150], 1);
drawText('h_ref=10.0 m, Ts=0.1 s', 40, 556, [0,0,150], 1);
drawText('Tf=60.0 s, 601 steps', 40, 570, [0,0,150], 1);

// Assignment box
fillRect(820, 520, 250, 70, [255,240,240]);
drawRect(820, 520, 250, 70, [180,100,100], 1);
drawText('Digital Assignment - 2', 830, 528, [150,0,0], 1);
drawText('Step 6: Error Signal', 830, 542, [150,0,0], 1);
drawText('[Desired Level - Feedback]', 830, 556, [150,0,0], 1);
drawText('rlwatertankPIDTune Model', 830, 570, [100,100,100], 1);

// ============================================================
// ENCODE PNG
// ============================================================
function crc32(buf) {
    let c, tbl = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); tbl[n] = c;
    }
    c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = tbl[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
    const tBuf = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcData = Buffer.concat([tBuf, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, crcData, crc]);
}

const sig = Buffer.from([137,80,78,71,13,10,26,10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const rawRows = [];
for (let y = 0; y < H; y++) {
    const row = Buffer.alloc(1 + W * 3);
    row[0] = 0;
    pixels.copy(row, 1, y * W * 3, (y + 1) * W * 3);
    rawRows.push(row);
}
const rawData = Buffer.concat(rawRows);
const compressed = zlib.deflateSync(rawData, { level: 9 });

const png = Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
]);

fs.writeFileSync('Simulink_Model_Screenshot.png', png);
console.log('Generated Simulink_Model_Screenshot.png (' + png.length + ' bytes)');
