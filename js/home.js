// VoxelOcean - Vanilla JS implementation based on provided React + Three.js component
// This script mounts a Three.js animation inside the #voxel-ocean-container div.

import * as THREE from 'three/webgpu';

(async function initVoxelOcean() {
  const container = document.getElementById('voxel-ocean-container');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 40, 200);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    65,
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
  const voxelSize = 6;
  const gridSize = 200;
  const instanceCount = gridSize * gridSize;

  const geometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.75,
  });

  const instancedMesh = new THREE.InstancedMesh(
    geometry,
    material,
    instanceCount
  );

  // Set colors for each instance
  const color = new THREE.Color();
  for (let i = 0; i < instanceCount; i++) {
    const hue = i / instanceCount;
    color.setHSL(hue, 1.0, 0.5);
    instancedMesh.setColorAt(i, color);
  }
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }

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

  // Camera rotation
  let angle = 0;
  const radius = 40;

  // Animation
  const animate = () => {
    const time = Date.now() * 0.0008;

    // Update voxel positions with wave motion
    positions.forEach(({ x, z, index }) => {
      const waveX = Math.sin(x * 0.1 + time * 2) * 5;
      const waveZ = Math.cos(z * 0.1 + time * 2) * 5;
      const waveInterference = Math.sin(x * 0.05 + z * 0.05 + time * 3) * 4;

      const height = waveX + waveZ + waveInterference;

      // Update rainbow color based on height and time
      const hue = ((height + 10) / 20 + time * 0.1) % 1.0;
      color.setHSL(hue, 1, 0.5);
      instancedMesh.setColorAt(index, color);

      matrix.setPosition(x, height, z);
      instancedMesh.setMatrixAt(index, matrix);
    });

    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

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
