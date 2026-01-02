import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

// Select the container element where you want to render the scene
const container = document.querySelector('.boxC');

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    47,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0); // transparent clear
renderer.setClearAlpha(0);            // explicit alpha clear
renderer.autoClear = false;           // let composer manage clears
container.appendChild(renderer.domElement);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.8;

// Setup environment with RoomEnvironment
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const environment = new RoomEnvironment();
const envRT = pmremGenerator.fromScene(environment);
scene.environment = envRT.texture;

// Define your materials
const materialOrange = new THREE.MeshPhysicalMaterial({
    color: 0xfa7000,
    metalness: 1,
    roughness: 0,
    iridescence: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
});

const materialWhite = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0,
    iridescence: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
});

// Declare a variable to hold the loaded FBX model for rotation later
let fbxModel;

// Load your custom FBX model
const loader = new FBXLoader();
loader.load(
    '/assets/coin/btc.fbx', // Replace this with the correct path to your FBX file
    (fbx) => {
        // Traverse the loaded object and apply materials based on mesh names
        fbx.traverse((child) => {
            if (child.isMesh) {
                child.geometry.computeVertexNormals();
                console.log(child.name);
                if (child.name === 'Coin_obj') {
                    child.material = materialOrange;
                } else {
                    child.material = materialWhite;
                }
            }
        });
        // Store the loaded model for auto-rotation
        fbxModel = fbx;
        fbxModel.position.y = 0.17;
        scene.add(fbx);
    },
    undefined,
    (error) => {
        console.error('Error loading FBX model:', error);
    }
);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5).normalize();
scene.add(directionalLight);

// Camera position
camera.position.z = 2.7;

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false;
controls.enablePan = false;
controls.minPolarAngle = Math.PI / 2;
controls.maxPolarAngle = Math.PI / 2;

// Set up the EffectComposer for postprocessing
const rtParams = { format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false };
const renderTarget = new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight, rtParams);
const composer = new EffectComposer(renderer, renderTarget);
const renderPass = new RenderPass(scene, camera);
renderPass.clear = true;
composer.addPass(renderPass);

const ScanlineShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "resolution": { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
        "scanlineIntensity": { value: .6 },
        "scanlineCount": { value: 1025 } // Adjust this value for density
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float scanlineIntensity;
      uniform float scanlineCount;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        // Create horizontal scanlines using a sine function
        float scanline = sin(vUv.y * scanlineCount);
        color.rgb -= scanlineIntensity * (1.0 - abs(scanline));
        gl_FragColor = vec4(color.rgb, color.a);
      }
    `
};

const scanlinePass = new ShaderPass(ScanlineShader);
composer.addPass(scanlinePass);

// Handle window resize
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (typeof renderTarget !== 'undefined') {
        renderTarget.setSize(width, height);
    }
    composer.setSize(width, height);
    if (scanlinePass && scanlinePass.uniforms && scanlinePass.uniforms.resolution) {
        scanlinePass.uniforms.resolution.value.set(width, height);
    }
});

// Auto-Rotate speed (adjust as needed)
const autoRotateSpeed = 0.0008;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // If the FBX model is loaded, rotate it along the Y axis at the defined speed...
    if (fbxModel) {
        fbxModel.rotation.y += autoRotateSpeed;
    }

    composer.render();
}

animate();
