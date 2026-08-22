const imgCarousel = (() => {
    let autoPlayIntervals = [];

    /**
     @param {HTMLElement} btn - Clicked Button
     @param {number} direction - 1 for next, -1 for previous.
     */
    const updateSlide = (btn, direction) => {
        const container = btn.closest('.carousel-container');
        if (!container) return;
        performSlideUpdate(container, direction);
    };

    const performSlideUpdate = (container, direction) => {
        const items = Array.from(container.querySelectorAll('.carousel-item'));
        if (!items.length) return;

        const currentIndex = items.findIndex(item => item.classList.contains('active'));
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex = (safeIndex + direction + items.length) % items.length;

        items[safeIndex]?.classList.remove('active');
        items[nextIndex].classList.add('active');
    };

    const stopAutoPlay = () => {
        autoPlayIntervals.forEach(clearInterval);
        autoPlayIntervals = [];
    };

    const startAutoPlay = () => {
        stopAutoPlay();
        const containers = document.querySelectorAll('.carousel-container');
        containers.forEach(container => {
            const interval = setInterval(() => {
                performSlideUpdate(container, 1);
            }, 8000); // 8 seconds as requested
            autoPlayIntervals.push(interval);
        });
    };

    const init = () => {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.carousel-prev, .carousel-next');
            if (!btn) return;
            const direction = btn.classList.contains('carousel-next') ? 1 : -1;
            updateSlide(btn, direction);
            
            // Restart auto-play on manual interaction to reset the timer
            startAutoPlay();
        });
    };

    return { init, startAutoPlay, stopAutoPlay };
})();

// Execute
imgCarousel.init();
window.imgCarousel = imgCarousel;