(() => {
  const lesson = document.querySelector('.worksheet');
  if (!lesson) return;

  const button = lesson.querySelector('.worksheet-solve');
  const paper = lesson.querySelector('.worksheet-paper');
  const viewport = lesson.querySelector('.worksheet-viewport');
  const zoomButton = lesson.querySelector('.worksheet-zoom');
  const zoomedComparison = lesson.querySelector('.worksheet-zoomed-comparison');
  const zoomedRange = zoomedComparison.querySelector('input');
  const phone = matchMedia('(max-width: 760px)');
  const drawing = lesson.querySelector('.worksheet-ink');
  const canvas = drawing.querySelector('canvas');
  const penPosition = drawing.querySelector('.worksheet-pen-position');
  const pen = drawing.querySelector('.worksheet-pen');
  const reveal = lesson.querySelector('.worksheet-reveal');
  const solution = reveal.querySelector('img');
  const range = lesson.querySelector('.worksheet-range');
  const status = lesson.querySelector('.worksheet-status');
  const comparison = [reveal, range, ...lesson.querySelectorAll('.worksheet-divider, .worksheet-grip, .worksheet-labels')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const { width, height } = canvas;
  const context = canvas.getContext('2d');

  // Each entry is a piece of the supplied handwriting, in the order it is written.
  // Coordinates are in the solved screenshot. Sweep down for vertical strokes.
  const handwriting = [
    [706, 65, 50, 42, 235], [893, 60, 47, 52, 235],
    [717, 119, 37, 39, 160, 'down', 'red'], [901, 117, 38, 39, 160, 'down', 'red'],
    [372, 337, 415, 76, 630], [350, 412, 474, 77, 640], [846, 416, 84, 46, 210, 'across', 'red'],
    [255, 400, 59, 155, 320, 'down'],
    [354, 530, 438, 73, 540], [280, 627, 40, 18, 145, 'across', 'red'],
    [355, 604, 403, 68, 540], [315, 674, 540, 25, 285], [463, 699, 361, 66, 500],
    [485, 766, 114, 62, 195], [607, 762, 127, 45, 200], [606, 809, 123, 12, 145],
    [610, 821, 96, 38, 180], [758, 796, 136, 47, 230],
    [993, 307, 67, 551, 460, 'down'],
    [1051, 328, 461, 74, 580], [1066, 427, 186, 69, 280],
    [1084, 516, 73, 68, 200], [1172, 505, 53, 38, 145], [1166, 543, 75, 12, 130],
    [1180, 555, 39, 45, 155], [1098, 618, 238, 68, 325],
    [538, 878, 85, 47, 235], [440, 927, 139, 48, 260],
  ];

  let ink;
  let stage = 'blank';
  let frame = 0;
  let zoomed = false;
  let followZoom = false;

  function setZoom(enabled) {
    zoomed = enabled;
    lesson.classList.toggle('is-zoomed', enabled);
    zoomButton.textContent = enabled ? 'Fit page' : 'Zoom in';
    zoomButton.setAttribute('aria-pressed', String(enabled));
    if (enabled) viewport.tabIndex = 0;
    else viewport.removeAttribute('tabindex');
  }

  function followPen(x, y) {
    if (!phone.matches || !zoomed) return;
    const horizontal = x * paper.clientWidth / width;
    const vertical = y * paper.clientHeight / height;
    const marginX = viewport.clientWidth * .13;
    const marginY = viewport.clientHeight * .18;
    const targetX = Math.max(horizontal - viewport.clientWidth + marginX,
      Math.min(viewport.scrollLeft, horizontal - marginX));
    const targetY = Math.max(vertical - viewport.clientHeight + marginY,
      Math.min(viewport.scrollTop, vertical - marginY));
    viewport.scrollLeft += (targetX - viewport.scrollLeft) * .31;
    viewport.scrollTop += (targetY - viewport.scrollTop) * .31;
  }

  function extractInk() {
    const bitmap = document.createElement('canvas');
    bitmap.width = width;
    bitmap.height = height;
    const bitmapContext = bitmap.getContext('2d', { willReadFrequently: true });
    bitmapContext.drawImage(solution, 0, 0, width, height);
    const source = bitmapContext.getImageData(0, 0, width, height).data;
    const mask = bitmapContext.createImageData(width, height);

    const lines = handwriting.flatMap(([left, top, boxWidth, boxHeight, duration, direction, color = 'blue']) => {
      const down = direction === 'down';
      const length = down ? boxHeight : boxWidth;
      const counts = new Uint16Array(length);
      const positions = new Float32Array(length);

      for (let y = top; y < top + boxHeight; y++) {
        for (let x = left; x < left + boxWidth; x++) {
          const pixel = (y * width + x) * 4;
          const [r, g, b] = [source[pixel], source[pixel + 1], source[pixel + 2]];
          const isInk = color === 'red'
            ? r - g > 44 && r - b > 49 && g - b < 55
            : b - r > 16 && b - g > 16;
          if (!isInk) continue;
          mask.data[pixel] = r;
          mask.data[pixel + 1] = g;
          mask.data[pixel + 2] = b;
          mask.data[pixel + 3] = 255;

          const column = down ? y - top : x - left;
          counts[column]++;
          positions[column] += down ? x : y;
        }
      }

      const start = counts.findIndex(count => count > 0);
      if (start < 0) return [];
      let last = start;
      positions[start] /= counts[start];
      for (let i = start + 1; i < length; i++) {
        if (!counts[i]) continue;
        positions[i] /= counts[i];
        for (let j = last + 1; j < i; j++) {
          positions[j] = positions[last] + (positions[i] - positions[last]) * (j - last) / (i - last);
        }
        last = i;
      }

      return [{ left, top, boxWidth, boxHeight, duration, down, color, positions, start, end: last + 1 }];
    });

    bitmapContext.putImageData(mask, 0, 0);
    return { bitmap, lines };
  }

  function setReveal(value) {
    range.value = value;
    zoomedRange.value = value;
    paper.style.setProperty('--reveal', value + '%');
    reveal.setAttribute('aria-hidden', String(Number(value) === 0));
    range.setAttribute('aria-valuetext', value + '% solved');
    zoomedRange.setAttribute('aria-valuetext', value + '% solved');
  }

  function compare() {
    cancelAnimationFrame(frame);
    stage = 'compare';
    drawing.hidden = true;
    if (followZoom) {
      followZoom = false;
      setZoom(false);
    }
    comparison.forEach(element => { element.hidden = false; });
    zoomedComparison.hidden = false;
    setReveal(100);
    button.textContent = 'Replay';
    status.textContent = 'Solution complete. Drag the slider or use its arrow keys to compare the two worksheets.';
  }

  function movePen(x, y) {
    penPosition.style.transform = `translate3d(${x / width * 100}%, ${y / height * 100}%, 0)`;
    followPen(x, y);
  }

  function penPoint(line, column) {
    const index = Math.min(line.end - 1, Math.max(line.start, column));
    const from = Math.max(line.start, index - 3);
    const to = Math.min(line.end - 1, index + 3);
    let sum = 0;
    for (let i = from; i <= to; i++) sum += line.positions[i];
    const average = sum / (to - from + 1);
    return line.down ? [average, line.top + index] : [line.left + index, average];
  }

  function animate() {
    stage = 'drawing';
    drawing.hidden = false;
    button.textContent = 'Skip animation';
    status.textContent = 'Writing the solution.';
    context.clearRect(0, 0, width, height);
    if (phone.matches) {
      if (!zoomed) {
        followZoom = true;
        setZoom(true);
      }
      const overflow = viewport.getBoundingClientRect().bottom + 12 - innerHeight;
      if (overflow > 0) window.scrollBy({ top: overflow, behavior: 'smooth' });
    }

    let index = 0;
    let lastPoint = [1400, 232];
    let startTime;
    let painted = ink.lines[0].start;
    movePen(...lastPoint);

    function tick(now) {
      if (startTime === undefined) startTime = now;
      const line = ink.lines[index];
      const glide = index === 0 ? 340 : 62;
      const elapsed = now - startTime;
      pen.dataset.ink = line.color;

      if (elapsed < glide) {
        const start = penPoint(line, line.start);
        const t = 1 - (1 - elapsed / glide) ** 3;
        movePen(lastPoint[0] + (start[0] - lastPoint[0]) * t, lastPoint[1] + (start[1] - lastPoint[1]) * t);
      } else {
        const progress = Math.min((elapsed - glide) / line.duration, 1);
        const edge = Math.round(line.start + (line.end - line.start) * progress);

        if (edge > painted) {
          const x = line.down ? line.left : line.left + painted;
          const y = line.down ? line.top + painted : line.top;
          const w = line.down ? line.boxWidth : edge - painted;
          const h = line.down ? edge - painted : line.boxHeight;
          context.drawImage(ink.bitmap, x, y, w, h, x, y, w, h);
          painted = edge;
        }

        const point = penPoint(line, edge);
        movePen(...point);
        if (progress === 1) {
          index++;
          if (index === ink.lines.length) {
            compare();
            return;
          }
          lastPoint = point;
          painted = ink.lines[index].start;
          startTime = now;
        }
      }
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
  }

  async function solve() {
    if (stage === 'drawing') {
      compare();
      return;
    }

    stage = 'preparing';
    button.disabled = true;
    button.textContent = 'Loading…';
    solution.loading = 'eager';
    try {
      await solution.decode();
      comparison.forEach(element => { element.hidden = true; });
      zoomedComparison.hidden = true;
      setReveal(0);

      if (!motion.matches && context && !ink) {
        try {
          ink = extractInk();
        } catch {
          // The finished comparison is still available when canvas readback is blocked.
        }
      }

      if (motion.matches || !ink?.lines.length) compare();
      else animate();
    } catch {
      stage = 'blank';
      button.textContent = 'Retry';
      status.textContent = 'The worksheet image could not load. The written solution is available below.';
    } finally {
      button.disabled = false;
    }
  }

  range.addEventListener('input', () => setReveal(range.value));
  zoomedRange.addEventListener('input', () => setReveal(zoomedRange.value));
  zoomButton.addEventListener('click', () => {
    followZoom = false;
    setZoom(!zoomed);
  });
  zoomButton.hidden = false;
  button.addEventListener('click', solve);
  motion.addEventListener('change', () => {
    if (motion.matches && stage === 'drawing') compare();
  });
  button.hidden = false;
})();
