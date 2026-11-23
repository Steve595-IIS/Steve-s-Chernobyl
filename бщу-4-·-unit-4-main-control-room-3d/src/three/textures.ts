import * as THREE from 'three';

export interface ProceduralTextureSet {
  concreteMap: THREE.CanvasTexture;
  concreteBump: THREE.CanvasTexture;
  floorMap: THREE.CanvasTexture;
  hallWallMap: THREE.CanvasTexture;
  brushedSteelBump: THREE.CanvasTexture;
  elenaMap: THREE.CanvasTexture;
  consolePlateMap: THREE.CanvasTexture;
  deskBackPanelMap: THREE.CanvasTexture;
  tabbyFurMap: THREE.CanvasTexture;
  hazardStripeMap: THREE.CanvasTexture;
  steamPuffMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Weathered Soviet concrete (color + bump)
  const [concCanvas, cctx] = makeCanvas(256, 256);
  cctx.fillStyle = '#4e524a';
  cctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 58 + Math.floor(Math.random() * 44);
    cctx.fillStyle = `rgb(${v},${v + 2},${v - 2})`;
    cctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  cctx.strokeStyle = 'rgba(20,22,18,0.45)';
  cctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 64) {
    cctx.beginPath();
    cctx.moveTo(0, y);
    cctx.lineTo(256, y);
    cctx.stroke();
  }
  for (let x = 0; x < 256; x += 128) {
    cctx.beginPath();
    cctx.moveTo(x, 0);
    cctx.lineTo(x, 256);
    cctx.stroke();
  }
  const concreteMap = new THREE.CanvasTexture(concCanvas);
  concreteMap.colorSpace = THREE.SRGBColorSpace;
  concreteMap.wrapS = THREE.RepeatWrapping;
  concreteMap.wrapT = THREE.RepeatWrapping;
  concreteMap.repeat.set(3, 2);
  concreteMap.anisotropy = maxAnisotropy;

  const [bumpCanvas, bctx] = makeCanvas(256, 256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const v = 90 + Math.floor(Math.random() * 80);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  const concreteBump = new THREE.CanvasTexture(bumpCanvas);
  concreteBump.wrapS = THREE.RepeatWrapping;
  concreteBump.wrapT = THREE.RepeatWrapping;
  concreteBump.repeat.set(3, 2);

  // 2. Reactor hall industrial floor tiles with yellow safety walkway border lines
  const [floorCanvas, fctx] = makeCanvas(512, 512);
  fctx.fillStyle = '#242821';
  fctx.fillRect(0, 0, 512, 512);
  const tile = 32;
  for (let y = 0; y < 512; y += tile) {
    for (let x = 0; x < 512; x += tile) {
      const shade = 33 + Math.floor(Math.random() * 14);
      fctx.fillStyle = `rgb(${shade},${shade + 4},${shade - 2})`;
      fctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }
  const floorMap = new THREE.CanvasTexture(floorCanvas);
  floorMap.colorSpace = THREE.SRGBColorSpace;
  floorMap.wrapS = THREE.RepeatWrapping;
  floorMap.wrapT = THREE.RepeatWrapping;
  floorMap.repeat.set(8, 8);
  floorMap.anisotropy = maxAnisotropy;

  // 2b. Central Hall Concrete Wall Panels + Sage Dado + Glass-Block Window Bay
  const [hwCanvas, hwctx] = makeCanvas(512, 512);
  hwctx.fillStyle = '#363b33';
  hwctx.fillRect(0, 0, 512, 512);
  // Subtle concrete panel grain
  for (let i = 0; i < 2400; i++) {
    const v = 42 + Math.floor(Math.random() * 28);
    hwctx.fillStyle = `rgba(${v},${v + 2},${v - 2},0.35)`;
    hwctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  // Upper industrial glass-block windows
  hwctx.fillStyle = '#1b262d';
  hwctx.fillRect(28, 36, 456, 220);
  for (let wy = 44; wy < 248; wy += 28) {
    for (let wx = 36; wx < 476; wx += 38) {
      const b = 34 + ((wx + wy) % 14);
      hwctx.fillStyle = `rgb(${b},${b + 14},${b + 24})`;
      hwctx.fillRect(wx + 2, wy + 2, 34, 24);
    }
  }
  hwctx.strokeStyle = '#252922';
  hwctx.lineWidth = 6;
  hwctx.strokeRect(28, 36, 456, 220);
  // Lower Soviet sage-green painted wainscot dado
  hwctx.fillStyle = '#475442';
  hwctx.fillRect(0, 340, 512, 152);
  hwctx.fillStyle = '#22261e';
  hwctx.fillRect(0, 336, 512, 6);
  // Concrete panel vertical seams
  hwctx.strokeStyle = '#1e211c';
  hwctx.lineWidth = 4;
  for (const sx of [0, 256, 511]) {
    hwctx.beginPath();
    hwctx.moveTo(sx, 0);
    hwctx.lineTo(sx, 512);
    hwctx.stroke();
  }
  const hallWallMap = new THREE.CanvasTexture(hwCanvas);
  hallWallMap.colorSpace = THREE.SRGBColorSpace;
  hallWallMap.wrapS = THREE.RepeatWrapping;
  hallWallMap.wrapT = THREE.ClampToEdgeWrapping;
  hallWallMap.repeat.set(4, 1);
  hallWallMap.anisotropy = maxAnisotropy;

  // 2c. Brushed Steel linear bump map for rotors, separators & pump housings
  const [bsCanvas, bsctx] = makeCanvas(256, 256);
  bsctx.fillStyle = '#808080';
  bsctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    const v = 108 + Math.floor(Math.random() * 40);
    bsctx.fillStyle = `rgb(${v},${v},${v})`;
    bsctx.fillRect(0, y, 256, 1);
  }
  const brushedSteelBump = new THREE.CanvasTexture(bsCanvas);
  brushedSteelBump.wrapS = THREE.RepeatWrapping;
  brushedSteelBump.wrapT = THREE.RepeatWrapping;
  brushedSteelBump.repeat.set(2, 2);

  // 3. Upper Biological Shield "Elena" plate texture
  const [elenaCanvas, ectx] = makeCanvas(512, 512);
  ectx.fillStyle = '#3c433a';
  ectx.fillRect(0, 0, 512, 512);
  ectx.strokeStyle = '#6b7265';
  ectx.lineWidth = 4;
  ectx.beginPath();
  ectx.arc(256, 256, 240, 0, Math.PI * 2);
  ectx.stroke();
  for (let gy = -7; gy <= 7; gy++) {
    for (let gx = -7; gx <= 7; gx++) {
      if (gx * gx + gy * gy <= 52) {
        const px = 256 + gx * 27;
        const py = 256 + gy * 27;
        ectx.fillStyle = (gx + gy) % 3 === 0 ? '#8c9484' : '#586054';
        ectx.fillRect(px - 9, py - 9, 18, 18);
        ectx.strokeStyle = '#1d211b';
        ectx.lineWidth = 2;
        ectx.strokeRect(px - 9, py - 9, 18, 18);
      }
    }
  }
  const elenaMap = new THREE.CanvasTexture(elenaCanvas);
  elenaMap.colorSpace = THREE.SRGBColorSpace;
  elenaMap.anisotropy = maxAnisotropy;

  // 4. Hazard black/yellow stripe texture
  const [hazCanvas, hctx] = makeCanvas(256, 64);
  hctx.fillStyle = '#d99b18';
  hctx.fillRect(0, 0, 256, 64);
  hctx.fillStyle = '#181916';
  for (let i = -64; i < 320; i += 48) {
    hctx.beginPath();
    hctx.moveTo(i, 0);
    hctx.lineTo(i + 24, 0);
    hctx.lineTo(i + 56, 64);
    hctx.lineTo(i + 32, 64);
    hctx.closePath();
    hctx.fill();
  }
  const hazardStripeMap = new THREE.CanvasTexture(hazCanvas);
  hazardStripeMap.colorSpace = THREE.SRGBColorSpace;
  hazardStripeMap.wrapS = THREE.RepeatWrapping;
  hazardStripeMap.wrapT = THREE.RepeatWrapping;
  hazardStripeMap.repeat.set(6, 1);
  hazardStripeMap.anisotropy = maxAnisotropy;

  // 5. BShU-4 Control desk faceplate texture with mimic schematic lines
  const [cpCanvas, pctx] = makeCanvas(512, 256);
  pctx.fillStyle = '#9aa38c';
  pctx.fillRect(0, 0, 512, 256);
  pctx.strokeStyle = '#252922';
  pctx.lineWidth = 4;
  pctx.strokeRect(8, 8, 496, 240);
  // Mimic flow diagram connecting sections
  pctx.strokeStyle = '#2d4a5e';
  pctx.lineWidth = 5;
  pctx.beginPath();
  pctx.moveTo(60, 145);
  pctx.lineTo(160, 145);
  pctx.lineTo(264, 145);
  pctx.stroke();
  pctx.strokeStyle = '#754e1d';
  pctx.beginPath();
  pctx.moveTo(264, 145);
  pctx.lineTo(364, 145);
  pctx.stroke();
  // Section dividers
  pctx.strokeStyle = '#252922';
  pctx.lineWidth = 3;
  for (const x of [108, 212, 316, 412]) {
    pctx.beginPath();
    pctx.moveTo(x, 14);
    pctx.lineTo(x, 242);
    pctx.stroke();
  }
  // Yellow hazard framing on АЗ-5 bay
  pctx.strokeStyle = '#d49a16';
  pctx.lineWidth = 4;
  pctx.strokeRect(418, 48, 82, 188);

  pctx.fillStyle = '#171916';
  pctx.font = 'bold 15px sans-serif';
  pctx.textAlign = 'center';
  const labels = [
    ['СТЕРЖНИ СУЗ', 58],
    ['ГЦН А / Б', 160],
    ['ТГ-8 · БРУ-К', 264],
    ['БОР · САОР', 364],
    ['АЗ-5', 458],
  ] as const;
  for (const [text, cx] of labels) {
    pctx.fillRect(cx - 44, 18, 88, 22);
    pctx.fillStyle = '#e9e5d3';
    pctx.fillText(text, cx, 34);
    pctx.fillStyle = '#171916';
  }
  const consolePlateMap = new THREE.CanvasTexture(cpCanvas);
  consolePlateMap.colorSpace = THREE.SRGBColorSpace;
  consolePlateMap.anisotropy = maxAnisotropy;

  // 5b. BShU-4 Desk Hood Backlit Instrument & Annunciator Texture
  const [bpCanvas, bpctx] = makeCanvas(512, 128);
  bpctx.fillStyle = '#20241d';
  bpctx.fillRect(0, 0, 512, 128);
  // Analog meter bezels on left
  for (let m = 0; m < 4; m++) {
    const mx = 42 + m * 62;
    bpctx.fillStyle = '#dcd7c2';
    bpctx.beginPath();
    bpctx.arc(mx, 64, 24, 0, Math.PI * 2);
    bpctx.fill();
    bpctx.strokeStyle = '#111';
    bpctx.lineWidth = 3;
    bpctx.stroke();
    // Dial ticks + red needle
    bpctx.strokeStyle = '#333';
    bpctx.lineWidth = 2;
    bpctx.beginPath();
    bpctx.arc(mx, 64, 17, Math.PI * 0.75, Math.PI * 2.25);
    bpctx.stroke();
    bpctx.strokeStyle = '#b6281e';
    bpctx.beginPath();
    bpctx.moveTo(mx, 64);
    bpctx.lineTo(mx + 12, 52);
    bpctx.stroke();
  }
  // Annunciator tile grid on right
  const tileCols = ['#2a3026', '#2a3026', '#d49517', '#2f7a44', '#2a3026', '#9a2a20'];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 6; c++) {
      const idx = (r * 6 + c) % tileCols.length;
      bpctx.fillStyle = tileCols[idx];
      bpctx.fillRect(280 + c * 36, 24 + r * 42, 32, 34);
      bpctx.strokeStyle = '#0e100c';
      bpctx.lineWidth = 2;
      bpctx.strokeRect(280 + c * 36, 24 + r * 42, 32, 34);
    }
  }
  const deskBackPanelMap = new THREE.CanvasTexture(bpCanvas);
  deskBackPanelMap.colorSpace = THREE.SRGBColorSpace;
  deskBackPanelMap.anisotropy = maxAnisotropy;

  // 5c. Ginger tabby fur texture for Comrade Whiskers
  const [catCanvas, catctx] = makeCanvas(128, 128);
  catctx.fillStyle = '#cf7f36';
  catctx.fillRect(0, 0, 128, 128);
  catctx.fillStyle = '#9c5419';
  for (let sy = 8; sy < 128; sy += 18) {
    catctx.fillRect(0, sy, 128, 6);
  }
  const tabbyFurMap = new THREE.CanvasTexture(catCanvas);
  tabbyFurMap.colorSpace = THREE.SRGBColorSpace;

  // 6. Soft radial steam puff sprite
  const [stCanvas, sctx] = makeCanvas(128, 128);
  const sGrad = sctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  sGrad.addColorStop(0, 'rgba(235, 244, 255, 0.9)');
  sGrad.addColorStop(0.45, 'rgba(205, 222, 240, 0.45)');
  sGrad.addColorStop(1, 'rgba(190, 210, 230, 0)');
  sctx.fillStyle = sGrad;
  sctx.fillRect(0, 0, 128, 128);
  const steamPuffMap = new THREE.CanvasTexture(stCanvas);
  steamPuffMap.colorSpace = THREE.SRGBColorSpace;

  // 7. Soft contact shadow radial disc
  const [shCanvas, shctx] = makeCanvas(128, 128);
  const shGrad = shctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  shGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shctx.fillStyle = shGrad;
  shctx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shCanvas);

  return {
    concreteMap,
    concreteBump,
    floorMap,
    hallWallMap,
    brushedSteelBump,
    elenaMap,
    consolePlateMap,
    deskBackPanelMap,
    tabbyFurMap,
    hazardStripeMap,
    steamPuffMap,
    contactShadowMap,
    dispose: () => {
      concreteMap.dispose();
      concreteBump.dispose();
      floorMap.dispose();
      hallWallMap.dispose();
      brushedSteelBump.dispose();
      elenaMap.dispose();
      consolePlateMap.dispose();
      deskBackPanelMap.dispose();
      tabbyFurMap.dispose();
      hazardStripeMap.dispose();
      steamPuffMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
