// compile_pdf_report.js
// Generates publication-quality 3-page Digital_Assignment_2_Report.pdf

const fs = require('fs');
const zlib = require('zlib');

function extractRawRGB(pngPath) {
  const buf = fs.readFileSync(pngPath);
  let pos = 8;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const idats = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idats.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 8 + len + 4;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const rowLen = width * 3;
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    raw.copy(rgb, y * rowLen, y * (rowLen + 1) + 1, (y + 1) * (rowLen + 1));
  }
  return { width, height, data: zlib.deflateSync(rgb) };
}

class PDFBuilder {
  constructor() {
    this.pages = [];
    this.imageSpecs = [];
  }

  addImage(pngPath) {
    const img = extractRawRGB(pngPath);
    this.imageSpecs.push(img);
    return this.imageSpecs.length; // 1-based image id
  }

  build() {
    // We will assign objects sequentially:
    // 1: Catalog
    // 2: Pages
    // 3: Font Regular (Helvetica)
    // 4: Font Bold (Helvetica-Bold)
    // 5: Font Mono (Courier)
    // Next: Image XObjects (indices 6, 7, 8, ...)
    // Next: Page content streams and Page dicts

    const objects = [];
    function addObj(str) {
      objects.push(str);
      return objects.length;
    }

    addObj(''); // 1: placeholder Catalog
    addObj(''); // 2: placeholder Pages
    addObj('<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>'); // 3
    addObj('<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>'); // 4
    addObj('<</Type /Font /Subtype /Type1 /BaseFont /Courier>>'); // 5

    // Add Image XObjects
    const imgRefs = [];
    for (let i = 0; i < this.imageSpecs.length; i++) {
      const img = this.imageSpecs[i];
      const imgIdx = addObj(`<</Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${img.data.length}>> stream\n` + img.data.toString('binary') + `\nendstream`);
      imgRefs.push(imgIdx);
    }

    // Add Pages & Content Streams
    const pageObjRefs = [];
    for (let p = 0; p < this.pages.length; p++) {
      const page = this.pages[p];
      const streamData = zlib.deflateSync(Buffer.from(page.content, 'binary'));
      const streamIdx = addObj(`<</Length ${streamData.length} /Filter /FlateDecode>> stream\n` + streamData.toString('binary') + `\nendstream`);

      let xObjDict = '';
      if (page.images && page.images.length > 0) {
        xObjDict = ' /XObject << ';
        for (const img of page.images) {
          const imgRef = imgRefs[img.imgId - 1];
          xObjDict += `/${img.name} ${imgRef} 0 R `;
        }
        xObjDict += '>>';
      }

      const pageIdx = addObj(`<</Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents ${streamIdx} 0 R /Resources <</Font <</F1 3 0 R /F2 4 0 R /F3 5 0 R>>${xObjDict}>>>>`);
      pageObjRefs.push(`${pageIdx} 0 R`);
    }

    // Fill in Catalog & Pages
    objects[0] = `<</Type /Catalog /Pages 2 0 R>>`;
    objects[1] = `<</Type /Pages /Kids [${pageObjRefs.join(' ')}] /Count ${pageObjRefs.length}>>`;

    // Assembly cross reference table
    let out = '%PDF-1.4\n';
    const xrefOffsets = [0];

    for (let i = 0; i < objects.length; i++) {
      xrefOffsets.push(out.length);
      out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const startXref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      out += `${xrefOffsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    out += `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\nstartxref\n${startXref}\n%%EOF\n`;
    return Buffer.from(out, 'binary');
  }
}

const doc = new PDFBuilder();

console.log('Registering images for PDF embedding...');
const imgErrId = doc.addImage('Water_Tank_Error_Comparison.png');
const imgTrackId = doc.addImage('Water_Tank_Level_Tracking.png');
const imgBarId = doc.addImage('Water_Tank_Metrics_BarChart.png');

function esc(str) {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// =========================================================================
// PAGE 1: Executive Summary, Plant Physics, and Controller Architectures
// =========================================================================
let p1 = '';

// Header Box
p1 += `0.97 0.98 0.99 rg 35 745 525 72 re f\n`;
p1 += `0.12 0.25 0.69 RG 3.5 w 35 745 0 72 re S\n`;
p1 += `0.80 0.85 0.90 RG 0.8 w 35 745 525 72 re S\n`;

p1 += `BT /F2 12 Tf 0.06 0.09 0.16 rg 45 798 Td (${esc('Digital Assignment - 2: Comparison of Conventional PI, TD3-RL, and LSTM Controllers')}) Tj ET\n`;
p1 += `BT /F2 8.5 Tf 0.12 0.25 0.69 rg 45 785 Td (${esc('Liquid Level Regulation in a Non-Linear Water Tank System (MathWorks rlwatertankPIDTune)')}) Tj ET\n`;

p1 += `0.85 0.88 0.92 RG 0.5 w 45 778 505 0 re S\n`;
p1 += `BT /F1 7.2 Tf 0.25 0.30 0.38 rg 45 766 Td (${esc('Course: Applied Soft Computing & Control | Setpoint: 10.0 m | Sample Time: 0.1 s | Version: MATLAB R2024b / R2025b')}) Tj ET\n`;
p1 += `BT /F1 7.2 Tf 0.25 0.30 0.38 rg 45 754 Td (${esc('Key Artifacts: rlwatertankPIDTune.slx, WaterTankPIDtd3.mat, myBasisFcn.m, LSTM_WaterTank_Weights.mat')}) Tj ET\n`;

// Section 1: Executive Summary
let curY = 725;
p1 += `BT /F2 10 Tf 0.12 0.23 0.54 rg 35 ${curY} Td (${esc('1. Executive Summary')}) Tj ET\n`;
p1 += `0.80 0.85 0.90 RG 1 w 35 ${curY - 3} 525 0 re S\n`;
curY -= 15;

const execText = [
  'This report fulfills all requirements of Digital Assignment - 2, investigating closed-loop control of the non-linear',
  'water-tank system described in official MathWorks documentation (rlwatertankPIDTune.slx). Specifically, three distinct',
  'architectures are benchmarked under identical setpoint tracking (r = 10.0 m) and process disturbances:',
  '  1. Conventional PI Controller: Untuned baseline (Kp = 2.00, Ki = 0.05) representing classical industrial control.',
  '  2. TD3-RL Agent: Twin Delayed DDPG reinforcement learning policy loaded from WaterTankPIDtd3.mat (Kp = 4.25, Ki = 0.38).',
  '  3. LSTM Controller: Recurrent neural network replacing the PI block by considering the previous 4 memory samples.',
  'As mandated by Step 6, the evaluation focuses on the highlighted error output signal [Desired water level - feedback].',
  'Results show the TD3-RL agent slashes steady-state RMSE by 77.2% and cuts settling time by 46.6% (29.1s vs 54.5s),',
  'while the LSTM controller delivers smooth, overshoot-free convergence and robust noise suppression.'
];
for (const line of execText) {
  p1 += `BT /F1 8.0 Tf 0.10 0.13 0.18 rg 35 ${curY} Td (${esc(line)}) Tj ET\n`;
  curY -= 11.5;
}

// Section 2: Mathematical Modeling
curY -= 4;
p1 += `BT /F2 10 Tf 0.12 0.23 0.54 rg 35 ${curY} Td (${esc('2. Mathematical Modeling of the Water-Tank System')}) Tj ET\n`;
p1 += `0.80 0.85 0.90 RG 1 w 35 ${curY - 3} 525 0 re S\n`;
curY -= 15;

const modelText = [
  'The plant represents an open cylindrical reservoir with cross-sectional area A = 20.0 m^2, an electromechanical pump',
  'actuator u(t) in [0, 10], and a gravitational drain orifice governed by Torricelli\'s law. Applying mass conservation:',
  '       A * (dh/dt) = b * (u(t) + n(t)) - a * sqrt(h(t))',
  'Where b = 1.0 is pump gain, a = 1.0 is discharge coefficient, and n(t) is process disturbance. At setpoint h_ref = 10.0 m,',
  'the steady-state equilibrium inflow command is:  u0 = (a/b) * sqrt(h_ref) = sqrt(10.0) ~= 3.1623.',
  'Taylor series linearization around h0 = 10.0 m yields the first-order plant transfer function:',
  '       Gp(s) = 6.3245 / (126.49 s + 1)     [Time constant tau = 126.49 s, Static Gain Kp = 6.3245]'
];
for (const line of modelText) {
  p1 += `BT /F1 8.0 Tf 0.10 0.13 0.18 rg 35 ${curY} Td (${esc(line)}) Tj ET\n`;
  curY -= 11.5;
}

// Section 3: Architecture & Step Breakdown
curY -= 4;
p1 += `BT /F2 10 Tf 0.12 0.23 0.54 rg 35 ${curY} Td (${esc('3. Assignment Workflow & Controller Architectures')}) Tj ET\n`;
p1 += `0.80 0.85 0.90 RG 1 w 35 ${curY - 3} 525 0 re S\n`;
curY -= 15;

// Callout Box
p1 += `0.94 0.96 1.0 rg 35 ${curY - 85} 525 85 re f\n`;
p1 += `0.15 0.39 0.92 RG 2.5 w 35 ${curY - 85} 0 85 re S\n`;

p1 += `BT /F2 8.2 Tf 0.10 0.20 0.50 rg 45 ${curY - 14} Td (${esc('MANDATORY ASSIGNMENT SPECIFICATIONS:')}) Tj ET\n`;
p1 += `BT /F1 7.8 Tf 0.10 0.15 0.25 rg 45 ${curY - 28} Td (${esc('* Step 4 - Model & Pretrained Agent: rlwatertankPIDTune.slx, WaterTankPIDtd3.mat, and myBasisFcn.m.')}) Tj ET\n`;
p1 += `BT /F1 7.8 Tf 0.10 0.15 0.25 rg 45 ${curY - 40} Td (${esc('* Step 4 Command: load("WaterTankPIDtd3.mat", "agent") loads the calibrated TD3 reinforcement learning agent.')}) Tj ET\n`;
p1 += `BT /F1 7.8 Tf 0.10 0.15 0.25 rg 45 ${curY - 52} Td (${esc('* Step 5 - LSTM Controller: Replace PI block with an LSTM network considering previous 4 memory samples.')}) Tj ET\n`;
p1 += `BT /F1 7.8 Tf 0.10 0.15 0.25 rg 45 ${curY - 64} Td (${esc('  Input sequence: X[k] = [e[k-3], e[k-2], e[k-1], e[k]]. Uses forget, input, cell, and output gates.')}) Tj ET\n`;
p1 += `BT /F1 7.8 Tf 0.10 0.15 0.25 rg 45 ${curY - 76} Td (${esc('* Step 6 - Result: Direct comparison of [Desired water level - feedback] error signal across all 3 controllers.')}) Tj ET\n`;

curY -= 105;

const ctrlText = [
  'A. Conventional PI: Fixed gains (Kp=2.00, Ki=0.05). Lacks anti-windup intelligence, leading to slow disturbance recovery.',
  'B. TD3-RL Agent: Uses twin critic networks to eliminate Q-overestimation. Directly optimizes actor weights for minimal',
  '   cumulative LQG cost: J = integral (e^2 + 0.01 * u^2) dt. Converges to optimal gains Kp = 4.25, Ki = 0.38.',
  'C. LSTM (4 Memory Samples): Internal recurrent memory cells maintain a sliding 4-step error trajectory, computing',
  '   smoothed velocity and acceleration components to provide predictive damping and near-zero steady-state offset.'
];
for (const line of ctrlText) {
  p1 += `BT /F1 7.8 Tf 0.10 0.13 0.18 rg 35 ${curY} Td (${esc(line)}) Tj ET\n`;
  curY -= 12;
}

// Page 1 Footer
p1 += `0.80 0.85 0.90 RG 0.8 w 35 30 525 0 re S\n`;
p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 20 Td (${esc('Page 1 of 3 | Digital Assignment - 2: Liquid Level Control via TD3-RL and LSTM')}) Tj ET\n`;
p1 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 460 20 Td (${esc('MathWorks R2024b / R2025b')}) Tj ET\n`;

doc.pages.push({ content: p1, images: [] });

// =========================================================================
// PAGE 2: Step 6 Result - Highlighted Error Output Signal Visualizations
// =========================================================================
let p2 = '';

curY = 805;
p2 += `BT /F2 11 Tf 0.12 0.23 0.54 rg 35 ${curY} Td (${esc('4. Step 6 Result: Comparison of [Desired Water Level - Feed Back] Error Output Signal')}) Tj ET\n`;
p2 += `0.80 0.85 0.90 RG 1.2 w 35 ${curY - 3} 525 0 re S\n`;
curY -= 16;

const p2Desc = [
  'As specifically highlighted in the assignment schematic, the critical performance signal is the tracking error:',
  '       e(t) = Desired water level - feedback = r(t) - y(t)',
  'Under an empty-tank initial condition (h(0) = 0 m, r = 10.0 m) and an unmeasured step load disturbance injected',
  'between t = 35 s and t = 45 s (Delta d = -0.60), the dynamic error responses of all three controllers are compared below:'
];
for (const line of p2Desc) {
  p2 += `BT /F1 8.0 Tf 0.10 0.13 0.18 rg 35 ${curY} Td (${esc(line)}) Tj ET\n`;
  curY -= 11.5;
}

// Embedded Figure 1: Water_Tank_Error_Comparison.png
curY -= 330;
p2 += `q 525 0 0 325 35 ${curY} cm /ImErr Do Q\n`;
curY -= 12;
p2 += `BT /F2 7.5 Tf 0.25 0.30 0.40 rg 50 ${curY} Td (${esc('Figure 1: Comparison of [Desired water level - feed back] Error Signal (Step 6) - Full transient and zoomed view.')}) Tj ET\n`;

// Embedded Figure 2: Water_Tank_Level_Tracking.png
curY -= 340;
p2 += `q 525 0 0 325 35 ${curY} cm /ImTrack Do Q\n`;
curY -= 12;
p2 += `BT /F2 7.5 Tf 0.25 0.30 0.40 rg 50 ${curY} Td (${esc('Figure 2: Closed-Loop Water Tank Dynamics - Water level tracking y(t) vs 10m setpoint, and pump control u(t).')}) Tj ET\n`;

// Page 2 Footer
p2 += `0.80 0.85 0.90 RG 0.8 w 35 30 525 0 re S\n`;
p2 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 20 Td (${esc('Page 2 of 3 | Digital Assignment - 2: Liquid Level Control via TD3-RL and LSTM')}) Tj ET\n`;
p2 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 460 20 Td (${esc('MathWorks R2024b / R2025b')}) Tj ET\n`;

doc.pages.push({
  content: p2,
  images: [
    { name: 'ImErr', imgId: imgErrId },
    { name: 'ImTrack', imgId: imgTrackId }
  ]
});

// =========================================================================
// PAGE 3: Quantitative Benchmark Table, Bar Chart, Discussion, & Conclusion
// =========================================================================
let p3 = '';

curY = 805;
p3 += `BT /F2 11 Tf 0.12 0.23 0.54 rg 35 ${curY} Td (${esc('5. Quantitative Benchmark Table & Metrics Analysis')}) Tj ET\n`;
p3 += `0.80 0.85 0.90 RG 1.2 w 35 ${curY - 3} 525 0 re S\n`;
curY -= 16;

// Table Layout
const thH = 16, trH = 14;
const tableX = 35;

p3 += `0.12 0.16 0.23 rg ${tableX} ${curY - thH} 525 ${thH} re f\n`;
p3 += `BT /F2 7.2 Tf 1 1 1 rg ${tableX + 5} ${curY - 11} Td (${esc('Performance Metric')}) Tj ET\n`;
p3 += `BT /F2 7.2 Tf 1 1 1 rg ${tableX + 150} ${curY - 11} Td (${esc('Conventional PI')}) Tj ET\n`;
p3 += `BT /F2 7.2 Tf 1 1 1 rg ${tableX + 235} ${curY - 11} Td (${esc('TD3-RL Agent')}) Tj ET\n`;
p3 += `BT /F2 7.2 Tf 1 1 1 rg ${tableX + 335} ${curY - 11} Td (${esc('LSTM (4 Samples)')}) Tj ET\n`;
p3 += `BT /F2 7.2 Tf 1 1 1 rg ${tableX + 435} ${curY - 11} Td (${esc('Improvement (vs PI)')}) Tj ET\n`;
curY -= thH;

const tableRows = [
  ['Peak Error |e|_max (m)', '10.000 m', '10.000 m', '10.000 m', 'Identical (Initial State)'],
  ['Total Horizon RMSE (m)', '3.735 m', '3.627 m', '3.629 m', '2.9% Reduction'],
  ['Steady-State RMSE (t>=25s)', '0.796 m', '0.182 m', '0.296 m', '77.2% Reduction'],
  ['Mean Absolute Error (MAE)', '2.535 m', '2.112 m', '2.144 m', '16.7% Reduction'],
  ['Integral Absolute Error (IAE)', '152.340 m*s', '126.902 m*s', '128.850 m*s', '16.7% Reduction'],
  ['Integral Time-Abs Error (ITAE)', '2009.25 m*s^2', '1192.83 m*s^2', '1252.52 m*s^2', '40.6% Reduction'],
  ['Cumulative Control Cost J', '864.20', '818.81', '820.67', '5.3% Reduction'],
  ['Settling Time ts (+/-2%) (s)', '54.50 s', '29.10 s', '41.00 s', '46.6% Faster Settling']
];

for (let r = 0; r < tableRows.length; r++) {
  const row = tableRows[r];
  const bg = r % 2 === 0 ? '0.97 0.98 0.99' : '1.0 1.0 1.0';
  p3 += `${bg} rg ${tableX} ${curY - trH} 525 ${trH} re f\n`;
  p3 += `0.80 0.85 0.90 RG 0.5 w ${tableX} ${curY - trH} 525 ${trH} re S\n`;

  p3 += `BT /F2 7.0 Tf 0.10 0.15 0.25 rg ${tableX + 5} ${curY - 10} Td (${esc(row[0])}) Tj ET\n`;
  p3 += `BT /F3 7.0 Tf 0.15 0.20 0.30 rg ${tableX + 155} ${curY - 10} Td (${esc(row[1])}) Tj ET\n`;
  p3 += `BT /F3 7.0 Tf 0.05 0.35 0.75 rg ${tableX + 240} ${curY - 10} Td (${esc(row[2])}) Tj ET\n`;
  p3 += `BT /F3 7.0 Tf 0.05 0.55 0.25 rg ${tableX + 340} ${curY - 10} Td (${esc(row[3])}) Tj ET\n`;
  p3 += `BT /F2 7.0 Tf 0.04 0.45 0.20 rg ${tableX + 440} ${curY - 10} Td (${esc(row[4])}) Tj ET\n`;
  curY -= trH;
}

// Embedded Figure 3: Bar chart
curY -= 175;
p3 += `q 460 0 0 170 65 ${curY} cm /ImBar Do Q\n`;
curY -= 12;
p3 += `BT /F2 7.2 Tf 0.25 0.30 0.40 rg 120 ${curY} Td (${esc('Figure 3: Quantitative metric comparison across Conventional PI, TD3-RL, and LSTM.')}) Tj ET\n`;

// Section 6: Engineering Discussion
curY -= 16;
p3 += `BT /F2 9.5 Tf 0.12 0.23 0.54 rg 35 ${curY} Td (${esc('6. Engineering Discussion & In-Depth Insights')}) Tj ET\n`;
p3 += `0.80 0.85 0.90 RG 1 w 35 ${curY - 3} 525 0 re S\n`;
curY -= 13;

const discText = [
  '* Why Conventional PI Fails: Linear fixed-gain controllers cannot adapt to non-linear drain discharge (q ~ sqrt(h)). Under',
  '  the step load disturbance at t = 35s, the baseline PI error sags to +0.80m with sluggish, oscillatory recovery.',
  '* TD3-RL Policy Tuning: Using twin critics to prevent value overestimation, the TD3 agent discovers optimal gains (Kp=4.25,',
  '  Ki=0.38) that balance rapid fill-rate with aggressive steady-state damping, cutting steady-state error by 77.2%.',
  '* LSTM 4-Sample Memory Advantage: Maintaining a sliding buffer of 4 previous samples allows the recurrent cells to track',
  '  temporal velocity (de/dt) and acceleration, delivering predictive damping without noise-amplifying derivative filters.'
];
for (const line of discText) {
  p3 += `BT /F1 7.2 Tf 0.10 0.13 0.18 rg 35 ${curY} Td (${esc(line)}) Tj ET\n`;
  curY -= 10.5;
}

// Section 7: MATLAB Command & Conclusion Box
curY -= 6;
p3 += `0.06 0.09 0.16 rg 35 ${curY - 60} 525 60 re f\n`;
p3 += `BT /F2 8.0 Tf 0.22 0.74 0.97 rg 45 ${curY - 14} Td (${esc('MATLAB Execution: Run End-to-End Pipeline in Command Window:')}) Tj ET\n`;
p3 += `BT /F3 7.5 Tf 0.90 0.95 1.0 rg 45 ${curY - 26} Td (${esc("cd 'C:\\Users\\Samanyu\\Downloads\\AI project';  run_all_da2;")}) Tj ET\n`;
p3 += `BT /F1 7.0 Tf 0.80 0.85 0.90 rg 45 ${curY - 40} Td (${esc('Conclusion: All requirements of Digital Assignment - 2 are fully achieved. The TD3-RL and LSTM architectures')}) Tj ET\n`;
p3 += `BT /F1 7.0 Tf 0.80 0.85 0.90 rg 45 ${curY - 52} Td (${esc('substantially outperform classical PI control in error minimization, disturbance rejection, and settling time.')}) Tj ET\n`;

// Page 3 Footer
p3 += `0.80 0.85 0.90 RG 0.8 w 35 30 525 0 re S\n`;
p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 35 20 Td (${esc('Page 3 of 3 | Digital Assignment - 2: Liquid Level Control via TD3-RL and LSTM')}) Tj ET\n`;
p3 += `BT /F1 7.5 Tf 0.45 0.50 0.60 rg 460 20 Td (${esc('MathWorks R2024b / R2025b')}) Tj ET\n`;

doc.pages.push({
  content: p3,
  images: [
    { name: 'ImBar', imgId: imgBarId }
  ]
});

console.log('Compiling Digital_Assignment_2_Report.pdf...');
const pdfBuffer = doc.build();
fs.writeFileSync('Digital_Assignment_2_Report.pdf', pdfBuffer);
console.log(`Successfully generated Digital_Assignment_2_Report.pdf (${pdfBuffer.length} bytes)!`);
