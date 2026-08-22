// VoxelOcean - Vanilla JS implementation based on provided React + Three.js component
// This script mounts a Three.js animation inside the #voxel-ocean-container div.

import * as THREE from 'three/webgpu';
import { color, mix, positionWorld } from 'three/tsl';

(async function initVoxelOcean() {
  const container = document.getElementById('voxel-ocean-container');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 40, 220);

  // Camera
  const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
  );
  camera.position.set(0, 50, 80);
  camera.lookAt(0, 0, 0);

  // Renderer
  const renderer = new THREE.WebGPURenderer({ antialias: true });
  await renderer.init();
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 50);
  scene.add(directionalLight);

  // Create voxel ocean
  const voxelSize = 3;
  const gridSize = 210;
  const instanceCount = gridSize * gridSize;

  const geometry = new THREE.BoxGeometry(voxelSize + 0.1, 20, voxelSize + 0.2);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: .65,
  });

  const worldY = positionWorld.y;
  const h = worldY.add(15).div(30).clamp(0, 1).toVar();

  const bottomColor = color("rgb(0, 0, 0)"); // RGB(0,0,70)
  const midColor = color("rgb(0,100,214)");    // RGB(0,0,255)
  const topColor = color("rgb(225, 225, 255)");    // Light white blue

  material.colorNode = mix(
      mix(bottomColor, midColor, h.mul(2).clamp(0, 1)),
      topColor,
      h.mul(2).sub(1).clamp(0, 0.8)
  );

  const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      instanceCount
  );

  // Store initial positions
  const positions = [];
  const matrix = new THREE.Matrix4();
  let index = 0;

  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      const posX = (x - gridSize / 2) * voxelSize;
      const posZ = (z - gridSize / 2) * voxelSize;
      positions.push({ x: posX, z: posZ, index: index });

      matrix.setPosition(posX, 0, posZ);
      instancedMesh.setMatrixAt(index, matrix);
      index++;
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedMesh);

  // Simple noise function for more organic waves
  const noise = (x, y) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const a = (X * 374761393 + Y * 668265263) & 0xffffffff;
    const b = ((X + 1) * 374761393 + Y * 668265263) & 0xffffffff;
    const c = (X * 374761393 + (Y + 1) * 668265263) & 0xffffffff;
    const d = ((X + 1) * 374761393 + (Y + 1) * 668265263) & 0xffffffff;

    const k0 = a * 1.3283064365386963e-10;
    const k1 = b * 1.3283064365386963e-10;
    const k2 = c * 1.3283064365386963e-10;
    const k3 = d * 1.3283064365386963e-10;

    return (k0 * (1 - u) + k1 * u) * (1 - v) + (k2 * (1 - u) + k3 * u) * v;
  };

  // Mouse and Interaction
  const mouse = new THREE.Vector2(-10, -10); // Start off-screen
  const targetMouse = new THREE.Vector2(-10, -10);
  const raycaster = new THREE.Raycaster();
  const mouseWorld = new THREE.Vector3(0, 0, 0);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const updateMouse = (x, y) => {
    const rect = container.getBoundingClientRect();
    targetMouse.x = ((x - rect.left) / rect.width) * 2 - 1;
    targetMouse.y = -((y - rect.top) / rect.height) * 2 + 1;
  };

  const onMouseMove = (e) => updateMouse(e.clientX, e.clientY);
  const onTouchStart = (e) => {
    if (e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e) => {
    if (e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  // Camera rotation
  let angle = 0;
  const radius = 40;

  // Animation
  const animate = () => {
    const time = Date.now() * 0.0003;

    // Smooth mouse movement
    mouse.x += (targetMouse.x - mouse.x) * 0.1;
    mouse.y += (targetMouse.y - mouse.y) * 0.1;

    // Update mouse world position
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(plane, mouseWorld);

    // Update voxel positions with wave motion
    positions.forEach(({ x, z, index }) => {
      // Add noise to break up regular patterns
      const noiseVal1 = noise(x * 0.03 + time * 2.1, z * 0.03 + time * 0.3) * 10;
      const noiseVal2 = noise(x * 0.05 - time * 2.1, z * 0.05 + time * 0.6) * 10;

      const waveX = Math.cos(x * 0.05 + time * 2 + noiseVal1) * 3;
      const waveZ = Math.sin(z * 0.05 + time * 2 + noiseVal2) * 3;
      const waveInterference = Math.sin(x * 0.08 + z * 0.08 + time * 3.2 + noiseVal1) * 4;

      // Interaction Peak
      const dx = x - mouseWorld.x;
      const dz = z - mouseWorld.z;
      const distSq = dx * dx + dz * dz;
      const peak = 33.0 * Math.exp(-distSq * 0.02); // Taller and narrower

      const height = waveX + waveZ + waveInterference + noiseVal2 + peak;

      matrix.setPosition(x, height - 8.5, z);
      instancedMesh.setMatrixAt(index, matrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;

    // Rotate camera around the ocean
    angle += 0.003;
    camera.position.x = Math.cos(angle) * radius;
    camera.position.z = Math.sin(angle) * radius;
    camera.position.y = 26;
    camera.lookAt(0, 3, 115);

    renderer.render(scene, camera);
  };

  renderer.setAnimationLoop(animate);

  // Handle window resize
  const handleResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener('resize', handleResize);

  // Optional cleanup on page unload/navigation
  const cleanup = () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    renderer.setAnimationLoop(null);
    if (renderer && renderer.domElement && renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };

  window.addEventListener('beforeunload', cleanup);
})();