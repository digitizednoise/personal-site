
// CLIENTS CARET (TERMINAL-CURSOR)
// Attach an animated ">" that follows the currently focused/hovered link
// inside any `.clients` container. Exposes `window.ClientsCaret.init(root)`
// so it can be re-run after content is injected dynamically (systems page).

(function () {
    function attach(container) {
        if (!container || container.dataset.clientsCaretBound === 'true') return;

        const caret = container.querySelector('.clients-caret');
        const links = container.querySelectorAll('p a');
        if (!caret || links.length === 0) return;

        container.dataset.clientsCaretBound = 'true';

        let currentLink = links[0];

        const updateCaret = (link) => {
            if (!link) return;
            requestAnimationFrame(() => {
                const linkRect = link.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
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
            link.addEventListener('mouseenter', handleInteraction);
            link.addEventListener('focus', handleInteraction);
            link.addEventListener('touchstart', handleInteraction, { passive: true });
        });

        const reflow = () => updateCaret(currentLink);
        setTimeout(reflow, 100);
        setTimeout(reflow, 500);
        setTimeout(reflow, 2000);

        window.addEventListener('resize', reflow);
        window.addEventListener('load', reflow);
    }

    function init(root) {
        const scope = root || document;
        scope.querySelectorAll('.clients').forEach(attach);
    }

    window.ClientsCaret = { init };

    document.addEventListener('DOMContentLoaded', () => init(document));
})();
