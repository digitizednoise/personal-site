document.addEventListener('DOMContentLoaded', () => {
    const caret = document.querySelector('.clients-caret');
    const links = document.querySelectorAll('.clients p a');
    const container = document.querySelector('.clients');

    if (!caret || links.length === 0 || !container) return;

    let currentLink = links[0];

    const updateCaret = (link) => {
        if (!link || !caret || !container) return;
        
        // Use requestAnimationFrame to ensure layout is ready
        requestAnimationFrame(() => {
            const linkRect = link.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Calculate position relative to container
            // We center the caret vertically relative to the link
            const linkFontSize = parseFloat(getComputedStyle(link).fontSize);
            const caretFontSize = parseFloat(getComputedStyle(caret).fontSize);
            
            const y = (linkRect.top - containerRect.top) + (linkRect.height - caret.offsetHeight) / 2;
            const x = linkRect.left - containerRect.left + (linkFontSize * 0.15);

            caret.style.transform = `translate(${x}px, ${y}px)`;
            caret.classList.add('visible');
        });
    };

    links.forEach(link => {
        const handleInteraction = () => {
            currentLink = link;
            updateCaret(link);
        };

        // Desktop hover
        link.addEventListener('mouseenter', handleInteraction);

        // Mobile tap / Keyboard focus
        link.addEventListener('focus', handleInteraction);

        // Mobile touch for immediate feedback
        link.addEventListener('touchstart', handleInteraction, {passive: true});
    });

    // Initialize position
    // We use multiple checks to handle font loading and layout shifts
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

    // Re-align on load (for fonts/images)
    window.addEventListener('load', () => {
        updateCaret(currentLink);
    });
});
