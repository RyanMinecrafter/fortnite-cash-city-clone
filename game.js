const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cashValue = document.getElementById('cashValue');
const healthValue = document.getElementById('healthValue');
const shieldValue = document.getElementById('shieldValue');
const waveValue = document.getElementById('waveValue');
const overlay = document.getElementById('gameOverlay');
const startButton = document.getElementById('startButton');
const lootPanel = document.getElementById('lootPanel');
const lootList = document.getElementById('lootList');
const lootCloseBtn = document.getElementById('lootCloseBtn');
const buildMenu = document.getElementById('buildMenu');

const world = {
  width: 1600,
  height: 900,
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
  wave: 1,
  waveCountdown: 0,
  gameTime: 0,
  buildMode: null,
  cameraX: 0,
  cameraY: 0,
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  radius: 16,
  speed: 280,
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

// Loot zones (POIs)
function initLootZones() {
  lootZones.length = 0;
  const zones = [
    { x: 300, y: 200, name: '💰 Gold Bank', items: ['ammo', 'ammo', 'shield_pot', 'cash'] },
    { x: 1300, y: 200, name: '🏪 Commerce Plaza', items: ['cash', 'cash', 'ammo', 'shield_pot'] },
    { x: 200, y: 700, name: '⚔️ Arena', items: ['ammo', 'ammo', 'ammo', 'cash'] },
    { x: 1400, y: 750, name: '🎯 Fort Zone', items: ['materials', 'materials', 'shield_pot', 'cash'] },
    { x: 800, y: 450, name: '💎 Vault', items: ['materials', 'materials', 'ammo', 'cash', 'cash'] },
  ];

  zones.forEach((zone) => {
    lootZones.push({
      ...zone,
      radius: 80,
      looted: false,
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

    let value = 0;
    let type = 'cash';
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
      x,
      y,
      radius: 9,
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
  state.wave = 1;
  state.spawnTimer = 0;
  state.waveCountdown = 0;
  state.gameTime = 0;
  state.buildMode = null;
  enemies.length = 0;
  pickups.length = 0;
  walls.length = 0;
  particles.length = 0;
  player.bullets.length = 0;
  initLootZones();
  updateHud();
}

function updateHud() {
  cashValue.textContent = Math.floor(player.cash);
  healthValue.textContent = Math.max(0, Math.ceil(player.health));
  shieldValue.textContent = Math.max(0, Math.ceil(player.shield));
  waveValue.textContent = state.wave;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  const margin = 60;
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

  const baseSpeed = 55 + state.wave * 6;
  const bounty = 15 + state.wave * 4;
  const health = 30 + state.wave * 8;

  enemies.push({
    x,
    y,
    radius: 14,
    speed: baseSpeed,
    health,
    maxHealth: health,
    bounty,
    damage: 14 + state.wave * 2.5,
    color: `hsl(${Math.random() * 20 + 10}, 80%, 50%)`,
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
    x: player.x + Math.cos(angle) * (player.radius + 10),
    y: player.y + Math.sin(angle) * (player.radius + 10),
    vx: Math.cos(angle) * 600,
    vy: Math.sin(angle) * 600,
    radius: 3,
    damage: player.damage,
    life: 1.2,
  });

  playShootSound();

  // Muzzle flash particle
  particles.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 300,
    vy: Math.sin(angle) * 300,
    radius: 6,
    type: 'muzzle',
    life: 0.1,
  });
}

function buildStructure(type) {
  const costs = { wall: 22, floor: 22, ramp: 30, roof: 25 };
  const cost = costs[type] || 22;
  if (player.materials < cost) return;

  const angle = player.angle || 0;
  const distance = 50;
  const x = player.x + Math.cos(angle) * distance;
  const y = player.y + Math.sin(angle) * distance;

  player.materials -= cost;
  playBuildSound();

  let structure = {
    x,
    y,
    w: 40,
    h: 40,
    health: 100,
    type,
  };

  if (type === 'ramp') {
    structure.angle = player.angle;
  }

  walls.push(structure);
  state.buildMode = null;
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

  // Check loot zone proximity
  let nearZone = null;
  for (let zone of lootZones) {
    if (distance(player.x, player.y, zone.x, zone.y) < 120) {
      nearZone = zone;
      break;
    }
  }

  if (nearZone && !nearZone.lootSpawned) {
    spawnLootAtZone(nearZone);
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
        playHitSound();

        // Damage particles
        for (let k = 0; k < 4; k++) {
          particles.push({
            x: bullet.x,
            y: bullet.y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            radius: 3,
            type: 'damage',
            life: 0.4,
          });
        }

        if (enemy.health <= 0) {
          enemies.splice(j, 1);
          player.cash += enemy.bounty;
          player.materials += 8 + Math.random() * 8;
          playPickupSound();

          // Death particles
          for (let k = 0; k < 8; k++) {
            particles.push({
              x: enemy.x,
              y: enemy.y,
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
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    let moveX = (dx / dist) * enemy.speed * dt;
    let moveY = (dy / dist) * enemy.speed * dt;

    // Wall avoidance
    for (let w = 0; w < walls.length; w++) {
      const wall = walls[w];
      const nearX = clamp(enemy.x + moveX, wall.x - wall.w / 2, wall.x + wall.w / 2);
      const nearY = clamp(enemy.y + moveY, wall.y - wall.h / 2, wall.y + wall.h / 2);
      const dxw = enemy.x + moveX - nearX;
      const dyw = enemy.y + moveY - nearY;
      if (Math.hypot(dxw, dyw) < enemy.radius + 5) {
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
  }

  if (player.health <= 0) {
    state.running = false;
    overlay.classList.add('visible');
    overlay.querySelector('h2').textContent = 'Eliminated';
    overlay.querySelector('p').textContent = 
      `Cash: $${Math.floor(player.cash)} | Materials: ${Math.floor(player.materials)} | Wave: ${state.wave}`;
    startButton.textContent = 'Play Again';
  }
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    pickup.pulse += dt * 6;

    // Slight gravity and movement
    pickup.velocity.y += 80 * dt;
    pickup.x += pickup.velocity.x * dt;
    pickup.y += pickup.velocity.y * dt;
    pickup.velocity.x *= 0.92;
    pickup.velocity.y *= 0.92;

    // Pickup range detection
    const dx = pickup.x - player.x;
    const dy = pickup.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < pickup.radius + player.radius + 20) {
      player.cash += pickup.type === 'cash' ? pickup.value : 0;
      if (pickup.type === 'shield' && player.shield < player.maxShield) {
        player.shield = Math.min(player.maxShield, player.shield + pickup.value);
      }
      if (pickup.type === 'materials') {
        player.materials += pickup.value;
      }

      playPickupSound();
      pickups.splice(i, 1);
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

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateWave(dt) {
  if (enemies.length === 0 && state.running) {
    state.waveCountdown -= dt;
    if (state.waveCountdown <= 0) {
      state.wave += 1;
      state.waveCountdown = 2.5;
      playLevelUpSound();
      for (let i = 0; i < Math.min(4 + state.wave, 14); i++) {
        spawnEnemy();
      }
    }
  } else {
    state.waveCountdown = 2.5;
  }

  if (state.running) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = Math.max(0.6, 1.5 - state.wave * 0.06);
      if (enemies.length < 16) {
        spawnEnemy();
      }
    }
  }

  state.gameTime += dt;
}

// Rendering functions

function drawBackground() {
  ctx.clearRect(0, 0, world.width, world.height);

  // Multi-layer background
  const grad = ctx.createLinearGradient(0, 0, 0, world.height);
  grad.addColorStop(0, '#0d2c42');
  grad.addColorStop(0.5, '#0d3a52');
  grad.addColorStop(1, '#0d2a40');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, world.width, world.height);

  // Grid
  ctx.strokeStyle = 'rgba(126, 240, 255, 0.05)';
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

  // Loot zones
  lootZones.forEach((zone) => {
    const radius = zone.radius;
    const grad = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, radius);
    grad.addColorStop(0, 'rgba(255, 209, 102, 0.1)');
    grad.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 209, 102, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 209, 102, 0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(zone.name, zone.x, zone.y - 3);
  });
}

function drawWalls() {
  walls.forEach((wall) => {
    ctx.save();
    ctx.translate(wall.x, wall.y);
    if (wall.type === 'ramp') {
      ctx.rotate(wall.angle || 0);
    }

    // 3D-ish perspective
    ctx.fillStyle = '#4a6b82';
    ctx.fillRect(-wall.w / 2, -wall.h / 2, wall.w, wall.h);

    // Edge highlights for 3D effect
    ctx.strokeStyle = 'rgba(126, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-wall.w / 2, -wall.h / 2, wall.w, wall.h);

    // Top edge (light)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-wall.w / 2, -wall.h / 2);
    ctx.lineTo(wall.w / 2, -wall.h / 2);
    ctx.stroke();

    // Type indicator
    const icons = { wall: '🧱', floor: '📦', ramp: '📐', roof: '🔺' };
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[wall.type] || wall.type[0], 0, 0);

    ctx.restore();
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    // Radial gradient for 3D effect
    const grad = ctx.createRadialGradient(enemy.x - 4, enemy.y - 4, 0, enemy.x, enemy.y, enemy.radius);
    grad.addColorStop(0, 'rgba(255, 100, 120, 0.9)');
    grad.addColorStop(1, enemy.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Health bar
    const barWidth = enemy.radius * 2.2;
    const pct = clamp(enemy.health / enemy.maxHealth, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 14, barWidth, 4);
    ctx.fillStyle = `hsl(${Math.max(0, pct * 120)}, 100%, 50%)`;
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 14, barWidth * pct, 4);
  });
}

function drawBullets() {
  player.bullets.forEach((bullet) => {
    // Glow
    ctx.fillStyle = 'rgba(255, 209, 102, 0.3)';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius * 3, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPickups() {
  pickups.forEach((pickup) => {
    const bob = Math.sin(pickup.pulse) * 3;
    const icons = { cash: '💵', ammo: '🔫', shield: '🛡️', materials: '⚙️' };

    // Glow
    const glowColor = pickup.type === 'cash' ? 'rgba(255, 209, 102, 0.25)' : 
                      pickup.type === 'shield' ? 'rgba(126, 240, 255, 0.25)' :
                      'rgba(125, 249, 166, 0.25)';
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, pickup.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[pickup.type] || '📦', pickup.x, pickup.y + bob);
  });
}

function drawParticles() {
  particles.forEach((p) => {
    const alpha = clamp(p.life, 0, 1);

    if (p.type === 'muzzle') {
      ctx.fillStyle = `rgba(255, 209, 102, ${alpha * 0.6})`;
    } else if (p.type === 'damage') {
      ctx.fillStyle = `rgba(255, 100, 120, ${alpha * 0.7})`;
    } else if (p.type === 'death') {
      ctx.fillStyle = `rgba(255, 100, 120, ${alpha * 0.5})`;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle || 0);

  // Body (3D-ish gradient)
  const grad = ctx.createRadialGradient(-3, -3, 0, 0, 0, player.radius);
  grad.addColorStop(0, 'rgba(126, 240, 255, 0.95)');
  grad.addColorStop(1, 'rgba(70, 170, 200, 0.8)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Gun barrel
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(8, -3, 16, 6);

  // Muzzle
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(24, -2, 6, 4);

  ctx.restore();

  // Shield indicator
  if (player.shield > 0) {
    ctx.strokeStyle = `rgba(126, 240, 255, ${clamp(player.shield / player.maxShield, 0.3, 0.8)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHUD() {
  // Crosshair
  ctx.strokeStyle = 'rgba(126, 240, 255, 0.5)';
  ctx.lineWidth = 1.5;
  const crosshairSize = 12;
  ctx.beginPath();
  ctx.moveTo(mouse.x - crosshairSize, mouse.y);
  ctx.lineTo(mouse.x + crosshairSize, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - crosshairSize);
  ctx.lineTo(mouse.x, mouse.y + crosshairSize);
  ctx.stroke();

  // Build mode indicator
  if (state.buildMode) {
    const icons = { wall: '🧱', floor: '📦', ramp: '📐', roof: '🔺' };
    ctx.fillStyle = 'rgba(126, 240, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(126, 240, 255, 0.8)';
    ctx.fillText(icons[state.buildMode] || '?', mouse.x, mouse.y);
  }

  // Materials counter
  ctx.fillStyle = 'rgba(11, 28, 42, 0.7)';
  ctx.fillRect(10, 10, 140, 50);
  ctx.strokeStyle = 'rgba(126, 240, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 140, 50);

  ctx.fillStyle = '#aaa';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Materials', 18, 24);
  ctx.fillStyle = '#7df9a6';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(Math.floor(player.materials), 18, 42);
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
  state.waveCountdown = 2.5;
  for (let i = 0; i < 5; i++) spawnEnemy();
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  const buildTypes = { '1': 'wall', '2': 'floor', '3': 'ramp', '4': 'roof' };
  if (buildTypes[key]) {
    if (state.buildMode === buildTypes[key]) {
      buildStructure(state.buildMode);
      state.buildMode = null;
      updateBuildMenu();
    } else {
      state.buildMode = buildTypes[key];
      updateBuildMenu();
    }
  }

  if (key === 'e') {
    const nearest = lootZones.find(z => distance(player.x, player.y, z.x, z.y) < 120);
    if (nearest) {
      showLootPanel(nearest);
    }
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
      state.buildMode = null;
    } else {
      state.buildMode = type;
    }
    updateBuildMenu();
  });
});

function showLootPanel(zone) {
  if (!zone.lootSpawned) {
    spawnLootAtZone(zone);
  }
  lootList.innerHTML = '';
  zone.items.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'loot-item';
    const icons = { cash: '💵', ammo: '🔫', shield_pot: '🛡️', materials: '⚙️' };
    div.innerHTML = `${icons[item] || '📦'} ${item} <span class="qty">x1</span>`;
    lootList.appendChild(div);
  });
  lootPanel.classList.remove('hidden');
}

lootCloseBtn.addEventListener('click', () => {
  lootPanel.classList.add('hidden');
});

startButton.addEventListener('click', startGame);

resetGame();
requestAnimationFrame(gameLoop);
