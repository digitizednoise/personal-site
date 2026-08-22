class HorizontalScrollRow {
  constructor(container, row) {
    this.container = container;
    this.row = row;
    this.targetX = 0;
    this.currentX = 0;
    this.smoothingTime = 155;
    this.speed = 1.3;
    this._dragThreshold = 8;
    this._pointerId = null;
    this._pointerStartX = 0;
    this._pointerStartY = 0;
    this._pointerLastX = 0;
    this._gestureAxis = null;
    this._isDragging = false;
    this.animationFrameId = null;
    this._lastFrameTime = 0;
    this._motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._reducedMotion = this._motionQuery.matches;

    this._originalRowStyles = {
      transform: this.row.style.transform,
      transition: this.row.style.transition,
      willChange: this.row.style.willChange,
    };
    this._originalTouchAction = this.container.style.touchAction;
    this._addedTabIndex = !this.container.hasAttribute('tabindex');

    this._onWheel = this._onWheel.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerEnd = this._onPointerEnd.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onKey = this._onKey.bind(this);
    this._onFocusIn = this._onFocusIn.bind(this);
    this._onMotionChange = this._onMotionChange.bind(this);
    this.update = this.update.bind(this);

    this.row.style.transition = 'none';
    this.row.style.willChange = 'transform';
    this.container.style.touchAction = 'pan-y';
    if (this._addedTabIndex) this.container.tabIndex = 0;

    this.container.addEventListener('wheel', this._onWheel, { passive: false });
    this.container.addEventListener('pointerdown', this._onPointerDown);
    this.container.addEventListener('pointermove', this._onPointerMove, { passive: false });
    this.container.addEventListener('pointerup', this._onPointerEnd);
    this.container.addEventListener('pointercancel', this._onPointerEnd);
    window.addEventListener('resize', this._onResize);
    this.container.addEventListener('keydown', this._onKey);
    this.container.addEventListener('focusin', this._onFocusIn);
    this._motionQuery.addEventListener?.('change', this._onMotionChange);

    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this._clamp());
      this._ro.observe(this.row);
      this._ro.observe(this.container);
    }

    this._render();
  }

  destroy() {
    if (this._pointerId !== null) this._releasePointer(this._pointerId);
    this.container.removeEventListener('wheel', this._onWheel);
    this.container.removeEventListener('pointerdown', this._onPointerDown);
    this.container.removeEventListener('pointermove', this._onPointerMove);
    this.container.removeEventListener('pointerup', this._onPointerEnd);
    this.container.removeEventListener('pointercancel', this._onPointerEnd);
    window.removeEventListener('resize', this._onResize);
    this.container.removeEventListener('keydown', this._onKey);
    this.container.removeEventListener('focusin', this._onFocusIn);
    this._motionQuery.removeEventListener?.('change', this._onMotionChange);
    this._ro?.disconnect();
    this.row.style.transform = this._originalRowStyles.transform;
    this.row.style.transition = this._originalRowStyles.transition;
    this.row.style.willChange = this._originalRowStyles.willChange;
    this.container.style.touchAction = this._originalTouchAction;
    if (this._addedTabIndex) this.container.removeAttribute('tabindex');
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  _render() {
    this.row.style.transform = `translate3d(${this.currentX}px, 0, 0)`;
  }

  _requestUpdate() {
    if (this.animationFrameId !== null) return;
    if (!this._lastFrameTime) this._lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.update);
  }

  update(timestamp) {
    this.animationFrameId = null;

    const elapsed = this._lastFrameTime ? Math.max(0, timestamp - this._lastFrameTime) : 0;
    this._lastFrameTime = timestamp;
    const difference = this.targetX - this.currentX;

    if (this._reducedMotion || Math.abs(difference) < 0.1) {
      this.currentX = this.targetX;
      this._lastFrameTime = 0;
      this._render();
      return;
    }

    const timeBasedEase = 1 - Math.exp(-elapsed / this.smoothingTime);
    this.currentX += difference * timeBasedEase;
    this._render();
    this._requestUpdate();
  }

  _maxScroll() {
    return -(this.row.scrollWidth - this.container.clientWidth);
  }

  _clampedPosition(x) {
    const min = Math.min(0, this._maxScroll());
    return Math.min(0, Math.max(min, x));
  }

  _apply(x, immediate = false) {
    this.targetX = this._clampedPosition(x);
    if (immediate || this._reducedMotion) {
      this.currentX = this.targetX;
      this._lastFrameTime = 0;
      this._render();
      return;
    }
    this._requestUpdate();
  }

  _clamp() {
    this.targetX = this._clampedPosition(this.targetX);
    this.currentX = this._clampedPosition(this.currentX);
    this._render();
    if (Math.abs(this.targetX - this.currentX) >= 0.1) this._requestUpdate();
  }

  _normalizedWheelDelta(e) {
    let multiplier = 1;

    if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      const styles = getComputedStyle(this.container);
      const lineHeight = Number.parseFloat(styles.lineHeight);
      const fontSize = Number.parseFloat(styles.fontSize) || 16;
      multiplier = Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.2;
    } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      multiplier = this.container.clientWidth;
    }

    const deltaX = e.deltaX * multiplier;
    const deltaY = e.deltaY * multiplier;
    return Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  }

  _onWheel(e) {
    if (this.row.scrollWidth <= this.container.clientWidth) return;

    const delta = this._normalizedWheelDelta(e);
    if (delta === 0) return;

    const nextX = this._clampedPosition(this.targetX - delta * this.speed);
    if (nextX === this.targetX) return;
    e.preventDefault();
    this._apply(nextX);
  }

  _onPointerDown(e) {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (this._pointerId !== null || this.row.scrollWidth <= this.container.clientWidth) return;

    this._pointerId = e.pointerId;
    this._pointerStartX = e.clientX;
    this._pointerStartY = e.clientY;
    this._pointerLastX = e.clientX;
    this._gestureAxis = null;
    this._isDragging = true;
  }

  _onPointerMove(e) {
    if (!this._isDragging || e.pointerId !== this._pointerId) return;

    if (this._gestureAxis === null) {
      const totalX = e.clientX - this._pointerStartX;
      const totalY = e.clientY - this._pointerStartY;
      if (Math.hypot(totalX, totalY) < this._dragThreshold) return;

      this._gestureAxis = Math.abs(totalX) > Math.abs(totalY) ? 'horizontal' : 'vertical';
      if (this._gestureAxis === 'vertical') {
        this._releasePointer(e.pointerId);
        return;
      }

      e.preventDefault();
      this.container.setPointerCapture?.(e.pointerId);
      this.targetX = this.currentX;
      this._apply(this.targetX + totalX, true);
      this._pointerLastX = e.clientX;
      return;
    }

    if (this._gestureAxis !== 'horizontal') return;

    e.preventDefault();
    const deltaX = e.clientX - this._pointerLastX;
    this._pointerLastX = e.clientX;
    this._apply(this.targetX + deltaX, true);
  }

  _onPointerEnd(e) {
    if (e.pointerId !== this._pointerId) return;
    this._releasePointer(e.pointerId);
  }

  _releasePointer(pointerId) {
    if (this.container.hasPointerCapture?.(pointerId)) {
      this.container.releasePointerCapture(pointerId);
    }
    this._pointerId = null;
    this._gestureAxis = null;
    this._isDragging = false;
  }

  _onResize() {
    this._clamp();
  }

  _onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this._apply(this.targetX - 140);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._apply(this.targetX + 140);
    }
  }

  _onMotionChange(e) {
    this._reducedMotion = e.matches;
    if (this._reducedMotion) this._apply(this.targetX, true);
  }

  _onFocusIn(e) {
    const target = e.target.closest?.('button, a[href], iframe, [tabindex]:not([tabindex="-1"])');
    if (!target || !this.row.contains(target)) return;

    const padding = 16;
    const containerRect = this.container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (targetRect.left < containerRect.left + padding) {
      this._apply(this.targetX + (containerRect.left + padding - targetRect.left));
    } else if (targetRect.right > containerRect.right - padding) {
      this._apply(this.targetX - (targetRect.right - containerRect.right + padding));
    }
  }
}

window.HorizontalScroll = {
  _instances: new WeakMap(),
  init(containerSelector, rowSelector) {
    document.querySelectorAll(containerSelector).forEach((container) => {
      const row = container.querySelector(rowSelector);
      if (!row) return;
      const previous = this._instances.get(container);
      previous?.destroy();
      this._instances.set(container, new HorizontalScrollRow(container, row));
    });
  },
  destroy(containerSelector) {
    document.querySelectorAll(containerSelector).forEach((container) => {
      const previous = this._instances.get(container);
      if (!previous) return;
      previous.destroy();
      this._instances.delete(container);
    });
  },
  initDeclarative(root = document) {
    root.querySelectorAll('[data-horizontal-scroll]').forEach((container) => {
      const row = container.querySelector('[data-horizontal-scroll-row]');
      if (!row) return;
      const previous = this._instances.get(container);
      previous?.destroy();
      this._instances.set(container, new HorizontalScrollRow(container, row));
    });
  },
};

window.HorizontalScroll.initDeclarative();
