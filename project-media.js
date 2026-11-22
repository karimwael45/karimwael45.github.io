(() => {
  const video = document.querySelector('video[data-autoplay]');
  if (!video) return;

  const toggle = document.querySelector('[data-video-toggle]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function play() {
    if (video.dataset.src && !video.hasAttribute('src')) {
      video.src = video.dataset.src;
    }
    video.muted = true;
    return video.play();
  }

  if (!toggle) {
    if (!reducedMotion.matches) play().catch(() => {});
    return;
  }

  let autoplay = !reducedMotion.matches;
  let inView = !('IntersectionObserver' in window);

  function syncPlayback() {
    toggle.textContent = autoplay ? 'Pause video' : 'Play video';
    if (autoplay && inView && !document.hidden) {
      play().catch(() => {});
    } else {
      video.pause();
    }
  }

  toggle.addEventListener('click', () => {
    autoplay = !autoplay;
    if (autoplay) inView = true;
    syncPlayback();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) autoplay = false;
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);

  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= .5;
      syncPlayback();
    }, { threshold: .5 });
    visibility.observe(video);
  }

  syncPlayback();
  toggle.hidden = false;
})();
