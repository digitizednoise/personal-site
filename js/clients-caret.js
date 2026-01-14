
// CLIENTS CARET (TERMINAL-CURSOR)

document.addEventListener('DOMContentLoaded', () => {
    const caret = document.querySelector('.clients-caret');
    const links = document.querySelectorAll('.clients p a');
    const container = document.querySelector('.clients');

    // Checking our current selected link.

    if (!caret || links.length === 0 || !container) return;
    let currentLink = links[0];

    const updateCaret = (link) => {
        if (!link || !caret || !container) return;
        
        // Is layout ready?
        requestAnimationFrame(() => {
            const linkRect = link.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Calculate position relative to clients container
            const linkFontSize = parseFloat(getComputedStyle(link).fontSize);
            
            const y = (linkRect.top - containerRect.top) + (linkRect.height - caret.offsetHeight) / 2;
            const x = linkRect.left - containerRect.left - (linkFontSize * 0.85);

            caret.style.transform = `translate(${x}px, ${y}px)`;
            caret.classList.add('visible');
        });
    };

    links.forEach(link => {
        const handleInteraction = () => {
            currentLink = link;
            updateCaret(link);
        };

        // Desktop Hover
        link.addEventListener('mouseenter', handleInteraction);

        // Mobile Tap / Keyboard
        link.addEventListener('focus', handleInteraction);

        // Mobile Immediate
        link.addEventListener('touchstart', handleInteraction, {passive: true});
    });

    // Initialize position
    const init = () => {
        updateCaret(currentLink);
    };

    // Initial call
    setTimeout(init, 100);
    // Secondary call for slower loading assets
    setTimeout(init, 500);
    // Final call just in case
    setTimeout(init, 2000);

    // Re-align on window resize
    window.addEventListener('resize', () => {
        updateCaret(currentLink);
    });

    // Re-align on load
    window.addEventListener('load', () => {
        updateCaret(currentLink);
    });
});
