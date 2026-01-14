// gallery.js - Lightbox and dynamic item utilities for Visual Gallery

(function(){
  // Cache Vimeo players per iframe to avoid recreating them on every pause/resume
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

  function getBackgroundVimeoIframes() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return [];

    // Only target the thumbnail/grid Vimeo embeds (background=1)
    return Array.from(gallery.querySelectorAll('iframe[src*="player.vimeo.com/video/"][src*="background=1"]'));
  }

  function pauseBackgroundVimeos() {
    if (!window.Vimeo?.Player) return;

    getBackgroundVimeoIframes().forEach((iframe) => {
      const player = getVimeoPlayerForIframe(iframe);
      if (!player) return;

      player.pause().catch(() => {
        // Some browsers/edge cases can reject; safe to ignore.
      });
    });
  }

  function resumeBackgroundVimeos() {
    if (!window.Vimeo?.Player) return;

    getBackgroundVimeoIframes().forEach((iframe) => {
      const player = getVimeoPlayerForIframe(iframe);
      if (!player) return;

      player.play().catch(() => {
        // Autoplay can still be blocked in some situations.
        // Usually OK here because closing the modal is a user gesture.
      });
    });
  }

  let lastFocusedElement = null;
  let dnLightboxBackdropHandlerBound = false;

  function openLightbox(element) {
    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent');
    if (!lightbox || !content) return;

    // Bind once: close on backdrop click (don’t reassign lightbox.onclick every open)
    if (!dnLightboxBackdropHandlerBound) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      dnLightboxBackdropHandlerBound = true;
    }

    // Save the element that triggered the lightbox to return focus later
    lastFocusedElement = element;

    // Pause background Vimeo thumbs so nothing plays behind the modal
    pauseBackgroundVimeos();

    // Reset display style just in case it was set to none previously
    lightbox.style.display = '';

    // Clear previous content
    content.innerHTML = '';

    // Check if it's a video (iframe) or image
    const iframe = element.querySelector?.('iframe');
    const img = element.querySelector?.('img');
    const isPortrait = element.classList?.contains('portrait');
    const youtubeUrl = element.getAttribute?.('data-youtube');
    const vimeoId = element.getAttribute?.('data-vimeo');
    const itemType = element.querySelector?.('.item-type')?.textContent || '';
    const itemYear = element.getAttribute?.('data-year') || '';

    let mediaElement = null;

    if (youtubeUrl) {
      const newIframe = document.createElement('iframe');
      const autoplayUrl = youtubeUrl.includes('?')
        ? `${youtubeUrl}&autoplay=1`
        : `${youtubeUrl}?autoplay=1`;

      newIframe.src = autoplayUrl;
      newIframe.width = '800';
      newIframe.height = '450';
      newIframe.frameBorder = '0';
      newIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen; picture-in-picture; web-share';
      newIframe.referrerPolicy = 'strict-origin-when-cross-origin';
      if (isPortrait) newIframe.classList.add('portrait-video');
      mediaElement = newIframe;
    } else if (vimeoId) {
      // Allow opening a Vimeo lightbox from ANY element that has data-vimeo (not just gallery items)
      const newIframe = document.createElement('iframe');
      newIframe.src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
      newIframe.width = '800';
      newIframe.height = '450';
      newIframe.frameBorder = '0';
      newIframe.allow = 'autoplay; fullscreen; picture-in-picture';
      if (isPortrait) newIframe.classList.add('portrait-video');
      mediaElement = newIframe;
    } else if (iframe) {
      // Handle YouTube video
      if (iframe.src.includes('youtube.com') || iframe.src.includes('youtu.be')) {
        const newIframe = document.createElement('iframe');
        // Extract YouTube video ID and create autoplay URL
        const youtubeUrl = iframe.src;
        const autoplayUrl = youtubeUrl.includes('?')
          ? `${youtubeUrl}&autoplay=1`
          : `${youtubeUrl}?autoplay=1`;

        newIframe.src = autoplayUrl;
        newIframe.width = '800';
        newIframe.height = '450';
        newIframe.frameBorder = '0';
        newIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen; picture-in-picture; web-share';
        newIframe.referrerPolicy = 'strict-origin-when-cross-origin';
        if (isPortrait) newIframe.classList.add('portrait-video');
        mediaElement = newIframe;
      }
      // Handle Vimeo video without data-vimeo attribute
      else if (iframe.src.includes('vimeo.com')) {
        const newIframe = document.createElement('iframe');
        // Extract Vimeo ID from the src and create autoplay URL
        const vimeoMatch = iframe.src.match(/vimeo\.com\/video\/(\d+)/);
        if (vimeoMatch) {
          const vimeoId = vimeoMatch[1];
          newIframe.src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
          newIframe.width = '800';
          newIframe.height = '450';
          newIframe.frameBorder = '0';
          newIframe.allow = 'autoplay; fullscreen; picture-in-picture';
          if (isPortrait) newIframe.classList.add('portrait-video');
          mediaElement = newIframe;
        }
      }
    } else if (img) {
      // Handle image (including animated WebP)
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      mediaElement = newImg;
    }

    if (mediaElement) {
      const wrapper = document.createElement('div');
      wrapper.className = 'lightbox-media-wrapper';
      wrapper.appendChild(mediaElement);

      if (itemType) {
        const info = document.createElement('div');
        info.className = 'lightbox-info';

        const software = document.createElement('div');
        software.className = 'lightbox-software';
        software.textContent = itemType;

        const year = document.createElement('div');
        year.className = 'lightbox-year';
        year.textContent = itemYear || '2024'; // Individual year from data-year attribute

        info.appendChild(software);
        info.appendChild(year);
        wrapper.appendChild(info);
      }

      content.appendChild(wrapper);
    }

    // Force a browser reflow so the transition animation plays nicely
    void lightbox.offsetWidth;

    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus the close button for accessibility
    const closeBtn = lightbox.querySelector('.lightbox-close');
    if (closeBtn) {
      // Small timeout to ensure the element is visible before focusing
      setTimeout(() => closeBtn.focus(), 50);
    }

  }

  function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';

    // Stop any playing videos (iframe/audio) immediately
    const content = document.getElementById('lightboxContent');
    if (content) content.innerHTML = '';

    // Resume background Vimeo thumbs after modal closes
    resumeBackgroundVimeos();

    // Clear inline style so CSS can handle visibility
    lightbox.style.display = '';

    // Return focus to the element that opened the lightbox
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null; // avoid stale references
    }
  }

  // Close with Escape and handle Tab trapping
  document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeLightbox();
    }

    if (e.key === 'Tab') {
      const focusableElements = lightbox.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), iframe');
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Guardrail: if focus somehow escapes the modal, bring it back in.
      if (!lightbox.contains(document.activeElement)) {
        firstElement.focus();
        e.preventDefault();
        return;
      }

      if (e.shiftKey) { // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  });

  // Expose helpers globally
  window.openLightbox = openLightbox;
  window.closeLightbox = closeLightbox;

  function setupVimeoPlaceholders() {
    if (!window.Vimeo?.Player) return;

    getBackgroundVimeoIframes().forEach((iframe) => {
      const item = iframe.closest('.gallery-item');
      if (!item) return;

      const placeholder = item.querySelector('.vimeo-placeholder');
      if (!placeholder) return;

      const player = getVimeoPlayerForIframe(iframe);
      if (!player) return;

      // When the video starts playing, fade out the placeholder
      player.on('play', function() {
        placeholder.style.opacity = '0';
      });

      // Also check if it's already playing (*e.g. if it loaded before JS)
      player.getPaused().then(paused => {
        if (!paused) {
          placeholder.style.opacity = '0';
        }
      });
    });
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupVimeoPlaceholders);
  } else {
    // Small delay to ensure Vimeo API is fully ready if needed
    setTimeout(setupVimeoPlaceholders, 100);
  }

  window.addGalleryItem = function(type, src, title, itemType, vimeoId = null, youtubeId = null, placeholderSrc = null, year = null) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `gallery-item ${type}`;
    if (year) item.setAttribute('data-year', year);
    if (title) item.setAttribute('aria-label', `View ${title}`);
    item.onclick = () => openLightbox(item);

    if (vimeoId) {
      item.setAttribute('data-vimeo', vimeoId);
      item.innerHTML = `
        <iframe src="https://player.vimeo.com/video/${vimeoId}?background=1&muted=1"></iframe>
        ${placeholderSrc ? `<img src="${placeholderSrc}" class="vimeo-placeholder" alt="">` : ''}
        <div class="item-overlay">
            <div class="item-info">
                <div class="item-title">${title}</div>
                <div class="item-type">${itemType}</div>
            </div>
        </div>
      `;

      if (placeholderSrc && window.Vimeo?.Player) {
        const iframe = item.querySelector('iframe');
        const player = getVimeoPlayerForIframe(iframe);
        if (player) {
          player.on('play', () => {
            const p = item.querySelector('.vimeo-placeholder');
            if (p) p.style.opacity = '0';
          });
        }
      }
    } else if (youtubeId) {
      item.setAttribute('data-youtube', `https://www.youtube.com/embed/${youtubeId}`);
      item.innerHTML = `
        <img src="/img/bombei.webp" alt="${title}" loading="lazy">
        <div class="item-overlay">
            <div class="item-info">
                <div class="item-title">${title}</div>
                <div class="item-type">${itemType}</div>
            </div>
        </div>
      `;
    } else {
      item.innerHTML = `
        <img src="${src}" alt="${title}">
        <div class="item-overlay">
            <div class="item-info">
                <div class="item-title">${title}</div>
                <div class="item-type">${itemType}</div>
            </div>
        </div>
      `;
    }

    gallery.appendChild(item);
  }
})();
