(() => {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.mobile-menu');
  const navLinks = [...header.querySelectorAll('nav a')];
  const destinations = navLinks.map(link => document.querySelector(link.hash));
  const progressBar = document.querySelector('#lap b');

  menu.querySelector('nav').addEventListener('click', event => {
    if (event.target.closest('a')) menu.open = false;
  });
  menu.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    menu.querySelector('summary').focus();
  });
  root.classList.add('enhanced');

  const about = document.querySelector('#big');
  const aboutWords = [];
  const aboutCopy = document.createDocumentFragment();
  for (const token of about.textContent.match(/\S+|\s+/g)) {
    if (!token.trim()) {
      aboutCopy.append(token);
      continue;
    }
    const word = document.createElement('span');
    word.textContent = token;
    aboutCopy.append(word);
    aboutWords.push(word);
  }
  about.replaceChildren(aboutCopy);
  about.classList.add('about-reveal');

  const race = document.querySelector('#race .pin');
  const track = race.querySelector('.trk');
  const rythmifySection = document.querySelector('#ryth');
  const rythmify = rythmifySection.querySelector('.pin');
  const credits = document.querySelector('#cr');
  const experience = document.querySelector('#exp');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const device = rythmify.querySelector('.dev');
  const phone = device.querySelector('.ph1');
  const phoneScreens = [...phone.querySelectorAll('img')];
  const tabletScreens = [...device.querySelectorAll('.tab img')];
  const steps = [...rythmify.querySelectorAll('.step')];
  const galleryControls = device.querySelector('.ryth-controls');
  const galleryStatus = device.querySelector('.ryth-view');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const projects = document.querySelector('#project-track');
  const projectCards = [...projects.querySelectorAll('.project')];
  const projectControls = document.querySelector('.project-controls');
  const previousProject = projectControls.querySelector('[data-shift="-1"]');
  const nextProject = projectControls.querySelector('[data-shift="1"]');

  function updateProjectControls() {
    const remaining = projects.scrollWidth - projects.clientWidth - projects.scrollLeft;
    previousProject.setAttribute('aria-disabled', String(projects.scrollLeft <= 2));
    nextProject.setAttribute('aria-disabled', String(remaining <= 2));
  }

  function stepProject(direction) {
    const button = direction > 0 ? nextProject : previousProject;
    if (button.getAttribute('aria-disabled') === 'true') return;
    const positions = projectCards.map(card => card.offsetLeft);
    const current = projects.scrollLeft;
    const target = direction > 0
      ? positions.find(position => position > current + 2)
      : positions.reverse().find(position => position < current - 2);
    projects.scrollTo({
      left: target ?? 0,
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });
  }

  previousProject.addEventListener('click', () => stepProject(-1));
  nextProject.addEventListener('click', () => stepProject(1));
  projects.addEventListener('scroll', updateProjectControls, { passive: true });
  projects.addEventListener('keydown', event => {
    if (event.target !== projects || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    stepProject(event.key === 'ArrowRight' ? 1 : -1);
  });
  addEventListener('resize', updateProjectControls);
  updateProjectControls();
  projectControls.hidden = false;
  const desktopMotion = matchMedia('(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)');

  const clamp = value => Math.max(0, Math.min(value, 1));
  const trackDistance = () => Math.max(0, track.offsetWidth - race.clientWidth);
  const sectionProgress = (section, distance) =>
    distance > 0 ? clamp((header.offsetHeight - section.getBoundingClientRect().top) / distance) : 0;

  function selectSlide(items, index) {
    items.forEach((item, i) => item.classList.toggle('on', i === index));
  }

  let frame = 0;
  let racingDistance = 0;
  let rythmifyDistance = 0;
  let currentSlide = -1;
  let currentTablet = -1;
  let revealedWordCount = 0;
  let galleryIndex = 0;
  let swipeStart;

  function showGalleryScreen(index) {
    galleryIndex = (index + steps.length) % steps.length;
    selectSlide(steps, galleryIndex);
    selectSlide(phoneScreens, galleryIndex);
    galleryStatus.textContent = steps[galleryIndex].dataset.view + ' · ' + (galleryIndex + 1) + ' of ' + steps.length;
  }

  galleryControls.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => showGalleryScreen(galleryIndex + Number(button.dataset.shift)));
  });
  phone.addEventListener('pointerdown', event => {
    if (galleryControls.hidden || event.pointerType !== 'touch' || !event.isPrimary) return;
    swipeStart = { x: event.clientX, y: event.clientY };
    phone.setPointerCapture(event.pointerId);
  });
  phone.addEventListener('pointerup', event => {
    if (!swipeStart || !event.isPrimary) return;
    const x = event.clientX - swipeStart.x;
    const y = event.clientY - swipeStart.y;
    swipeStart = undefined;
    if (Math.abs(x) >= 40 && Math.abs(x) > Math.abs(y) * 1.25) {
      showGalleryScreen(galleryIndex + (x < 0 ? 1 : -1));
    }
  });
  phone.addEventListener('pointercancel', () => { swipeStart = undefined; });

  function revealAbout(ribbonHeight) {
    const rect = about.getBoundingClientRect();
    const viewport = innerHeight - ribbonHeight;
    const start = ribbonHeight + viewport * .88;
    const distance = viewport * .65 + rect.height * .43;
    const nextWordCount = Math.round(clamp((start - rect.top) / distance) * aboutWords.length);
    for (let i = Math.min(revealedWordCount, nextWordCount); i < Math.max(revealedWordCount, nextWordCount); i++) {
      aboutWords[i].classList.toggle('is-read', i < nextWordCount);
    }
    revealedWordCount = nextWordCount;
  }

  function covers(section, point) {
    const rect = section.getBoundingClientRect();
    return rect.top <= point && rect.bottom > point;
  }

  function updateScene(point) {
    let scene = '';
    if (covers(rythmifySection, point) || covers(credits, point)) scene = 'rythmify';
    else if (covers(experience, point)) scene = 'experience';

    if (scene === (root.dataset.scene ?? '')) return;
    if (scene) root.dataset.scene = scene;
    else delete root.dataset.scene;
    themeColor.content = getComputedStyle(root).getPropertyValue('--ribbon-bg').trim();
  }

  function draw() {
    frame = 0;
    if (desktopMotion.matches) {
      const racingProgress = sectionProgress(race, racingDistance);
      track.style.transform = 'translateX(' + (-racingProgress * racingDistance) + 'px)';

      const progress = sectionProgress(rythmify, rythmifyDistance);
      const slide = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      const tablet = Math.min(tabletScreens.length - 1, Math.floor(progress * tabletScreens.length));
      if (slide !== currentSlide) {
        selectSlide(steps, slide);
        selectSlide(phoneScreens, slide);
        currentSlide = slide;
      }
      if (tablet !== currentTablet) {
        selectSlide(tabletScreens, tablet);
        currentTablet = tablet;
      }
      phone.style.setProperty('--ry', (progress - .5) * -16 + 'deg');
      device.style.setProperty('--tx', (clamp(progress * 3) - 1) * 40 + 'px');
      device.style.setProperty('--ty', (progress - .5) * -50 + 'px');
    }

    const maxScroll = root.scrollHeight - innerHeight;
    progressBar.style.width = (maxScroll > 0 ? clamp(scrollY / maxScroll) * 100 : 0) + '%';
    const ribbonHeight = header.offsetHeight;
    if (!reducedMotion.matches) revealAbout(ribbonHeight);
    updateScene(ribbonHeight + 1);
    const marker = ribbonHeight + (innerHeight - ribbonHeight) * .32;
    const activeSection = covers(credits, marker)
      ? rythmifySection
      : destinations.find(section => covers(section, marker));
    navLinks.forEach((link, i) => {
      if (destinations[i] === activeSection) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function scheduleDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function sizeScenes() {
    root.classList.toggle('motion-desktop', desktopMotion.matches);
    root.classList.toggle('ryth-gallery', !desktopMotion.matches);
    galleryControls.hidden = desktopMotion.matches;
    currentSlide = -1;
    if (desktopMotion.matches) {
      const raceHeight = race.querySelector('.stk').offsetHeight;
      const rythmifyHeight = rythmify.querySelector('.stk').offsetHeight;
      racingDistance = trackDistance();
      rythmifyDistance = rythmifyHeight * 2.05;
      race.style.height = (raceHeight + racingDistance) + 'px';
      rythmify.style.height = (rythmifyHeight + rythmifyDistance) + 'px';
    } else {
      race.style.height = '';
      rythmify.style.height = '';
      track.style.transform = '';
      showGalleryScreen(galleryIndex);
    }
    scheduleDraw();
  }

  addEventListener('scroll', scheduleDraw, { passive: true });
  addEventListener('resize', sizeScenes);
  addEventListener('load', sizeScenes);
  desktopMotion.addEventListener('change', sizeScenes);
  document.fonts?.ready.then(sizeScenes);
  sizeScenes();

  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        reveal.unobserve(entry.target);
      });
    }, { threshold: .15 });
    document.querySelectorAll('.rv').forEach(item => reveal.observe(item));
  }

  const results = document.querySelector('#rv');
  const resultImages = [...results.querySelectorAll('img')];
  const resultControls = document.querySelector('#rvd');
  const resultButtons = [...resultControls.querySelectorAll('.rev-dots button')];
  const playback = resultControls.querySelector('.rev-play');
  let resultIndex = 0;
  let rotation;
  let autoplay = !reducedMotion.matches;
  let resultVisible = !('IntersectionObserver' in window);

  function queueResult() {
    clearTimeout(rotation);
    if (autoplay && resultVisible && !document.hidden) {
      rotation = setTimeout(() => showResult((resultIndex + 1) % resultImages.length), 10000);
    }
  }

  function updatePlayback() {
    playback.textContent = autoplay ? 'Pause' : 'Play';
    playback.setAttribute('aria-label', autoplay ? 'Pause student results' : 'Play student results');
    queueResult();
  }

  function showResult(index) {
    resultIndex = index;
    resultImages.forEach((image, i) => { image.hidden = i !== index; });
    resultButtons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    queueResult();
  }

  resultButtons.forEach((button, i) => button.addEventListener('click', () => showResult(i)));
  playback.addEventListener('click', () => {
    autoplay = !autoplay;
    updatePlayback();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) autoplay = false;
    updatePlayback();
    scheduleDraw();
  });
  document.addEventListener('visibilitychange', queueResult);

  showResult(0);
  results.classList.add('is-carousel');
  resultControls.hidden = false;
  updatePlayback();
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(([entry]) => {
      resultVisible = entry.isIntersecting;
      queueResult();
    });
    visibility.observe(results);
  }

  const dialog = document.querySelector('#lb');
  const previewImage = dialog.querySelector('#lbi');
  const previewVideo = dialog.querySelector('#lb-video');
  const previewTitle = dialog.querySelector('#lbt');
  const verifyLink = dialog.querySelector('#lbv');

  if (typeof dialog.showModal === 'function') {
    document.querySelectorAll('.zoom, [data-preview]').forEach(link => {
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const isVideo = link.dataset.preview === 'video';
        previewImage.hidden = isVideo;
        previewVideo.hidden = !isVideo;
        if (isVideo) {
          previewVideo.src = link.href;
        } else {
          previewImage.src = link.href;
          previewImage.alt = link.dataset.alt ?? link.querySelector('img').alt;
        }
        previewTitle.textContent = link.dataset.t;
        if (link.dataset.v) verifyLink.href = link.dataset.v;
        verifyLink.hidden = !link.dataset.v;
        dialog.showModal();
        if (isVideo) previewVideo.play().catch(() => {});
      });
    });
    dialog.addEventListener('close', () => {
      if (!previewVideo.hasAttribute('src')) return;
      previewVideo.pause();
      previewVideo.removeAttribute('src');
      previewVideo.load();
    });
    dialog.querySelector('#lbx').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  }
})();
