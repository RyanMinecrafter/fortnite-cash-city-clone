const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('gameOverlay');
const startButton = document.getElementById('startButton');
const lootPanel = document.getElementById('lootPanel');
const lootList = document.getElementById('lootList');
const lootCloseBtn = document.getElementById('lootCloseBtn');
const buildMenu = document.getElementById('buildMenu');

const world = { width: 1600, height: 900 };
const keys = {};
const mouse = { x: world.width / 2, y: world.height / 2, down: false };

const state = {
  running: false,
  lastTime: 0,
  spawnTimer: 0,
  wave: 1,
  gameTime: 0,
  buildMode: null,
  gameMode: 'solo', // solo or squad
};

// Single player object
const player = {
  x: world.width / 2,
  y: world.height / 2,
  radius: 15,
  speed: 260,
  angle: 0,
  health: 100,
  maxHealth: 100,
  shield: 0,
  maxShield: 50,
  cash: 0,
  materials: 0,
  fireCooldown: 0,
  shootRate: 0.15,
  damage: 16,
  bullets: [],
};

const enemies = [];
const pickups = [];
const walls = [];
const lootZones = [];
const particles = [];

function initLootZones() {
  lootZones.length = 0;
  const zones = [
    { x: 300, y: 180, name: '💰 Gold Bank', items: ['ammo', 'ammo', 'shield_pot', 'cash'] },
    { x: 1300, y: 180, name: '🏪 Commerce Plaza', items: ['cash', 'cash', 'ammo', 'shield_pot'] },
    { x: 180, y: 700, name: '⚔️ Arena', items: ['ammo', 'ammo', 'ammo', 'cash'] },
    { x: 1400, y: 750, name: '🏰 Fort Zone', items: ['materials', 'materials', 'shield_pot', 'cash'] },
    { x: 800, y: 450, name: '💎 Vault', items: ['materials', 'materials', 'ammo', 'cash', 'cash'] },
  ];

  zones.forEach((zone) => {
    lootZones.push({
      ...zone,
      radius: 75,
      lootSpawned: false,
    });
  });
}

function spawnLootAtZone(zone) {
  if (zone.lootSpawned) return;
  zone.lootSpawned = true;

  zone.items.forEach((item, i) => {
    const angle = (i / zone.items.length) * Math.PI * 2;
    const distance = 35;
    const x = zone.x + Math.cos(angle) * distance;
    const y = zone.y + Math.sin(angle) * distance;

    let value = 0, type = 'cash';
    if (item === 'cash') {
      value = 25 + Math.random() * 15;
      type = 'cash';
    } else if (item === 'ammo') {
      value = 15;
      type = 'ammo';
    } else if (item === 'shield_pot') {
      value = 25;
      type = 'shield';
    } else if (item === 'materials') {
      value = 20;
      type = 'materials';
    }

    pickups.push({
      x, y,
      radius: 8,
      type,
      value,
      pulse: Math.random() * Math.PI * 2,
      velocity: {
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 80,
      },
    });
  });
}

function resetGame() {
  player.x = world.width / 2;
  player.y = world.height / 2;
  player.health = player.maxHealth;
  player.shield = 0;
  player.cash = 0;
  player.materials = 0;
  player.fireCooldown = 0;
  player.bullets.length = 0;
  state.wave = 1;
  state.spawnTimer = 0;
  state.gameTime = 0;
  state.buildMode = null;
  enemies.length = 0;
  pickups.length = 0;
  walls.length = 0;
  particles.length = 0;
  initLootZones();
  updateHud();
}

function updateHud() {
  document.getElementById('cashValue').textContent = Math.floor(player.cash);
  document.getElementById('healthValue').textContent = Math.max(0, Math.ceil(player.health));
  document.getElementById('shieldValue').textContent = Math.max(0, Math.ceil(player.shield));
  document.getElementById('waveValue').textContent = state.wave;
  document.getElementById('materialsValue').textContent = Math.floor(player.materials);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  const margin = 50;
  let x = 0, y = 0;

  if (side === 0) x = Math.random() * world.width, y = -margin;
  else if (side === 1) x = world.width + margin, y = Math.random() * world.height;
  else if (side === 2) x = Math.random() * world.width, y = world.height + margin;
  else x = -margin, y = Math.random() * world.height;

  const baseSpeed = 55 + state.wave * 6;
  const bounty = 15 + state.wave * 4;
  const health = 30 + state.wave * 8;

  enemies.push({
    x, y,
    radius: 14,
    speed: baseSpeed,
    health, maxHealth: health,
    bounty, damage: 14 + state.wave * 2.5,
    color: `hsl(${Math.random() * 20 + 8}, 78%, 48%)`,
  });
}

function shootBullet() {
  if (player.fireCooldown > 0 || !state.running) return;

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const angle = Math.atan2(dy, dx);

  player.angle = angle;
  player.fireCooldown = player.shootRate;

  player.bullets.push({
    x: player.x + Math.cos(angle) * (player.radius + 8),
    y: player.y + Math.sin(angle) * (player.radius + 8),
    vx: Math.cos(angle) * 600,
    vy: Math.sin(angle) * 600,
    radius: 3.5,
    damage: player.damage,
    life: 1.1,
  });

  playShootSound();

  particles.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 300,
    vy: Math.sin(angle) * 300,
    radius: 5,
    type: 'muzzle',
    life: 0.08,
  });
}

function buildStructure(type) {
  const costs = { wall: 22, floor: 22, ramp: 26, roof: 24 };
  const cost = costs[type] || 22;
  if (player.materials < cost) return;

  player.materials -= cost;
  playBuildSound();

  const angle = player.angle || 0;
  const x = player.x + Math.cos(angle) * 50;
  const y = player.y + Math.sin(angle) * 50;

  walls.push({
    x, y, w: 40, h: 40,
    health: 100,
    type,
    angle: type === 'ramp' ? angle : 0,
  });

  state.buildMode = null;
  updateHud();
}

function handleInput(dt) {
  let moveX = 0, moveY = 0;

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

  if (player.fireCooldown > 0) player.fireCooldown -= dt;

  if (mouse.down) shootBullet();
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
        playHitSound();

        for (let k = 0; k < 5; k++) {
          particles.push({
            x: bullet.x, y: bullet.y,
            vx: (Math.random() - 0.5) * 220,
            vy: (Math.random() - 0.5) * 220,
            radius: 3,
            type: 'damage',
            life: 0.35,
          });
        }

        if (enemy.health <= 0) {
          enemies.splice(j, 1);
          player.cash += enemy.bounty;
          player.materials += 8 + Math.random() * 10;
          playPickupSound();

          for (let k = 0; k < 8; k++) {
            particles.push({
              x: enemy.x, y: enemy.y,
              vx: (Math.random() - 0.5) * 300,
              vy: (Math.random() - 0.5) * 300,
              radius: 4,
              type: 'death',
              life: 0.6,
            });
          }
        }
        break;
      }
    }
  }
}

function updateEnemies(dt) {
  enemies.forEach((enemy) => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    let moveX = (dx / dist) * enemy.speed * dt;
    let moveY = (dy / dist) * enemy.speed * dt;

    for (let w = 0; w < walls.length; w++) {
      const wall = walls[w];
      const nearX = clamp(enemy.x + moveX, wall.x - wall.w / 2, wall.x + wall.w / 2);
      const nearY = clamp(enemy.y + moveY, wall.y - wall.h / 2, wall.y + wall.h / 2);
      const dxw = enemy.x + moveX - nearX;
      const dyw = enemy.y + moveY - nearY;
      if (Math.hypot(dxw, dyw) < enemy.radius + 6) {
        moveX *= 0.3;
        moveY *= 0.3;
      }
    }

    enemy.x += moveX;
    enemy.y += moveY;

    const playerDist = distance(player.x, player.y, enemy.x, enemy.y);
    if (playerDist < enemy.radius + player.radius + 2) {
      const damageAmount = enemy.damage * dt * 2.5;
      if (player.shield > 0) {
        const shieldDamage = Math.min(player.shield, damageAmount);
        player.shield -= shieldDamage;
        player.health -= damageAmount - shieldDamage;
      } else {
        player.health -= damageAmount;
      }
    }
  });

  if (player.health <= 0) {
    state.running = false;
    overlay.classList.add('visible');
    overlay.querySelector('h2').textContent = 'You Were Eliminated';
    overlay.querySelector('p').textContent = `Wave: ${state.wave} | Cash: $${Math.floor(player.cash)} | Materials: ${Math.floor(player.materials)}`;
    startButton.textContent = 'Play Again';
  }
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    pickup.pulse += dt * 6;
    pickup.velocity.y += 80 * dt;
    pickup.x += pickup.velocity.x * dt;
    pickup.y += pickup.velocity.y * dt;
    pickup.velocity.x *= 0.92;
    pickup.velocity.y *= 0.92;

    const dx = pickup.x - player.x;
    const dy = pickup.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < pickup.radius + player.radius + 20) {
      if (pickup.type === 'cash') player.cash += pickup.value;
      if (pickup.type === 'shield' && player.shield < player.maxShield) {
        player.shield = Math.min(player.maxShield, player.shield + pickup.value);
      }
      if (pickup.type === 'materials') player.materials += pickup.value;

      pickups.splice(i, 1);
      playPickupSound();
      updateHud();
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateWave(dt) {
  if (enemies.length === 0 && state.running) {
    state.wave += 1;
    playLevelUpSound();
    for (let i = 0; i < Math.min(5 + state.wave, 16); i++) {
      spawnEnemy();
    }
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.running) {
    state.spawnTimer = Math.max(0.5, 1.5 - state.wave * 0.08);
    if (enemies.length < 18) spawnEnemy();
  }

  state.gameTime += dt;
}

// Rendering

function drawBackground() {
  ctx.clearRect(0, 0, world.width, world.height);
  const grad = ctx.createLinearGradient(0, 0, 0, world.height);
  grad.addColorStop(0, '#0c2a3a');
  grad.addColorStop(1, '#08202c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.strokeStyle = 'rgba(126, 240, 255, 0.06)';
  ctx.lineWidth = 1;
  const grid = 50;
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

  lootZones.forEach((zone) => {
    const grad = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, zone.radius);
    grad.addColorStop(0, 'rgba(255, 209, 102, 0.08)');
    grad.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 209, 102, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 209, 102, 0.7)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(zone.name, zone.x, zone.y);
  });
}

function drawWalls() {
  walls.forEach((wall) => {
    ctx.save();
    ctx.translate(wall.x, wall.y);
    if (wall.type === 'ramp') ctx.rotate(wall.angle);

    ctx.fillStyle = '#4a6b82';
    ctx.fillRect(-wall.w / 2, -wall.h / 2, wall.w, wall.h);
    ctx.strokeStyle = 'rgba(126, 240, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-wall.w / 2, -wall.h / 2, wall.w, wall.h);

    const icons = { wall: '🧱', floor: '📦', ramp: '📐', roof: '🔺' };
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[wall.type] || '?', 0, 0);

    ctx.restore();
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    const grad = ctx.createRadialGradient(enemy.x - 3, enemy.y - 3, 0, enemy.x, enemy.y, enemy.radius);
    grad.addColorStop(0, 'rgba(255, 100, 120, 0.85)');
    grad.addColorStop(1, enemy.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const barWidth = enemy.radius * 2.2;
    const pct = clamp(enemy.health / enemy.maxHealth, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 12, barWidth, 3.5);
    ctx.fillStyle = `hsl(${Math.max(0, pct * 120)}, 100%, 50%)`;
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 12, barWidth * pct, 3.5);
  });
}

function drawBullets() {
  player.bullets.forEach((bullet) => {
    ctx.fillStyle = 'rgba(255, 209, 102, 0.4)';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPickups() {
  pickups.forEach((pickup) => {
    const bob = Math.sin(pickup.pulse) * 2.5;
    const icons = { cash: '💵', ammo: '🔫', shield: '🛡️', materials: '⚙️' };

    const glowColor = pickup.type === 'cash' ? 'rgba(255, 209, 102, 0.2)' :
                      pickup.type === 'shield' ? 'rgba(126, 240, 255, 0.2)' :
                      'rgba(125, 249, 166, 0.2)';
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, pickup.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[pickup.type] || '📦', pickup.x, pickup.y + bob);
  });
}

function drawParticles() {
  particles.forEach((p) => {
    const alpha = clamp(p.life, 0, 1);
    if (p.type === 'muzzle') ctx.fillStyle = `rgba(255, 209, 102, ${alpha * 0.5})`;
    else if (p.type === 'damage') ctx.fillStyle = `rgba(255, 100, 120, ${alpha * 0.6})`;
    else if (p.type === 'death') ctx.fillStyle = `rgba(255, 100, 120, ${alpha * 0.4})`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle || 0);

  const grad = ctx.createRadialGradient(-2.5, -2.5, 0, 0, 0, player.radius);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(0.6, '#7ef0ff');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.fillRect(6, -2.5, 16, 5);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(22, -1.5, 6, 3);

  ctx.restore();

  if (player.shield > 0) {
    ctx.strokeStyle = `rgba(126, 240, 255, ${clamp(player.shield / player.maxShield, 0.25, 0.7)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHUD() {
  // Crosshair
  ctx.strokeStyle = 'rgba(126, 240, 255, 0.45)';
  ctx.lineWidth = 1.2;
  const ch = 12;
  ctx.beginPath();
  ctx.moveTo(mouse.x - ch, mouse.y);
  ctx.lineTo(mouse.x + ch, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - ch);
  ctx.lineTo(mouse.x, mouse.y + ch);
  ctx.stroke();

  // Build mode indicator
  if (state.buildMode) {
    const icons = { wall: '🧱', floor: '📦', ramp: '📐', roof: '🔺' };
    ctx.fillStyle = 'rgba(126, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(126, 240, 255, 0.75)';
    ctx.fillText(icons[state.buildMode] || '?', mouse.x, mouse.y);
  }
}

function render() {
  drawBackground();
  drawWalls();
  drawPickups();
  drawBullets();
  drawParticles();
  drawEnemies();
  drawPlayer();
  drawHUD();
}

function gameLoop(timestamp) {
  const dt = Math.min(0.033, (timestamp - state.lastTime || 16) / 1000);
  state.lastTime = timestamp;

  if (state.running) {
    handleInput(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updatePickups(dt);
    updateParticles(dt);
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
  for (let i = 0; i < 5; i++) spawnEnemy();
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  const buildTypes = { '1': 'wall', '2': 'floor', '3': 'ramp', '4': 'roof' };
  if (buildTypes[key]) {
    if (state.buildMode === buildTypes[key]) {
      buildStructure(state.buildMode);
    } else {
      state.buildMode = buildTypes[key];
    }
    updateBuildMenu();
  }

  if (key === 'r') startGame();
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
});

canvas.addEventListener('mousedown', () => {
  mouse.down = true;
});

canvas.addEventListener('mouseup', () => {
  mouse.down = false;
});

function updateBuildMenu() {
  document.querySelectorAll('.build-slot').forEach((slot) => {
    const type = slot.getAttribute('data-type');
    if (state.buildMode === type) {
      slot.classList.add('active');
    } else {
      slot.classList.remove('active');
    }
  });
}

document.querySelectorAll('.build-slot').forEach((slot) => {
  slot.addEventListener('click', () => {
    const type = slot.getAttribute('data-type');
    if (state.buildMode === type) {
      buildStructure(state.buildMode);
    } else {
      state.buildMode = type;
    }
    updateBuildMenu();
  });
});

startButton.addEventListener('click', startGame);
lootCloseBtn.addEventListener('click', () => {
  lootPanel.classList.add('hidden');
});

resetGame();
requestAnimationFrame(gameLoop);
