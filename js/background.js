export function createBackground(canvas) {
  const context = canvas.getContext("2d", { alpha: true });
  const pointer = { x: .5, y: .5 };
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let speed = 0;
  let frame = 0;
  const columns = 31;
  const rows = 16;

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function draw() {
    frame += 1;
    context.clearRect(0, 0, width, height);
    const horizon = height * .42;
    const centerX = width * (.5 + (pointer.x - .5) * .035);
    const pace = Math.min(speed / 100, 1);
    const drift = frame * (.002 + pace * .018);
    context.lineWidth = 1;

    for (let row = 0; row < rows; row += 1) {
      const t = row / (rows - 1);
      const depth = t * t;
      const y = horizon + depth * (height - horizon + 60);
      context.beginPath();
      for (let col = 0; col <= columns; col += 1) {
        const xRatio = col / columns;
        const baseX = (xRatio - .5) * width * (1.1 + depth * .9) + centerX;
        const wave = Math.sin(xRatio * 12 + drift + row * .32) * (3 + pace * 9) * depth;
        if (col === 0) context.moveTo(baseX, y + wave);
        else context.lineTo(baseX, y + wave);
      }
      const alpha = .025 + depth * .08;
      context.strokeStyle = `rgba(104, 198, 166, ${alpha + pace * .035})`;
      context.stroke();
    }

    for (let col = 0; col <= columns; col += 1) {
      const x = (col / columns - .5) * width * 2 + centerX;
      context.beginPath();
      context.moveTo(centerX + (x - centerX) * .025, horizon);
      context.lineTo(x, height + 30);
      context.strokeStyle = `rgba(104, 198, 166, ${.025 + (col % 4 === 0 ? .025 : 0) + pace * .02})`;
      context.stroke();
    }
    window.requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", event => {
    pointer.x = event.clientX / Math.max(1, width);
    pointer.y = event.clientY / Math.max(1, height);
  }, { passive: true });
  resize();
  draw();
  return { setSpeed(value) { speed = Math.max(0, value || 0); } };
}