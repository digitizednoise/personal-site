// horizontal-scroll.js - Convert vertical scroll to horizontal scroll

class HorizontalScrollGallery {
    constructor() {
        this.gallery = document.querySelector('.gallery');
        this.container = document.querySelector('.visualWrapper');
        this.scrollSpeed = 1.5;
        this.targetX = 0;
        this.currentX = 0;
        this.animationFrameId = null;

        if (this.gallery && this.container) {
            this.init();
        }
    }

    init() {
        // Add smooth transition to gallery
        this.gallery.style.transition = 'transform 0.2s ease-out';

        // Add wheel event listener for horizontal scrolling
        this.container.addEventListener('wheel', (e) => this.handleScroll(e), { passive: false });

        // Add touch support for mobile
        this.addTouchSupport();

        // Add keyboard support
        this.addKeyboardSupport();

        // Clamp position on load and when layout changes
        this.addResizeHandling();
        this.targetX = this.getCurrentX();
        this.currentX = this.targetX;
    }

    handleScroll(e) {
        e.preventDefault();

        const scrollAmount = e.deltaY * this.scrollSpeed;
        this.targetX = this.targetX - scrollAmount;

        // Clamp target to bounds
        const containerWidth = this.container.offsetWidth;
        const galleryWidth = this.gallery.scrollWidth;
        const maxScroll = -(galleryWidth - containerWidth);
        this.targetX = Math.min(0, Math.max(maxScroll, this.targetX));

        // Apply immediately (CSS transition handles smoothing)
        this.gallery.style.transform = `translateX(${this.targetX}px)`;
        this.currentX = this.targetX;
    }

    addTouchSupport() {
        let startX = 0;
        let isDragging = false;

        // Disable transition during touch for immediate feedback
        this.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.gallery.style.transition = 'none';
            this.targetX = this.getCurrentX();
        });

        this.container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const currentTouchX = e.touches[0].clientX;
            const deltaX = currentTouchX - startX;

            this.targetX = this.targetX + deltaX;
            this.clampToBounds(this.targetX);

            startX = currentTouchX;
        }, { passive: false });

        this.container.addEventListener('touchend', () => {
            isDragging = false;
            // Re-enable transition
            this.gallery.style.transition = 'transform 0.1s ease-out';
        });
    }

    addKeyboardSupport() {
        document.addEventListener('keydown', (e) => {
            if (!this.container.matches(':hover')) return;

            let scrollAmount = 0;

            switch(e.key) {
                case 'ArrowRight':
                    scrollAmount = 100;
                    break;
                case 'ArrowLeft':
                    scrollAmount = -100;
                    break;
                default:
                    return;
            }

            e.preventDefault();

            this.targetX = this.targetX - scrollAmount;
            this.clampToBounds(this.targetX);
        });
    }

    addResizeHandling() {
        const clamp = () => {
            this.targetX = this.getCurrentX();
            this.clampToBounds(this.targetX);
        };
        window.addEventListener('resize', clamp);
        window.addEventListener('orientationchange', clamp);

        if (window.ResizeObserver) {
            const ro = new ResizeObserver(clamp);
            ro.observe(this.gallery);
            this._ro = ro;
        }
    }

    getCurrentX() {
        const currentTransform = getComputedStyle(this.gallery).transform;
        if (currentTransform && currentTransform !== 'none') {
            const match = currentTransform.match(/matrix\((.+)\)/);
            if (match) {
                const parts = match[1].split(', ');
                const x = parseFloat(parts[4]);
                return isNaN(x) ? 0 : x;
            }
        }
        return 0;
    }

    clampToBounds(x) {
        const containerWidth = this.container.offsetWidth;
        const galleryWidth = this.gallery.scrollWidth;
        const maxScroll = -(galleryWidth - containerWidth);
        const constrainedX = Math.min(0, Math.max(maxScroll, x));
        this.gallery.style.transform = `translateX(${constrainedX}px)`;
        this.targetX = constrainedX;
        this.currentX = constrainedX;
        return constrainedX;
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    new HorizontalScrollGallery();
});