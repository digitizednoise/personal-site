// gallery.js - Lightbox and dynamic item utilities for Visual Gallery

(function(){
  function openLightbox(element) {
    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent');
    if (!lightbox || !content) return;

    // Clear previous content
    content.innerHTML = '';

    // Check if it's a video or image
    const iframe = element.querySelector('iframe');
    const img = element.querySelector('img');
    const isPortrait = element.classList.contains('portrait');

    if (iframe) {
      // Handle Vimeo video
      const vimeoId = element.getAttribute('data-vimeo');
      if (vimeoId) {
        const newIframe = document.createElement('iframe');
        newIframe.src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
        newIframe.width = '800';
        newIframe.height = '450';
        newIframe.frameBorder = '0';
        newIframe.allow = 'autoplay; fullscreen; picture-in-picture';
        if (isPortrait) newIframe.classList.add('portrait-video');
        content.appendChild(newIframe);
      } 
      // Handle YouTube video
      else if (iframe.src.includes('youtube.com') || iframe.src.includes('youtu.be')) {
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
      // Handle image
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      content.appendChild(newImg);
    }

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

    // Stop any playing videos
    const content = document.getElementById('lightboxContent');
    if (content) content.innerHTML = '';
  }

  // Close with Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });

  // Expose helpers globally (to be used by inline onclick and future scripts)
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
      item.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe>
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
