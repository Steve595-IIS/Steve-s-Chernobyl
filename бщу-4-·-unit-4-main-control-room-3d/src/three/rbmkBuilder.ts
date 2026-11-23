import * as THREE from 'three';
import { CORE_CELLS } from '../sim/physics';
import type { InspectTargetId, ReactorState } from '../sim/types';
import type { ProceduralTextureSet } from './textures';

export interface RbmkSceneRig {
  root: THREE.Group;
  interactables: THREE.Object3D[];
  cameraAnchors: Record<
    'overview' | 'core' | 'turbine' | 'console' | 'explosion',
    { pos: THREE.Vector3; target: THREE.Vector3 }
  >;
  triggerWhiskersPerk: () => void;
  updateFromState: (
    s: ReactorState,
    dt: number,
    elapsed: number,
    hoveredId: InspectTargetId | null,
    hasActiveAlarm?: boolean,
  ) => void;
  dispose: () => void;
}

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _col = new THREE.Color();
const _tmpCol = new THREE.Color();

function tagTarget(obj: THREE.Object3D, id: InspectTargetId, interactables: THREE.Object3D[]) {
  obj.userData.targetId = id;
  obj.traverse((child) => {
    child.userData.targetId = id;
  });
  interactables.push(obj);
}

export function buildRbmkUnit4Scene(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): RbmkSceneRig {
  const root = new THREE.Group();
  const interactables: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // ---- Shared PBR Materials (deliberate roughness & metalness contrast) ----
  const matConcrete = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.concreteMap,
      bumpMap: textures.concreteBump,
      bumpScale: 0.06,
      roughness: 0.9,
      metalness: 0.06,
    }),
  );

  const matFloor = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.floorMap,
      roughness: 0.74,
      metalness: 0.1,
    }),
  );

  const matHallWall = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.hallWallMap,
      bumpMap: textures.concreteBump,
      bumpScale: 0.03,
      roughness: 0.85,
      metalness: 0.08,
    }),
  );

  const matSteelDark = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b423c,
      roughness: 0.45,
      metalness: 0.82,
    }),
  );

  const matSteelBright = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa4aea8,
      bumpMap: textures.brushedSteelBump,
      bumpScale: 0.015,
      roughness: 0.24,
      metalness: 0.92,
    }),
  );

  const matCopper = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc87d36,
      roughness: 0.26,
      metalness: 0.9,
    }),
  );

  const matBrass = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9ad42,
      roughness: 0.22,
      metalness: 0.92,
    }),
  );

  const matHazard = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.hazardStripeMap,
      roughness: 0.55,
      metalness: 0.15,
    }),
  );

  const matSageConsole = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8a957c,
      roughness: 0.68,
      metalness: 0.18,
    }),
  );

  const matConsoleFace = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.consolePlateMap,
      roughness: 0.52,
      metalness: 0.14,
    }),
  );

  const matDeskHoodPanel = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.deskBackPanelMap,
      emissive: 0x26291c,
      emissiveIntensity: 0.5,
      roughness: 0.42,
      metalness: 0.1,
    }),
  );

  const matPipeBlue = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2f6fa3,
      roughness: 0.36,
      metalness: 0.62,
    }),
  );

  const matPipeSteam = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc98226,
      roughness: 0.36,
      metalness: 0.64,
    }),
  );

  const matBoronPurple = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7b5ba8,
      roughness: 0.42,
      metalness: 0.45,
    }),
  );

  const matEccsCyan = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2f98b8,
      roughness: 0.38,
      metalness: 0.48,
    }),
  );

  const matSafetyYellow = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd99f22,
      roughness: 0.44,
      metalness: 0.52,
    }),
  );

  const matShadowDisc = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );

  // ---- 1. UNIT 4 CENTRAL HALL ARCHITECTURE, COLUMNS & OVERHEAD RZM CRANE ----
  const hallFloor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(52, 42)), matFloor);
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.y = 0;
  hallFloor.receiveShadow = !isSoftwareGl;
  root.add(hallFloor);

  const hallGroup = new THREE.Group();
  root.add(hallGroup);

  // Back wall (z = -11.5) & side walls enclosing Unit 4 Central Hall
  const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(36, 14.5, 0.6)), matHallWall);
  backWall.position.set(2, 7.25, -11.5);
  hallGroup.add(backWall);

  const leftWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.6, 14.5, 28)), matHallWall);
  leftWall.position.set(-16, 7.25, 2);
  hallGroup.add(leftWall);

  const rightWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.6, 14.5, 28)), matHallWall);
  rightWall.position.set(19, 7.25, 2);
  hallGroup.add(rightWall);

  // Reinforced concrete structural pilasters along back hall wall + crane runway beams
  const pilasterGeo = trackGeo(new THREE.BoxGeometry(0.95, 14.5, 1.1));
  const corbelGeo = trackGeo(new THREE.BoxGeometry(1.15, 0.85, 1.55));
  const beaconLenses: THREE.MeshStandardMaterial[] = [];

  for (let i = 0; i < 6; i++) {
    const px = -12.5 + i * 5.8;
    const pilaster = new THREE.Mesh(pilasterGeo, matConcrete);
    pilaster.position.set(px, 7.25, -10.95);
    hallGroup.add(pilaster);

    const corbel = new THREE.Mesh(corbelGeo, matConcrete);
    corbel.position.set(px, 10.6, -10.65);
    hallGroup.add(corbel);

    // Emergency wall klaxon beacons on columns 2 and 4
    if (i === 1 || i === 3) {
      const klaxonMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x8f1a14,
          emissive: 0xff2b1a,
          emissiveIntensity: 0.15,
          roughness: 0.25,
          metalness: 0.2,
        }),
      );
      beaconLenses.push(klaxonMat);
      const klaxon = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.25, 0.42, 12)), klaxonMat);
      klaxon.position.set(px, 8.8, -10.25);
      hallGroup.add(klaxon);
    }
  }

  // Steel crane runway I-beam rails running left-right along back & front hall
  const runwayBeamBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(35, 0.55, 0.65)), matSteelDark);
  runwayBeamBack.position.set(1.5, 11.15, -10.3);
  hallGroup.add(runwayBeamBack);

  // Overhead gantry crane girder + multi-part RZM Refueling Machine ("РЗМ")
  const craneGroup = new THREE.Group();
  const craneBeamMain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(31, 0.72, 0.85)), matSafetyYellow);
  craneBeamMain.position.set(2.5, 11.75, -2.5);
  craneGroup.add(craneBeamMain);
  const craneBeamTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(31, 0.22, 1.15)), matSteelDark);
  craneBeamTop.position.set(2.5, 12.22, -2.5);
  craneGroup.add(craneBeamTop);

  // RZM Refueling Machine Trolley & Shielded Cask
  const rzmGroup = new THREE.Group();
  rzmGroup.position.set(-3.2, 11.4, -2.5);
  const trolleyCar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.3, 0.65, 1.65)), matSteelDark);
  rzmGroup.add(trolleyCar);
  const rzmCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 0.72, 0.6, 16)), matSafetyYellow);
  rzmCollar.position.y = -0.62;
  rzmGroup.add(rzmCollar);
  const rzmCask = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.46, 0.46, 2.25, 16)), matSteelBright);
  rzmCask.position.y = -1.95;
  rzmGroup.add(rzmCask);
  const rzmGrapple = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.34, 0.55, 12)), matCopper);
  rzmGrapple.position.y = -3.25;
  rzmGroup.add(rzmGrapple);
  craneGroup.add(rzmGroup);
  root.add(craneGroup);

  // ---- 2. RBMK-1000 REACTOR CUTAWAY ASSEMBLY (Origin: x=-3.2, z=-0.5) ----
  const reactorX = -3.2;
  const reactorZ = -0.5;
  const reactorGroup = new THREE.Group();
  reactorGroup.position.set(reactorX, 0, reactorZ);
  root.add(reactorGroup);

  const reactorShadow = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(7.6, 32)), matShadowDisc);
  reactorShadow.rotation.x = -Math.PI / 2;
  reactorShadow.position.y = 0.02;
  reactorGroup.add(reactorShadow);

  // Outer concrete biological shield vault (235° cutaway arc)
  const arcStart = Math.PI * 0.42;
  const arcLen = Math.PI * 1.42;
  const shieldOuter = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(5.1, 5.25, 6.4, 28, 1, true, arcStart, arcLen)),
    matConcrete,
  );
  shieldOuter.position.y = 3.2;
  shieldOuter.castShadow = !isSoftwareGl;
  shieldOuter.receiveShadow = !isSoftwareGl;
  reactorGroup.add(shieldOuter);

  // Vertical concrete buttress ribs around the biological shield exterior
  const buttressGeo = trackGeo(new THREE.BoxGeometry(0.45, 6.4, 0.68));
  for (let b = 0; b < 7; b++) {
    const ang = arcStart + 0.18 + (b / 6) * (arcLen - 0.36);
    const rib = new THREE.Mesh(buttressGeo, matConcrete);
    rib.position.set(Math.sin(ang) * 5.25, 3.2, Math.cos(ang) * 5.25);
    rib.rotation.y = ang;
    reactorGroup.add(rib);
  }

  // Cutaway cross-section faceplates sealing the two open edges of the sliced concrete shield!
  const cutWallGeo = trackGeo(new THREE.BoxGeometry(1.15, 6.42, 0.24));
  for (const edgeAng of [arcStart, arcStart + arcLen]) {
    const wall = new THREE.Mesh(cutWallGeo, matConcrete);
    wall.position.set(Math.sin(edgeAng) * 4.58, 3.2, Math.cos(edgeAng) * 4.58);
    wall.rotation.y = edgeAng + Math.PI / 2;
    reactorGroup.add(wall);
  }

  const shieldTopRim = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(4.0, 5.25, 28, 1, arcStart, arcLen)),
    matHazard,
  );
  shieldTopRim.rotation.x = -Math.PI / 2;
  shieldTopRim.position.y = 6.42;
  reactorGroup.add(shieldTopRim);

  // Upper safety railing stanchions & yellow rail along the rear shield rim
  const railPostGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 6));
  for (let p = 0; p < 10; p++) {
    const ang = arcStart + 0.1 + (p / 9) * (arcLen - 0.2);
    const post = new THREE.Mesh(railPostGeo, matSafetyYellow);
    post.position.set(Math.sin(ang) * 4.95, 6.84, Math.cos(ang) * 4.95);
    reactorGroup.add(post);
  }
  const railBar = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(4.95, 0.04, 6, 28, arcLen - 0.2)),
    matSafetyYellow,
  );
  railBar.rotation.x = Math.PI / 2;
  railBar.rotation.z = -arcStart + Math.PI * 0.5 - 0.1;
  railBar.position.y = 7.22;
  reactorGroup.add(railBar);

  // Steel inner thermal shield liner ("Лабиринтная защита")
  const innerLiner = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.05, 4.05, 5.85, 28, 1, true, arcStart, arcLen)),
    matSteelDark,
  );
  innerLiner.position.y = 3.2;
  reactorGroup.add(innerLiner);

  // Lower Support Structure ("Схема ОР") + Coolant Collector Ring
  const lowerPlenum = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.9, 3.95, 0.68, 24)), matSteelDark);
  lowerPlenum.position.y = 0.4;
  reactorGroup.add(lowerPlenum);

  const lowerCollectorRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(4.35, 0.18, 10, 28)), matPipeBlue);
  lowerCollectorRing.rotation.x = Math.PI / 2;
  lowerCollectorRing.position.y = 0.55;
  reactorGroup.add(lowerCollectorRing);

  // Core Cavity Glow Light + Cherenkov Point Light
  const coreLight = new THREE.PointLight(0xff7b22, 1.5, 17, 1.5);
  coreLight.position.set(0, 3.3, 0);
  reactorGroup.add(coreLight);

  const cherenkovLight = new THREE.PointLight(0x2890ff, 0.2, 13, 1.7);
  cherenkovLight.position.set(0, 2.2, 0.6);
  reactorGroup.add(cherenkovLight);

  const matCoreGlow = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff6a00,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const coreGlowSphere = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(3.35, 20, 14)), matCoreGlow);
  coreGlowSphere.position.y = 3.25;
  coreGlowSphere.scale.set(1, 0.72, 1);
  reactorGroup.add(coreGlowSphere);

  // 211-Channel Active Zone Matrix: fuel channels + rear graphite moderator block columns
  const cellSpacing = 0.41;
  const visibleFuelCells = CORE_CELLS.filter(([gx, gy]) => {
    const wx = (gx - 8) * cellSpacing;
    const wz = (gy - 8) * cellSpacing;
    return !(wz > 1.25 && Math.abs(wx) < 1.85);
  });
  const cellCount = visibleFuelCells.length;
  const fuelGeo = trackGeo(new THREE.CylinderGeometry(0.062, 0.062, 4.2, 8));
  const matFuelInst = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x626b5e,
      emissive: 0xff6200,
      emissiveIntensity: 0.25,
      roughness: 0.48,
      metalness: 0.55,
    }),
  );
  const fuelInstanced = new THREE.InstancedMesh(fuelGeo, matFuelInst, cellCount);
  fuelInstanced.frustumCulled = false;

  // Individual graphite moderator block columns behind the cutaway wedge
  const graphiteBlockCells = CORE_CELLS.filter(([gx, gy]) => {
    const wz = (gy - 8) * cellSpacing;
    const wx = (gx - 8) * cellSpacing;
    return wz < -0.55 && Math.abs(wx) < 3.1;
  });
  const graphiteColGeo = trackGeo(new THREE.BoxGeometry(0.32, 4.15, 0.32));
  const matGraphiteCol = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x222521,
      roughness: 0.92,
      metalness: 0.08,
    }),
  );
  const graphiteColInst = new THREE.InstancedMesh(graphiteColGeo, matGraphiteCol, graphiteBlockCells.length);
  graphiteBlockCells.forEach(([gx, gy], idx) => {
    _pos.set((gx - 8) * cellSpacing, 3.2, (gy - 8) * cellSpacing);
    _quat.identity();
    _scale.set(1, 1, 1);
    _mat4.compose(_pos, _quat, _scale);
    graphiteColInst.setMatrixAt(idx, _mat4);
  });
  graphiteColInst.instanceMatrix.needsUpdate = true;
  graphiteColInst.computeBoundingSphere();
  reactorGroup.add(graphiteColInst);

  // Control rod subset (~every 3rd cell)
  const rodIndices: number[] = [];
  CORE_CELLS.forEach((_, idx) => {
    if (idx % 3 === 0) rodIndices.push(idx);
  });
  const rodCount = rodIndices.length;

  const absorberGeo = trackGeo(new THREE.CylinderGeometry(0.084, 0.084, 3.6, 10));
  const matAbsorber = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb8cae0,
      emissive: 0x000000,
      roughness: 0.24,
      metalness: 0.88,
    }),
  );
  const absorberInstanced = new THREE.InstancedMesh(absorberGeo, matAbsorber, rodCount);
  absorberInstanced.frustumCulled = false;

  const followerGeo = trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 1.5, 6));
  const followerInstanced = new THREE.InstancedMesh(followerGeo, matSteelBright, rodCount);
  followerInstanced.frustumCulled = false;

  // Iconic BLACK GRAPHITE DISPLACER TIPS on the bottom of each control rod
  const graphiteGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.086, 1.1, 10));
  const matGraphiteTip = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x101114,
      emissive: 0x1a3b7a,
      emissiveIntensity: 0.0,
      roughness: 0.78,
      metalness: 0.18,
    }),
  );
  const graphiteTipInstanced = new THREE.InstancedMesh(graphiteGeo, matGraphiteTip, rodCount);
  graphiteTipInstanced.frustumCulled = false;

  visibleFuelCells.forEach(([gx, gy], idx) => {
    const wx = (gx - 8) * cellSpacing;
    const wz = (gy - 8) * cellSpacing;
    _pos.set(wx, 3.2, wz);
    _quat.identity();
    _scale.set(1, 1, 1);
    _mat4.compose(_pos, _quat, _scale);
    fuelInstanced.setMatrixAt(idx, _mat4);
    fuelInstanced.setColorAt(idx, _col.setHex(0x6c7568));
  });
  fuelInstanced.instanceMatrix.needsUpdate = true;
  if (fuelInstanced.instanceColor) fuelInstanced.instanceColor.needsUpdate = true;
  fuelInstanced.computeBoundingSphere();

  const coreHitProxy = new THREE.Group();
  coreHitProxy.add(fuelInstanced);
  tagTarget(coreHitProxy, 'core', interactables);
  reactorGroup.add(coreHitProxy);

  const rodsGroup = new THREE.Group();
  rodsGroup.add(absorberInstanced, followerInstanced, graphiteTipInstanced);
  tagTarget(rodsGroup, 'rods', interactables);
  reactorGroup.add(rodsGroup);

  // Dedicated "Boris" stubborn control rod (amber band + top collar)
  const borisGroup = new THREE.Group();
  borisGroup.position.set(1.23, 3.2, 0.82);
  const borisShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.082, 0.082, 3.7, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xe8a317, roughness: 0.34, metalness: 0.72 })),
  );
  borisGroup.add(borisShaft);
  const borisTip = new THREE.Mesh(graphiteGeo, matGraphiteTip);
  borisTip.position.y = -2.35;
  borisGroup.add(borisTip);
  tagTarget(borisGroup, 'boris', interactables);
  reactorGroup.add(borisGroup);

  // Steam Void Bubbles inside active channels
  const bubbleCount = 120;
  const bubbleGeo = trackGeo(new THREE.SphereGeometry(0.075, 6, 6));
  const matBubble = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdcf4ff,
      emissive: 0x7bcfff,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.82,
      roughness: 0.1,
    }),
  );
  const bubbleInstanced = new THREE.InstancedMesh(bubbleGeo, matBubble, bubbleCount);
  bubbleInstanced.frustumCulled = false;
  const bubbleSeeds = Array.from({ length: bubbleCount }, (_, i) => {
    const cell = CORE_CELLS[(i * 7) % CORE_CELLS.length];
    return {
      x: (cell[0] - 8) * cellSpacing + (Math.random() - 0.5) * 0.14,
      z: (cell[1] - 8) * cellSpacing + (Math.random() - 0.5) * 0.14,
      phase: Math.random(),
      speed: 0.55 + Math.random() * 0.7,
      scale: 0.6 + Math.random() * 0.7,
    };
  });
  reactorGroup.add(bubbleInstanced);

  // Upper Biological Shield "Elena" ("Схема Е") — multi-part lid with standpipe plugs & lifting trunnions
  const elenaPivot = new THREE.Group();
  elenaPivot.position.set(0, 6.25, 0);
  const elenaDisc = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.15, 4.15, 0.55, 28)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.elenaMap,
        roughness: 0.46,
        metalness: 0.74,
      }),
    ),
  );
  elenaPivot.add(elenaDisc);
  const elenaCollar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(4.18, 0.16, 10, 28)), matHazard);
  elenaCollar.rotation.x = Math.PI / 2;
  elenaCollar.position.y = 0.2;
  elenaPivot.add(elenaCollar);

  // Lifting trunnion lugs around Elena rim
  const lugGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.42, 0.22));
  for (let l = 0; l < 4; l++) {
    const ang = (l * Math.PI) / 2 + Math.PI / 4;
    const lug = new THREE.Mesh(lugGeo, matSafetyYellow);
    lug.position.set(Math.cos(ang) * 4.28, 0.35, Math.sin(ang) * 4.28);
    lug.rotation.y = -ang;
    elenaPivot.add(lug);
  }

  // Standpipe stubs & caps on top of Elena
  const stubGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.075, 0.6, 6));
  const stubInstanced = new THREE.InstancedMesh(stubGeo, matSteelBright, 64);
  for (let i = 0; i < 64; i++) {
    const ang = (i / 64) * Math.PI * 2 + (i % 2) * 0.1;
    const rad = 0.7 + (i % 5) * 0.68;
    _pos.set(Math.cos(ang) * rad, 0.48, Math.sin(ang) * rad);
    _quat.identity();
    _scale.set(1, 1, 1);
    _mat4.compose(_pos, _quat, _scale);
    stubInstanced.setMatrixAt(i, _mat4);
  }
  stubInstanced.instanceMatrix.needsUpdate = true;
  stubInstanced.computeBoundingSphere();
  elenaPivot.add(stubInstanced);
  tagTarget(elenaPivot, 'elena', interactables);
  reactorGroup.add(elenaPivot);

  // ---- 3. STEAM SEPARATORS (БС) WITH GROUNDED SUPPORT CRADLES & MANOMETERS ----
  const sepGroup = new THREE.Group();
  const sepDrumProfile = [
    new THREE.Vector2(0.0, -3.55),
    new THREE.Vector2(0.45, -3.45),
    new THREE.Vector2(0.78, -3.15),
    new THREE.Vector2(0.88, -2.75),
    new THREE.Vector2(0.88, 2.75),
    new THREE.Vector2(0.78, 3.15),
    new THREE.Vector2(0.45, 3.45),
    new THREE.Vector2(0.0, 3.55),
  ];
  const sepDrumGeo = trackGeo(new THREE.LatheGeometry(sepDrumProfile, 20));
  const sepCollarGeo = trackGeo(new THREE.TorusGeometry(0.91, 0.055, 8, 22));
  const sepLegGeo = trackGeo(new THREE.BoxGeometry(0.28, 7.0, 0.42));
  const sepPadGeo = trackGeo(new THREE.BoxGeometry(1.5, 0.35, 0.75));

  for (const side of [-1, 1]) {
    const drum = new THREE.Mesh(sepDrumGeo, matSteelBright);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(side * 5.8, 7.2, 0);
    sepGroup.add(drum);

    // Welded girth flange rings & steel support cradles down to floor (y=0)
    for (const cz of [-2.1, 0, 2.1]) {
      const collar = new THREE.Mesh(sepCollarGeo, matSteelDark);
      collar.position.set(side * 5.8, 7.2, cz);
      sepGroup.add(collar);
    }
    for (const lz of [-2.0, 2.0]) {
      const pad = new THREE.Mesh(sepPadGeo, matConcrete);
      pad.position.set(side * 5.8, 0.175, lz);
      sepGroup.add(pad);
      for (const lx of [-0.52, 0.52]) {
        const leg = new THREE.Mesh(sepLegGeo, matSteelDark);
        leg.position.set(side * 5.8 + lx, 3.6, lz);
        sepGroup.add(leg);
      }
    }

    // Front circular sight-glass / pressure dial on БС front cap
    const gaugeBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 14)), matBrass);
    gaugeBody.rotation.x = Math.PI / 2;
    gaugeBody.position.set(side * 5.8, 7.2, 3.56);
    sepGroup.add(gaugeBody);

    // Dual steam riser pipes from reactor upper plenum into separator drum
    for (const rz of [-1.1, 1.1]) {
      const riserCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 3.1, 5.7, rz * 0.65),
        new THREE.Vector3(side * 4.5, 6.95, rz * 0.85),
        new THREE.Vector3(side * 5.8, 7.2, rz),
      ]);
      const riser = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(riserCurve, 16, 0.21, 10, false)), matPipeSteam);
      sepGroup.add(riser);
    }
  }
  tagTarget(sepGroup, 'separators', interactables);
  reactorGroup.add(sepGroup);

  // ---- 4. MAIN CIRCULATION PUMPS ГЦН-A & ГЦН-B (COMPOSITE INDUSTRIAL ASSEMBLIES) ----
  const finGeo = trackGeo(new THREE.BoxGeometry(0.08, 1.45, 0.16));
  const vaneShape = new THREE.Shape();
  vaneShape.moveTo(0, -0.05);
  vaneShape.quadraticCurveTo(0.24, 0.08, 0.34, 0.02);
  vaneShape.lineTo(0.32, -0.07);
  vaneShape.quadraticCurveTo(0.18, -0.02, 0, -0.1);
  vaneShape.closePath();
  const vaneGeo = trackGeo(
    new THREE.ExtrudeGeometry(vaneShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    }),
  );

  function buildPump(side: -1 | 1, id: InspectTargetId) {
    const pGroup = new THREE.Group();
    pGroup.position.set(side * 6.2, 0, 2.3);

    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.42, 2.1)), matConcrete);
    plinth.position.y = 0.21;
    pGroup.add(plinth);

    const baseFlange = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.0, 1.05, 0.16, 16)), matSteelDark);
    baseFlange.position.y = 0.5;
    pGroup.add(baseFlange);

    const volute = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.84, 0.92, 1.15, 18)), matPipeBlue);
    volute.position.y = 1.12;
    pGroup.add(volute);

    const voluteRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.86, 0.07, 8, 20)), matSteelBright);
    voluteRim.rotation.x = Math.PI / 2;
    voluteRim.position.y = 1.72;
    pGroup.add(voluteRim);

    const motor = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.62, 0.68, 1.55, 16)), matSteelDark);
    motor.position.y = 2.52;
    pGroup.add(motor);

    // 8 radial cooling fins around the motor housing
    for (let f = 0; f < 8; f++) {
      const ang = (f * Math.PI) / 4;
      const fin = new THREE.Mesh(finGeo, matSteelBright);
      fin.position.set(Math.sin(ang) * 0.67, 2.52, Math.cos(ang) * 0.67);
      fin.rotation.y = ang;
      pGroup.add(fin);
    }

    const flywheelCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.62, 0.28, 16)), matSteelBright);
    flywheelCap.position.y = 3.42;
    pGroup.add(flywheelCap);

    const lampMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2f9e5a,
        emissive: 0x2f9e5a,
        emissiveIntensity: 1.3,
        roughness: 0.25,
      }),
    );
    const beacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 12, 10)), lampMat);
    beacon.position.y = 3.72;
    pGroup.add(beacon);

    // Cutaway sight-ring housing with 6 curved ExtrudeGeometry impeller vanes
    const sightRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.46, 0.06, 8, 18)), matBrass);
    sightRing.position.set(0, 1.12, 0.85);
    pGroup.add(sightRing);

    const impeller = new THREE.Group();
    impeller.position.set(0, 1.12, 0.84);
    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 10)), matSteelBright);
    hub.rotation.x = Math.PI / 2;
    impeller.add(hub);
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(vaneGeo, matSteelBright);
      blade.rotation.z = (b * Math.PI) / 3;
      impeller.add(blade);
    }
    pGroup.add(impeller);

    // Downcomer pipe from separator to pump & pump to lower collector
    const feedCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 5.8 - side * 6.2, 7.2, -1.8),
      new THREE.Vector3(0, 5.1, -1.0),
      new THREE.Vector3(0, 1.3, 0),
    ]);
    const feedPipe = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(feedCurve, 16, 0.18, 8, false)), matPipeBlue);
    pGroup.add(feedPipe);

    const toCoreCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.85, 0),
      new THREE.Vector3(-side * 1.4, 0.55, -0.8),
      new THREE.Vector3(-side * 2.8, 0.55, -2.3),
    ]);
    const corePipe = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(toCoreCurve, 12, 0.2, 8, false)), matPipeBlue);
    pGroup.add(corePipe);

    tagTarget(pGroup, id, interactables);
    reactorGroup.add(pGroup);
    return { pGroup, impeller, lampMat };
  }

  const pumpA = buildPump(-1, 'pumpA');
  const pumpB = buildPump(1, 'pumpB');

  // ---- 5. BORON INJECTION TANK & САОР ECCS MANIFOLD (LATHE PRESSURE VESSELS) ----
  const vesselProfile = [
    new THREE.Vector2(0.0, 0.45),
    new THREE.Vector2(0.55, 0.52),
    new THREE.Vector2(0.76, 0.82),
    new THREE.Vector2(0.76, 2.75),
    new THREE.Vector2(0.55, 3.05),
    new THREE.Vector2(0.0, 3.15),
  ];
  const vesselGeo = trackGeo(new THREE.LatheGeometry(vesselProfile, 18));

  function buildPressureTank(
    x: number,
    z: number,
    bodyMat: THREE.Material,
    glowHex: number,
    id: InspectTargetId,
    pipeTargetX: number,
  ) {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);

    const pad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.24, 1.9)), matConcrete);
    pad.position.y = 0.12;
    grp.add(pad);

    for (const lx of [-0.52, 0.52]) {
      for (const lz of [-0.52, 0.52]) {
        const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.07, 0.09, 0.75, 8)), matSteelDark);
        leg.position.set(lx, 0.5, lz);
        grp.add(leg);
      }
    }

    const tankBody = new THREE.Mesh(vesselGeo, bodyMat);
    grp.add(tankBody);

    const girth = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.78, 0.05, 8, 20)), matSteelBright);
    girth.rotation.x = Math.PI / 2;
    girth.position.y = 1.8;
    grp.add(girth);

    // Illuminated vertical sight-glass level tube
    const sightMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: glowHex,
        emissive: glowHex,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      }),
    );
    const sightTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 1.65, 8)), sightMat);
    sightTube.position.set(0, 1.8, 0.82);
    grp.add(sightTube);

    // Isolation valve wheel on front pipe
    const valveWheel = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.22, 0.04, 6, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xc83228, roughness: 0.4 })),
    );
    valveWheel.position.set(pipeTargetX * 0.25, 0.85, 0.75);
    grp.add(valveWheel);

    const pipe = new THREE.Mesh(
      trackGeo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(pipeTargetX * 0.25, 0.65, 0.4),
            new THREE.Vector3(pipeTargetX * 0.65, 0.55, 1.4),
            new THREE.Vector3(pipeTargetX, 0.55, 2.7),
          ]),
          12,
          0.14,
          8,
          false,
        ),
      ),
      bodyMat,
    );
    grp.add(pipe);

    tagTarget(grp, id, interactables);
    reactorGroup.add(grp);
    return grp;
  }

  buildPressureTank(-6.6, -3.3, matBoronPurple, 0xb287ff, 'boronTank', 3.4);
  buildPressureTank(6.5, -3.3, matEccsCyan, 0x45d6ff, 'eccsPipe', -3.3);

  // ---- 6. TURBINE HALL: К-1000-60/1500 ТГ-8 & БРУ-К STEAM DUMP (x = +8.4) ----
  const turbineHall = new THREE.Group();
  turbineHall.position.set(8.4, 0, -0.5);
  root.add(turbineHall);

  const steamHeaderCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(reactorX + 5.8, 7.2, reactorZ),
    new THREE.Vector3(4.2, 7.2, -0.5),
    new THREE.Vector3(5.6, 3.8, -0.5),
    new THREE.Vector3(6.2, 2.35, -0.5),
  ]);
  const steamHeader = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(steamHeaderCurve, 24, 0.25, 10, false)), matPipeSteam);
  root.add(steamHeader);

  const turbShadow = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(5.8, 28)), matShadowDisc);
  turbShadow.rotation.x = -Math.PI / 2;
  turbShadow.position.y = 0.02;
  turbineHall.add(turbShadow);

  const turbineGroup = new THREE.Group();

  // Portal-frame concrete foundation piers (leaving authentic condenser bay underneath)
  const turbDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.0, 0.42, 3.4)), matConcrete);
  turbDeck.position.y = 1.15;
  turbineGroup.add(turbDeck);
  const pierGeo = trackGeo(new THREE.BoxGeometry(1.15, 0.95, 3.2));
  for (const px of [-3.6, -1.2, 1.2, 3.6]) {
    const pier = new THREE.Mesh(pierGeo, matConcrete);
    pier.position.set(px, 0.475, 0);
    turbineGroup.add(pier);
  }
  const condenserDrum = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 0.65, 4.4, 14)), matSteelDark);
  condenserDrum.rotation.z = Math.PI / 2;
  condenserDrum.position.set(-0.4, 0.55, 0);
  turbineGroup.add(condenserDrum);

  // Cutaway HP + LP turbine casings with bolted horizontal flange lips
  const hpCasing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.02, 1.18, 2.5, 20, 1, true, 0, Math.PI * 1.28)),
    matSteelDark,
  );
  hpCasing.rotation.z = Math.PI / 2;
  hpCasing.position.set(-2.2, 2.15, 0);
  turbineGroup.add(hpCasing);

  const lpCasing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.48, 1.48, 2.9, 20, 1, true, 0, Math.PI * 1.28)),
    matSteelDark,
  );
  lpCasing.rotation.z = Math.PI / 2;
  lpCasing.position.set(0.65, 2.15, 0);
  turbineGroup.add(lpCasing);

  // Horizontal bolted cutaway flange bars
  const flangeLip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.5, 0.14, 0.26)), matSteelBright);
  flangeLip.position.set(-0.75, 2.15, 1.22);
  turbineGroup.add(flangeLip);

  // Multi-stage spinning turbine rotor with conical shaft + copper shrouds + 10 angled airfoil blades per stage
  const turbRotor = new THREE.Group();
  turbRotor.position.set(-0.6, 2.15, 0);
  const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 7.6, 14)), matSteelBright);
  shaft.rotation.z = Math.PI / 2;
  turbRotor.add(shaft);

  for (let st = 0; st < 7; st++) {
    const sx = -2.6 + st * 0.66;
    const rad = st < 3 ? 0.72 + st * 0.12 : 1.15 + (st - 3) * 0.08;
    const disc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(rad * 0.48, rad * 0.48, 0.14, 14)), matCopper);
    disc.rotation.z = Math.PI / 2;
    disc.position.x = sx;
    turbRotor.add(disc);
    const bladeGeo = trackGeo(new THREE.BoxGeometry(0.055, rad * 1.85, 0.14));
    for (let b = 0; b < 10; b++) {
      const blade = new THREE.Mesh(bladeGeo, matSteelBright);
      blade.position.x = sx;
      blade.rotation.x = (b * Math.PI) / 5;
      blade.rotation.y = 0.28;
      turbRotor.add(blade);
    }
  }
  turbineGroup.add(turbRotor);

  // Ribbed Blue Generator Stator + Copper Brushless Exciter
  const genStator = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.36, 1.36, 2.25, 20)), matPipeBlue);
  genStator.rotation.z = Math.PI / 2;
  genStator.position.set(3.15, 2.15, 0);
  turbineGroup.add(genStator);

  for (const gx of [2.35, 3.15, 3.95]) {
    const rib = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.39, 0.06, 8, 22)), matSteelDark);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(gx, 2.15, 0);
    turbineGroup.add(rib);
  }

  const exciter = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.72, 0.78, 0.85, 16)), matCopper);
  exciter.rotation.z = Math.PI / 2;
  exciter.position.set(4.65, 2.15, 0);
  turbineGroup.add(exciter);

  const turbLampMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: 0x2f9e5a,
      emissiveIntensity: 0,
      roughness: 0.25,
    }),
  );
  const turbLamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.22, 12, 10)), turbLampMat);
  turbLamp.position.set(3.15, 3.72, 0);
  turbineGroup.add(turbLamp);

  tagTarget(turbineGroup, 'turbine', interactables);
  turbineHall.add(turbineGroup);

  // БРУ-К Steam Dump Valve (Lathe conical diffuser + rising stem + red handwheel) & Pooled Steam Plume
  const brukGroup = new THREE.Group();
  brukGroup.position.set(-3.4, 0, 3.0);
  const brukProfile = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.72, 0),
    new THREE.Vector2(0.66, 0.35),
    new THREE.Vector2(0.55, 1.35),
    new THREE.Vector2(0.68, 1.55),
    new THREE.Vector2(0.45, 1.68),
    new THREE.Vector2(0.0, 1.68),
  ];
  const brukBody = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(brukProfile, 18)), matPipeSteam);
  brukGroup.add(brukBody);
  for (const vx of [-0.26, 0.26]) {
    const yoke = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.58, 8)), matSteelBright);
    yoke.position.set(vx, 1.92, 0);
    brukGroup.add(yoke);
  }
  const brukWheelAsm = new THREE.Group();
  brukWheelAsm.position.set(0, 2.18, 0);
  const brukStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8)), matBrass);
  brukStem.position.y = -0.22;
  brukWheelAsm.add(brukStem);
  const brukWheel = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.54, 0.08, 8, 18)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xc83228, roughness: 0.38, metalness: 0.32 })),
  );
  brukWheel.rotation.x = Math.PI / 2;
  brukWheelAsm.add(brukWheel);
  const brukSpoke = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.04, 0.06, 0.08)), matSteelDark);
  brukWheelAsm.add(brukSpoke);
  brukGroup.add(brukWheelAsm);

  tagTarget(brukGroup, 'bruK', interactables);
  turbineHall.add(brukGroup);

  // Steam dump pooled particles
  const steamCount = 48;
  const steamGeo = trackGeo(new THREE.PlaneGeometry(1.4, 1.4));
  const matSteam = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.steamPuffMap,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const steamInstanced = new THREE.InstancedMesh(steamGeo, matSteam, steamCount);
  steamInstanced.frustumCulled = false;
  const steamSeeds = Array.from({ length: steamCount }, () => ({
    phase: Math.random(),
    dx: (Math.random() - 0.5) * 0.9,
    dz: (Math.random() - 0.5) * 0.9,
    speed: 0.35 + Math.random() * 0.45,
  }));
  brukGroup.add(steamInstanced);

  // ---- 7. BEVELED BShU-4 CONTROL DESK VIGNETTE & COMRADE WHISKERS (z = +8.8) ----
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(1.0, 0.28, 8.8);
  root.add(consoleGroup);

  const deskDais = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.8, 0.28, 3.0)), matConcrete);
  deskDais.position.set(0, -0.14, 0.1);
  consoleGroup.add(deskDais);

  // Extruded side profile for ergonomic Soviet BShU-4 operator desk with chamfered knee-well
  const deskSideShape = new THREE.Shape();
  deskSideShape.moveTo(-1.05, 0);
  deskSideShape.lineTo(0.85, 0);
  deskSideShape.lineTo(0.85, 0.72);
  deskSideShape.lineTo(1.02, 0.96);
  deskSideShape.lineTo(0.92, 1.18);
  deskSideShape.lineTo(-0.78, 1.44);
  deskSideShape.lineTo(-1.05, 1.44);
  deskSideShape.closePath();

  const deskBodyGeo = trackGeo(
    new THREE.ExtrudeGeometry(deskSideShape, {
      depth: 6.0,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    }),
  );
  // Rotate so profile runs along Z and extrudes along X centered at 0
  deskBodyGeo.rotateY(Math.PI / 2);
  deskBodyGeo.translate(-3.0, 0, 0);
  const deskBodyMesh = new THREE.Mesh(deskBodyGeo, matSageConsole);
  deskBodyMesh.castShadow = !isSoftwareGl;
  deskBodyMesh.receiveShadow = !isSoftwareGl;
  consoleGroup.add(deskBodyMesh);

  // Angled mnemonic control faceplate
  const deskTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.8, 0.08, 1.72)), matConsoleFace);
  deskTop.position.set(0, 1.31, 0.08);
  deskTop.rotation.x = 0.155;
  consoleGroup.add(deskTop);

  // Upper recessed dark instrument hood with backlit analog dials & annunciator grid
  const deskHood = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.05, 0.68, 0.42)), matSageConsole);
  deskHood.position.set(0, 1.68, -0.84);
  consoleGroup.add(deskHood);

  const hoodFace = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(5.75, 0.56)), matDeskHoodPanel);
  hoodFace.position.set(0, 1.68, -0.625);
  consoleGroup.add(hoodFace);

  // Tactile row of physical pushbuttons on the left rod & boron bays
  const btnCols = [0x3d8b4a, 0x3d8b4a, 0xd8a020, 0x9b6ed8, 0x36a2cf];
  for (let i = 0; i < btnCols.length; i++) {
    const bMat = trackMat(new THREE.MeshStandardMaterial({ color: btnCols[i], roughness: 0.35 }));
    const btn = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.065, 0.072, 0.08, 10)), bMat);
    const bx = i < 2 ? -2.35 + i * 0.28 : i === 2 ? -1.8 : 1.05 + (i - 3) * 0.32;
    btn.position.set(bx, 1.37, 0.2);
    btn.rotation.x = 0.155;
    consoleGroup.add(btn);
  }

  // Interactive 3D АЗ-5 Button + Hinged Yellow Cover on right end of desk
  const az5Housing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.12, 0.68)), matSteelDark);
  az5Housing.position.set(2.15, 1.37, 0.15);
  az5Housing.rotation.x = 0.155;
  consoleGroup.add(az5Housing);

  const matAz5Red = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd83a2e,
      emissive: 0x6b0b05,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.15,
    }),
  );
  const az5Button = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.25, 0.14, 18)), matAz5Red);
  az5Button.position.set(2.15, 1.44, 0.16);
  az5Button.rotation.x = 0.155;
  tagTarget(az5Button, 'az5Button', interactables);
  consoleGroup.add(az5Button);

  const az5CoverPivot = new THREE.Group();
  az5CoverPivot.position.set(2.15, 1.5, -0.14);
  az5CoverPivot.rotation.x = 0.155;
  const matYellowCover = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf4c430,
      transparent: true,
      opacity: 0.62,
      roughness: 0.18,
      metalness: 0.05,
    }),
  );
  const az5CoverLid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.64, 0.06, 0.62)), matYellowCover);
  az5CoverLid.position.set(0, 0.03, 0.31);
  az5CoverPivot.add(az5CoverLid);
  tagTarget(az5CoverPivot, 'az5Cover', interactables);
  consoleGroup.add(az5CoverPivot);

  // Interactive 3D Brass-Trimmed Turbine Key Switch
  const turbKeyPivot = new THREE.Group();
  turbKeyPivot.position.set(0.2, 1.38, 0.15);
  turbKeyPivot.rotation.x = 0.155;
  const keyBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 16)), matSteelDark);
  turbKeyPivot.add(keyBase);
  const keyBlade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.16, 0.26)), matBrass);
  keyBlade.position.y = 0.11;
  turbKeyPivot.add(keyBlade);
  tagTarget(turbKeyPivot, 'turbine', interactables);
  consoleGroup.add(turbKeyPivot);

  // Interactive 3D Pump Switches on console with toggle guards
  const swAPivot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.22, 0.14)), matSteelBright);
  swAPivot.position.set(-1.1, 1.4, 0.15);
  tagTarget(swAPivot, 'pumpA', interactables);
  consoleGroup.add(swAPivot);

  const swBPivot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.22, 0.14)), matSteelBright);
  swBPivot.position.set(-0.55, 1.4, 0.15);
  tagTarget(swBPivot, 'pumpB', interactables);
  consoleGroup.add(swBPivot);

  // Green Soviet Gooseneck Desk Lamp + Warm Light Pool over Comrade Whiskers
  const lampGroup = new THREE.Group();
  lampGroup.position.set(-2.72, 1.98, -0.78);
  const lampBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.17, 0.08, 12)), matSteelDark);
  lampGroup.add(lampBase);
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, 0),
    new THREE.Vector3(0.04, 0.34, 0.18),
    new THREE.Vector3(0.18, 0.32, 0.45),
  ]);
  const lampNeck = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(neckCurve, 10, 0.025, 6, false)), matBrass);
  lampGroup.add(lampNeck);
  const lampShade = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.18, 0.22, 14, 1, true)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x1d6b38, roughness: 0.32, side: THREE.DoubleSide })),
  );
  lampShade.position.set(0.18, 0.26, 0.48);
  lampShade.rotation.x = 0.35;
  lampGroup.add(lampShade);
  const deskLampLight = new THREE.PointLight(0xffcf82, 1.35, 5.5, 1.8);
  deskLampLight.position.set(0.18, 0.12, 0.5);
  lampGroup.add(deskLampLight);
  consoleGroup.add(lampGroup);

  // Ceramic Soviet Coffee Mug ("КРУЖКА")
  const mug = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.09, 0.08, 0.17, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xd9d2bc, roughness: 0.38 })),
  );
  mug.position.set(-1.58, 1.35, 0.52);
  consoleGroup.add(mug);

  // Comrade Whiskers (tabby fur coat + folded blueprint mat + perkable ears!)
  const whiskers = new THREE.Group();
  whiskers.position.set(-2.28, 1.32, 0.45);
  const catMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.tabbyFurMap, roughness: 0.88 }));
  const catBelly = trackMat(new THREE.MeshStandardMaterial({ color: 0xead5b7, roughness: 0.92 }));
  const catMatPad = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.68, 0.025, 0.52)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x2f4d6b, roughness: 0.85 })),
  );
  catMatPad.position.set(0.02, -0.09, 0.04);
  whiskers.add(catMatPad);

  const catBody = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.26, 14, 10)), catMat);
  catBody.scale.set(1.25, 0.65, 0.95);
  whiskers.add(catBody);

  const catHeadGroup = new THREE.Group();
  catHeadGroup.position.set(0.25, 0.08, 0.05);
  const catHead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.15, 12, 10)), catMat);
  catHeadGroup.add(catHead);
  for (const ez of [-0.07, 0.07]) {
    const ear = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.048, 0.11, 4)), catBelly);
    ear.position.set(0, 0.13, ez);
    catHeadGroup.add(ear);
  }
  whiskers.add(catHeadGroup);

  const catTail = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.22, 0.036, 6, 14, Math.PI * 1.15)), catMat);
  catTail.rotation.x = Math.PI / 2;
  catTail.position.set(-0.05, 0.02, 0.06);
  whiskers.add(catTail);
  tagTarget(whiskers, 'whiskers', interactables);
  consoleGroup.add(whiskers);

  // ---- 8. EXPLOSION / MELTDOWN BLAST WAVE, FIREBALL, SMOKE PLUMES & SKYBEAM ----
  const debrisCount = 84;
  const debrisGeo = trackGeo(new THREE.BoxGeometry(0.48, 0.36, 0.48));
  const matDebris = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x221b18,
      emissive: 0xff5a00,
      emissiveIntensity: 2.2,
      roughness: 0.75,
    }),
  );
  const debrisInstanced = new THREE.InstancedMesh(debrisGeo, matDebris, debrisCount);
  debrisInstanced.visible = false;
  debrisInstanced.frustumCulled = false;
  const debrisSeeds = Array.from({ length: debrisCount }, () => {
    const ang = Math.random() * Math.PI * 2;
    const spd = 5.5 + Math.random() * 9.5;
    const startR = 1.2 + Math.random() * 2.2;
    return {
      sx: Math.cos(ang) * startR,
      sz: Math.sin(ang) * startR,
      vx: Math.cos(ang) * spd,
      vy: 8.5 + Math.random() * 12.5,
      vz: Math.sin(ang) * spd,
      rx: 2.5 + Math.random() * 6.5,
      rz: 2.5 + Math.random() * 6.5,
      phase: Math.random() * 0.14,
      scale: 0.65 + Math.random() * 0.8,
    };
  });
  reactorGroup.add(debrisInstanced);

  // Two-layer fireball: fiery outer shell + blinding white-yellow plasma core
  const matBlast = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff6200,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  const blastFireball = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.0, 22, 16)), matBlast);
  blastFireball.position.y = 6.2;
  blastFireball.visible = false;
  reactorGroup.add(blastFireball);

  const matBlastCore = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfff0b0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const blastCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.0, 18, 12)), matBlastCore);
  blastCore.position.y = 6.2;
  blastCore.visible = false;
  reactorGroup.add(blastCore);

  // Expanding floor shockwave ring sweeping past the hall & console
  const matShockwave = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff8c28,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  const shockwaveRing = new THREE.Mesh(trackGeo(new THREE.RingGeometry(1.6, 3.2, 36)), matShockwave);
  shockwaveRing.rotation.x = -Math.PI / 2;
  shockwaveRing.position.y = 0.35;
  shockwaveRing.visible = false;
  reactorGroup.add(shockwaveRing);

  // Turbulent fire-and-soot plumes billowing above blown reactor cavity
  const expSmokeCount = 38;
  const expSmokeGeo = trackGeo(new THREE.PlaneGeometry(3.8, 3.8));
  const matExpSmoke = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.steamPuffMap,
      color: 0xff6e24,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const expSmokeInstanced = new THREE.InstancedMesh(expSmokeGeo, matExpSmoke, expSmokeCount);
  expSmokeInstanced.visible = false;
  expSmokeInstanced.frustumCulled = false;
  const expSmokeSeeds = Array.from({ length: expSmokeCount }, (_, i) => {
    const ang = (i / expSmokeCount) * Math.PI * 2 + Math.random() * 0.5;
    return {
      dx: Math.cos(ang) * (0.6 + Math.random() * 2.8),
      dz: Math.sin(ang) * (0.6 + Math.random() * 2.8),
      phase: Math.random(),
      speed: 0.32 + Math.random() * 0.38,
      scale: 0.9 + Math.random() * 1.4,
    };
  });
  reactorGroup.add(expSmokeInstanced);

  const matBeam = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x2a8cff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const ionizingBeam = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.7, 3.2, 24, 18, 1, true)), matBeam);
  ionizingBeam.position.y = 14;
  ionizingBeam.visible = false;
  reactorGroup.add(ionizingBeam);

  const matBeamCore = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xa4e6ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const ionizingBeamCore = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 1.25, 24, 14, 1, true)), matBeamCore);
  ionizingBeamCore.position.y = 14;
  ionizingBeamCore.visible = false;
  reactorGroup.add(ionizingBeamCore);

  // ---- CAMERA PRESETS (calibrated for open center viewport between wings) ----
  const cameraAnchors: RbmkSceneRig['cameraAnchors'] = {
    overview: { pos: new THREE.Vector3(3.6, 13.4, 32.5), target: new THREE.Vector3(3.4, 2.7, 1.4) },
    core: { pos: new THREE.Vector3(-3.2, 5.4, 13.0), target: new THREE.Vector3(reactorX, 3.5, reactorZ) },
    turbine: { pos: new THREE.Vector3(8.4, 5.4, 11.4), target: new THREE.Vector3(8.4, 2.0, -0.5) },
    console: { pos: new THREE.Vector3(1.0, 4.5, 16.5), target: new THREE.Vector3(1.0, 0.75, 8.8) },
    explosion: { pos: new THREE.Vector3(2.0, 7.6, 18.2), target: new THREE.Vector3(reactorX + 0.6, 5.4, reactorZ) },
  };

  let coverAngle = 0;
  let keyAngle = 0;
  let explodeTimer = 0;
  let whiskersPerkTimer = 0;

  function triggerWhiskersPerk() {
    whiskersPerkTimer = 1.4;
  }

  function updateFromState(
    s: ReactorState,
    dt: number,
    elapsed: number,
    hoveredId: InspectTargetId | null,
    hasActiveAlarm = false,
  ) {
    const pf = Math.max(0, Math.min(1, s.P / 2600));
    const tempNorm = Math.max(0, Math.min(1, (s.Tf - 300) / 2200));

    // Fuel channels glow with thermal & Cherenkov power
    matFuelInst.emissiveIntensity = s.exploded ? 2.4 : 0.08 + pf * 1.65 + tempNorm * 1.2;
    _tmpCol.setRGB(1.0, 0.35 + (1 - tempNorm) * 0.35, 0.05 + (s.rho > 480 ? 0.55 : 0));
    matFuelInst.emissive.copy(_tmpCol);

    coreLight.intensity = s.exploded ? 6.5 : 0.8 + pf * 5.2;
    coreLight.color.setRGB(1.0, 0.42 + (1 - tempNorm) * 0.25, 0.12);

    const tipSurgeActive = Boolean(s.scram && s.sT < 5 && s.rP < 40);
    cherenkovLight.intensity = s.exploded ? 5.0 : tipSurgeActive ? 4.5 : s.rho > 480 ? 2.8 : pf * 0.7;

    matCoreGlow.opacity = s.exploded ? 0.48 : 0.06 + pf * 0.28 + (tipSurgeActive ? 0.2 : 0);
    matCoreGlow.color.setHex(tipSurgeActive || s.exploded ? 0x4ca6ff : 0xff6a00);

    // Wall emergency klaxon beacon flash during red alarms
    const klaxonFlash = hasActiveAlarm || s.exploded ? 0.45 + Math.abs(Math.sin(elapsed * 5.5)) * 1.85 : 0.12;
    for (const kl of beaconLenses) {
      kl.emissiveIntensity = klaxonFlash;
    }

    // Control rods & black graphite tips move vertically with s.r
    const rodFrac = s.r / 100;
    const absorberY = 6.9 - rodFrac * 3.7;
    const tipY = absorberY - 2.32;
    const followerY = absorberY + 2.5;

    matAbsorber.emissive.setHex(s.scram ? 0xd83a2e : hoveredId === 'rods' ? 0xe8a317 : 0x000000);
    matAbsorber.emissiveIntensity = s.scram ? 0.55 : hoveredId === 'rods' ? 0.45 : 0;
    matGraphiteTip.emissiveIntensity = tipSurgeActive ? 1.8 : 0.04;

    for (let i = 0; i < rodCount; i++) {
      const [gx, gy] = CORE_CELLS[rodIndices[i]];
      const wx = (gx - 8) * cellSpacing;
      const wz = (gy - 8) * cellSpacing;

      _quat.identity();
      _scale.set(1, 1, 1);

      _pos.set(wx, absorberY, wz);
      _mat4.compose(_pos, _quat, _scale);
      absorberInstanced.setMatrixAt(i, _mat4);

      _pos.set(wx, followerY, wz);
      _mat4.compose(_pos, _quat, _scale);
      followerInstanced.setMatrixAt(i, _mat4);

      _pos.set(wx, tipY, wz);
      _mat4.compose(_pos, _quat, _scale);
      graphiteTipInstanced.setMatrixAt(i, _mat4);
    }
    absorberInstanced.instanceMatrix.needsUpdate = true;
    followerInstanced.instanceMatrix.needsUpdate = true;
    graphiteTipInstanced.instanceMatrix.needsUpdate = true;

    // Stubborn rod "Boris" lags slightly and tilts/shudders
    const borisLag = Math.max(0, Math.min(100, s.r - 6)) / 100;
    borisGroup.position.y = 6.9 - borisLag * 3.7;
    borisGroup.rotation.z = 0.045 + Math.sin(elapsed * 14) * (Math.abs(s.rt - s.r) > 0.5 ? 0.025 : 0.002);

    // Steam void bubbles rising inside active channels
    const activeBubbles = Math.floor(s.V * bubbleCount);
    const riseRate = 0.45 + (s.flow / 100) * 1.45;
    for (let i = 0; i < bubbleCount; i++) {
      if (i >= activeBubbles) {
        _scale.set(0, 0, 0);
        _pos.set(0, -10, 0);
        _quat.identity();
        _mat4.compose(_pos, _quat, _scale);
      } else {
        const b = bubbleSeeds[i];
        const t = (b.phase + elapsed * b.speed * riseRate) % 1;
        _pos.set(b.x, 1.2 + t * 4.2, b.z);
        _quat.identity();
        _scale.setScalar(b.scale * (0.7 + s.V * 0.8));
        _mat4.compose(_pos, _quat, _scale);
      }
      bubbleInstanced.setMatrixAt(i, _mat4);
    }
    bubbleInstanced.instanceMatrix.needsUpdate = true;

    // Pumps ГЦН-A & ГЦН-B impellers & indicator lamps
    const flowFactor = Math.max(0.05, s.flow / 100);
    if (s.pa) pumpA.impeller.rotation.z -= dt * 10 * flowFactor;
    if (s.pb) pumpB.impeller.rotation.z -= dt * 10 * flowFactor;
    pumpA.lampMat.color.setHex(s.pa ? 0x2f9e5a : 0x8f221b);
    pumpA.lampMat.emissive.setHex(s.pa ? 0x2f9e5a : 0x8f221b);
    pumpA.lampMat.emissiveIntensity = s.pa ? 1.4 : 0.4;
    pumpB.lampMat.color.setHex(s.pb ? 0x2f9e5a : 0x8f221b);
    pumpB.lampMat.emissive.setHex(s.pb ? 0x2f9e5a : 0x8f221b);
    pumpB.lampMat.emissiveIntensity = s.pb ? 1.4 : 0.4;

    // Turbine rotor & indicator
    turbRotor.rotation.x += dt * (2.5 + s.turbRpm * 24);
    turbLampMat.emissiveIntensity = s.turb ? 1.6 : 0.1;
    turbLampMat.emissive.setHex(s.turb ? 0x2f9e5a : s.ph >= 1 ? 0xe8a317 : 0x222222);

    // БРУ-К handwheel spin + rising stem + steam plume
    brukWheelAsm.rotation.y = -(s.valve / 100) * Math.PI * 3;
    brukWheelAsm.position.y = 2.08 + (s.valve / 100) * 0.24;
    const steamAmount = (s.valve / 100) * Math.min(1, s.p / 25);
    const activeSteam = Math.floor(steamAmount * steamCount);
    for (let i = 0; i < steamCount; i++) {
      if (i >= activeSteam) {
        _scale.set(0, 0, 0);
        _pos.set(0, -10, 0);
        _quat.identity();
        _mat4.compose(_pos, _quat, _scale);
      } else {
        const st = steamSeeds[i];
        const age = (st.phase + elapsed * st.speed) % 1;
        const spread = age * 1.4;
        _pos.set(st.dx * spread, 2.3 + age * 6.5, st.dz * spread);
        _quat.identity();
        _scale.setScalar(0.55 + age * 2.1);
        _mat4.compose(_pos, _quat, _scale);
      }
      steamInstanced.setMatrixAt(i, _mat4);
    }
    steamInstanced.instanceMatrix.needsUpdate = true;

    // 3D Control Desk animations (AZ-5 cover, Turbine Key, Pump Switches, Comrade Whiskers)
    const targetCoverAngle = s.coverOpen ? -1.75 : 0;
    coverAngle = THREE.MathUtils.damp(coverAngle, targetCoverAngle, 12, dt);
    az5CoverPivot.rotation.x = 0.155 + coverAngle;

    const targetKeyAngle = s.turb ? -Math.PI / 2 : 0;
    keyAngle = THREE.MathUtils.damp(keyAngle, targetKeyAngle, 14, dt);
    turbKeyPivot.rotation.y = keyAngle;

    swAPivot.rotation.x = s.pa ? -0.35 : 0.45;
    swBPivot.rotation.x = s.pb ? -0.35 : 0.45;

    matAz5Red.emissiveIntensity = s.scram ? 1.5 : hoveredId === 'az5Button' ? 0.95 : 0.4;

    // Comrade Whiskers sleep breathing + perk reaction when clicked
    const breath = 1 + Math.sin(elapsed * 2.1) * 0.045;
    catBody.scale.set(1.25, 0.65 * breath, 0.95);
    if (whiskersPerkTimer > 0) {
      whiskersPerkTimer = Math.max(0, whiskersPerkTimer - dt);
      catHeadGroup.position.y = 0.08 + Math.sin(whiskersPerkTimer * Math.PI) * 0.07;
      catHeadGroup.rotation.z = Math.sin(elapsed * 14) * 0.08;
    } else {
      catHeadGroup.position.y = 0.08;
      catHeadGroup.rotation.z = 0;
    }

    // Catastrophic Multi-Stage Reactor Explosion, Elena Launch, Fireball, Smoke & Skybeam
    if (s.exploded) {
      explodeTimer += dt;

      // Stage 1: Two-layer blast fireball & sweeping floor shockwave ring (0..1.55s)
      if (explodeTimer < 1.55) {
        const bf = explodeTimer / 1.55;
        blastFireball.visible = true;
        blastFireball.scale.setScalar(2.8 + bf * 7.4);
        blastFireball.position.y = 6.2 + bf * 5.2;
        matBlast.color.setRGB(1.0, Math.max(0.18, 0.55 - bf * 0.45), Math.max(0.02, 0.14 - bf * 0.14));
        matBlast.opacity = Math.max(0, (1 - bf * bf) * 0.88);
      } else {
        blastFireball.visible = false;
      }

      if (explodeTimer < 1.05) {
        const cf = explodeTimer / 1.05;
        blastCore.visible = true;
        blastCore.scale.setScalar(2.1 + cf * 5.2);
        blastCore.position.y = 6.2 + cf * 3.8;
        matBlastCore.opacity = Math.max(0, (1 - cf) * 0.95);
      } else {
        blastCore.visible = false;
      }

      if (explodeTimer < 1.25) {
        const sf = explodeTimer / 1.25;
        shockwaveRing.visible = true;
        shockwaveRing.scale.setScalar(1.2 + sf * 7.2);
        matShockwave.opacity = Math.max(0, (1 - sf) * 0.92);
      } else {
        shockwaveRing.visible = false;
      }

      // Stage 2: Smooth parabolic launch of 2,000-ton Elena shield lid (starts at y=6.25 -> peak ~11.2 -> slams rim at y=8.75)
      if (explodeTimer < 1.25) {
        const arcY = 6.25 + 13.5 * explodeTimer - 9.2 * explodeTimer * explodeTimer;
        elenaPivot.position.y = arcY;
      } else {
        const settleT = explodeTimer - 1.25;
        const settleBounce = Math.abs(Math.sin(settleT * 9)) * Math.exp(-settleT * 3.6) * 0.52;
        elenaPivot.position.y = 8.75 + settleBounce;
      }
      const rotProgress = Math.min(1, explodeTimer / 1.15);
      elenaPivot.position.x = rotProgress * 1.65;
      elenaPivot.position.z = -rotProgress * 0.4;
      elenaPivot.rotation.z = -rotProgress * 0.82;
      elenaPivot.rotation.x = rotProgress * 0.34;

      // Overhead RZM refueling machine recoils from the blast wave
      rzmGroup.rotation.x = Math.sin(explodeTimer * 5.4) * Math.exp(-explodeTimer * 0.65) * 0.3;
      rzmGroup.rotation.z = Math.cos(explodeTimer * 4.6) * Math.exp(-explodeTimer * 0.65) * 0.16;

      // Stage 3: Cherenkov ionizing skybeam & thick billowing fire-to-soot plume
      const beamAlpha = Math.min(1, Math.max(0, (explodeTimer - 0.15) / 0.45));
      ionizingBeam.visible = beamAlpha > 0.01;
      ionizingBeamCore.visible = beamAlpha > 0.01;
      matBeam.opacity = beamAlpha * (0.58 + Math.sin(elapsed * 11) * 0.12);
      matBeamCore.opacity = beamAlpha * (0.78 + Math.cos(elapsed * 14) * 0.14);

      coreLight.intensity = 7.5 + Math.max(0, 1 - explodeTimer * 0.5) * 11.0;

      expSmokeInstanced.visible = true;
      const smokeCool = Math.min(1, explodeTimer / 3.2);
      matExpSmoke.color.setRGB(1.0 - smokeCool * 0.72, 0.45 - smokeCool * 0.28, 0.15 + smokeCool * 0.04);
      for (let i = 0; i < expSmokeCount; i++) {
        const sp = expSmokeSeeds[i];
        const age = (sp.phase + explodeTimer * sp.speed) % 1;
        const spread = 0.55 + age * 2.4;
        _pos.set(sp.dx * spread, 5.2 + age * 10.5, sp.dz * spread);
        _quat.identity();
        _scale.setScalar(sp.scale * (0.75 + age * 1.8));
        _mat4.compose(_pos, _quat, _scale);
        expSmokeInstanced.setMatrixAt(i, _mat4);
      }
      expSmokeInstanced.instanceMatrix.needsUpdate = true;

      // Ballistic glowing graphite & structural debris chunks arcing out over the hall floor
      debrisInstanced.visible = true;
      for (let i = 0; i < debrisCount; i++) {
        const d = debrisSeeds[i];
        const rawT = Math.max(0, explodeTimer - d.phase);
        const age = rawT < 2.6 ? rawT : 2.6 + ((rawT - 2.6) % 2.4);
        const yPos = 6.4 + d.vy * age - 5.2 * age * age;
        const landed = yPos <= 0.34;
        _pos.set(d.sx + d.vx * age * 0.78, Math.max(0.34, yPos), d.sz + d.vz * age * 0.78);
        _euler.set(landed ? 0.2 : elapsed * d.rx, landed ? d.phase * 8 : elapsed * 2.1, landed ? 0.15 : elapsed * d.rz);
        _quat.setFromEuler(_euler);
        _scale.setScalar(d.scale);
        _mat4.compose(_pos, _quat, _scale);
        debrisInstanced.setMatrixAt(i, _mat4);
      }
      debrisInstanced.instanceMatrix.needsUpdate = true;
    } else {
      explodeTimer = 0;
      elenaPivot.position.set(0, 6.25, 0);
      elenaPivot.rotation.set(0, 0, 0);
      rzmGroup.rotation.set(0, 0, 0);
      blastFireball.visible = false;
      blastCore.visible = false;
      shockwaveRing.visible = false;
      expSmokeInstanced.visible = false;
      ionizingBeam.visible = false;
      ionizingBeamCore.visible = false;
      debrisInstanced.visible = false;
    }
  }

  return {
    root,
    interactables,
    cameraAnchors,
    triggerWhiskersPerk,
    updateFromState,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
