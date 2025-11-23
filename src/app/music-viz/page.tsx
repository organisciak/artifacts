'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function MusicVizPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for Three.js and audio
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mountainRef = useRef<THREE.LineSegments | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // Audio reactive values
  const rotationSpeedRef = useRef(0.001);
  const scaleRef = useRef(1);
  const baseRotationRef = useRef({ x: 0, y: 0 });

  // Camera control values
  const cameraAngleRef = useRef({ theta: 0, phi: Math.PI / 6 }); // theta = horizontal, phi = vertical
  const cameraDistanceRef = useRef(60);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Color transition value
  const colorTransitionRef = useRef(0);

  // Store original vertex positions for displacement
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Setup Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera with perspective
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Initial camera position from spherical coordinates
    const updateCameraPosition = () => {
      const { theta, phi } = cameraAngleRef.current;
      const distance = cameraDistanceRef.current;
      camera.position.x = distance * Math.sin(phi) * Math.sin(theta);
      camera.position.y = distance * Math.cos(phi);
      camera.position.z = distance * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    };
    updateCameraPosition();
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create mountain geometry with vertex colors
    const mountainGeometry = createMountainGeometry();
    const wireframe = new THREE.WireframeGeometry(mountainGeometry);

    // Add vertex colors for gradient
    const vertexCount = wireframe.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    const positions = wireframe.attributes.position.array;

    // Gold: RGB(1, 0.84, 0) to Ultraviolet: RGB(0.5, 0, 1)
    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      // Gradient based on position (corner to corner)
      const t = Math.max(0, Math.min(1, (x + z + 80) / 160)); // Normalize to 0-1

      // Interpolate between gold and ultraviolet
      const r = 1 * (1 - t) + 0.5 * t;      // Gold R to UV R
      const g = 0.84 * (1 - t) + 0 * t;     // Gold G to UV G
      const b = 0 * (1 - t) + 1 * t;        // Gold B to UV B

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    wireframe.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Store original positions for displacement
    originalPositionsRef.current = new Float32Array(positions);

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      opacity: 0.9,
      transparent: true,
    });
    const mountain = new THREE.LineSegments(wireframe, material);

    // Tilt the mountain slightly off-axis
    mountain.rotation.x = -0.3;
    mountain.rotation.z = 0.1;

    scene.add(mountain);
    mountainRef.current = mountain;

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse controls for camera
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;

      // Update camera angles
      cameraAngleRef.current.theta += deltaX * 0.005;
      cameraAngleRef.current.phi += deltaY * 0.005;

      // Clamp phi to avoid flipping (keep between 0.1 and PI - 0.1)
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleRef.current.phi));

      updateCameraPosition();
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      cameraDistanceRef.current += e.deltaY * 0.05;
      cameraDistanceRef.current = Math.max(20, Math.min(150, cameraDistanceRef.current));
      updateCameraPosition();
    };

    // Double-click for fullscreen
    const handleDoubleClick = () => {
      if (!document.fullscreenElement) {
        container.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel);
    container.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Increment time for terrain animation
      timeRef.current += 0.02;

      if (mountainRef.current) {
        // Rotate the mountain
        baseRotationRef.current.y += rotationSpeedRef.current;
        mountainRef.current.rotation.y = baseRotationRef.current.y;

        // Apply scale (throbbing effect)
        const targetScale = scaleRef.current;
        mountainRef.current.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.1
        );

        // Displace terrain vertices over time
        if (originalPositionsRef.current) {
          const geometry = mountainRef.current.geometry;
          const posAttr = geometry.attributes.position;
          const original = originalPositionsRef.current;
          const time = timeRef.current;
          const beatIntensity = colorTransitionRef.current;

          for (let i = 0; i < posAttr.count; i++) {
            const ox = original[i * 3];
            const oy = original[i * 3 + 1];
            const oz = original[i * 3 + 2];

            // Create wave displacement based on position and time
            const waveX = Math.sin(ox * 0.1 + time) * Math.cos(oz * 0.08 + time * 0.7);
            const waveZ = Math.cos(ox * 0.12 + time * 0.8) * Math.sin(oz * 0.1 + time);

            // Base subtle movement + beat-reactive amplification
            const baseDisplacement = 0.5;
            const beatBoost = beatIntensity * 4;
            const displacement = baseDisplacement + beatBoost;

            // Apply displacement to Y (height)
            const newY = oy + waveX * displacement + waveZ * displacement * 0.5;

            posAttr.setY(i, newY);
          }
          posAttr.needsUpdate = true;
        }
      }

      // Analyze audio if available
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Get bass frequencies (first 10 bins) for beat detection
        const bassSum = dataArray.slice(0, 10).reduce((a, b) => a + b, 0);
        const bassAvg = bassSum / 10;

        // Get overall energy
        const overallSum = dataArray.reduce((a, b) => a + b, 0);
        const overallAvg = overallSum / dataArray.length;

        // Map bass to rotation speed - slower base, very brief speed bursts
        const normalizedBass = bassAvg / 255;
        const bassPower = Math.pow(normalizedBass, 5); // Higher power = only strong beats trigger
        rotationSpeedRef.current = 0.0008 + bassPower * 0.15;

        // Map overall energy to scale - more pronounced throb (1 to 2.2)
        const normalizedEnergy = overallAvg / 255;
        const energyPower = Math.pow(normalizedEnergy, 1.5); // Slightly boosted
        scaleRef.current = 1 + energyPower * 1.2;

        // Update color transition based on bass (throbbing with beat)
        const bassBurst = Math.pow(normalizedBass, 1.5); // Less aggressive power for more response
        colorTransitionRef.current = bassBurst;

        // Update vertex colors with beat-reactive transition
        if (mountainRef.current) {
          const geometry = mountainRef.current.geometry;
          const colorAttr = geometry.attributes.color;
          const posAttr = geometry.attributes.position;
          const transition = colorTransitionRef.current;

          for (let i = 0; i < colorAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);
            // Base gradient position
            const baseT = Math.max(0, Math.min(1, (x + z + 80) / 160));

            // Shift the gradient dramatically based on beat
            // transition of 1.0 should shift everything toward ultraviolet
            const shifted = Math.max(0, Math.min(1, baseT * (1 - transition * 0.8) + transition * 0.9));

            // Gold to ultraviolet interpolation
            const r = 1 * (1 - shifted) + 0.5 * shifted;
            const g = 0.84 * (1 - shifted);
            const b = shifted;

            // Boost intensity with beat
            const intensity = 1 + transition * 0.8;
            colorAttr.setXYZ(
              i,
              r * intensity,
              g * intensity,
              b * intensity
            );
          }
          colorAttr.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Create procedural mountain geometry
  function createMountainGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.PlaneGeometry(80, 80, 40, 40);
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Create mountain-like terrain using multiple noise frequencies
      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = 40;

      // Central peak with falloff
      let height = Math.max(0, 15 - distance * 0.3);

      // Add ridges
      height += Math.sin(x * 0.2) * Math.cos(y * 0.15) * 5;
      height += Math.sin(x * 0.4 + y * 0.3) * 3;

      // Add smaller details
      height += Math.sin(x * 0.8) * Math.sin(y * 0.9) * 2;
      height += Math.cos(x * 1.2 + y * 0.7) * 1.5;

      // Edge falloff
      const edgeFalloff = Math.max(0, 1 - (distance / maxDistance) ** 2);
      height *= edgeFalloff;

      positions[i + 2] = height;
    }

    geometry.computeVertexNormals();
    geometry.rotateX(-Math.PI / 2);

    return geometry;
  }

  // Start microphone listening
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      setError(null);
    } catch (err) {
      setError('Could not access microphone. Please allow microphone access.');
      console.error('Microphone error:', err);
    }
  };

  // Stop listening
  const stopListening = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);

    // Reset values
    rotationSpeedRef.current = 0.001;
    scaleRef.current = 1;
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-6 py-3 font-mono text-sm tracking-wider transition-all border-2 bg-transparent ${
            isListening
              ? 'border-red-500 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              : 'border-amber-400 text-amber-300 hover:bg-amber-400/20 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]'
          }`}
        >
          {isListening ? '[ STOP ]' : '[ START MIC ]'}
        </button>

        {error && (
          <p className="mt-2 text-red-400 text-sm font-mono max-w-xs">{error}</p>
        )}

        {isListening && (
          <p className="mt-2 text-violet-400 text-sm font-mono">
            :: listening ::
          </p>
        )}

        {isFullscreen && (
          <p className="mt-2 text-gray-500 text-xs font-mono">
            double-click to exit
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 text-gray-500 text-xs font-mono max-w-md space-y-1">
        <p>{'// drag to orbit | scroll to zoom'}</p>
        <p>{'// double-click for fullscreen'}</p>
      </div>
    </div>
  );
}
