// systems.js (ES module)
// Minimal Three.js coverflow-style carousel

const { CSS2DRenderer, CSS2DObject } = THREE;



const images = [
    // Image order must match the links order below
    '/img/systems/digitaltwin2.jpg',
    '/img/systems/crypto.jpg',
    '/img/systems/streamingfront.jpg',
];

// Destination HTML pages for each card (in the same order as images)
const links = [
    '/systems/DIGITAL_TWIN.html',
    '/systems/CRYPTOVISUAL.html',
    '/systems/T_STREAM.html',
];

// Display names for each system in the same order as images/links
const systemNames = [
    'xARM.SYSTEM',
    'CRYPTOVISUAL.SYSTEM',
    'STREAM.SYSTEM',
];

const container = document.getElementById('systems-carousel');
container.style.position = 'relative';
container.style.width = '100%';
container.style.height = '100vh';

// Scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0000000);

// Responsive FOV parameters
const MIN_FOV = 43; // smallest FOV (at large widths)
const MAX_FOV = 78; // largest FOV (at small widths)
const MIN_W = 320;  // width at which FOV reaches MAX_FOV
const MAX_W = 1920; // width at which FOV reaches MIN_FOV

function computeResponsiveFov(width) {
    const t = THREE.MathUtils.clamp((width - MIN_W) / (MAX_W - MIN_W), 0, 1);
    // As width grows, FOV shrinks from MAX_FOV -> MIN_FOV
    return THREE.MathUtils.lerp(MAX_FOV, MIN_FOV, t);
}

const initialFov = computeResponsiveFov(container.clientWidth);
const camera = new THREE.PerspectiveCamera(initialFov, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 3.8, 10);
camera.rotation.x = -0.33;
camera.rotation.y = 0;
camera.rotation.z = 0;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0); // transparent clear
renderer.setClearAlpha(0);            // explicit alpha clear
container.appendChild(renderer.domElement);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);


// Lights
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(2, 4, 6);
key.castShadow = true;
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.45));

// Helper: soft shadow texture (radial falloff)
function makeShadowTexture(size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

const shadowTex = makeShadowTexture();

// Materials
const loader = new THREE.TextureLoader();
const cardW = 4.5, cardH = 3;            // square covers; adjust for aspect if needed
const gap = 5;                       // horizontal spacing between cards
const maxTilt = THREE.MathUtils.degToRad(55);

// Create cards
const geometry = new THREE.PlaneGeometry(cardW, cardH, 1, 1);
const floorY = -cardH * 0.8;

// Fade texture for reflections (alpha top->bottom)
function makeVerticalFade(size = 256) {
    const c = document.createElement('canvas');
    c.width = 4.5; c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
}
const reflectionFade = makeVerticalFade();

const cards = images.map((src, i) => {
    const tex = loader.load(src);
    tex.colorSpace = THREE.SRGBColorSpace;

    // Main card
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    // Add a floating soft shadow quad as a child
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(cardW * 0.9, cardH * 0.5),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2; // lay flat
    shadow.position.set(0, -cardH * 0.7, 0);
    mesh.add(shadow);
    // Disable raycast on shadow to avoid intercepting clicks
    shadow.raycast = () => {};

    // Reflection (mirrored clone with fade)
    const reflMat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0x999999,
        transparent: true,
        opacity: 0.5,
        alphaMap: reflectionFade,
        depthWrite: false
    });
    const reflection = new THREE.Mesh(geometry, reflMat);
    reflection.scale.y = -1; // mirror vertically across the floor plane
    reflection.position.y = 2 * floorY; // reflect across y = floorY
    // Disable raycast on reflection so clicks go to the main card
    reflection.raycast = () => {};

    // Group containing card + reflection
    const group = new THREE.Group();
    group.add(mesh);
    group.add(reflection);
    // Store link and index for interaction
    group.userData = { index: i, link: links[i] };

    scene.add(group);
    return group;
});

// TEXT

// CSS2DRenderer for 2D labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(container.clientWidth, container.clientHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

// Simple "Hello World" label
const systemTitles = document.createElement('div');
systemTitles.classList.add('systemTitle');
const helloLabel = new CSS2DObject(systemTitles);
helloLabel.position.set(0,  cardH * 0.9, 0); // above the centered cards
scene.add(helloLabel);

// Adding Page Title (CSS2D label)
const pageTitleEl = document.createElement('div');
// Use .pageTitle styling from style.scss exclusively
pageTitleEl.classList.add('pageTitle');
// Use the document's <title> text if available, otherwise a sensible default
pageTitleEl.textContent = 'SYSTEMS';
const systemPage = new CSS2DObject(pageTitleEl);
systemPage.position.set(0, 5, 0); // above the centered cards
scene.add(systemPage);

// TEXT

// State for interaction
const startIndex = Math.floor(cards.length / 2); // start from the middle (e.g., 3rd card in a 5-card set)
let index = startIndex;       // snapped index (integer)
let target = startIndex;      // target position (float)
let velocity = 0;    // for inertial drag

// Set initial label to match the initially centered card
systemTitles.textContent = systemNames[startIndex] || '';

// Click gating thresholds: only allow clicks when the card is very near center and motion is minimal
const CLICK_CENTER_EPS = 0.25;   // in index units; lower = stricter
const CLICK_SPEED_EPS = 0.003;   // lower = require slower motion
// Drag-to-click cancellation: if the pointer moved beyond this normalized threshold during a press,
// suppress the subsequent click so dragging from side to center won't trigger navigation.
const DRAG_CLICK_CANCEL_EPS = 0.02;

// Levitation parameters
const clock = new THREE.Clock();
const BOB_AMP = 0.14;      // how high the center card floats (in world units)
const BOB_SPEED = 0.2;    // cycles per second (slow and subtle)
let currentBobOffset = 0;  // updated each frame in animate()
let lastCenteredIndex = -1; // track last center to update label text only on change

// Positioning / layout update
function layout(t) {
    const centerIdx = Math.round(t);



    // Update the CSS2D label when the centered card changes
    if (centerIdx !== lastCenteredIndex) {
        systemTitles.textContent = systemNames[centerIdx] || '';
        lastCenteredIndex = centerIdx;
    }

    for (let i = 0; i < cards.length; i++) {
        const offset = i - t; // distance from center in index units

        // Position: horizontal offset + slight Z pushback for side items
        const x = offset * gap;
        const z = -Math.min(Math.abs(offset) * 1.5, 6);

        // Scale: emphasize the centered card
        const s = THREE.MathUtils.lerp(0.75, 1.3, Math.max(0, 1 - Math.abs(offset)));

        // Rotation Y: tilt side cards
        const ry = THREE.MathUtils.clamp(-offset, -1, 1) * maxTilt;

        const card = cards[i];
        card.position.set(x, 0, z);
        card.rotation.set(0, ry, 0);
        card.scale.setScalar(s);

        // Gentle levitation only for the centered card
        const isCenter = (i === centerIdx);
        const mesh = card.children[0];        // main card mesh
        const reflection = card.children[1];  // mirrored mesh

        const bobY = isCenter ? currentBobOffset : 0;
        mesh.position.y = bobY;
        // Keep the reflection mirrored across the floor plane despite bobbing
        reflection.position.y = 2 * floorY - bobY;

        // Subtle drop shadow offset based on tilt; keep it near the floor even when bobbing
        const shadow = mesh.children[0];
        shadow.position.y = -cardH * (0.7 + 0.05 * Math.abs(offset)) - bobY;
        shadow.scale.set(THREE.MathUtils.lerp(0.9, 1.2, Math.abs(offset)), 1, 1);
        shadow.material.opacity = THREE.MathUtils.lerp(0.5, 0.15, Math.min(1, Math.abs(offset)));
    }
}

// Input: wheel
container.addEventListener('wheel', (e) => {
    const delta = Math.sign(e.deltaY);
    target = THREE.MathUtils.clamp(target + delta, 0, cards.length - 1);
});

// Input: arrows
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') target = Math.min(target + 1, cards.length - 1);
    if (e.key === 'ArrowLeft') target = Math.max(target - 1, 0);
});

// Input: drag (mouse/touch)
let dragging = false, lastX = 0;
let accumulatedDrag = 0; // sum of absolute normalized dx during a press
let suppressNextClick = false; // set true after a drag to cancel the click event
const onDown = (x) => { dragging = true; lastX = x; velocity = 0; accumulatedDrag = 0; };
const onMove = (x) => {
    if (!dragging) return;
    const dx = (x - lastX) / container.clientWidth; // normalize
    lastX = x;
    target -= dx * 5; // sensitivity
    target = THREE.MathUtils.clamp(target, 0, cards.length - 1);
    velocity = -dx * 5;
    accumulatedDrag += Math.abs(dx);
};
const onUp = () => {
    dragging = false;
    if (accumulatedDrag > DRAG_CLICK_CANCEL_EPS) suppressNextClick = true;
};
container.addEventListener('mousedown', (e) => onDown(e.clientX));
window.addEventListener('mousemove', (e) => onMove(e.clientX));
window.addEventListener('mouseup', onUp);
container.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX), { passive: true });
container.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
container.addEventListener('touchend', onUp);

// Link handling: raycaster for hover and click
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoverLink = null;

function updateHover(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Intersect only the main card meshes (child[0] of each group)
    const mainMeshes = cards.map(g => g.children[0]);
    const hits = raycaster.intersectObjects(mainMeshes, false);
    if (hits.length > 0) {
      const group = hits[0].object.parent; // main mesh's parent is the group
      const groupIndex = group.userData && typeof group.userData.index === 'number' ? group.userData.index : -1;
      const centerDistance = Math.abs(groupIndex - index);
      const isCentered = centerDistance < CLICK_CENTER_EPS && Math.abs(velocity) < CLICK_SPEED_EPS;
      hoverLink = isCentered && group.userData && group.userData.link ? group.userData.link : null;
      renderer.domElement.style.cursor = hoverLink ? 'pointer' : '';
    } else {
      hoverLink = null;
      renderer.domElement.style.cursor = '';
    }
}

renderer.domElement.addEventListener('mousemove', (e) => updateHover(e.clientX, e.clientY));
renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) updateHover(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });
renderer.domElement.addEventListener('click', (e) => {
    // If the previous interaction was a drag, suppress this click to avoid accidental navigation.
    if (suppressNextClick) { suppressNextClick = false; return; }
    // Recompute hover target at click time to ensure only centered card can be clicked
    updateHover(e.clientX, e.clientY);
    if (hoverLink) {
        // Open the infographic overlay for the currently centered card
        const centeredIndex = Math.round(index);
        openOverlay(centeredIndex);
    }
});

// Animate: ease towards target, then snap to nearest index when slow
function animate() {
    requestAnimationFrame(animate);

    // Smooth damp
    const stiffness = 0.008; // larger = snappier
    const damping = 0.8;
    const delta = target - index;
    velocity = velocity * damping + delta * stiffness;
    index += velocity;

    // Update levitation offset (slow sine wave)
    const tsec = clock.getElapsedTime();
    currentBobOffset = Math.sin(tsec * 2 * Math.PI * BOB_SPEED) * BOB_AMP;

    layout(index);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', onResize);
function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.fov = computeResponsiveFov(w);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
}

// Set initial responsive sizes/FOV
onResize();

// === Infographic Overlay (expand centered card) ===
// Lightweight modal to show rich content for the center card.
// You can optionally define window.carouselInfo = [htmlStringPerCard...] elsewhere to override content.
(function initInfographicOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'systems-overlay';
    Object.assign(overlay.style, {
        position: 'absolute',
        inset: '0',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        zIndex: '1',
        pointerEvents: 'auto',
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
        width: '85%',
        maxHeight: '600px',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: '1px',
        backdropFilter: 'blur(6px)',
        color: '#eaeaea',
        padding: '24px 24px 16px 24px',
        position: 'relative'
    });

    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '28px',
        lineHeight: '28px',
        background: 'transparent',
        border: 'none',
        color: '#ddd',
        cursor: 'pointer'
    });

    const mediaEl = document.createElement('div');
    Object.assign(mediaEl.style, {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '16px',
        marginBottom: '16px'
    });

    const contentEl = document.createElement('div');
    Object.assign(contentEl.style, {
        fontSize: '16px',
        lineHeight: '1.55',
        color: '#d6d6d6',
        marginBottom: '16px'
    });

    const actionsEl = document.createElement('div');
    Object.assign(actionsEl.style, {
        display: 'flex',
        gap: '12px',
        marginTop: '8px'
    });

    panel.appendChild(closeBtn);
    panel.appendChild(mediaEl);
    panel.appendChild(contentEl);
    panel.appendChild(actionsEl);

    overlay.appendChild(panel);
    container.appendChild(overlay);

    let previousBodyOverflow = '';

    // Ensure a compatible import map exists so module scripts like /coin.js can resolve 'three' and example modules
    function ensureImportMap() {
        if (window.__systemsOverlayImportMapInjected) return;
        // If page already has an importmap, respect it
        const existing = document.querySelector('script[type="importmap"]');
        if (existing) { window.__systemsOverlayImportMapInjected = true; return; }
        const map = {
            imports: {
                "three": "https://cdn.jsdelivr.net/npm/three@0.136.0/build/three.module.js",
                "three/examples/jsm/controls/OrbitControls": "https://cdn.jsdelivr.net/npm/three@0.136.0/examples/jsm/controls/OrbitControls.js",
                "three/examples/jsm/loaders/FBXLoader": "https://cdn.jsdelivr.net/npm/three@0.136.0/examples/jsm/loaders/FBXLoader.js",
                "three/examples/jsm/environments/RoomEnvironment": "https://cdn.jsdelivr.net/npm/three@0.136.0/examples/jsm/environments/RoomEnvironment.js",
                "three/examples/jsm/postprocessing/EffectComposer": "https://cdn.jsdelivr.net/npm/three@0.136.0/examples/jsm/postprocessing/EffectComposer.js",
                "three/examples/jsm/postprocessing/RenderPass": "https://cdn.jsdelivr.net/npm/three@0.136.0/examples/jsm/postprocessing/RenderPass.js",
                "three/examples/jsm/postprocessing/ShaderPass": "https://cdn.jsdelivr.net/npm/three@0.136.0/examples/jsm/postprocessing/ShaderPass.js"
            }
        };
        const s = document.createElement('script');
        s.type = 'importmap';
        s.textContent = JSON.stringify(map, null, 2);
        document.head.appendChild(s);
        window.__systemsOverlayImportMapInjected = true;
    }

    // Ensure any <script> tags inside injected HTML execute (including type="module").
    function executeScripts(container) {
        const scripts = Array.from(container.querySelectorAll('script'));
        for (const oldScript of scripts) {
            const newScript = document.createElement('script');
            // Copy attributes
            for (const attr of oldScript.attributes) {
                newScript.setAttribute(attr.name, attr.value);
            }
            // Inline content
            if (oldScript.textContent) {
                newScript.textContent = oldScript.textContent;
            }
            // Replace to trigger execution
            oldScript.parentNode.replaceChild(newScript, oldScript);
        }
    }

    function fillDefaultContent(i) {
        // Default image preview
        const img = document.createElement('img');
        img.src = images[i];
        img.alt = systemNames[i] || 'preview';
        Object.assign(img.style, {
            width: '30%',
            height: 'auto',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
        });
        mediaEl.appendChild(img);

        // Default placeholder text
        const p = document.createElement('p');
        p.textContent = 'Add videos, galleries, and detailed copy for this system here. You can override this content by defining window.carouselInfo[index] as custom HTML.';
        contentEl.appendChild(p);
    }

    window.openOverlay = function openOverlay(i) {
        // Clear old content
        mediaEl.innerHTML = '';
        contentEl.innerHTML = '';

        // If user provided custom HTML content for this index, render it
        if (window.carouselInfo && window.carouselInfo[i]) {
            // Allow either string or object with media and content fields
            const custom = window.carouselInfo[i];
            if (typeof custom === 'string') {
                contentEl.innerHTML = custom;
            } else if (custom && typeof custom === 'object') {
                if (custom.mediaHtml) {
                    mediaEl.innerHTML = custom.mediaHtml;
                } else if (custom.media && Array.isArray(custom.media)) {
                    custom.media.forEach(src => {
                        const el = document.createElement('img');
                        el.src = src;
                        el.style.width = '100%';
                        el.style.borderRadius = '10px';
                        mediaEl.appendChild(el);
                    });
                }
                if (custom.html) contentEl.innerHTML = custom.html;
                if (!custom.mediaHtml && !custom.media && !custom.html) fillDefaultContent(i);
            } else {
                fillDefaultContent(i);
            }
        } else {
            fillDefaultContent(i);
        }

        // Ensure an import map exists for module scripts like /coin.js
        ensureImportMap();
        // If the injected content contains a .boxC container with no height, give it a sensible default so WebGL can size correctly
        const boxC = panel.querySelector('.boxC');
        if (boxC && boxC.clientHeight < 40) {
            boxC.style.minHeight = '180px';
            boxC.style.height = '180px';
            boxC.style.position = boxC.style.position || 'relative';
        }
        // Execute any <script> tags inside the newly injected content
        executeScripts(panel);

        overlay.style.display = 'flex';
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    };

    function closeOverlay() {
        overlay.style.display = 'none';
        document.body.style.overflow = previousBodyOverflow || '';
    }

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
    });
    closeBtn.addEventListener('click', closeOverlay);
    window.addEventListener('keydown', (e) => {
        if (overlay.style.display !== 'none' && e.key === 'Escape') closeOverlay();
    });
})();


// === Custom overlay content mapping for systems ===
// Inject CRYPTOVISUAL (index 1) content from systems/CRYPTOVISUAL.html lines 54–97.
window.carouselInfo = window.carouselInfo || [];
window.carouselInfo[1] = {
  html: `
               <div class = "sPageTitle">CRYPTOVISUAL .SYSTEM</div>
               <div class = "description">Real-Time Global Cryptocurrency Chart</div>
               <div class = "iframe-container">
                    <div><iframe src="https://player.vimeo.com/video/754129193?h=353138da28?&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="CryptoVisual-System-Video"></iframe></div>
               </div>
               <div class = "blogText">
                    <div class = "span">> System Information: </div>
               </div>
              <div class="infosection">
                   <div class = "subdescription">The CryptoChart.SYSTEM is a real-time data visualization system that displays the USD pricing, market percentage, and OHLC data for the top ten most dominating cryptocurrencies in the market, updating in real-time.</div>
                    <div class = "boxA">
                         <div class = 'images'> <img src="/img/cryptograph.png" class="responsiveSystem"></div>
                    </div>
                  <div class = "subdescription">CryptoChart displays coins ranked in order from 1 to 10, starting from the current crypto coin with the highest overall global dominance; with data being fetched using <a href="https://www.coingecko.com/">coingecko.com's</a> API and WebSockets.</div>
                    <div class = "iframe-container">
                      <div><iframe src="https://player.vimeo.com/video/1072648117?h=353138da28&badge=0&autopause=0&player_id=0&app_id=584791"
                                   allow="autoplay; fullscreen; picture-in-picture"
                                   allowfullscreen
                                   style="border: white 1px solid"
                                   title="CryptoVisual-System-Video"></iframe>
                      </div>
                    </div>
                    <div class = "boxC">
                      <script type="module" src="/js/coin.js"></script>
                    </div>
                    <div class = "subdescription">The main CryptoChart display window is also able to display a 24 hour and 7 - day OHLC bar chart, with red and green colors across the UI indicating a loss or gain. The prices displayed in the outer window are also able to change the current USD coin value to instead display 1-hour OHLC market data.</div>
                    <div class = "boxB">
                        <div class = 'images'> <img src="/img/crypto.png" class="responsiveSystem"></div>
                    </div>
                  <div class = "subdescription">Along with being able to run in real-time at 60 frames per second; this system also uploads its chart and statistics on X (also known as Twitter) daily at: <a href = "https://x.com/dn_cryptochart"> https://x.com/dn_cryptochart </a></div>
                  <div class = "iframe-container">
                      <div><iframe src="https://player.vimeo.com/video/1072029509?h=353138da28&badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1"
                                   allow="autoplay; fullscreen; picture-in-picture"
                                   allowfullscreen
                                   style="pointer-events: none; border: white 1px solid"
                                   title="CryptoVisual-System-Video"></iframe>
                      </div>
                  </div>
                  <div class = "techdescription">Technologies: TouchDesigner </div>
               </div>
  `
};


// Inject DIGITAL_TWIN (index 0) content from systems/DIGITAL_TWIN.html lines 56–194.
window.carouselInfo = window.carouselInfo || [];
window.carouselInfo[0] = {
  html: `
               <div class = "sPageTitle">xArm.SYSTEM</div>
               <div class = "description">Real-Time Robotic Arm Digital Twin System </div>
               <div class = "iframe-container">
                  <div><iframe src="https://player.vimeo.com/video/1053833143?h=353138da28?&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="REEL.MOV"></iframe></div>
               </div>
               <div class = "blogText">
                  <div class = "span">> System Information: </div>
               </div>
               <div class="infosection">
                  <div class = "subdescription">The xArm.SYSTEM is a Real-Time Robotic Arm Digital Twin System that mirrors the movement of the xArm robotic arm within a simulated 3D environment, allowing for immediate, accurate feedback of the xArm in real-time, and the ability to change operation settings on the fly.  </div>
                  <div class = "iframe-container">
                       <div><iframe src="https://player.vimeo.com/video/1095999657?h=353138da28?&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" style=" border: white 1px solid;" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;" title="REEL.MOV"></iframe></div>
                  </div>
                  <div class = "subdescription">To the right of the interface is the 3D environment of the Digital Twin itself, running in real-time while displaying the claw’s current position and the claw's path as it moves from position to position, updating continuously to reflect the synchronization between the physical xArm Robotic Arm itself and the Digital Twin render.</div>
                  <div class = "boxB">
                       <div class = 'images'> <img src="/img/dtUI.jpg" class="responsiveSystem"></div>
                  </div>
                  <div class = "subdescription">To the left of the interface are all of the available controls for the system and data available for viewing, such as serial messages being sent for current status and current CPU usage of the system. User is able to control 5 servos controlling the xArm, configure speed settings of the arm, and add or remove the visual pathing of the digital twin.</div>
                  <div class = "iframe-container">
                       <div><iframe src="https://player.vimeo.com/video/1072607533?h=353138da28&badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowfullscreen
                                    style="pointer-events: none; border: white 1px solid;"
                                    title="CryptoVisual-System-Video"></iframe>
                       </div>
                  </div>
                  <div class = "subdescription">xArm.System has two modes: Manual and Auto. Manual works as described earlier; using the UI sliders to manually adjust the bot itself. Auto mode automatically detects the color block of the user's choice, and using Open CV the camera detects the position of the colored object itself, then sending the correct position of the object to the the 5 servos; and activating the claw to open open and grab object.</div>
                  <div class = "subdescription">The follow Python script is the main driver for Auto mode:</div>
                  <div class="codeContainer">
                       <pre class="shiki vitesse-dark" style="background-color:#121212;color:#dbd7caee" tabindex="0"><code><span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">import cv2 as cv</span></span>
<span class="line"><span style="color:#DBD7CAEE">import numpy as np</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE"># Constants</span></span>
<span class="line"><span style="color:#DBD7CAEE">width </span><span style="color:#666666">=</span><span style="color:#4C9A91"> 10</span><span style="color:#DBD7CAEE">  # Real width of the object in cm</span></span>
<span class="line"><span style="color:#DBD7CAEE">focal </span><span style="color:#666666">=</span><span style="color:#4C9A91"> 450</span><span style="color:#DBD7CAEE">  # Focal length of the camera</span></span>
<span class="line"><span style="color:#DBD7CAEE">kernel </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> cv.</span><span style="color:#80A665">getStructuringElement</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">cv.MORPH_ELLIPSE</span><span style="color:#666666">,</span><span style="color:#666666"> (</span><span style="color:#4C9A91">5</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 5</span><span style="color:#666666">))</span></span>
<span class="line"><span style="color:#DBD7CAEE">dist </span><span style="color:#666666">=</span><span style="color:#4C9A91"> 0</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE"># Define colors</span></span>
<span class="line"><span style="color:#DBD7CAEE">blue   </span><span style="color:#666666">=</span><span style="color:#666666"> (</span><span style="color:#4C9A91">255</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 0</span><span style="color:#666666">,</span><span style="color:#4C9A91">   0</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">green  </span><span style="color:#666666">=</span><span style="color:#666666"> (</span><span style="color:#4C9A91">0</span><span style="color:#666666">,</span><span style="color:#4C9A91">   255</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 0</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">red    </span><span style="color:#666666">=</span><span style="color:#666666"> (</span><span style="color:#4C9A91">0</span><span style="color:#666666">,</span><span style="color:#4C9A91">   0</span><span style="color:#666666">,</span><span style="color:#4C9A91">   255</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">yellow </span><span style="color:#666666">=</span><span style="color:#666666"> (</span><span style="color:#4C9A91">0</span><span style="color:#666666">,</span><span style="color:#4C9A91">   255</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 255</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">purple </span><span style="color:#666666">=</span><span style="color:#666666"> (</span><span style="color:#4C9A91">255</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 0</span><span style="color:#666666">,</span><span style="color:#4C9A91">   255</span><span style="color:#666666">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">color_map </span><span style="color:#666666">=</span><span style="color:#666666"> {</span></span>
<span class="line"><span style="color:#C98A7D77">    '</span><span style="color:#C98A7D">RED</span><span style="color:#C98A7D77'>"</span><span style="color:#DBD7CAEE">: red</span><span style="color:#666666">,</span></span>
<span class="line"><span style="color:#C98A7D77">    '</span><span style="color:#C98A7D">BLUE</span><span style="color:#C98A7D77">'</span><span style="color:#DBD7CAEE">: blue</span><span style="color:#666666">,</span></span>
<span class="line"><span style="color:#C98A7D77">    '</span><span style="color:#C98A7D">GREEN</span><span style="color:#C98A7D77">'</span><span style="color:#DBD7CAEE">: green</span><span style="color:#666666">,</span></span>
<span class="line"><span style="color:#C98A7D77">    '</span><span style="color:#C98A7D">YELLOW</span><span style="color:#C98A7D77">'</span><span style="color:#DBD7CAEE">: yellow</span><span style="color:#666666">,</span></span>
<span class="line"><span style="color:#C98A7D77">    '</span><span style="color:#C98A7D">PURPLE</span><span style="color:#C98A7D77">'</span><span style="color:#DBD7CAEE">: purple</span></span>
<span class="line"><span style="color:#666666">}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE"># Set the color you want to detect</span></span>
<span class="line"><span style="color:#DBD7CAEE">selected_color </span><span style="color:#666666">=</span><span style="color:#80A665"> str</span><span style="color:#666666">(</span><span style="color:#80A665">op</span><span style="color:#666666">(</span><span style="color:#C98A7D77">'</span><span style="color:#C98A7D">colorName</span><span style="color:#C98A7D77">'</span><span style="color:#666666">)[</span><span style="color:#4C9A91">0</span><span style="color:#666666">,</span><span style="color:#4C9A91">0</span><span style="color:#666666">])</span><span style="color:#DBD7CAEE">.</span><span style="color:#80A665">upper</span><span style="color:#666666">()</span></span>
<span class="line"><span style="color:#DBD7CAEE">x </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> color_map.</span><span style="color:#80A665">get</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">selected_color</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> red</span><span style="color:#666666">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE"># Precompute HSV ranges once at startup</span></span>
<span class="line"><span style="color:#DBD7CAEE">HSV_RANGES </span><span style="color:#666666">=</span><span style="color:#666666"> {}</span></span>
<span class="line"><span style="color:#4D9375">for</span><span style="color:#DBD7CAEE"> name</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> bgr in color_map.</span><span style="color:#80A665">items</span><span style="color:#666666">()</span><span style="color:#DBD7CAEE">:</span></span>
<span class="line"><span style="color:#DBD7CAEE">    hsv </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> cv.</span><span style="color:#80A665">cvtColor</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">np.</span><span style="color:#80A665">uint8</span><span style="color:#666666">([[</span><span style="color:#DBD7CAEE">bgr</span><span style="color:#666666">]]),</span><span style="color:#DBD7CAEE"> cv.COLOR_BGR2HSV</span><span style="color:#666666">)[</span><span style="color:#4C9A91">0</span><span style="color:#666666">][</span><span style="color:#4C9A91">0</span><span style="color:#666666">]</span></span>
<span class="line"><span style="color:#DBD7CAEE">    h </span><span style="color:#666666">=</span><span style="color:#CB7676"> int</span><span style="color:#666666">(</span><span style="color:#BD976A">hsv</span><span style="color:#666666">[</span><span style="color:#4C9A91">0</span><span style="color:#666666">])</span></span>
<span class="line"><span style="color:#4D9375">    if</span><span style="color:#DBD7CAEE"> name </span><span style="color:#CB7676">==</span><span style="color:#C98A7D77"> '</span><span style="color:#C98A7D">RED</span><span style="color:#C98A7D77">'</span><span style="color:#DBD7CAEE">:</span></span>
<span class="line"><span style="color:#DBD7CAEE">        lowerLimit </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> np.</span><span style="color:#80A665">array</span><span style="color:#666666">([</span><span style="color:#4C9A91">150</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 140</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 140</span><span style="color:#666666">],</span><span style="color:#DBD7CAEE"> dtype</span><span style="color:#666666">=</span><span style="color:#DBD7CAEE">np.uint8</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">        upperLimit </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> np.</span><span style="color:#80A665">array</span><span style="color:#666666">([</span><span style="color:#4C9A91">179</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 210</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 210</span><span style="color:#666666">],</span><span style="color:#DBD7CAEE"> dtype</span><span style="color:#666666">=</span><span style="color:#DBD7CAEE">np.uint8</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#4D9375">    else</span><span style="color:#DBD7CAEE">:</span></span>
<span class="line"><span style="color:#DBD7CAEE">        lowerLimit </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> np.</span><span style="color:#80A665">array</span><span style="color:#666666">([</span><span style="color:#80A665">max</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">h </span><span style="color:#CB7676">-</span><span style="color:#4C9A91"> 30</span><span style="color:#666666">,</span><span style="color:#4C9A91">0</span><span style="color:#666666">),</span><span style="color:#4C9A91"> 50</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 50</span><span style="color:#666666">],</span><span style="color:#DBD7CAEE"> dtype</span><span style="color:#666666">=</span><span style="color:#DBD7CAEE">np.uint8</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">        upperLimit </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> np.</span><span style="color:#80A665">array</span><span style="color:#666666">([</span><span style="color:#80A665">min</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">h </span><span style="color:#CB7676">+</span><span style="color:#4C9A91"> 30</span><span style="color:#666666">,</span><span style="color:#4C9A91">179</span><span style="color:#666666">),</span><span style="color:#4C9A91"> 255</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 255</span><span style="color:#666666">],</span><span style="color:#DBD7CAEE"> dtype</span><span style="color:#666666">=</span><span style="color:#DBD7CAEE">np.uint8</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#BD976A">    HSV_RANGES</span><span style="color:#666666">[</span><span style="color:#DBD7CAEE">name</span><span style="color:#666666">]</span><span style="color:#666666"> =</span><span style="color:#666666"> (</span><span style="color:#DBD7CAEE">lowerLimit</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> upperLimit</span><span style="color:#666666">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">def </span><span style="color:#80A665">get_dist</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">rect</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> image</span><span style="color:#666666">)</span><span style="color:#DBD7CAEE">:</span></span>
<span class="line"><span style="color:#DBD7CAEE">    pixels </span><span style="color:#666666">=</span><span style="color:#BD976A"> rect</span><span style="color:#666666">[</span><span style="color:#4C9A91">1</span><span style="color:#666666">][</span><span style="color:#4C9A91">0</span><span style="color:#666666">]</span></span>
<span class="line"><span style="color:#DBD7CAEE">    dist </span><span style="color:#666666">=</span><span style="color:#666666"> (</span><span style="color:#DBD7CAEE">width </span><span style="color:#CB7676">*</span><span style="color:#DBD7CAEE"> focal</span><span style="color:#666666">)</span><span style="color:#CB7676"> /</span><span style="color:#DBD7CAEE"> pixels  </span></span>
<span class="line"><span style="color:#DBD7CAEE">    table </span><span style="color:#666666">=</span><span style="color:#80A665"> op</span><span style="color:#666666">(</span><span style="color:#C98A7D77">'</span><span style="color:#C98A7D">cv_table</span><span style="color:#C98A7D77">'</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#BD976A">    table</span><span style="color:#666666">[</span><span style="color:#4C9A91">0</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 0</span><span style="color:#666666">]</span><span style="color:#666666"> =</span><span style="color:#80A665"> str</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">dist</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#4D9375">    return</span><span style="color:#DBD7CAEE"> image</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">#Detect Colors</span></span>
<span class="line"><span style="color:#DBD7CAEE">def </span><span style="color:#80A665">get_limits</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">color</span><span style="color:#666666">)</span><span style="color:#DBD7CAEE">:</span></span>
<span class="line"><span style="color:#4D9375">    return</span><span style="color:#DBD7CAEE"> HSV_RANGES.</span><span style="color:#80A665">get</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">selected_color</span><span style="color:#666666">,</span><span style="color:#666666"> (</span><span style="color:#DBD7CAEE">np.</span><span style="color:#80A665">array</span><span style="color:#666666">([</span><span style="color:#4C9A91">0</span><span style="color:#666666">,</span><span style="color:#4C9A91">0</span><span style="color:#666666">,</span><span style="color:#4C9A91">0</span><span style="color:#666666">]),</span><span style="color:#DBD7CAEE"> np.</span><span style="color:#80A665">array</span><span style="color:#666666">([</span><span style="color:#4C9A91">179</span><span style="color:#666666">,</span><span style="color:#4C9A91">255</span><span style="color:#666666">,</span><span style="color:#4C9A91">255</span><span style="color:#666666">])))</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">#Used to update servo positions in Touchdesigner</span></span>
<span class="line"><span style="color:#DBD7CAEE">def </span><span style="color:#80A665">update_constant_chops</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">dist</span><span style="color:#666666">)</span><span style="color:#DBD7CAEE">:</span></span>
<span class="line"><span style="color:#DBD7CAEE">    constant_chop </span><span style="color:#666666">=</span><span style="color:#80A665"> op</span><span style="color:#666666">(</span><span style="color:#C98A7D77">'</span><span style="color:#C98A7D">fillValues</span><span style="color:#C98A7D77">'</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">    constant_chop.par.value0 </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> dist</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">def </span><span style="color:#80A665">onCook</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">scriptOp</span><span style="color:#666666">)</span><span style="color:#DBD7CAEE">:</span></span>
<span class="line"><span style="color:#80A665">    debug</span><span style="color:#666666">(</span><span style="color:#C98A7D77">'</span><span style="color:#C98A7D">onCook called</span><span style="color:#C98A7D77">'</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">    top </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> scriptOp.</span><span style="color:#BD976A">inputs</span><span style="color:#666666">[</span><span style="color:#4C9A91">0</span><span style="color:#666666">]</span><span style="color:#DBD7CAEE">  # This means the script is reading frame from the input of this operator</span><span style="color:#666666">;</span><span style="color:#DBD7CAEE"> in most cases our webcams.</span></span>
<span class="line"><span style="color:#4D9375">    if</span><span style="color:#DBD7CAEE"> top is None:</span></span>
<span class="line"><span style="color:#80A665">        debug</span><span style="color:#666666">(</span><span style="color:#C98A7D77">'</span><span style="color:#C98A7D">Error: Could not find input</span><span style="color:#C98A7D77">'</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#4D9375">        return</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">    img </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> top.</span><span style="color:#80A665">numpyArray</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">delayed</span><span style="color:#666666">=</span><span style="color:#DBD7CAEE">True</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#4D9375">    if</span><span style="color:#DBD7CAEE"> img is None:</span></span>
<span class="line"><span style="color:#80A665">        debug</span><span style="color:#666666">(</span><span style="color:#C98A7D77">'</span><span style="color:#C98A7D">Error: No frame data available</span><span style="color:#C98A7D77">'</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#4D9375">        return</span></span>
<span class="line"></span>
<span class="line"><span style="color:#80A665">    debug</span><span style="color:#666666">(</span><span style="color:#C98A7D77">'</span><span style="color:#C98A7D">Img received</span><span style="color:#C98A7D77">'</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">    hsvImg </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> cv.</span><span style="color:#80A665">cvtColor</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">img</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> cv.COLOR_BGR2HSV</span><span s tyle="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">    lowerLimit</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> upperLimit </span><span style="color:#666666">=</span><span style="color:#80A665"> get_limits</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">x</span><span style="color:#666666">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#80A665">    debug</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">f</span><span style="color:#C98A7D77">"</span><span style="color:#C98A7D">Thresholds → low: {lowerLimit}, high: {upperLimit}</span><span style="color:#C98A7D77">"</span><span style="color:#666666">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">    mask </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> cv.</span><span style="color:#80A665">inRange</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">hsvImg</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> lowerLimit</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> upperLimit</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">    img2 </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> cv.</span><span style="color:#80A665">morphologyEx</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">mask</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> cv.MORPH_OPEN</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> kernel</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> iterations</span><span style="color:#666666">=</span><span style="color:#4C9A91">2</span><span style="color:#666666">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">    contours</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> _ </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> cv.</span><span style="color:#80A665">findContours</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">img2</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> cv.RETR_EXTERNAL</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> cv.CHAIN_APPROX_SIMPLE</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#4D9375">    if</span><span style="color:#DBD7CAEE"> contours:</span></span>
<span class="line"><span style="color:#DBD7CAEE">        cnt </span><span style="color:#666666">=</span><span style="color:#80A665"> max</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">contours</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> key</span><span style="color:#666666">=</span><span style="color:#DBD7CAEE">cv.contourArea</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">        area </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> cv.</span><span style="color:#80A665">contourArea</span><span style="color:#666666">(</span><span style=                                                                                                                                                                                                                                                   ="color:#DBD7CAEE">cnt</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#4D9375">        if</span><span style="color:#4C9A91"> 100</span><span style="color:#CB7676"> &#x3C;</span><span style="color:#DBD7CAEE"> area </span><span style="color:#CB7676">&#x3C;</span><span style="color:#4C9A91"> 306000</span><span style="color:#DBD7CAEE">:</span></span>
<span class="line"><span style="color:#DBD7CAEE">            rect </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> cv.</span><span style="color:#80A665">minAreaRect</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">cnt</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">            box </span><span style="color:#666666">=</span><span style="color:#DBD7CAEE"> np.</span><span style="color:#80A665">intp</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">cv.</span><span style="color:#80A665">boxPoints</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">rect</span><span style="color:#666666">))</span></span>
<span class="line"><span style="color:#DBD7CAEE">            cv.</span><span style="color:#80A665">drawContours</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">img</span><span style="color:#666666">,</span><span style="color:#666666"> [</span><span style="color:#DBD7CAEE">box</span><span style="color:#666666">],</span><span style="color:#CB7676"> -</span><span style="color:#4C9A91">1</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> x</span><span style="color:#666666">,</span><span style="color:#4C9A91"> 3</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#DBD7CAEE">            img </span><span style="color:#666666">=</span><span style="color:#80A665"> get_dist</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">rect</span><span style="color:#666666">,</span><span style="color:#DBD7CAEE"> img</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#80A665">            update_constant_chops</span><span style="color:#666666">((</span><span style="color:#DBD7CAEE">width </span><span style="color:#CB7676">*</span><span style="color:#DBD7CAEE"> focal</span><span style="color:#666666">)</span><span style="color:#CB7676"> /</span><span style="color:#BD976A"> rect</span><span style="color:#666666">[</span><span style="color:#4C9A91">1</span><span style="color:#666666">][</span><span style="color:#4C9A91">0</span><span style="color:#666666">])</span></span>
<span class="line"></span>
<span class="line"><span style="color:#DBD7CAEE">    scriptOp.</span><span style="color:#80A665">copyNumpyArray</span><span style="color:#666666">(</span><span style="color:#DBD7CAEE">img</span><span style="color:#666666">)</span></span>
<span class="line"><span style="color:#4D9375">    return</span></span>
<span class="line"></span>
<span class="line"></span></code></pre>
                  </div>
                   <p></p>
                  <div class = "iframe-container">
                       <div><iframe src="https://player.vimeo.com/video/1096319813?h=353138da28&badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowfullscreen
                                    style="pointer-events: none; border: white 1px solid;"
                                    title="CryptoVisual-System-Video"></iframe>
                       </div>
                  </div>
                  <div class = "subdescription">This system is driven by Touchdesigner, which in turn is sending serial messages to a modified Arduino Uno to then control xArm's servos and claw.</div>
                  <div class = "boxA">
                       <div class = 'images'> <img src="/img/xarm-png.png" class="responsiveSystem"></div>
                  </div>
                  <div class = "techdescription">Technologies: TouchDesigner | Hiwonder xArm | Arduino   </div>
               </div>
  `
};

// Inject T_STREAM (index 2) content from systems/T_STREAM.html lines 56–112.
window.carouselInfo[2] = {
  html: `
               <div class = "sPageTitle">T_STREAM SYSTEM</div>
               <div class = "description"> Dual Twitch Streaming & Tourney Layout System</div>
               <div class = "iframe-container">
                    <div class = "twitch-video"><iframe src="https://player.twitch.tv/?collection=9t9EG_SbzxYqFg&video=1589470132&parent=DIGITIZEDNOISE.com" frameborder="0" allowfullscreen="true" scrolling="no" height="720" width="1280"></iframe></div>
               </div>
               <div class = "blogText">
                    <div class = "span">> System Information: </div>
               </div>
               <div class="infosection">
                    <div class = 'subdescription'>
                         Stream.System is a live virtual production streaming system built with Touchdesigner that displays video feeds,
                         displays, user controller inputs, various special FX and transitions; and Twitch data all in real-time. The entire system has been optimized with the intent of
                         running at a 60FPS for offline and online broadcast purpose.
                         It's main purpose initially was to properly display a player's controller inputs when playing their video game of choice; for this purpose
                         I chose Fighting Games, since I feel that is the genre that can really benefit from displaying controller inputs in real-time.
                         <br>
                    </div>
                    <div class="boxA">
                         <div class = 'images'> <img src="/img/streaming.jpg" class="responsiveSystem"></div>
                         <div class = 'copyright'>GUILTY GEAR: STRIVE © Arc System Works</div>
                    </div>
                    <div class = "subdescription">
                         The Default mode is the default and original mode; this was the first iteration of the system.
                         The bottom part of the screen is taken up by the camera input of the user, their current controller's display,
                         and a second - screen which displays Twitch - Chat. It has since then been updated with the ability for Multiple Camera Filter FX .
                         Reactions to appear inside the Chat Box screen by listening for Twitch GET / POST Requests.
                         <br>
                    </div>
                    <div class="boxA">
                         <div class = 'images'> <img src="/img/streaming.jpg" class="responsiveSystem"></div>
                         <div class = 'copyright'>GUILTY GEAR: STRIVE © Arc System Works</div>
                    </div>
                    <div class="subdescription">
                         In it's Modular mode, the main feed takes up the entire screen space and instead the camera, controller, and second-screen displays  are placed in dynamic windows; with the user free to move, remove, insert, and scale Windows around the screen; giving the user much more flexibility as to what they would like displayed on the main screen.
                         <br>
                    </div>
                    <div class="boxB">
                         <div class = 'images'> <img src="/gif/tourney.gif" class="responsiveSystem"></div>
                         <div class = 'copyright'>TEKKEN 7 © Bandai-Namco</div>
                    </div>
                    <div class="subdescription">
                         Player Two display two camera feeds and two controllers inputs within the same screen space at a fixed position; featuring a score system to keep track of current player scores with various Twitch FX able to appear throughout different areas of the screen. This particular mode is Esports friendly, with players being able to plug and play their preferred controller to compete with. A player is able to join camera and audio feed online over RTSP, however controller inputs cannot be displayed for the other player.
                    </div>
                    <div class = "iframe-container">
                         <div class = "twitch-video"><iframe src="https://player.twitch.tv/?channel=digitizednoise&parent=digitizednoise.com" frameborder="0" allowfullscreen="true" scrolling="no" height="720" width="1280"></iframe></div>
                    </div>
                    <div class = "iframe-container">
                         <div class = "twitch-video"><iframe src="https://www.twitch.tv/embed/digitizednoise/chat?parent=digitizednoise.com" frameborder="0" allowfullscreen="true" scrolling="no" height="720" width="1280"></iframe></div>
                    </div>
                    <div class="boxB">
                         <div class = 'images'> <img src="/gif/tourney.gif" class="responsiveSystem"></div>
                         <div class = 'copyright'>TEKKEN 7 © Bandai-Namco</div>
                    </div>
                    <div class = "techdescription">Technologies: TouchDesigner | OBS  </div>
               </div>
  `
};
