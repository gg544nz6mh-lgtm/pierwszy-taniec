// Poziom 1 - Pierwszy taniec (prototyp pod iOS Safari)
// Sterowanie: przyciski dotykowe (LEWO/PRAWO/TANIEC) + opcjonalnie klawiatura na PC (A/D/Strzałki + Spacja)
// Cel: zbierz 3x "Odwaga", podejdź do niej i naciśnij TANIEC.

(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });

  // Ustawienia świata
  const W = canvas.width, H = canvas.height;
  const GROUND_Y = 560;
  const WORLD_W = 3200; // długi parkiet
  const SAFE = 42;

  // Input
  const input = {
    left: false, right: false, act: false,
    actPressed: false,
  };

  function bindBtn(id, key) {
    const el = document.getElementById(id);
    const down = (e) => { e.preventDefault(); input[key] = true; if (key === "act") input.actPressed = true; };
    const up   = (e) => { e.preventDefault(); input[key] = false; };

    el.addEventListener("pointerdown", down, { passive: false });
    el.addEventListener("pointerup", up, { passive: false });
    el.addEventListener("pointercancel", up, { passive: false });
    el.addEventListener("pointerleave", up, { passive: false });
  }

  bindBtn("left", "left");
  bindBtn("right", "right");
  bindBtn("act", "act");

  // Klawiatura (dla wygody na PC)
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") input.left = true;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") input.right = true;
    if (e.key === " " || e.key === "Enter") { input.act = true; input.actPressed = true; }
  });
  addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") input.left = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") input.right = false;
    if (e.key === " " || e.key === "Enter") input.act = false;
  });

  // iOS: blokuj scroll/zoom gestami
  addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // Prosta kamera
  let camX = 0;

  // Pomocnicze
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  // Gracz
  const player = {
    x: 120, y: GROUND_Y - 84,
    w: 44, h: 84,
    vx: 0,
    speed: 520,
    courage: 0,
  };

  // NPC: kolega i ona (+ 2 koleżanki)
  const friend = { x: 60, y: GROUND_Y - 80, w: 40, h: 80 };
  const girl   = { x: 2550, y: GROUND_Y - 92, w: 46, h: 92 };
  const girls  = [
    { x: girl.x - 64, y: GROUND_Y - 86, w: 42, h: 86 },
    { x: girl.x + 64, y: GROUND_Y - 86, w: 42, h: 86 },
  ];

  // Tłum - przeszkody (bez przemocy)
  const crowd = [];
  for (let i = 0; i < 18; i++) {
    crowd.push({
      x: 520 + i * 140 + rand(-40, 40),
      y: GROUND_Y - (70 + rand(0, 30)),
      w: 40 + rand(0, 18),
      h: 70 + rand(0, 30),
      phase: rand(0, Math.PI * 2),
      amp: rand(10, 26),
    });
  }

  // Odwaga (do zebrania)
  const couragePickups = [
    { x: 900, y: GROUND_Y - 170, taken: false },
    { x: 1500, y: GROUND_Y - 210, taken: false },
    { x: 2050, y: GROUND_Y - 180, taken: false },
  ];

  // Stan gry
  let state = "PLAY"; // PLAY -> DANCE -> WIN
  let tDance = 0;
  let hearts = [];

  const hintEl = document.getElementById("hint");
  function setHint(text) { hintEl.textContent = text; }

  setHint("POZIOM 1: Pierwszy taniec\nZbierz 3x Odwaga (✨) i podejdź do niej. Następnie naciśnij TANIEC.");

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function spawnHeart(x, y) {
    hearts.push({
      x, y,
      vx: rand(-60, 60),
      vy: rand(-180, -240),
      life: 1.2,
    });
  }

  // Render helpers
  function drawNeonBG(time) {
    // Tło
    ctx.fillStyle = "#07060a";
    ctx.fillRect(0, 0, W, H);

    // Światła (pasy)
    for (let i = 0; i < 14; i++) {
      const y = (i * 52 + (time * 60) % 52) - 52;
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = i % 3 === 0 ? "#f37a1f" : (i % 3 === 1 ? "#8a4dff" : "#2ee6ff");
      ctx.fillRect(0, y, W, 26);
    }
    ctx.globalAlpha = 1;

    // Neony - kropki
    for (let i = 0; i < 80; i++) {
      const x = (i * 160 + time * 40) % W;
      const y = 80 + (i * 37) % 380;
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = i % 3 === 0 ? "#2ee6ff" : (i % 3 === 1 ? "#ff4df3" : "#f37a1f");
      ctx.fillRect(x, y, 6, 6);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloor(time, camX) {
    const floorY = GROUND_Y + 30;

    // Parkiet
    ctx.fillStyle = "#15101a";
    ctx.fillRect(-camX, GROUND_Y, WORLD_W, H - GROUND_Y);

    // "kafelki"
    const tile = 64;
    for (let x = 0; x < WORLD_W; x += tile) {
      const s = Math.sin((x * 0.02) + time * 3) * 0.5 + 0.5;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = s > 0.6 ? "#2ee6ff" : (s > 0.3 ? "#8a4dff" : "#f37a1f");
      ctx.fillRect(x - camX, GROUND_Y + 6, tile - 2, 34);
    }
    ctx.globalAlpha = 1;

    // Linie głębi
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 10; i++) {
      const y = GROUND_Y + 55 + i * 14;
      ctx.fillRect(0, y, W, 1);
    }
    ctx.globalAlpha = 1;

    // Bar z prawej jako landmark
    const barX = 2850;
    ctx.fillStyle = "#1e1626";
    ctx.fillRect(barX - camX, 320, 260, 220);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#f37a1f";
    ctx.fillRect(barX - camX + 24, 350, 212, 10);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("BAR", barX - camX + 105, 420);
  }

  function drawEntity(rect, color, label) {
    ctx.fillStyle = color;
    ctx.fillRect(rect.x - camX, rect.y, rect.w, rect.h);
    if (label) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText(label, rect.x - camX + 6, rect.y + 20);
    }
  }

  function drawPickup(p, time) {
    if (p.taken) return;
    const bob = Math.sin(time * 5 + p.x * 0.01) * 10;
    const x = p.x - camX;
    const y = p.y + bob;

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(46,230,255,0.9)";
    ctx.fillRect(x - 10, y - 10, 20, 20);

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(243,122,31,0.9)";
    ctx.fillRect(x - 4, y - 26, 8, 8);

    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    // Pasek u góry
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, 52);
    ctx.globalAlpha = 1;

    // Odwaga
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "800 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Odwaga:", 18, 34);

    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < player.courage ? 1 : 0.22;
      ctx.fillStyle = "#2ee6ff";
      ctx.fillRect(108 + i * 26, 18, 18, 18);
    }
    ctx.globalAlpha = 1;

    // Cel
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Cel: podejdź do niej i naciśnij TANIEC", 220, 33);
  }

  function update(dt, time) {
    // Kamera podąża
    camX = clamp(player.x - W * 0.35, 0, WORLD_W - W);

    if (state === "PLAY") {
      // Ruch
      const dir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      player.vx = dir * player.speed;
      player.x += player.vx * dt;
      player.x = clamp(player.x, SAFE, WORLD_W - SAFE);

      // Tłum porusza się (przeszkody)
      for (const c of crowd) {
        const sway = Math.sin(time * 2 + c.phase) * c.amp;
        c._x = c.x + sway;
        // Kolizja: lekko odpycha gracza (bez „kary”)
        if (aabb(player.x, player.y, player.w, player.h, c._x, c.y, c.w, c.h)) {
          player.x -= Math.sign(player.vx || 1) * 120 * dt;
          // delikatny efekt serduszek = "przepchnięcie" w tłumie
          if (Math.random() < 0.08) spawnHeart(player.x + player.w/2, player.y + 20);
        }
      }

      // Zbieranie odwagi
      for (const p of couragePickups) {
        if (!p.taken && aabb(player.x, player.y, player.w, player.h, p.x - 12, p.y - 12, 24, 24)) {
          p.taken = true;
          player.courage = Math.min(3, player.courage + 1);
          for (let i = 0; i < 8; i++) spawnHeart(p.x, p.y);
        }
      }

      // Interakcja z nią
      const nearHer = aabb(player.x, player.y, player.w, player.h, girl.x - 24, girl.y, girl.w + 48, girl.h);
      if (nearHer && player.courage >= 3) {
        setHint("Jesteś obok niej. Naciśnij TANIEC, żeby poprosić do tańca.");
        if (input.actPressed) {
          state = "DANCE";
          tDance = 0;
          input.actPressed = false;
          for (let i = 0; i < 24; i++) spawnHeart(girl.x, girl.y + 10);
        }
      } else if (nearHer && player.courage < 3) {
        setHint("Jesteś blisko niej, ale brakuje odwagi. Zbierz 3x ✨ (Odwaga).");
        if (input.actPressed) input.actPressed = false;
      } else {
        setHint("POZIOM 1: Pierwszy taniec\nZbierz 3x Odwaga (✨) i podejdź do niej. Następnie naciśnij TANIEC.");
        if (input.actPressed) input.actPressed = false;
      }
    }

    if (state === "DANCE") {
      tDance += dt;
      // krótka scena
      if (tDance > 2.2) {
        state = "WIN";
        setHint("LEVEL COMPLETED\nZostaliście razem całą noc - tańcząc, pijąc drinki, razem ze znajomymi.");
      }
    }

    // Serduszka
    hearts = hearts.filter(h => h.life > 0);
    for (const h of hearts) {
      h.life -= dt;
      h.vy += 420 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
    }
  }

  function draw(time) {
    drawNeonBG(time);

    // Świat: parkiet
    drawFloor(time, camX);

    // Start label nad kolegą
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Kolega", friend.x - camX, friend.y - 12);
    ctx.globalAlpha = 1;

    // NPC i gracz
    drawEntity({ ...friend }, "rgba(255,255,255,0.30)", "");

    // tłum
    for (const c of crowd) {
      const cx = (c._x ?? c.x);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(cx - camX, c.y, c.w, c.h);
    }
    ctx.globalAlpha = 1;

    // Odwaga pickup
    for (const p of couragePickups) drawPickup(p, time);

    // Ona + koleżanki jako "cel"
    drawEntity({ ...girls[0] }, "rgba(255,77,243,0.22)", "");
    drawEntity({ ...girls[1] }, "rgba(255,77,243,0.22)", "");
    drawEntity({ ...girl }, "rgba(243,122,31,0.28)", "");

    // Etykieta
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "800 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Ona", girl.x - camX + 6, girl.y - 10);

    // Gracz
    const playerColor = state === "DANCE" ? "rgba(46,230,255,0.45)" : "rgba(46,230,255,0.32)";
    drawEntity({ ...player }, playerColor, "");

    // Scena tańca
    if (state === "DANCE" || state === "WIN") {
      // spotlight
      const sx = (girl.x - camX) + 24;
      const sy = girl.y + 30;
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(sx, sy, 220, 160, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // tekst w środku świata (nie HUD)
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(W * 0.18, H * 0.28, W * 0.64, 84);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "900 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("„Czasem jeden taniec zmienia wszystko.”", W * 0.22, H * 0.28 + 54);
    }

    // Serduszka
    for (const h of hearts) {
      const a = Math.max(0, Math.min(1, h.life / 1.2));
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(243,122,31,0.85)";
      ctx.fillRect(h.x - camX, h.y, 6, 6);
      ctx.globalAlpha = 1;
    }

    // HUD
    drawHUD();

    // WIN overlay
    if (state === "WIN") {
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "900 42px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("LEVEL COMPLETED", W * 0.30, H * 0.45);

      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = "700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("Poziom 2 odblokowany: Pierwszy pocałunek", W * 0.30, H * 0.45 + 46);

      ctx.fillStyle = "rgba(46,230,255,0.75)";
      ctx.font = "800 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("Odśwież stronę, aby zagrać ponownie.", W * 0.30, H * 0.45 + 78);
    }
  }

  // Main loop
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    const time = now / 1000;

    update(dt, time);
    draw(time);

    // reset "press" edge
    input.actPressed = false;

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
