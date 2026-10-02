* {
  box-sizing: border-box;
}

:root {
  --bg-1: #07141d;
  --bg-2: #0d2337;
  --panel: rgba(10, 20, 32, 0.74);
  --panel-2: rgba(12, 32, 44, 0.8);
  --line: rgba(126, 240, 255, 0.45);
  --gold: #ffd166;
  --text: #eaf9ff;
  --muted: #9bc4dc;
  --accent: #7ef0ff;
  --danger: #ff6b6b;
  --success: #7df9a6;
  --shadow: rgba(0, 0, 0, 0.32);
  --p1: #7ef0ff;
  --p2: #ffb86c;
  --p3: #a5ff9a;
  --p4: #d8a6ff;
}

html, body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, var(--bg-1), var(--bg-2));
  color: var(--text);
  font-family: Inter, "Segoe UI", sans-serif;
  overflow: hidden;
}

body {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
}

.hud-shell {
  width: 100%;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 8px 24px var(--shadow);
  z-index: 20;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 18px 8px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(126, 240, 255, 0.25), rgba(255, 209, 102, 0.2));
  border: 1px solid rgba(126, 240, 255, 0.4);
  font-size: 20px;
}

.brand h1 {
  margin: 0;
  font-size: 1.08rem;
  letter-spacing: 0.12em;
}

.brand p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat {
  min-width: 84px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(14, 31, 44, 0.8);
  border: 1px solid rgba(126, 240, 255, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

#squadStats span[id$="Stat"] {
  margin-top: 3px;
  font-size: 0.9rem;
  font-weight: 800;
}

.player-pill.p1 { border-color: rgba(126, 240, 255, 0.4); }
.player-pill.p2 { border-color: rgba(255, 184, 108, 0.4); }
.player-pill.p3 { border-color: rgba(165, 255, 154, 0.4); }
.player-pill.p4 { border-color: rgba(216, 166, 255, 0.4); }

.controls-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  padding: 6px 18px 12px;
  color: var(--muted);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.game-container {
  position: relative;
  flex: 1;
  width: 100%;
  overflow: hidden;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #0e2d42 0%, #0a2134 100%);
}

.build-menu {
  position: fixed;
  right: 18px;
  bottom: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(68px, 1fr));
  gap: 8px;
  background: rgba(11, 28, 42, 0.82);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px;
  z-index: 50;
  backdrop-filter: blur(12px);
}

.build-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 74px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid rgba(126, 240, 255, 0.2);
  background: rgba(13, 35, 53, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.build-slot:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
}

.build-slot.active {
  background: rgba(126, 240, 255, 0.12);
  border-color: var(--accent);
  box-shadow: 0 0 12px rgba(126, 240, 255, 0.25);
}

.build-slot .icon { font-size: 1.4rem; }
.build-slot .label { font-size: 0.55rem; }
.build-slot .cost { color: var(--gold); font-weight: 700; font-size: 0.7rem; }

.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 10, 19, 0.6);
  backdrop-filter: blur(8px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 120;
}

.overlay.visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.panel {
  width: min(520px, 88vw);
  background: rgba(11, 28, 42, 0.94);
  border: 1px solid rgba(126, 240, 255, 0.4);
  border-radius: 18px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.44);
  padding: 28px 24px;
  text-align: center;
}

.panel h2 {
  margin: 0 0 12px;
  font-size: clamp(1.8rem, 2vw, 2.4rem);
  letter-spacing: 0.08em;
}

.panel p {
  margin: 0 0 20px;
  color: var(--muted);
  line-height: 1.6;
}

button {
  appearance: none;
  border: none;
  border-radius: 10px;
  padding: 12px 26px;
  background: linear-gradient(135deg, var(--accent), var(--gold));
  color: #07141a;
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.15s ease;
  box-shadow: 0 8px 20px rgba(126, 240, 255, 0.25);
}

button:hover {
  transform: translateY(-1px);
}

.loot-panel {
  position: fixed;
  left: 20px;
  top: 100px;
  width: 260px;
  background: rgba(11, 28, 42, 0.86);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  backdrop-filter: blur(12px);
  z-index: 80;
  opacity: 1;
  visibility: visible;
  transition: all 0.2s ease;
}

.loot-panel.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.loot-content h3 {
  margin: 0 0 10px;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
}

.loot-list {
  max-height: 260px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.loot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: rgba(19, 38, 56, 0.7);
  border-radius: 8px;
  font-size: 0.8rem;
}

.loot-item .qty {
  color: var(--gold);
  font-weight: 700;
}

.loot-panel button {
  width: 100%;
  padding: 8px 14px;
  font-size: 0.74rem;
}

@media (max-width: 820px) {
  .topbar {
    align-items: flex-start;
  }

  .stats {
    width: 100%;
    justify-content: flex-start;
  }

  .controls-bar {
    justify-content: flex-start;
  }

  .build-menu {
    right: 10px;
    bottom: 10px;
  }
}
