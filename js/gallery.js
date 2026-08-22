const LIGHTBOX_TRIGGER_SELECTOR = '.gallery-item, [data-vimeo], [data-youtube]';
const VIMEO_IFRAME_SELECTOR = 'iframe[src*="player.vimeo.com/video/"][src*="background=1"]';
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'iframe',
].join(',');

const vimeoPlayers = new WeakMap();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let lastFocusedElement = null;
let previousBodyOverflow = null;
let backgroundInertState = [];
let lightboxInertState = [];

function getVimeoPlayerConstructor() {
  return globalThis.Vimeo?.Player ?? null;
}

function getVimeoPlayer(iframe) {
  const Player = getVimeoPlayerConstructor();
  if (!Player || !iframe) return null;

  let player = vimeoPlayers.get(iframe);
  if (!player) {
    player = new Player(iframe);
    vimeoPlayers.set(iframe, player);
  }
  return player;
}

function getBackgroundVimeoIframes() {
  return [...document.querySelectorAll(VIMEO_IFRAME_SELECTOR)];
}

function callOnBackgroundPlayers(method) {
  if (!getVimeoPlayerConstructor()) return;

  getBackgroundVimeoIframes().forEach((iframe) => {
    getVimeoPlayer(iframe)
      ?.[method]()
      .catch(() => {
        // Browser autoplay and media-control policies can reject these promises.
      });
  });
}

function setBackgroundInert(lightbox, shouldInert) {
  if (shouldInert) {
    if (backgroundInertState.length) return;

    const closeControl = document.querySelector('.lightbox-close');
    lightboxInertState = [...new Set([lightbox, closeControl])]
      .filter(Boolean)
      .map((element) => ({
        element,
        wasInert: element.hasAttribute('inert'),
      }));
    lightboxInertState.forEach(({ element }) => element.removeAttribute('inert'));

    const seen = new Set();
    const allowedSelector = '.menubar, .navModal';
    const rememberAndInert = (element) => {
      if (seen.has(element)) return;
      seen.add(element);
      backgroundInertState.push({ element, wasInert: element.hasAttribute('inert') });
      element.setAttribute('inert', '');
    };
    const inertOutsideAllowedControls = (element) => {
      if (element.matches(allowedSelector)) return;
      if (!element.querySelector(allowedSelector)) {
        rememberAndInert(element);
        return;
      }
      [...element.children].forEach(inertOutsideAllowedControls);
    };

    backgroundInertState = [];
    [...document.body.children].forEach((element) => {
      if (
        element === lightbox ||
        element.matches('script, style, link, .lightbox-close')
      ) {
        return;
      }
      inertOutsideAllowedControls(element);
    });
    return;
  }

  backgroundInertState.forEach(({ element, wasInert }) => {
    element.toggleAttribute('inert', wasInert);
  });
  backgroundInertState = [];

  lightboxInertState.forEach(({ element, wasInert }) => {
    element.toggleAttribute('inert', wasInert);
  });
  lightboxInertState = [];
}

function createIframe({ src, title, allow, portrait = false }) {
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.width = '800';
  iframe.height = '450';
  iframe.title = title;
  iframe.allow = allow;
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  if (portrait) iframe.classList.add('portrait-video');
  return iframe;
}

function createLoadingVideo(portrait) {
  const placeholder = document.createElement('video');
  placeholder.src = portrait ? '/media/webm/loading.webm' : '/media/webm/loading-2.webm';
  placeholder.className = 'vimeo-placeholder';
  placeholder.autoplay = !reducedMotion.matches;
  placeholder.loop = true;
  placeholder.muted = true;
  placeholder.defaultMuted = true;
  placeholder.playsInline = true;
  placeholder.preload = 'auto';
  placeholder.setAttribute('loop', '');
  placeholder.addEventListener('ended', () => {
    placeholder.currentTime = 0;
    placeholder.play().catch(() => {});
  });
  placeholder.setAttribute('aria-hidden', 'true');
  return placeholder;
}

function revealVimeo(container, placeholder, status) {
  if (!placeholder.isConnected) return;

  placeholder.style.opacity = '0';
  container.classList.remove('is-loading');
  container.removeAttribute('aria-busy');
  status?.remove();
  placeholder.addEventListener('transitionend', () => placeholder.remove(), {
    once: true,
  });
}

function monitorVimeo(iframe, container, placeholder, status) {
  let revealed = false;
  let playerIsConnected = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    revealVimeo(container, placeholder, status);
  };

  const connectPlayer = () => {
    if (revealed || playerIsConnected || !iframe.isConnected) return;

    const player = getVimeoPlayer(iframe);
    if (!player) return;

    playerIsConnected = true;
    player.on('play', reveal);
    player
      .getPaused()
      .then((paused) => {
        if (!paused) reveal();
      })
      .catch(() => {});
  };

  // Attach first, then check synchronously so an async SDK cannot finish in
  // the gap between the initial check and listener registration.
  document
    .querySelector('script[src*="player.vimeo.com/api/player.js"]')
    ?.addEventListener('load', connectPlayer, { once: true });
  // Lightbox media is assembled before its wrapper is attached to the page.
  // Defer the immediate SDK check until that synchronous render is complete.
  queueMicrotask(connectPlayer);
}

function createVimeoMedia(vimeoId, title, portrait) {
  const iframe = createIframe({
    src: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
    title: `${title} video`,
    allow: 'autoplay; fullscreen; picture-in-picture',
    portrait,
  });
  const container = document.createElement('div');
  const placeholder = createLoadingVideo(portrait);
  const status = document.createElement('span');

  container.className = 'lightbox-vimeo-container is-loading';
  container.setAttribute('aria-busy', 'true');
  if (portrait) container.classList.add('portrait-container');

  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading video…';

  container.append(placeholder, iframe, status);
  monitorVimeo(iframe, container, placeholder, status);
  return container;
}

function createYouTubeMedia(url, title, portrait) {
  const separator = url.includes('?') ? '&' : '?';
  return createIframe({
    src: `${url}${separator}autoplay=1`,
    title: `${title} video`,
    allow:
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen; picture-in-picture; web-share',
    portrait,
  });
}

function getVimeoId(trigger, sourceIframe) {
  const explicitId = trigger.dataset.vimeo;
  if (explicitId) return explicitId;
  return sourceIframe?.src.match(/vimeo\.com\/video\/(\d+)/)?.[1] ?? null;
}

function createMedia(trigger) {
  const sourceIframe = trigger.querySelector('iframe');
  const sourceImage = trigger.querySelector('img');
  const sourceVideo = trigger.querySelector('video');
  const portrait = trigger.classList.contains('portrait');
  const title =
    trigger.getAttribute('aria-label') || sourceImage?.alt || sourceIframe?.title || 'Media';
  const youtubeUrl = trigger.dataset.youtube;
  const vimeoId = getVimeoId(trigger, sourceIframe);

  if (youtubeUrl) return createYouTubeMedia(youtubeUrl, title, portrait);
  if (vimeoId) return createVimeoMedia(vimeoId, title, portrait);
  if (sourceIframe?.src.includes('youtube.com')) {
    return createYouTubeMedia(sourceIframe.src, title, portrait);
  }

  if (sourceImage) {
    const image = document.createElement('img');
    image.src = sourceImage.currentSrc || sourceImage.src;
    image.alt = sourceImage.alt;
    return image;
  }

  if (sourceVideo) {
    const video = document.createElement('video');
    video.src = sourceVideo.currentSrc || sourceVideo.src;
    video.autoplay = !reducedMotion.matches;
    video.controls = true;
    video.loop = sourceVideo.loop;
    video.playsInline = true;
    return video;
  }

  return null;
}

function createMediaInfo(trigger) {
  const softwareText = trigger.querySelector('.item-type')?.textContent?.trim();
  if (!softwareText) return null;

  const info = document.createElement('div');
  const software = document.createElement('div');
  const year = document.createElement('div');

  info.className = 'lightbox-info';
  software.className = 'lightbox-software';
  software.textContent = softwareText;
  year.className = 'lightbox-year';
  year.textContent = trigger.dataset.year || '';
  info.append(software);
  if (year.textContent) info.append(year);
  return info;
}

function renderLightboxContent(content, trigger) {
  const media = createMedia(trigger);
  if (!media) return false;

  const wrapper = document.createElement('div');
  const info = createMediaInfo(trigger);
  wrapper.className = 'lightbox-media-wrapper';
  wrapper.append(media);
  if (info) wrapper.append(info);
  content.replaceChildren(wrapper);
  return true;
}

function openLightbox(trigger) {
  const lightbox = document.getElementById('lightbox');
  const content = document.getElementById('lightboxContent');
  if (!lightbox || !content || !renderLightboxContent(content, trigger)) return;

  lastFocusedElement = trigger;
  callOnBackgroundPlayers('pause');
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  setBackgroundInert(lightbox, true);
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    document.querySelector('.lightbox-close')?.focus();
  });
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox?.classList.contains('active')) return;

  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  setBackgroundInert(lightbox, false);
  document.body.style.overflow = previousBodyOverflow ?? '';
  previousBodyOverflow = null;
  document.getElementById('lightboxContent')?.replaceChildren();
  callOnBackgroundPlayers('play');

  if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
  lastFocusedElement = null;
}

function trapLightboxFocus(event, lightbox) {
  const closeControl = document.querySelector('.lightbox-close');
  const focusableElements = [
    ...new Set([closeControl, ...lightbox.querySelectorAll(FOCUSABLE_SELECTOR)]),
  ].filter((element) => element && element.getAttribute('aria-hidden') !== 'true');
  if (!focusableElements.length) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);
  if (!focusableElements.includes(document.activeElement)) {
    event.preventDefault();
    firstElement.focus();
  } else if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function handleDocumentClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  if (target.closest('.lightbox-close')) {
    event.preventDefault();
    event.stopPropagation();
    closeLightbox();
    return;
  }

  const lightbox = target.closest('#lightbox');
  if (lightbox && target === lightbox) {
    event.preventDefault();
    event.stopPropagation();
    closeLightbox();
    return;
  }

  const trigger = target.closest(LIGHTBOX_TRIGGER_SELECTOR);
  if (!trigger || !document.getElementById('lightbox')) return;

  // Capture prevents legacy inline handlers in excluded, injected system content.
  event.stopPropagation();
  const isModifiedLinkClick =
    trigger.matches('a[href]') &&
    (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
  if (isModifiedLinkClick) return;

  event.preventDefault();
  openLightbox(trigger);
}

function handleDocumentKeydown(event) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox?.classList.contains('active')) return;
  if (event.defaultPrevented || document.body.dataset.navOpen === 'true') return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeLightbox();
  } else if (event.key === 'Tab') {
    trapLightboxFocus(event, lightbox);
  }
}

function setupVimeoPreviews() {
  getBackgroundVimeoIframes().forEach((iframe) => {
    if (iframe.dataset.vimeoPreviewReady === 'true') return;

    const container = iframe.closest('.gallery-item, .iframe-container, .images, .carousel-item');
    if (!container) return;

    iframe.dataset.vimeoPreviewReady = 'true';
    const portrait =
      container.classList.contains('portrait') || Boolean(container.closest('.portrait'));
    const placeholder =
      container.querySelector('.vimeo-placeholder') || createLoadingVideo(portrait);
    if (!placeholder.isConnected) container.insertBefore(placeholder, iframe);

    container.classList.add('is-loading');
    container.setAttribute('aria-busy', 'true');
    monitorVimeo(iframe, container, placeholder, null);
  });
}

function stopReducedMotionPreviews() {
  if (!reducedMotion.matches) return;
  document.querySelectorAll('.gallery-item > video').forEach((video) => video.pause());
}

function initGallery() {
  document.addEventListener('click', handleDocumentClick, true);
  document.addEventListener('keydown', handleDocumentKeydown);
  setupVimeoPreviews();
  stopReducedMotionPreviews();

  const previewObserver = new MutationObserver(() => setupVimeoPreviews());
  previewObserver.observe(document.body, { childList: true, subtree: true });
}

initGallery();
