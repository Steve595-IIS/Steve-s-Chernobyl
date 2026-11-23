import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ANNUNCIATORS } from '../sim/physics';
import type { CameraPreset, GameMode, InspectTargetId, ReactorState } from '../sim/types';
import { buildRbmkUnit4Scene } from './rbmkBuilder';
import { createProceduralTextures } from './textures';

export interface ReactorSceneProps {
  simRef: React.MutableRefObject<ReactorState>;
  modeRef: React.MutableRefObject<GameMode>;
  cameraPreset: CameraPreset;
  onSelect3DTarget: (targetId: InspectTargetId) => void;
  onHover3DTarget: (targetId: InspectTargetId | null, clientX: number, clientY: number) => void;
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

export function ReactorScene({
  simRef,
  modeRef,
  cameraPreset,
  onSelect3DTarget,
  onHover3DTarget,
}: ReactorSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const presetRef = useRef<CameraPreset>(cameraPreset);
  const transitionActiveRef = useRef<boolean>(false);
  const selectCbRef = useRef(onSelect3DTarget);
  const hoverCbRef = useRef(onHover3DTarget);

  selectCbRef.current = onSelect3DTarget;
  hoverCbRef.current = onHover3DTarget;

  useEffect(() => {
    if (presetRef.current !== cameraPreset) {
      presetRef.current = cameraPreset;
      transitionActiveRef.current = true;
    }
  }, [cameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('data-testid', 'rbmk-3d-canvas');
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c100b);
    scene.fog = new THREE.FogExp2(0x0c100b, 0.013);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      46,
      (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
      0.1,
      140,
    );

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4.5;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minPolarAngle = 0.14;

    controls.addEventListener('start', () => {
      transitionActiveRef.current = false;
    });

    // 3-point warm/cool industrial hall lighting rig
    const hemi = new THREE.HemisphereLight(0xa8c1d6, 0x2d3226, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffebd0, 1.75);
    keyLight.position.set(12, 18, 14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 48;
    const d = 16;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7ca7d9, 0.72);
    rimLight.position.set(-14, 11, -12);
    scene.add(rimLight);

    const textures = createProceduralTextures(renderer.capabilities.getMaxAnisotropy());
    const rig = buildRbmkUnit4Scene(textures, isSoftwareGl);
    scene.add(rig.root);

    // Initialize camera: if booting in 'title', frame the reactor cutaway on the right half of the viewport
    if (modeRef.current === 'title') {
      camera.position.set(-2.2, 7.0, 16.5);
      controls.target.set(-7.3, 3.4, -0.5);
    } else {
      const initialAnchor = rig.cameraAnchors[presetRef.current];
      camera.position.copy(initialAnchor.pos);
      controls.target.copy(initialAnchor.target);
    }
    controls.update();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    rig.updateFromState(simRef.current, 0, 0, null);
    renderer.render(scene, camera);

    // Raycasting state
    let hoveredId: InspectTargetId | null = null;
    let lastHoverCheck = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (modeRef.current !== 'playing') {
        if (hoveredId !== null) {
          hoveredId = null;
          hoverCbRef.current(null, ev.clientX, ev.clientY);
        }
        return;
      }
      const now = performance.now();
      if (now - lastHoverCheck < 55) return;
      lastHoverCheck = now;

      updateNdc(ev.clientX, ev.clientY);
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObjects(rig.interactables, true);
      const nextId = (hits[0]?.object.userData?.targetId as InspectTargetId | undefined) ?? null;
      if (nextId !== hoveredId) {
        hoveredId = nextId;
        canvas.style.cursor = nextId ? 'pointer' : 'grab';
      }
      hoverCbRef.current(nextId, ev.clientX, ev.clientY);
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (modeRef.current !== 'playing') return;
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6) return; // was an orbit drag, not a click
      updateNdc(ev.clientX, ev.clientY);
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObjects(rig.interactables, true);
      const hitId = hits[0]?.object.userData?.targetId as InspectTargetId | undefined;
      if (hitId) {
        if (hitId === 'whiskers') {
          rig.triggerWhiskersPerk();
        }
        selectCbRef.current(hitId);
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    // Animation loop (paced via afterDraw on software WebGL)
    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let prevMode: GameMode = modeRef.current;
    let explodeTrauma = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, (now - lastTime) / 1000);
      const dt = Math.min(0.05, rawDt);
      const visualDt = simRef.current.exploded ? Math.min(0.18, rawDt) : dt;
      lastTime = now;

      const mode = modeRef.current;
      if (mode !== 'paused') {
        elapsed += visualDt;
      }

      if (prevMode === 'title' && mode === 'playing') {
        transitionActiveRef.current = true;
      }
      if (prevMode !== 'exploding' && mode === 'exploding') {
        transitionActiveRef.current = true;
        explodeTrauma = 1.0;
      }
      if (mode === 'playing' || mode === 'title') {
        explodeTrauma = 0;
      }
      prevMode = mode;

      const s = simRef.current;
      const alarmActive = ANNUNCIATORS.some((a) => a.level(s) === 2);
      hemi.intensity = s.exploded ? 0.36 : 0.85;
      keyLight.intensity = s.exploded ? 0.95 : 1.75;
      (scene.fog as THREE.FogExp2).color.setHex(s.exploded ? 0x160e0b : 0x0c100b);
      rig.updateFromState(s, mode === 'paused' ? 0 : visualDt, elapsed, hoveredId, alarmActive);

      if (mode === 'title') {
        // Live world camera tour: keep illuminated Unit 4 cutaway framed cleanly on the right 55%
        const sway = Math.sin(elapsed * 0.28) * 1.2;
        _desiredPos.set(-2.2 + sway, 7.0 + Math.sin(elapsed * 0.4) * 0.5, 16.5 + Math.cos(elapsed * 0.28) * 0.9);
        _desiredTarget.set(-7.3, 3.4, -0.5);
        camera.position.lerp(_desiredPos, 1 - Math.exp(-3.0 * dt));
        controls.target.lerp(_desiredTarget, 1 - Math.exp(-3.0 * dt));
        controls.update();
      } else {
        if (transitionActiveRef.current) {
          const anchorKey = mode === 'exploding' ? 'explosion' : presetRef.current;
          const anchor = rig.cameraAnchors[anchorKey];
          const k = 1 - Math.exp(-(mode === 'exploding' ? 5.5 : 8.5) * dt);
          camera.position.lerp(anchor.pos, k);
          controls.target.lerp(anchor.target, k);
          if (
            camera.position.distanceTo(anchor.pos) < 0.08 &&
            controls.target.distanceTo(anchor.target) < 0.08
          ) {
            transitionActiveRef.current = false;
          }
        }
        controls.update();

        // Decaying quadratic trauma shake during initial explosion blast
        if (s.exploded && explodeTrauma > 0.01) {
          explodeTrauma = Math.max(0, explodeTrauma - dt * 0.36);
          const shake = explodeTrauma * explodeTrauma * 0.42;
          camera.position.x += (Math.random() - 0.5) * shake;
          camera.position.y += (Math.random() - 0.5) * shake;
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      rig.dispose();
      textures.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [simRef, modeRef]);

  return <div ref={mountRef} className="fixed inset-0 z-0 select-none" aria-label="Unit 4 3D Reactor Hall Viewport" />;
}
