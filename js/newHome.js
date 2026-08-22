import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


class THREEJS {
    #renderer_ = null;
    #scene_ = null;
    #camera_ = null;
    #controls_ = null;
    #container_ = null;

    constructor(container) {
        this.#container_ = container;
    }

    async init() {
        this.#renderer_ = new THREE.WebGPURenderer({ antialias: true });
        await this.#renderer_.init();

        const w = this.#container_.clientWidth || window.innerWidth;
        const h = this.#container_.clientHeight || window.innerHeight;

        this.#renderer_.setSize(w, h);
        this.#renderer_.setPixelRatio(window.devicePixelRatio || 1);
        this.#container_.appendChild(this.#renderer_.domElement);

        this.#camera_ = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
        this.#camera_.position.z = 5;

        this.#scene_ = new THREE.Scene();
        this.#scene_.background = new THREE.Color(0x000000);

        const boxGeometry = new THREE.BoxGeometry();
        const boxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true
        });

        const cube = new THREE.Mesh(boxGeometry, boxMaterial);
        this.#scene_.add(cube);

        this.#controls_ = new OrbitControls(this.#camera_, this.#renderer_.domElement);
        this.#controls_.enableDamping = true;

        const animate = () => {
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            this.#controls_.update();
        };

        this.#renderer_.setAnimationLoop(animate);

        window.addEventListener('resize', () => {
            const w = this.#container_.clientWidth || window.innerWidth;
            const h = this.#container_.clientHeight || window.innerHeight;

            this.#camera_.aspect = w / h;
            this.#camera_.updateProjectionMatrix();
            this.#renderer_.setSize(w, h);
        });
    }

    async run() {
        this.#renderer_.render(this.#scene_, this.#camera_);
        requestAnimationFrame(this.run.bind(this));
    }
}

const code = new THREEJS(document.body);
await code.init();
await code.run();