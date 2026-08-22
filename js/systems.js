import * as THREE from 'three/webgpu';
import {
    pass, Fn, If, uniform, float, vec2, vec3, color,
    instancedArray, instanceIndex, hash, time, mx_noise_float, length, smoothstep
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import Stats from 'three/addons/libs/stats.module.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import cryptoVisual from './systems-content/cryptoVisual.js';
import digitalTwin from './systems-content/digitalTwin.js';
import streamSystem from './systems-content/streamSystem.js';

// --- Vimeo Loading Helpers ---
const dnVimeoPlayerCache = new WeakMap();

function getVimeoPlayerForIframe(iframe) {
    if (!window.Vimeo?.Player) return null;
    let player = dnVimeoPlayerCache.get(iframe);
    if (!player) {
        player = new Vimeo.Player(iframe);
        dnVimeoPlayerCache.set(iframe, player);
    }
    return player;
}

function setupVimeoPlaceholders(root) {
    if (!window.Vimeo?.Player) return;
    const vimeoIframes = Array.from(root.querySelectorAll('iframe[src*="player.vimeo.com/video/"][src*="background=1"]'));
    vimeoIframes.forEach((iframe) => {
        const container = iframe.closest('.iframe-container, .images, .carousel-item, .gallery-item');
        if (!container) return;
        let placeholder = container.querySelector('.vimeo-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('video');
            const isPortrait = container.classList.contains('portrait') || container.closest('.portrait');
            placeholder.src = isPortrait ? '/media/webm/loading.webm' : '/media/webm/loading-2.webm';
            placeholder.className = 'vimeo-placeholder';
            placeholder.autoplay = true;
            placeholder.loop = true;
            placeholder.muted = true;
            placeholder.playsInline = true;
            container.insertBefore(placeholder, iframe);
        }
        const player = getVimeoPlayerForIframe(iframe);
        if (!player) return;
        container.classList.add('is-loading');
        const cleanup = () => {
            placeholder.style.opacity = '0';
            container.classList.remove('is-loading');
            setTimeout(() => { if (placeholder.parentNode) placeholder.remove(); }, 800);
        };
        player.on('play', cleanup);
        player.getPaused().then(paused => { if (!paused) cleanup(); });
    });
}

/**
 * SystemManager - Manages UI and navigation for the systems section.
 */
class SystemManager {
    static CONFIG = {
        SYSTEMS: [
            { name: 'SYSTEM SLOT 1', isPlaceholder: true },
            { name: 'SYSTEM SLOT 2', isPlaceholder: true },
            { name: 'SYSTEM SLOT 3', isPlaceholder: true },
            { name: 'DIGITAL TWIN' }, // Index 3
            { name: 'SYSTEM SLOT 4', isPlaceholder: true },
            { name: 'SYSTEM SLOT 5', isPlaceholder: true },
            { name: 'SYSTEM SLOT 6', isPlaceholder: true },
            { name: 'STREAM.SYSTEM' }, // Index 7
            { name: 'CRYPTOVISUAL' }, // Index 8
            { name: 'SYSTEM SLOT 7', isPlaceholder: true },
            { name: 'SYSTEM SLOT 8', isPlaceholder: true },
            { name: 'SYSTEM SLOT 9', isPlaceholder: true }
        ],
        SECTIONS: [
            { label: 'RED',   infoIndex: 3 },
            { label: 'GREEN', infoIndex: 8 },
            { label: 'BLUE',  infoIndex: 7 }
        ]
    };

    #container;
    #currentSection = null;
    #selectedIndex = -1;
    #carouselInfo = [];
    #isTransitioning = false;

    // UI related
    #uiContent;
    #uiInnerContent;
    #infoPanel;
    #systemsNav;
    #isMouseOverPanel = false;
    #scrollTracker = 0;
    #scrollDelayStartTime = Date.now();
    #typewriterTimeouts = [];
    #lastFocusedElement = null;
    #backgroundInertState = [];

    constructor(container, carouselInfo = []) {
        this.#container = container || document.body;
        this.#carouselInfo = carouselInfo;
    }

    async init() {
        this.#setupEvents();
        this.#setupUI();

        const greenSection = SystemManager.CONFIG.SECTIONS.find(s => s.label === 'GREEN');
        if (greenSection) this.focusOn(greenSection, false);

        this.#animate();
    }

    #setupEvents() {
        window.addEventListener('resize', this.#onResize.bind(this));

        document.querySelectorAll('.sys-btn').forEach(btn => {
            const previewButtonColor = () => {
                const isCurrentlyOpen = this.#infoPanel?.classList.contains('is-active');
                if (!isCurrentlyOpen) {
                    window.systemsVisual?.setColor(btn.getAttribute('data-section'));
                }
            };

            const restorePreviewColor = () => {
                requestAnimationFrame(() => {
                    const isCurrentlyOpen = this.#infoPanel?.classList.contains('is-active');
                    if (isCurrentlyOpen) return;

                    const focusedButton = document.querySelector('.sys-btn:focus-visible');
                    const hoveredButton = document.querySelector('.sys-btn:hover');
                    const previewButton = focusedButton || hoveredButton;

                    if (previewButton) {
                        window.systemsVisual?.setColor(previewButton.getAttribute('data-section'));
                    } else if (this.#currentSection) {
                        window.systemsVisual?.setColor(this.#currentSection.label);
                    }
                });
            };

            btn.addEventListener('click', () => {
                const label = btn.getAttribute('data-section');
                const section = SystemManager.CONFIG.SECTIONS.find(s => s.label === label);
                if (section) {
                    this.#lastFocusedElement = btn;
                    this.focusOn(section);
                }
            });

            btn.addEventListener('mouseenter', previewButtonColor);
            btn.addEventListener('focus', previewButtonColor);
            btn.addEventListener('mouseleave', restorePreviewColor);
            btn.addEventListener('blur', restorePreviewColor);
        });
    }

    #onResize() {
        if (this.#selectedIndex !== -1) {
            const isCurrentlyActive = this.#infoPanel?.classList.contains('is-active') || false;
            this.#performUIUpdate(this.#selectedIndex, !isCurrentlyActive);
        }
    }

    #setupUI() {
        this.#systemsNav    = document.querySelector('.systems-nav');
        this.#uiContent     = document.getElementById('info-content');
        this.#uiInnerContent = document.getElementById('info-inner-content');
        this.#infoPanel     = document.getElementById('systems-info-panel');

        if (this.#infoPanel) {
            const enter = () => { this.#isMouseOverPanel = true; };
            const leave = () => {
                this.#isMouseOverPanel = false;
                if (this.#uiContent) this.#scrollTracker = this.#uiContent.scrollTop;
                this.#scrollDelayStartTime = Date.now();
            };

            this.#infoPanel.addEventListener('mouseenter', enter);
            this.#infoPanel.addEventListener('mouseleave', leave);
            this.#infoPanel.addEventListener('touchstart', enter, { passive: true });
            this.#infoPanel.addEventListener('touchend',   leave, { passive: true });

            this.#uiContent?.addEventListener('scroll', () => {
                if (this.#isMouseOverPanel) this.#scrollTracker = this.#uiContent.scrollTop;
            }, { passive: true });

            document.querySelector('.info-panel-close')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeInfoPanel();
            });

            this.#infoPanel.addEventListener('click', (e) => {
                if (e.target === this.#infoPanel) this.closeInfoPanel();
            });
        }

        window.addEventListener('keydown', (e) => {
            if (document.getElementById('lightbox')?.classList.contains('active')) return;
            if (document.body.dataset.navOpen === 'true') return;

            if (e.key === 'Escape' && this.#infoPanel?.classList.contains('is-active')) {
                e.preventDefault();
                this.closeInfoPanel();
                return;
            }

            if (e.key === 'Tab' && this.#infoPanel?.classList.contains('is-active')) {
                this.#trapPanelFocus(e);
            }
        });

        window.closeInfoPanel = () => this.closeInfoPanel();
    }

    async focusOn(section, openPanel = true) {
        if (this.#isTransitioning) return;

        this.#currentSection = section;
        this.#selectedIndex  = section.infoIndex;

        document.querySelectorAll('.sys-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-section') === section.label);
        });

        window.systemsVisual?.setColor(section.label);

        const isCurrentlyOpen = this.#infoPanel?.classList.contains('is-active');
        const skipToggle      = !openPanel && !isCurrentlyOpen;

        // Auto-collapse the systems-nav when opening the panel
        if (openPanel) {
            document.body.classList.add('systems-nav-collapsed');
        }

        this.#performUIUpdate(this.#selectedIndex, skipToggle);
    }

    #performUIUpdate(i, skipToggle = false) {
        const data = SystemManager.CONFIG.SYSTEMS[i];
        if (i !== -1 && data) {
            if (this.#uiContent) {
                this.#uiContent.scrollTop = 0;
                this.#scrollTracker = 0;
                this.#scrollDelayStartTime = Date.now();
            }

            const info = this.#carouselInfo[i];
            if (this.#uiInnerContent) {
                this.#uiInnerContent.innerHTML = info
                    ? (typeof info === 'string' ? info : (info.html || ''))
                    : `<p>System details for ${data.name} will appear here.</p>`;

                this.#clearTypewriterTimeouts();
                this.#uiInnerContent.querySelectorAll('.typewriter-text').forEach(el => this.#typeWriter(el));

                if (window.ClientsCaret) {
                    window.ClientsCaret.init(this.#uiInnerContent);
                }

                if (this.#uiInnerContent.querySelector('.codeContainer')) {
                    CodeMagnifier.init('.codeContainer');
                }

                if (window.imgCarousel) window.imgCarousel.startAutoPlay();

                setupVimeoPlaceholders(this.#uiInnerContent);
            }
        }

        if (this.#infoPanel) {
            const desktop = this.#isDesktopOrLandscape();
            this.#infoPanel.classList.toggle('desktop-layout', desktop);

            if (window.HorizontalScroll) {
                if (desktop && this.#selectedIndex !== -1) {
                    window.HorizontalScroll.init('.right-scroll-wrapper', '.layout-scroll-row');
                } else {
                    window.HorizontalScroll.destroy('.right-scroll-wrapper');
                }
            }

            if (!skipToggle) {
                const active = this.#selectedIndex !== -1;
                const wasActive = this.#infoPanel.classList.contains('is-active');
                this.#infoPanel.classList.toggle('is-active', active);
                this.#infoPanel.setAttribute('aria-hidden', String(!active));
                this.#setBackgroundInert(active);

                const isLightboxMode = window.innerWidth <= 1100 && !desktop;
                document.body.style.overflow = (active && isLightboxMode) ? 'hidden' : '';
                document.documentElement.style.overflow = (active && isLightboxMode) ? 'hidden' : '';

                if (active && !wasActive) {
                    requestAnimationFrame(() => document.querySelector('.info-panel-close')?.focus());
                }
            }
        }
    }

    #isDesktopOrLandscape() {
        const isLandscapeMobile = window.innerWidth <= 950 && window.innerHeight <= 500 && window.innerWidth > window.innerHeight;
        const isMobileLayout    = window.innerWidth <= 1100 && !isLandscapeMobile;
        return !isMobileLayout;
    }

    #setBackgroundInert(shouldInert) {
        if (!this.#infoPanel) return;

        if (shouldInert) {
            if (this.#backgroundInertState.length) return;

            const seen = new Set();
            const allowedSelector = '.info-panel-close, .menubar, .navModal';
            const rememberAndInert = (element) => {
                if (seen.has(element)) return;
                seen.add(element);
                this.#backgroundInertState.push({ element, wasInert: element.hasAttribute('inert') });
                element.setAttribute('inert', '');
            };
            const inertOutsideAllowedControls = (element) => {
                if (element.matches(allowedSelector)) return;
                if (!element.querySelector(allowedSelector)) {
                    rememberAndInert(element);
                    return;
                }
                Array.from(element.children).forEach(inertOutsideAllowedControls);
            };
            let node = this.#infoPanel;

            while (node.parentElement) {
                Array.from(node.parentElement.children).forEach((sibling) => {
                    if (sibling === node || sibling.matches('script, style, link') || seen.has(sibling)) return;
                    inertOutsideAllowedControls(sibling);
                });
                node = node.parentElement;
            }
            return;
        }

        this.#backgroundInertState.forEach(({ element, wasInert }) => {
            if (wasInert) {
                element.setAttribute('inert', '');
            } else {
                element.removeAttribute('inert');
            }
        });
        this.#backgroundInertState = [];
    }

    #trapPanelFocus(e) {
        const closeControl = document.querySelector('.info-panel-close');
        const focusableElements = [closeControl, ...this.#infoPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), iframe')]
            .filter((element) => element && !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

        if (focusableElements.length === 0) {
            e.preventDefault();
            this.#infoPanel.focus();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!focusableElements.includes(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
        } else if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }

    #typeWriter(element) {
        element.innerHTML = element.innerHTML.trim();
        element.classList.add('with-cursor');
    }

    #clearTypewriterTimeouts() {
        this.#typewriterTimeouts.forEach(t => clearTimeout(t));
        this.#typewriterTimeouts = [];
    }

    closeInfoPanel() {
        const elementToRestore = this.#lastFocusedElement;
        this.#lastFocusedElement = null;
        this.#selectedIndex = -1;
        this.#clearTypewriterTimeouts();
        if (window.imgCarousel) window.imgCarousel.stopAutoPlay();
        if (this.#infoPanel) {
            this.#infoPanel.querySelectorAll('iframe').forEach(iframe => iframe.remove());
        }
        
        // Auto-expand the systems-nav when closing the panel
        document.body.classList.remove('systems-nav-collapsed');

        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        this.#performUIUpdate(-1);

        if (elementToRestore?.isConnected) {
            elementToRestore.focus();
        }
    }

    #animate() {
        requestAnimationFrame(this.#animate.bind(this));
    }
}

/**
 * CodeMagnifier - A magnifying glass effect for code containers.
 */
class CodeMagnifier {
    static #instance = null;
    #el;
    #content;
    #target = null;
    #zoom = 2;

    constructor() {
        if (CodeMagnifier.#instance) return CodeMagnifier.#instance;
        this.#createElements();
        CodeMagnifier.#instance = this;
    }

    #createElements() {
        this.#el = document.createElement('div');
        this.#el.className = 'code-magnifier';
        this.#content = document.createElement('div');
        this.#content.className = 'magnifier-content';
        this.#el.appendChild(this.#content);
        document.body.appendChild(this.#el);
    }

    attach(container) {
        if (container.dataset.magnifierAttached) return;
        container.addEventListener('mouseenter', (e) => this.#onEnter(e, container));
        container.addEventListener('mousemove',  (e) => this.#onMove(e));
        container.addEventListener('mouseleave', ()  => this.#onLeave());
        container.dataset.magnifierAttached = 'true';
    }

    #onEnter(e, container) {
        if (window.innerWidth <= 1100) return;
        this.#target = container;
        this.#content.innerHTML = container.innerHTML;
        this.#el.style.display = 'block';
        this.#update(e);
    }

    #onMove(e) { if (this.#target) this.#update(e); }

    #onLeave() {
        this.#target = null;
        this.#el.style.display = 'none';
        this.#content.innerHTML = '';
    }

    #update(e) {
        if (!this.#target) return;
        const rect = this.#target.getBoundingClientRect();
        this.#el.style.left = `${e.clientX}px`;
        this.#el.style.top  = `${e.clientY}px`;

        const relX = (e.clientX - rect.left) + this.#target.scrollLeft;
        const relY = (e.clientY - rect.top)  + this.#target.scrollTop;
        const magW = 180, magH = 180;
        this.#content.style.transform =
            `translate(${-relX * this.#zoom + magW / 2}px, ${-relY * this.#zoom + magH / 2}px) scale(${this.#zoom})`;
    }

    static init(selector) {
        const m = new CodeMagnifier();
        document.querySelectorAll(selector).forEach(el => m.attach(el));
    }
}

/**
 * SystemsVisual - WebGPU curl-noise GPU particle system.
 * Particles flow through a divergence-free noise field, color-reacting to the active section.
 * Rendering: SpriteNodeMaterial + AdditiveBlending + Bloom post-processing.
 */
class SystemsVisual {
    static #COLOR_MAP = {
        RED:   new THREE.Color(0xFF2200),
        GREEN: new THREE.Color(0x00FF00),
        BLUE:  new THREE.Color(0x0062FF)
    };

    static #PARAMS = {
        particleCount:  2000,
        noiseScale:     0.18,
        flowSpeed:      0.9,
        curlAmp:        10.6,
        attractPull:    30.0,
        damping:        0.94,
        particleSize:   0.055,
        colorIntensity: 2.4,
        bounds:         7.5,
        timeScale:      0.12,
        bloomStrength:  1.8,
        bloomRadius:    0.1,
        bloomThreshold: 0.0,
        showDebug:      false
    };

    #renderer     = null;
    #scene        = null;
    #camera       = null;
    #postProc     = null;
    #bloomPass    = null;
    #stats        = null;
    #gui          = null;
    #clock        = new THREE.Clock();

    #targetColor  = SystemsVisual.#COLOR_MAP.GREEN.clone();
    #currentColor = SystemsVisual.#COLOR_MAP.GREEN.clone();

    #params       = { ...SystemsVisual.#PARAMS };

    // TSL uniforms — bridged to CPU params each frame
    #u = {};

    // Pointer attractor — screen pointer unprojected onto the z=0 plane
    #pointerNDC     = new THREE.Vector2();
    #raycaster      = new THREE.Raycaster();
    #attractorPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    #attractorWorld = new THREE.Vector3();
    #pointerActive  = false;

    // Compute nodes
    #computeInit    = null;
    #computeUpdate  = null;
    #particleMesh   = null;
    #positionBuffer = null;
    #velocityBuffer = null;
    #lifeBuffer     = null;

    async init() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
        document.body.insertBefore(canvas, document.body.firstChild);

        try {
            this.#renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true });
            await this.#renderer.init();
        } catch {
            canvas.remove();
            return;
        }

        this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.setClearColor(0x000000, 0);

        this.#scene  = new THREE.Scene();
        this.#camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.#camera.position.set(0, 0, 14);

        this.#createUniforms();
        this.#updateReach();
        this.#buildParticleSystem();

        // Seed initial positions
        await this.#renderer.computeAsync(this.#computeInit);

        // Post-processing: bloom on the particle scene
        const scenePass = pass(this.#scene, this.#camera);
        const bloomPass = bloom(scenePass, this.#params.bloomStrength, this.#params.bloomRadius, this.#params.bloomThreshold);
        this.#bloomPass = bloomPass;
        this.#postProc  = new THREE.PostProcessing(this.#renderer);
        this.#postProc.outputNode = bloomPass;

        this.#setupDebugUI();

        window.addEventListener('resize', this.#onResize);
        window.addEventListener('keydown', this.#onKeyDown);
        this.#setupPointer();

        this.#clock.start();

        this.#renderer.setAnimationLoop(() => {
            const dt = Math.min(this.#clock.getDelta(), 0.05);
            this.#updateFrame(dt);
        });
    }

    #createUniforms() {
        this.#u = {
            noiseScale:     uniform(this.#params.noiseScale),
            flowSpeed:      uniform(this.#params.flowSpeed),
            curlAmp:        uniform(this.#params.curlAmp),
            damping:        uniform(this.#params.damping),
            particleSize:   uniform(this.#params.particleSize),
            colorIntensity: uniform(this.#params.colorIntensity),
            bounds:         uniform(this.#params.bounds),
            // Respawn limit — sized to the camera frustum so particles can reach the
            // cursor anywhere on screen. Spawn still uses the smaller `bounds` radius.
            maxBounds:      uniform(this.#params.bounds),
            timeScale:      uniform(this.#params.timeScale),
            deltaTime:      uniform(0.016),
            baseColor:      uniform(this.#currentColor.clone()),
            // Pointer attractor: world position + 0..1 strength (ramped when hovering)
            attractPull:      uniform(this.#params.attractPull),
            attractorPos:     uniform(new THREE.Vector3(0, 0, 0)),
            attractorStrength: uniform(0.0)
        };
    }

    #buildParticleSystem() {
        const count = this.#params.particleCount;

        this.#positionBuffer = instancedArray(count, 'vec3');
        this.#velocityBuffer = instancedArray(count, 'vec3');
        // vec2: x = current lifetime, y = max lifetime
        this.#lifeBuffer     = instancedArray(count, 'vec2');

        // --- Curl noise via finite differences on three offset noise fields ---
        const curlNoise = Fn(([p_input]) => {
            const p = p_input.toVar();
            const eps = float(0.35);

            const offA = vec3(0.0, 0.0, 0.0);
            const offB = vec3(41.7, 23.4, 55.9);
            const offC = vec3(78.2, 66.1, 12.3);

            const sampleN = (pos, off) => mx_noise_float(pos.add(off));

            const dNc_dy = sampleN(p.add(vec3(0, eps, 0)), offC).sub(sampleN(p.sub(vec3(0, eps, 0)), offC));
            const dNb_dz = sampleN(p.add(vec3(0, 0, eps)), offB).sub(sampleN(p.sub(vec3(0, 0, eps)), offB));
            const dNa_dz = sampleN(p.add(vec3(0, 0, eps)), offA).sub(sampleN(p.sub(vec3(0, 0, eps)), offA));
            const dNc_dx = sampleN(p.add(vec3(eps, 0, 0)), offC).sub(sampleN(p.sub(vec3(eps, 0, 0)), offC));
            const dNb_dx = sampleN(p.add(vec3(eps, 0, 0)), offB).sub(sampleN(p.sub(vec3(eps, 0, 0)), offB));
            const dNa_dy = sampleN(p.add(vec3(0, eps, 0)), offA).sub(sampleN(p.sub(vec3(0, eps, 0)), offA));

            return vec3(
                dNc_dy.sub(dNb_dz),
                dNa_dz.sub(dNc_dx),
                dNb_dx.sub(dNa_dy)
            );
        });

        // Spawn helper: pseudo-random point in a sphere shell
        const randomSpawn = Fn(([seed_in]) => {
            const seed = seed_in.toVar();
            const r1 = hash(seed.add(1.0));
            const r2 = hash(seed.add(2.0));
            const r3 = hash(seed.add(3.0));

            const theta = r1.mul(6.28318);
            const phi   = r2.mul(3.14159);
            // Cube root distribution for uniform volumetric density
            const radius = r3.pow(1.0 / 3.0).mul(this.#u.bounds).mul(0.9);

            const sinPhi = phi.sin();
            return vec3(
                sinPhi.mul(theta.cos()).mul(radius),
                phi.cos().mul(radius),
                sinPhi.mul(theta.sin()).mul(radius)
            );
        });

        // --- Init compute ---
        this.#computeInit = Fn(() => {
            const idx = instanceIndex.toFloat();
            const pos = this.#positionBuffer.element(instanceIndex);
            const vel = this.#velocityBuffer.element(instanceIndex);
            const life = this.#lifeBuffer.element(instanceIndex);

            pos.assign(randomSpawn(idx));
            vel.assign(vec3(0.0));

            const maxLife = hash(idx.add(7.0)).mul(4.0).add(2.0);
            life.assign(vec2(hash(idx.add(9.0)).mul(maxLife), maxLife));
        })().compute(count);

        // --- Update compute ---
        this.#computeUpdate = Fn(() => {
            const idx = instanceIndex.toFloat();
            const posSlot = this.#positionBuffer.element(instanceIndex);
            const velSlot = this.#velocityBuffer.element(instanceIndex);
            const lifeSlot = this.#lifeBuffer.element(instanceIndex);

            // Local mutable copies — write-back at the end to avoid RAW hazards on storage buffers
            const pos = posSlot.toVar();
            const vel = velSlot.toVar();
            const lifeX = lifeSlot.x.toVar();
            const lifeY = lifeSlot.y.toVar();

            const dt = this.#u.deltaTime;

            // Sample curl noise at the particle's scaled position, animated by time
            const samplePos = pos.mul(this.#u.noiseScale).add(time.mul(this.#u.timeScale));
            const curlForce = curlNoise(samplePos).mul(this.#u.curlAmp);

            // Pointer attraction: constant pull toward the cursor, gated by strength.
            // Guarded division avoids NaN when a particle sits exactly on the attractor.
            const toAttractor = this.#u.attractorPos.sub(pos);
            const attractDir  = toAttractor.div(length(toAttractor).max(0.0001));
            const attractForce = attractDir.mul(this.#u.attractPull).mul(this.#u.attractorStrength);

            // Semi-implicit Euler: v += (curl*flowSpeed + attract)*dt; v *= damping; p += v*dt
            vel.assign(
                vel.add(curlForce.mul(this.#u.flowSpeed).add(attractForce).mul(dt)).mul(this.#u.damping)
            );
            pos.assign(pos.add(vel.mul(dt)));
            lifeX.assign(lifeX.sub(dt));

            // Respawn if it escapes the reachable frustum or its life expired.
            // Spawning stays within the tighter `bounds`, so the idle cloud is centered.
            const respawn = length(pos).greaterThan(this.#u.maxBounds).or(lifeX.lessThanEqual(0.0));
            If(respawn, () => {
                pos.assign(randomSpawn(idx.add(time.mul(31.7))));
                vel.assign(vec3(0.0));
                lifeX.assign(lifeY);
            });

            posSlot.assign(pos);
            velSlot.assign(vel);
            lifeSlot.assign(vec2(lifeX, lifeY));
        })().compute(count);

        // --- Render material ---
        const material = new THREE.SpriteNodeMaterial({
            transparent: true,
            depthWrite:  false,
            blending:    THREE.AdditiveBlending
        });

        material.positionNode = this.#positionBuffer.element(instanceIndex);
        material.scaleNode    = this.#u.particleSize;

        // Fade in/out over lifetime; hot core based on velocity magnitude
        const lifeNode  = this.#lifeBuffer.element(instanceIndex);
        const velNode   = this.#velocityBuffer.element(instanceIndex);
        const lifeFrac  = lifeNode.x.div(lifeNode.y.add(0.0001)).saturate();
        const fadeAlpha = smoothstep(0.0, 0.15, lifeFrac).mul(smoothstep(1.0, 0.7, lifeFrac));
        const speed     = length(velNode).mul(0.4).saturate();

        const hot  = color(0xffffff).mul(speed);
        const tint = this.#u.baseColor.mul(this.#u.colorIntensity);
        material.colorNode   = tint.add(hot);
        material.opacityNode = fadeAlpha;

        const geometry = new THREE.PlaneGeometry(1, 1);
        this.#particleMesh = new THREE.InstancedMesh(geometry, material, count);
        this.#particleMesh.frustumCulled = false;
        this.#scene.add(this.#particleMesh);
    }

    #setupDebugUI() {
        // Stats
        this.#stats = new Stats();
        this.#stats.dom.classList.add('systems-stats');
        this.#stats.dom.style.cssText += 'position:fixed;top:8px;left:8px;z-index:100;opacity:0.7;';
        document.body.appendChild(this.#stats.dom);

        // GUI
        this.#gui = new GUI({ title: 'Particle System', width: 260 });
        this.#gui.domElement.classList.add('systems-gui');
        this.#gui.domElement.style.cssText += 'position:fixed;top:8px;right:8px;z-index:100;';

        const flow = this.#gui.addFolder('Flow');
        flow.add(this.#params, 'noiseScale', 0.02, 1.2, 0.005).onChange(v => this.#u.noiseScale.value = v);
        flow.add(this.#params, 'flowSpeed',  0.0,  3.0, 0.01) .onChange(v => this.#u.flowSpeed.value  = v);
        flow.add(this.#params, 'curlAmp',    0.0,  6.0, 0.01) .onChange(v => this.#u.curlAmp.value    = v);
        flow.add(this.#params, 'attractPull', 0.0, 80.0, 0.5).onChange(v => this.#u.attractPull.value = v);
        flow.add(this.#params, 'damping',    0.80, 0.999, 0.001).onChange(v => this.#u.damping.value = v);
        flow.add(this.#params, 'timeScale',  0.0,  1.0, 0.005).onChange(v => this.#u.timeScale.value = v);
        flow.add(this.#params, 'bounds',     2.0,  20.0, 0.1) .onChange(v => this.#u.bounds.value    = v);

        const look = this.#gui.addFolder('Appearance');
        look.add(this.#params, 'particleSize',   0.005, 0.3, 0.001).onChange(v => this.#u.particleSize.value   = v);
        look.add(this.#params, 'colorIntensity', 0.1,   6.0, 0.05) .onChange(v => this.#u.colorIntensity.value = v);

        const setBloom = (prop, v) => {
            const u = this.#bloomPass?.[prop];
            if (u && 'value' in u) u.value = v;
        };
        const post = this.#gui.addFolder('Bloom');
        post.add(this.#params, 'bloomStrength',  0.0, 6.0, 0.05).onChange(v => setBloom('strength',  v));
        post.add(this.#params, 'bloomRadius',    0.0, 2.0, 0.01).onChange(v => setBloom('radius',    v));
        post.add(this.#params, 'bloomThreshold', 0.0, 1.0, 0.01).onChange(v => setBloom('threshold', v));

        this.#gui.add({ reset: () => this.#reseedParticles() }, 'reset').name('Respawn Particles');

        this.#gui.close();

        // Debug hidden by default; press "D" to toggle
        this.#applyDebugVisibility();
    }

    #applyDebugVisibility() {
        const vis = this.#params.showDebug ? 'block' : 'none';
        if (this.#stats?.dom) this.#stats.dom.style.display = vis;
        if (this.#gui?.domElement) this.#gui.domElement.style.display = vis;
    }

    #onKeyDown = (e) => {
        if (e.key === 'd' || e.key === 'D') {
            // Ignore when typing in inputs
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            this.#params.showDebug = !this.#params.showDebug;
            this.#applyDebugVisibility();
        }
    };

    // Pointer/touch attractor. The canvas is pointer-events:none, so we listen on
    // window and read whatever DOM element is under the pointer to exclude the UI.
    #setupPointer() {
        // Don't attract while the pointer is over the nav or any open overlay UI.
        const EXCLUDE = '.systems-nav, .sidebar-toggle, #systems-info-panel, .systems-gui, .systems-stats';
        const overUI = (target) => !!(target && target.closest && target.closest(EXCLUDE));

        const setFromPointer = (e) => {
            if (overUI(e.target)) { this.#pointerActive = false; return; }
            this.#pointerNDC.x = (e.clientX / window.innerWidth)  * 2 - 1;
            this.#pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.#pointerActive = true;
        };
        const deactivate = () => { this.#pointerActive = false; };

        // pointermove covers mouse hover and touch-drag; pointerdown catches the
        // initial finger tap so a stationary touch still attracts.
        window.addEventListener('pointermove', setFromPointer, { passive: true });
        window.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') setFromPointer(e);
        }, { passive: true });
        window.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'touch') deactivate();
        }, { passive: true });
        window.addEventListener('pointercancel', deactivate, { passive: true });
        // Mouse leaving the document window ends the attraction.
        document.addEventListener('pointerleave', deactivate, { passive: true });
    }

    async #reseedParticles() {
        if (this.#computeInit && this.#renderer) {
            await this.#renderer.computeAsync(this.#computeInit);
        }
    }

    setColor(label) {
        const c = SystemsVisual.#COLOR_MAP[label];
        if (c) this.#targetColor.copy(c);
    }

    #onResize = () => {
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#updateReach();
    };

    // Size the respawn limit to the visible frustum at the z=0 plane (where the
    // attractor lives), so a cursor in any corner is still reachable. Widescreen
    // desktops get a large radius; portrait mobile stays close to `bounds`.
    #updateReach() {
        const distToPlane = Math.abs(this.#camera.position.z);
        const halfH = Math.tan((this.#camera.fov * Math.PI / 180) / 2) * distToPlane;
        const halfW = halfH * this.#camera.aspect;
        // Reach the screen corners, plus margin so particles can pool at the cursor
        // instead of respawning the instant they arrive.
        const reach = Math.hypot(halfW, halfH) * 1.25;
        this.#u.maxBounds.value = Math.max(reach, this.#params.bounds);
    }

    #updateFrame(dt) {
        this.#stats?.begin();

        // Interpolate section color CPU-side, then push into uniform
        this.#currentColor.lerp(this.#targetColor, 0.03);
        this.#u.baseColor.value.copy(this.#currentColor);
        this.#u.deltaTime.value = dt;

        // Unproject the pointer onto the z=0 plane so particles chase it in-scene,
        // then ramp attraction strength in/out for a smooth engage/release.
        if (this.#pointerActive) {
            this.#raycaster.setFromCamera(this.#pointerNDC, this.#camera);
            if (this.#raycaster.ray.intersectPlane(this.#attractorPlane, this.#attractorWorld)) {
                this.#u.attractorPos.value.copy(this.#attractorWorld);
            }
        }
        const targetStrength = this.#pointerActive ? 1.0 : 0.0;
        const cur = this.#u.attractorStrength.value;
        this.#u.attractorStrength.value = cur + (targetStrength - cur) * Math.min(1, dt * 6);

        this.#renderer.computeAsync(this.#computeUpdate);
        this.#postProc.renderAsync();

        this.#stats?.end();
    }
}

// --- Bootstrap ---
const carouselInfo = [];
carouselInfo[cryptoVisual.id] = cryptoVisual;
carouselInfo[digitalTwin.id]  = digitalTwin;
carouselInfo[streamSystem.id] = streamSystem;
window.carouselInfo = carouselInfo;

const visual = new SystemsVisual();
window.systemsVisual = visual;

// The panel element must exist in HTML before this script runs (it does — it's static)
// Load both in parallel — neither depends on the other
await visual.init();

const manager = new SystemManager(null, carouselInfo);
window.manager = manager;
await manager.init();

// Sidebar toggle — module runs after DOM is parsed, no need for DOMContentLoaded
const toggleBtn = document.getElementById('systems-sidebar-toggle');
const systemsNav = document.getElementById('systems-navigation');
if (toggleBtn) {
    const syncSystemsNavState = () => {
        const collapsed = document.body.classList.contains('systems-nav-collapsed');
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
        toggleBtn.setAttribute('aria-label', collapsed ? 'Show systems menu' : 'Hide systems menu');
        if (systemsNav) systemsNav.inert = collapsed;
    };

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('systems-nav-collapsed');
        syncSystemsNavState();
    });

    syncSystemsNavState();
}
