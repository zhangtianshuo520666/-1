// Simple Pong Game
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreLeftEl = document.getElementById('score-left');
  const scoreRightEl = document.getElementById('score-right');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Game objects
  const paddle = {
    width: 12,
    height: 100,
    leftX: 12,
    rightX: WIDTH - 12 - 12, // second 12 is paddle width
    leftY: (HEIGHT - 100) / 2,
    rightY: (HEIGHT - 100) / 2,
    speed: 6
  };

  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    r: 8,
    vx: 0,
    vy: 0,
    speed: 6
  };

  let score = { left: 0, right: 0 };
  let paused = false;
  let waitingToServe = false;

  // Keyboard state
  const keys = { ArrowUp: false, ArrowDown: false };

  // Initialize ball with random direction
  function serveBall(toRight = Math.random() > 0.5) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    const angle = (Math.random() * (Math.PI / 3)) - (Math.PI / 6); // -30 to +30 degrees
    const dir = toRight ? 1 : -1;
    ball.speed = 6;
    ball.vx = Math.cos(angle) * ball.speed * dir;
    ball.vy = Math.sin(angle) * ball.speed;
  }

  // Utility: clamp
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Draw functions
  function drawNet() {
    ctx.fillStyle = '#2f444f';
    const step = 14;
    for (let y = 0; y < HEIGHT; y += step) {
      ctx.fillRect(WIDTH / 2 - 1, y + 4, 2, 8);
    }
  }

  function draw() {
    // clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    drawNet();

    // paddles
    ctx.fillStyle = '#e6edf3';
    ctx.fillRect(paddle.leftX, paddle.leftY, paddle.width, paddle.height);
    ctx.fillRect(paddle.rightX, paddle.rightY, paddle.width, paddle.height);

    // ball
    ctx.beginPath();
    ctx.fillStyle = '#f5f7fa';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Collision detection between circle and rect
  function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    // find closest point on rect to circle center
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= cr * cr;
  }

  // Update AI paddle (right)
  function updateAI() {
    // Simple tracking with max speed and slight error
    const targetY = ball.y - paddle.height / 2;
    const diff = targetY - paddle.rightY;
    // add some lag/difficulty based on ball speed
    const maxMove = Math.min(5 + Math.abs(ball.vx) * 0.5, 8);
    if (Math.abs(diff) > maxMove) {
      paddle.rightY += Math.sign(diff) * maxMove;
    } else {
      paddle.rightY = targetY;
    }
    // keep in bounds
    paddle.rightY = clamp(paddle.rightY, 0, HEIGHT - paddle.height);
  }

  // Update left paddle based on keyboard
  function updatePlayerFromKeys() {
    if (keys.ArrowUp) paddle.leftY -= paddle.speed;
    if (keys.ArrowDown) paddle.leftY += paddle.speed;
    paddle.leftY = clamp(paddle.leftY, 0, HEIGHT - paddle.height);
  }

  // Main update loop
  function update() {
    if (paused || waitingToServe) {
      draw();
      return;
    }

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collisions (top/bottom)
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy = -ball.vy;
    } else if (ball.y + ball.r >= HEIGHT) {
      ball.y = HEIGHT - ball.r;
      ball.vy = -ball.vy;
    }

    // Paddles collision
    // Left paddle
    if (circleRectCollision(ball.x, ball.y, ball.r, paddle.leftX, paddle.leftY, paddle.width, paddle.height)) {
      // place ball outside paddle to avoid sticking
      ball.x = paddle.leftX + paddle.width + ball.r;
      // reflect and increase speed slightly
      const relativeIntersectY = (paddle.leftY + paddle.height / 2) - ball.y;
      const normalized = relativeIntersectY / (paddle.height / 2);
      const bounceAngle = normalized * (Math.PI / 4); // max 45 degrees
      const speed = Math.min(ball.speed * 1.05, 12);
      ball.speed = speed;
      ball.vx = Math.cos(bounceAngle) * speed; // move right
      ball.vy = -Math.sin(bounceAngle) * speed;
    }

    // Right paddle
    if (circleRectCollision(ball.x, ball.y, ball.r, paddle.rightX, paddle.rightY, paddle.width, paddle.height)) {
      ball.x = paddle.rightX - ball.r;
      const relativeIntersectY = (paddle.rightY + paddle.height / 2) - ball.y;
      const normalized = relativeIntersectY / (paddle.height / 2);
      const bounceAngle = normalized * (Math.PI / 4);
      const speed = Math.min(ball.speed * 1.05, 14);
      ball.speed = speed;
      ball.vx = -Math.cos(bounceAngle) * speed; // move left
      ball.vy = -Math.sin(bounceAngle) * speed;
    }

    // Score: left misses
    if (ball.x - ball.r <= 0) {
      score.right++;
      scoreRightEl.textContent = score.right;
      waitingToServe = true;
      setTimeout(() => {
        serveBall(true);
        waitingToServe = false;
      }, 900);
    }

    // Score: right misses
    if (ball.x + ball.r >= WIDTH) {
      score.left++;
      scoreLeftEl.textContent = score.left;
      waitingToServe = true;
      setTimeout(() => {
        serveBall(false);
        waitingToServe = false;
      }, 900);
    }

    // Update paddles
    updatePlayerFromKeys();
    updateAI();

    draw();
  }

  // Animation
  let lastTime = 0;
  function loop(time) {
    const dt = time - lastTime;
    lastTime = time;
    // we could use dt for time-based movement; current implementation uses fixed steps
    update();
    requestAnimationFrame(loop);
  }

  // Input handlers
  canvas.addEventListener('mousemove', (e) => {
    // compute mouse y relative to canvas
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    // center paddle at mouse
    paddle.leftY = clamp(y - paddle.height / 2, 0, HEIGHT - paddle.height);
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      keys[e.code] = true;
      e.preventDefault();
    }
    if (e.code === 'Space') {
      paused = !paused;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      keys[e.code] = false;
      e.preventDefault();
    }
  });

  // Hide default cursor and draw a custom small cursor for better feel (optional)
  // If desired, could draw the custom cursor on the canvas; currently we hide it in CSS.

  // Start
  serveBall(Math.random() > 0.5);
  draw();
  requestAnimationFrame(loop);

  // Expose for debugging (optional)
  window.pong = {
    paddle, ball, score, serveBall, pause: () => paused = true, resume: () => paused = false
  };
})();