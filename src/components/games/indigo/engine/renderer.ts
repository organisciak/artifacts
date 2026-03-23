import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { INDIGO_PALETTE, FOG_PRESETS, applyFog } from './palette';
import {
  createPearlescentMaterial,
  createWireframeMaterial,
  createGroundMaterial,
  createSkyMaterial,
  updateShaderTime,
} from './shaders';

/**
 * Chromatic aberration shader — subtle prismatic RGB offset
 * that gives wireframes a pearlescent edge quality.
 */
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uOffset: { value: new THREE.Vector2(0.003, 0.003) },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uOffset;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);
      // Stronger aberration toward edges, with subtle time animation
      float strength = dist * (1.0 + 0.15 * sin(uTime * 0.3));
      vec2 offset = uOffset * strength;

      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      float a = texture2D(tDiffuse, vUv).a;

      gl_FragColor = vec4(r, g, b, a);
    }
  `,
};

export type IndigoRendererConfig = {
  container: HTMLElement;
  width: number;
  height: number;
  pixelRatio?: number;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  chromaticStrength?: number;
  filmNoiseIntensity?: number;
  fogPreset?: keyof typeof FOG_PRESETS;
};

export type IndigoRenderer = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  clock: THREE.Clock;
  chromaticPass: ShaderPass;
  bloomPass: UnrealBloomPass;
  resize: (width: number, height: number) => void;
  render: (deltaTime: number, elapsedTime: number) => void;
  dispose: () => void;
};

/**
 * Create the core Three.js renderer with full post-processing pipeline
 * for The Indigo Frequency.
 */
export function createIndigoRenderer(config: IndigoRendererConfig): IndigoRenderer {
  const {
    container,
    width,
    height,
    pixelRatio = Math.min(window.devicePixelRatio, 2),
    bloomStrength = 1.2,
    bloomRadius = 0.6,
    bloomThreshold = 0.15,
    chromaticStrength = 0.003,
    filmNoiseIntensity = 0.2,
    fogPreset = 'default',
  } = config;

  // --- Scene ---
  const scene = new THREE.Scene();
  applyFog(scene, FOG_PRESETS[fogPreset]);

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
  camera.position.set(0, 2, 15);
  camera.lookAt(0, 0, 0);

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // --- Post-processing pipeline ---
  const composer = new EffectComposer(renderer);

  // 1. Render the scene
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Bloom — soft glow on wireframes, edges glow like neon through mist
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    bloomStrength,
    bloomRadius,
    bloomThreshold
  );
  composer.addPass(bloomPass);

  // 3. Chromatic aberration — prismatic pearlescent shift
  const chromaticPass = new ShaderPass(ChromaticAberrationShader);
  chromaticPass.uniforms.uOffset.value.set(chromaticStrength, chromaticStrength);
  composer.addPass(chromaticPass);

  // 4. Film grain — subtle noise for analog texture
  const filmPass = new FilmPass(filmNoiseIntensity);
  composer.addPass(filmPass);

  // 5. Output pass — tone mapping and color space correction
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // --- Ambient lighting ---
  const ambientLight = new THREE.AmbientLight(
    INDIGO_PALETTE.pearlWhite,
    0.15
  );
  scene.add(ambientLight);

  // Subtle directional light from above-right for depth
  const dirLight = new THREE.DirectionalLight(
    INDIGO_PALETTE.signalViolet,
    0.3
  );
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  // --- Clock ---
  const clock = new THREE.Clock();

  // --- Demo scene showcasing the shader system ---

  // Sky dome
  const skyGeo = new THREE.SphereGeometry(150, 32, 32);
  const skyMat = createSkyMaterial();
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.name = 'sky_dome';
  scene.add(skyDome);

  // Ground grid
  const groundGeo = new THREE.PlaneGeometry(100, 100, 60, 60);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = createGroundMaterial();
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -2;
  ground.name = 'ground_grid';
  scene.add(ground);

  // Pearlescent icosahedron (main object)
  const icoGeo = new THREE.IcosahedronGeometry(3, 2);
  const pearlescentMat = createPearlescentMaterial({ fresnelPower: 3.0 });
  const icoMesh = new THREE.Mesh(icoGeo, pearlescentMat);
  icoMesh.name = 'pearlescent_ico';
  scene.add(icoMesh);

  // Wireframe overlay on the icosahedron
  const wireGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(3.05, 2));
  const wireMat = createWireframeMaterial({ glowIntensity: 1.2 });
  const wireOverlay = new THREE.LineSegments(wireGeo, wireMat);
  wireOverlay.name = 'wireframe_overlay';
  scene.add(wireOverlay);

  // --- Resize ---
  function resize(w: number, h: number) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
  }

  // --- Render ---
  function render(_deltaTime: number, elapsedTime: number) {
    // Animate chromatic aberration time uniform
    chromaticPass.uniforms.uTime.value = elapsedTime;

    // Update all shader material time uniforms
    updateShaderTime(scene, elapsedTime);

    // Slowly rotate the pearlescent icosahedron and wireframe overlay
    const ico = scene.getObjectByName('pearlescent_ico');
    const wire = scene.getObjectByName('wireframe_overlay');
    if (ico) {
      ico.rotation.y = elapsedTime * 0.12;
      ico.rotation.x = Math.sin(elapsedTime * 0.08) * 0.3;
    }
    if (wire) {
      wire.rotation.y = elapsedTime * 0.12;
      wire.rotation.x = Math.sin(elapsedTime * 0.08) * 0.3;
    }

    composer.render();
  }

  // --- Dispose ---
  function dispose() {
    composer.dispose();
    renderer.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
  }

  return {
    renderer,
    scene,
    camera,
    composer,
    clock,
    chromaticPass,
    bloomPass,
    resize,
    render,
    dispose,
  };
}
