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

  const race = document.querySelector('#race .pin');
  const track = race.querySelector('.trk');
  const rythmify = document.querySelector('#ryth .pin');
  const device = rythmify.querySelector('.dev');
  const phone = device.querySelector('.ph1');
  const phoneScreens = [...phone.querySelectorAll('img')];
  const tabletScreens = [...device.querySelectorAll('.tab img')];
  const steps = [...rythmify.querySelectorAll('.step')];
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
    const marker = header.offsetHeight + (innerHeight - header.offsetHeight) * .32;
    const active = destinations.findIndex(section => {
      const rect = section.getBoundingClientRect();
      return rect.top <= marker && rect.bottom > marker;
    });
    const activeSection = active >= 0 ? destinations[active] : null;
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
      selectSlide(phoneScreens, 0);
      currentSlide = -1;
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
  const resultButtons = [...resultControls.querySelectorAll('button')];

  function showResult(index) {
    resultImages.forEach((image, i) => { image.hidden = i !== index; });
    resultButtons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }

  resultButtons.forEach((button, i) => button.addEventListener('click', () => showResult(i)));
  showResult(0);
  results.classList.add('is-carousel');
  resultControls.hidden = false;

  const dialog = document.querySelector('#lb');
  const certificateImage = dialog.querySelector('#lbi');
  const certificateTitle = dialog.querySelector('#lbt');
  const certificateVerify = dialog.querySelector('#lbv');

  if (typeof dialog.showModal === 'function') {
    document.querySelectorAll('.zoom').forEach(link => {
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        certificateImage.src = link.href;
        certificateImage.alt = link.querySelector('img').alt;
        certificateTitle.textContent = link.dataset.t;
        if (link.dataset.v) certificateVerify.href = link.dataset.v;
        certificateVerify.hidden = !link.dataset.v;
        dialog.showModal();
      });
    });
    dialog.querySelector('#lbx').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  }
})();
