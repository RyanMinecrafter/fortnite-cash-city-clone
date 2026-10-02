const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cashValue = document.getElementById('cashValue');
const healthValue = document.getElementById('healthValue');
const waveValue = document.getElementById('waveValue');
const overlay = document.getElementById('gameOverlay');
const startButton = document.getElementById('startButton');

const world = {
  width: canvas.width,
  height: canvas.height,
};

const keys = {};
const mouse = {
  x: world.width / 2,
  y: world.height / 2,
  down: false,
};

const state = {
  running: false,
  lastTime: 0,
  spawnTimer: 0,
  pickupTimer: 0,
  wave: 1,
  waveCountdown: 0,
  message: '',
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  radius: 18,
  speed: 260,
  angle: 0,
  health: 100,
  maxHealth: 100,
  cash: 0,
  fireCooldown: 0,
  shootRate: 0.18,
  damage: 15,
  bullets: [],
};

const enemies = [];
const pickups = [];
const walls = [];

function resetGame() {
  player.x = world.width / 2;
  player.y = world.height / 2;
  player.health = player.maxHealth;
  player.cash = 0;
  player.fireCooldown = 0;
  state.wave = 1;
  state.spawnTimer = 0;
  state.pickupTimer = 0;
  state.waveCountdown = 0;
  enemies.length = 0;
  pickups.length = 0;
  walls.length = 0;
  updateHud();
}

function updateHud() {
  cashValue.textContent = Math.floor(player.cash);
  healthValue.textContent = Math.max(0, Math.ceil(player.health));
  waveValue.textContent = state.wave;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  const margin = 40;
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = rand(-margin, world.width + margin);
    y = -margin;
  } else if (side === 1) {
    x = world.width + margin;
    y = rand(-margin, world.height + margin);
  } else if (side === 2) {
    x = rand(-margin, world.width + margin);
    y = world.height + margin;
  } else {
    x = -margin;
    y = rand(-margin, world.height + margin);
  }

  const baseSpeed = 52 + state.wave * 8;
  const bounty = 10 + state.wave * 3;
  const health = 25 + state.wave * 6;

  enemies.push({
    x,
    y,
    radius: 16,
    speed: baseSpeed,
    health,
    maxHealth: health,
    bounty,
    damage: 12 + state.wave * 2,
  });
}

function spawnPickup(x, y, value = 15) {
  pickups.push({
    x,
    y,
    radius: 10,
    value,
    pulse: Math.random() * Math.PI * 2,
  });
}

function shootBullet() {
  if (player.fireCooldown > 0 || !state.running) return;

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx);

  player.angle = angle;
  player.fireCooldown = player.shootRate;

  player.bullets.push({
    x: player.x + Math.cos(angle) * (player.radius + 8),
    y: player.y + Math.sin(angle) * (player.radius + 8),
    vx: Math.cos(angle) * 560,
    vy: Math.sin(angle) * 560,
    radius: 4,
    damage: player.damage,
    life: 1.1,
  });
}

function buildWall() {
  const cost = 22;
  if (player.cash < cost) return;

  const wallLength = 46;
  const dx = Math.cos(player.angle || 0);
  const dy = Math.sin(player.angle || 0);
  const x = player.x + dx * 42;
  const y = player.y + dy * 42;

  walls.push({
    x,
    y,
    w: 32,
    h: 32,
    health: 80,
  });

  player.cash -= cost;
  updateHud();
}

function handleInput(dt) {
  let moveX = 0;
  let moveY = 0;

  if (keys['w'] || keys['arrowup']) moveY -= 1;
  if (keys['s'] || keys['arrowdown']) moveY += 1;
  if (keys['a'] || keys['arrowleft']) moveX -= 1;
  if (keys['d'] || keys['arrowright']) moveX += 1;

  const mag = Math.hypot(moveX, moveY) || 1;
  if (moveX !== 0 || moveY !== 0) {
    player.x += (moveX / mag) * player.speed * dt;
    player.y += (moveY / mag) * player.speed * dt;
  }

  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);

  if (mouse.down) {
    shootBullet();
  }

  if (player.fireCooldown > 0) {
    player.fireCooldown -= dt;
  }
}

function updateBullets(dt) {
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const bullet = player.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.x < -20 ||
      bullet.x > world.width + 20 ||
      bullet.y < -20 ||
      bullet.y > world.height + 20 ||
      bullet.life <= 0
    ) {
      player.bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (dist < bullet.radius + enemy.radius) {
        enemy.health -= bullet.damage;
        player.bullets.splice(i, 1);

        if (enemy.health <= 0) {
          const index = enemies.indexOf(enemy);
          if (index >= 0) {
            enemies.splice(index, 1);
            player.cash += enemy.bounty;
            if (Math.random() < 0.38) {
              spawnPickup(enemy.x, enemy.y, 15 + Math.round(Math.random() * 10));
            }
          }
        }
        break;
      }
    }
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    const wallAvoid = walls.reduce((best, wall) => {
      const nearX = clamp(enemy.x, wall.x - wall.w / 2, wall.x + wall.w / 2);
      const nearY = clamp(enemy.y, wall.y - wall.h / 2, wall.y + wall.h / 2);
      const d = Math.hypot(enemy.x - nearX, enemy.y - nearY);
      return Math.min(best, d);
    }, 9999);

    let moveX = 0;
    let moveY = 0;

    if (wallAvoid < 24) {
      moveX = -Math.sign(dx) * 0.35;
      moveY = -Math.sign(dy) * 0.35;
    } else {
      moveX = (dx / dist) * enemy.speed * dt;
      moveY = (dy / dist) * enemy.speed * dt;
    }

    enemy.x += moveX;
    enemy.y += moveY;

    const playerDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (playerDist < enemy.radius + player.radius + 2) {
      player.health -= enemy.damage * dt * 2.2;
    }

    for (let w = walls.length - 1; w >= 0; w--) {
      const wall = walls[w];
      const nearestX = clamp(enemy.x, wall.x - wall.w / 2, wall.x + wall.w / 2);
      const nearestY = clamp(enemy.y, wall.y - wall.h / 2, wall.y + wall.h / 2);
      const dxw = enemy.x - nearestX;
      const dyw = enemy.y - nearestY;
      if (Math.hypot(dxw, dyw) < enemy.radius + 10) {
        enemy.x += (enemy.x - player.x) * 0.4;
        enemy.y += (enemy.y - player.y) * 0.4;
      }
    }
  }

  if (player.health <= 0) {
    state.running = false;
    overlay.classList.add('visible');
    overlay.querySelector('h2').textContent = 'You were eliminated';
    overlay.querySelector('p').textContent = 'Cash collected: ' + Math.floor(player.cash) + '. Press restart and drop back into the city.';
    startButton.textContent = 'Restart Match';
  }
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    pickup.pulse += dt * 5;

    const dx = pickup.x - player.x;
    const dy = pickup.y - player.y;
    if (Math.hypot(dx, dy) < pickup.radius + player.radius + 8) {
      player.cash += pickup.value;
      pickups.splice(i, 1);
      updateHud();
    }
  }
}

function updateWave(dt) {
  const goal = state.wave * 5;
  const currentEnemies = enemies.length;
  if (currentEnemies === 0 && state.running) {
    state.waveCountdown -= dt;
    if (state.waveCountdown <= 0) {
      state.wave += 1;
      state.waveCountdown = 1.5;
      for (let i = 0; i < Math.min(5 + state.wave, 16); i++) {
        spawnEnemy();
      }
    }
  } else {
    state.waveCountdown = 1.5;
  }

  if (state.running) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = Math.max(0.5, 1.7 - state.wave * 0.08);
      if (enemies.length < 18) {
        spawnEnemy();
      }
    }
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, world.width, world.height);

  ctx.fillStyle = '#0d2335';
  ctx.fillRect(0, 0, world.width, world.height);

  const grid = 40;
  ctx.strokeStyle = 'rgba(126, 240, 255, 0.08)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= world.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }

  for (let y = 0; y <= world.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }

  const edgeGlow = 18;
  ctx.fillStyle = 'rgba(122, 193, 255, 0.04)';
  ctx.fillRect(0, 0, world.width, edgeGlow);
  ctx.fillRect(0, world.height - edgeGlow, world.width, edgeGlow);
  ctx.fillRect(0, 0, edgeGlow, world.height);
  ctx.fillRect(world.width - edgeGlow, 0, edgeGlow, world.height);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle || 0);

  ctx.fillStyle = '#7ef0ff';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#10293b';
  ctx.fillRect(8, -4, 18, 8);

  ctx.fillStyle = '#ffd166';
  ctx.fillRect(24, -2, 10, 4);

  ctx.restore();
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    const barWidth = enemy.radius * 2;
    const pct = clamp(enemy.health / enemy.maxHealth, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 12, barWidth, 5);
    ctx.fillStyle = '#7df9a6';
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 12, barWidth * pct, 5);
  });
}

function drawBullets() {
  player.bullets.forEach((bullet) => {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPickups() {
  pickups.forEach((pickup) => {
    const bob = Math.sin(pickup.pulse) * 4;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, pickup.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10293b';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('$', pickup.x - 4, pickup.y + 4 + bob);
  });
}

function drawWalls() {
  walls.forEach((wall) => {
    ctx.fillStyle = '#5f7d8e';
    ctx.fillRect(wall.x - wall.w / 2, wall.y - wall.h / 2, wall.w, wall.h);
    ctx.strokeStyle = 'rgba(126, 240, 255, 0.3)';
    ctx.strokeRect(wall.x - wall.w / 2, wall.y - wall.h / 2, wall.w, wall.h);
  });
}

function drawMinimap() {
  const size = 120;
  const pad = 18;
  const x = world.width - size - pad;
  const y = world.height - size - pad;

  ctx.fillStyle = 'rgba(6, 16, 24, 0.75)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(126, 240, 255, 0.4)';
  ctx.strokeRect(x, y, size, size);

  const px = (player.x / world.width) * size;
  const py = (player.y / world.height) * size;
  ctx.fillStyle = '#7ef0ff';
  ctx.beginPath();
  ctx.arc(x + px, y + py, 4, 0, Math.PI * 2);
  ctx.fill();

  enemies.forEach((enemy) => {
    const ex = (enemy.x / world.width) * size;
    const ey = (enemy.y / world.height) * size;
    ctx.fillStyle = '#ff5d6c';
    ctx.fillRect(x + ex - 2, y + ey - 2, 4, 4);
  });
}

function render() {
  drawBackground();
  drawWalls();
  drawPickups();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawMinimap();
}

function gameLoop(timestamp) {
  const dt = Math.min(0.033, (timestamp - state.lastTime || 16) / 1000);
  state.lastTime = timestamp;

  if (state.running) {
    handleInput(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updatePickups(dt);
    updateWave(dt);
    updateHud();
  }

  render();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  resetGame();
  state.running = true;
  overlay.classList.remove('visible');
  overlay.querySelector('h2').textContent = 'Ready for the drop?';
  overlay.querySelector('p').textContent = 'Collect cash, survive enemy swarms, and build cover before the city goes dark.';
  startButton.textContent = 'Start Match';
  state.waveCountdown = 1.5;
  for (let i = 0; i < 5; i++) spawnEnemy();
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === 'b') {
    buildWall();
  }

  if (key === 'r') {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouse.x = (event.clientX - rect.left) * scaleX;
  mouse.y = (event.clientY - rect.top) * scaleY;

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  player.angle = Math.atan2(dy, dx);
});

canvas.addEventListener('mousedown', () => {
  mouse.down = true;
  shootBullet();
});

canvas.addEventListener('mouseup', () => {
  mouse.down = false;
});

startButton.addEventListener('click', startGame);

player.angle = 0;
resetGame();
requestAnimationFrame(gameLoop);
