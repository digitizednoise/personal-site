// gallery.js - Lightbox and dynamic item utilities for Visual Gallery

(function(){
  function getBackgroundVimeoIframes() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return [];

    // Only target the thumbnail/grid Vimeo embeds (background=1)
    return Array.from(gallery.querySelectorAll('iframe[src*="player.vimeo.com/video/"][src*="background=1"]'));
  }

  function pauseBackgroundVimeos() {
    if (!window.Vimeo?.Player) return;

    getBackgroundVimeoIframes().forEach((iframe) => {
      const player = new Vimeo.Player(iframe);
      player.pause().catch(() => {
        // Some browsers/edge cases can reject; safe to ignore.
      });
    });
  }

  function resumeBackgroundVimeos() {
    if (!window.Vimeo?.Player) return;

    getBackgroundVimeoIframes().forEach((iframe) => {
      const player = new Vimeo.Player(iframe);
      player.play().catch(() => {
        // Autoplay can still be blocked in some situations.
        // Usually OK here because closing the modal is a user gesture.
      });
    });
  }

  function openLightbox(element) {
    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent');
    if (!lightbox || !content) return;

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
      content.appendChild(newIframe);
    } else if (vimeoId) {
      // Allow opening a Vimeo lightbox from ANY element that has data-vimeo (not just gallery items)
      const newIframe = document.createElement('iframe');
      newIframe.src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
      newIframe.width = '800';
      newIframe.height = '450';
      newIframe.frameBorder = '0';
      newIframe.allow = 'autoplay; fullscreen; picture-in-picture';
      if (isPortrait) newIframe.classList.add('portrait-video');
      content.appendChild(newIframe);
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
        content.appendChild(newIframe);
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
          content.appendChild(newIframe);
        }
      }
    } else if (img) {
      // Handle image (including animated WebP)
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      content.appendChild(newImg);
    }

    // Force a browser reflow so the transition animation plays nicely
    void lightbox.offsetWidth;

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Close when clicking outside the content (backdrop click)
    lightbox.onclick = function(e) {
      if (e.target === lightbox) {
        closeLightbox();
      }
    };
  }

  function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';

    // Stop any playing videos (iframe/audio) immediately
    const content = document.getElementById('lightboxContent');
    if (content) content.innerHTML = '';

    // Resume background Vimeo thumbs after modal closes
    resumeBackgroundVimeos();

    // Clear inline style so CSS can handle visibility
    lightbox.style.display = '';
  }

  // Close with Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });

  // Expose helpers globally
  window.openLightbox = openLightbox;
  window.closeLightbox = closeLightbox;

  window.addGalleryItem = function(type, src, title, itemType, vimeoId = null, youtubeId = null) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    const item = document.createElement('div');
    item.className = `gallery-item ${type}`;
    item.onclick = () => openLightbox(item);

    if (vimeoId) {
      item.setAttribute('data-vimeo', vimeoId);
      item.innerHTML = `
        <iframe src="https://player.vimeo.com/video/${vimeoId}?background=1&muted=1" frameborder="0"></iframe>
        <div class="item-overlay">
            <div class="item-info">
                <div class="item-title">${title}</div>
                <div class="item-type">${itemType}</div>
            </div>
        </div>
      `;
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
