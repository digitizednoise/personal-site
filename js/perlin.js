// Perlin Noise Flow Field Background (perlin.js sketch)
// Renders a subtle animated flow field as a full-page background on any page that includes perlin.js and this script.

let dn_particles = [];
let dn_flowField = [];
let dn_cols, dn_rows;
let dn_scl = 15;
let dn_zoff = 0;
let dn_numParticles = 350;
let dn_canvas;

function setup() {
    dn_canvas = createCanvas(windowWidth, windowHeight);
    // Place canvas behind other content and ignore pointer events
    dn_canvas.style('position', 'fixed');
    dn_canvas.style('top', '0');
    dn_canvas.style('left', '0');
    dn_canvas.style('z-index', '-1');
    dn_canvas.style('pointer-events', 'none');

    // Add glow effect using CSS filters
    dn_canvas.style('filter', 'blur(1px) brightness(1.6) contrast(1.4)');
    dn_canvas.style('mix-blend-mode', 'screen');

    background(0);

    dn_cols = floor(width / dn_scl) + 1;
    dn_rows = floor(height / dn_scl) + 1;

    // Initialize particles
    dn_particles = [];
    for (let i = 0; i < dn_numParticles; i++) {
        dn_particles[i] = new DN_Particle();
    }
}

function draw() {

    if (frameCount > 1000) { // perlin.js automatically tracks frameCount
        noLoop();
        return;
    }
    // Much more subtle fade effect for longer trails
    fill(0, 0.1);
    noStroke();
    rect(0, 0, width, height);

    // Update flow field
    let yoff = 0;
    for (let y = 0; y < dn_rows; y++) {
        let xoff = 0;
        for (let x = 0; x < dn_cols; x++) {
            let angle = noise(xoff, yoff, dn_zoff) * TWO_PI * 2;
            let v = p5.Vector.fromAngle(angle);
            v.setMag(0.8);
            let index = x + y * dn_cols;
            dn_flowField[index] = v;
            xoff += 0.08;
        }
        yoff += 0.08;
    }

    // Update and display particles
    for (let i = 0; i < dn_particles.length; i++) {
        dn_particles[i].follow(dn_flowField);
        dn_particles[i].update();
        dn_particles[i].edges();
        dn_particles[i].show();
    }

    dn_zoff += 0.002;
}

class DN_Particle {
    constructor() {
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.maxSpeed = 1.5;
        this.prevPos = this.pos.copy();
        this.alpha = random(30, 80);
    }

    follow(vectors) {
        let x = floor(this.pos.x / dn_scl);
        let y = floor(this.pos.y / dn_scl);
        let index = x + y * dn_cols;
        let force = vectors[index];
        if (force) {
            this.acc.add(force);
        }
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    show() {
        // blue, white, or red
        //stroke(0,180,255, this.alpha);
        stroke(255,255,255, this.alpha);
        //stroke(255,0,0, this.alpha);
        strokeWeight(0.3);  // Slightly thicker for better glow visibility
        line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
        this.updatePrev();
    }

    updatePrev() {
        this.prevPos.x = this.pos.x;
        this.prevPos.y = this.pos.y;
    }

    edges() {
        if (this.pos.x > width) {
            this.pos.x = 0;
            this.updatePrev();
        }
        if (this.pos.x < 0) {
            this.pos.x = width;
            this.updatePrev();
        }
        if (this.pos.y > height) {
            this.pos.y = 0;
            this.updatePrev();
        }
        if (this.pos.y < 0) {
            this.pos.y = height;
            this.updatePrev();
        }
    }
}

function windowResized() {
    // Debounce so we don't clear/repaint 60 times while dragging the window size
    clearTimeout(window.__dnResizeTimer);
    window.__dnResizeTimer = setTimeout(() => {
        // Capture the current canvas content BEFORE resizing
        const canvasImage = get();

        // Resize the canvas (this clears it)
        resizeCanvas(windowWidth, windowHeight);

        // Restore what we had, scaled to fill the new canvas
        // (prevents newly exposed area from being black)
        image(canvasImage, 0, 0, width, height);

        // Update grid dimensions for the new canvas size
        dn_cols = floor(width / dn_scl) + 1;
        dn_rows = floor(height / dn_scl) + 1;

        // Keep particles in-bounds and keep their trails continuous
        for (let i = 0; i < dn_particles.length; i++) {
            if (dn_particles[i].pos.x > width) {
                dn_particles[i].pos.x = width - 10;
            }
            if (dn_particles[i].pos.y > height) {
                dn_particles[i].pos.y = height - 10;
            }
            dn_particles[i].prevPos.x = dn_particles[i].pos.x;
            dn_particles[i].prevPos.y = dn_particles[i].pos.y;
        }
    }, 120);
}
