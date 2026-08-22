export function initNavigation({ buttonId = 'navmenu', modalSelector = '.navModal' } = {}) {
  const menuButton = document.getElementById(buttonId);
  const navModal = document.querySelector(modalSelector);
  if (!menuButton || !navModal) return null;

  const links = [...navModal.querySelectorAll('a[href]')];
  let isOpen = false;

  function setOpen(nextState, { restoreFocus = true } = {}) {
    isOpen = nextState;
    menuButton.classList.toggle('change', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    navModal.classList.toggle('active', isOpen);
    navModal.setAttribute('aria-hidden', String(!isOpen));
    navModal.inert = !isOpen;
    document.body.dataset.navOpen = String(isOpen);

    requestAnimationFrame(() => {
      if (isOpen) {
        links[0]?.focus();
      } else if (restoreFocus) {
        menuButton.focus();
      }
    });
  }

  function trapFocus(event) {
    const focusableElements = [menuButton, ...links];
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    if (!focusableElements.includes(document.activeElement)) {
      event.preventDefault();
      links[0]?.focus();
    } else if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  menuButton.addEventListener('click', () => setOpen(!isOpen));
  navModal.addEventListener('click', (event) => {
    if (event.target.closest('a[href]')) setOpen(false, { restoreFocus: false });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab' && isOpen) {
      trapFocus(event);
    }
  });

  setOpen(false, { restoreFocus: false });
  return { close: () => setOpen(false), open: () => setOpen(true) };
}

initNavigation();
