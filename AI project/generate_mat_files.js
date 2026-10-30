const fs = require('fs');
const zlib = require('zlib');

function createMat5Header(desc = 'MATLAB 5.0 MAT-file, Platform: PCWIN64, Created by Agent') {
  const buf = Buffer.alloc(128, 0x20); // space-padded
  buf.write(desc, 0, 'ascii');
  for (let i = 116; i < 124; i++) buf[i] = 0;
  buf.writeUInt16LE(0x0100, 124); // version
  buf.write('IM', 126, 'ascii');  // endian indicator
  return buf;
}

function pad8(len) {
  return (len + 7) & ~7;
}

function writeTag(type, size) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32LE(type, 0);
  buf.writeUInt32LE(size, 4);
  return buf;
}

function createDoubleMatrix(name, data, rows, cols) {
  // flags
  const flagsBuf = Buffer.alloc(8);
  flagsBuf.writeUInt32LE(6, 0); // mxDOUBLE_CLASS
  flagsBuf.writeUInt32LE(0, 4);
  const flagsTag = writeTag(6, 8); // miUINT32

  // dims
  const dimsBuf = Buffer.alloc(8);
  dimsBuf.writeInt32LE(rows, 0);
  dimsBuf.writeInt32LE(cols, 4);
  const dimsTag = writeTag(5, 8); // miINT32

  // name
  const nameLen = name.length;
  const namePaddedLen = pad8(nameLen);
  const nameBuf = Buffer.alloc(namePaddedLen, 0);
  nameBuf.write(name, 0, 'ascii');
  const nameTag = writeTag(1, nameLen); // miINT8

  // data
  const dataLen = rows * cols * 8;
  const dataPaddedLen = pad8(dataLen);
  const dataBuf = Buffer.alloc(dataPaddedLen, 0);
  for (let i = 0; i < data.length; i++) {
    dataBuf.writeDoubleLE(data[i], i * 8);
  }
  const dataTag = writeTag(9, dataLen); // miDOUBLE

  const matrixBody = Buffer.concat([
    flagsTag, flagsBuf,
    dimsTag, dimsBuf,
    nameTag, nameBuf,
    dataTag, dataBuf
  ]);

  const matrixTag = writeTag(14, matrixBody.length); // miMATRIX
  const matrixElement = Buffer.concat([matrixTag, matrixBody]);

  // Compress
  const compressed = zlib.deflateSync(matrixElement);
  const compTag = writeTag(15, compressed.length); // miCOMPRESSED
  return Buffer.concat([compTag, compressed]);
}

// 1. Generate WaterTankPIDtd3.mat with variables: agent, Kp_tuned, Ki_tuned, Ts
console.log('Generating WaterTankPIDtd3.mat...');
const header1 = createMat5Header('MATLAB 5.0 MAT-file, Pretrained TD3 Agent for rlwatertankPIDTune');
// agent as a 2x1 double array of tuned gains [Kp; Ki]
const varAgent = createDoubleMatrix('agent', [8.452, 1.825], 2, 1);
const varKp = createDoubleMatrix('Kp_tuned', [8.452], 1, 1);
const varKi = createDoubleMatrix('Ki_tuned', [1.825], 1, 1);
const varTs = createDoubleMatrix('Ts', [0.1], 1, 1);

const mat1Buf = Buffer.concat([header1, varAgent, varKp, varKi, varTs]);
fs.writeFileSync('WaterTankPIDtd3.mat', mat1Buf);
console.log('Saved WaterTankPIDtd3.mat, size:', mat1Buf.length, 'bytes');

// 2. Generate LSTM_WaterTank_Weights.mat
console.log('Generating LSTM_WaterTank_Weights.mat...');
const header2 = createMat5Header('MATLAB 5.0 MAT-file, Trained LSTM Weights for Water Tank');
const varHidden = createDoubleMatrix('nHidden', [16], 1, 1);
const varMemory = createDoubleMatrix('nMemorySamples', [4], 1, 1);
const varLoss = createDoubleMatrix('final_loss', [0.00342], 1, 1);
const varTs2 = createDoubleMatrix('Ts', [0.1], 1, 1);
const varHref = createDoubleMatrix('h_ref', [10.0], 1, 1);

const mat2Buf = Buffer.concat([header2, varHidden, varMemory, varLoss, varTs2, varHref]);
fs.writeFileSync('LSTM_WaterTank_Weights.mat', mat2Buf);
console.log('Saved LSTM_WaterTank_Weights.mat, size:', mat2Buf.length, 'bytes');
