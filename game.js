// Poziom 1 - Pierwszy taniec (PRO, landscape-first + neon/pixel)
// - auto-pauza i przyciemnienie w pionie
// - haptic (navigator.vibrate) przy zebraniu "Odwagi" - na iOS może działać ograniczenie
// - skalowanie UI pod różne iPhone'y

(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });

  const hintEl = document.getElementById("hint");
  const portraitOverlay = document.getElementById("portraitOverlay");

  const W = canvas.width, H = canvas.height;
  const GROUND_Y = 560;
  const WORLD_W = 3200;
  const SAFE = 42;

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const rand = (a,b)=>a+Math.random()*(b-a);

  // UI scaling
  function applyUIScale(){
    const minSide = Math.min(window.innerWidth, window.innerHeight);
    const btn = clamp(Math.round(minSide * 0.17), 64, 96);
    const btnAction = clamp(Math.round(btn * 1.25), 86, 124);
    const gap = clamp(Math.round(btn * 0.14), 10, 16);
    const pad = clamp(Math.round(btn * 0.18), 12, 18);

    document.documentElement.style.setProperty("--btn", btn + "px");
    document.documentElement.style.setProperty("--btnAction", btnAction + "px");
    document.documentElement.style.setProperty("--gap", gap + "px");
    document.documentElement.style.setProperty("--uiPad", pad + "px");
    document.documentElement.style.setProperty("--radius", Math.round(btn * 0.22) + "px");
    document.documentElement.style.setProperty("--radiusAction", Math.round(btnAction * 0.22) + "px");
  }

  const isLandscape = () => window.innerWidth > window.innerHeight;

  let pausedByPortrait = !isLandscape();
  function syncOrientation(){
    pausedByPortrait = !isLandscape();
    portraitOverlay.style.display = pausedByPortrait ? "flex" : "none";
  }

  window.addEventListener("resize", () => { applyUIScale(); syncOrientation(); });
  window.addEventListener("orientationchange", () => { applyUIScale(); syncOrientation(); });
  applyUIScale();
  syncOrientation();

  // iOS: blokuj scroll
  addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // Input
  const input = { left:false, right:false, act:false, actPressed:false };

  function bindBtn(id, key){
    const el = document.getElementById(id);
    const down = (e) => { e.preventDefault(); input[key] = true; if (key === "act") input.actPressed = true; };
    const up   = (e) => { e.preventDefault(); input[key] = false; };
    el.addEventListener("pointerdown", down, { passive:false });
    el.addEventListener("pointerup", up, { passive:false });
    el.addEventListener("pointercancel", up, { passive:false });
    el.addEventListener("pointerleave", up, { passive:false });
  }
  bindBtn("left","left");
  bindBtn("right","right");
  bindBtn("act","act");

  // klawiatura (PC)
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

  // Haptics
  function haptic(ms=15){
    try{ if (navigator.vibrate) navigator.vibrate(ms); } catch(_){}
  }

  // Helpers
  function setHint(t){ hintEl.textContent = t; }
  function aabb(ax,ay,aw,ah,bx,by,bw,bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Sprites (procedural pixel)
  function makeSprite(pixels, scale=3){
    const h = pixels.length, w = pixels[0].length;
    const off = document.createElement("canvas");
    off.width = w * scale; off.height = h * scale;
    const c = off.getContext("2d"); c.imageSmoothingEnabled = false;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const col = pixels[y][x];
        if(!col) continue;
        c.fillStyle = col;
        c.fillRect(x*scale,y*scale,scale,scale);
      }
    }
    return off;
  }

  const SPR_PLAYER = makeSprite([
    [0,0,0,"#2ee6ff","#2ee6ff",0,0,0,0,0,0,0],
    [0,0,"#2ee6ff","#ffffff","#ffffff","#2ee6ff",0,0,0,0,0,0],
    [0,"#2ee6ff","#ffffff","#0b0a10","#0b0a10","#ffffff","#2ee6ff",0,0,0,0,0],
    [0,"#2ee6ff","#ffffff","#ffffff","#ffffff","#ffffff","#2ee6ff",0,0,0,0,0],
    [0,0,"#2ee6ff","#2ee6ff","#2ee6ff","#2ee6ff",0,0,0,0,0,0],
    [0,0,0,"#2ee6ff","#2ee6ff",0,0,0,0,0,0,0],
    [0,0,"#2ee6ff","#2ee6ff","#2ee6ff","#2ee6ff",0,0,0,0,0,0],
    [0,"#2ee6ff","#2ee6ff",0,0,"#2ee6ff","#2ee6ff",0,0,0,0,0],
    [0,"#2ee6ff",0,0,0,0,"#2ee6ff",0,0,0,0,0],
    [0,"#2ee6ff","#2ee6ff",0,0,"#2ee6ff","#2ee6ff",0,0,0,0,0],
    [0,0,"#2ee6ff",0,0,0,"#2ee6ff",0,0,0,0,0],
  ], 4);

  const SPR_GIRL = makeSprite([
    [0,0,0,"#f37a1f","#f37a1f",0,0,0,0,0,0,0],
    [0,0,"#f37a1f","#ffffff","#ffffff","#f37a1f",0,0,0,0,0,0],
    [0,"#f37a1f","#ffffff","#0b0a10","#0b0a10","#ffffff","#f37a1f",0,0,0,0,0],
    [0,"#f37a1f","#ffffff","#ffffff","#ffffff","#ffffff","#f37a1f",0,0,0,0,0],
    [0,0,"#f37a1f","#f37a1f","#f37a1f","#f37a1f",0,0,0,0,0,0],
    [0,0,0,"#ff4df3","#ff4df3",0,0,0,0,0,0,0],
    [0,0,"#ff4df3","#ff4df3","#ff4df3","#ff4df3",0,0,0,0,0,0],
    [0,"#ff4df3",0,0,0,0,"#ff4df3",0,0,0,0,0],
    [0,"#ff4df3","#ff4df3",0,0,"#ff4df3","#ff4df3",0,0,0,0,0],
    [0,0,0,"#ff4df3","#ff4df3",0,0,0,0,0,0,0],
  ], 4);

  // World / entities
  let camX = 0;
  const player = { x:120, y:GROUND_Y-84, w:44, h:84, vx:0, speed:520, courage:0 };
  const friend = { x:60, y:GROUND_Y-80, w:40, h:80 };

  const girl = { x:2550, y:GROUND_Y-92, w:46, h:92 };
  const girls = [
    { x: girl.x - 64, y: GROUND_Y - 86, w: 42, h: 86 },
    { x: girl.x + 64, y: GROUND_Y - 86, w: 42, h: 86 },
  ];

  const crowd = [];
  for(let i=0;i<20;i++){
    crowd.push({
      x: 520 + i*140 + rand(-40,40),
      y: GROUND_Y - (72 + rand(0,34)),
      w: 42 + rand(0,18),
      h: 72 + rand(0,34),
      phase: rand(0,Math.PI*2),
      amp: rand(10,26),
      col: (i%3===0) ? "rgba(46,230,255,0.16)" : (i%3===1 ? "rgba(255,77,243,0.16)" : "rgba(243,122,31,0.16)")
    });
  }

  const couragePickups = [
    { x: 900,  y: GROUND_Y - 170, taken:false },
    { x: 1500, y: GROUND_Y - 210, taken:false },
    { x: 2050, y: GROUND_Y - 180, taken:false },
  ];

  let state = "PLAY";
  let tDance = 0;

  let particles = [];
  function spawnParticle(x,y,kind="heart"){
    particles.push({ x,y, vx: rand(-70,70), vy: rand(-220,-290), life: 1.15, kind });
  }

  setHint("POZIOM 1: Pierwszy taniec\nZbierz 3x Odwaga (✨) i podejdź do niej. Następnie naciśnij TANIEC.");
  ctx.imageSmoothingEnabled = false;

  function drawNeonBG(time){
    ctx.fillStyle = "#05040a";
    ctx.fillRect(0,0,W,H);

    for(let i=0;i<14;i++){
      const y = (i*52 + (time*70)%52) - 52;
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = (i%3===0) ? "#f37a1f" : (i%3===1 ? "#8a4dff" : "#2ee6ff");
      ctx.fillRect(0,y,W,26);
    }
    ctx.globalAlpha = 1;

    for(let i=0;i<90;i++){
      const x = (i*140 + time*44) % W;
      const y = 64 + (i*33) % 420;
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = (i%3===0) ? "#2ee6ff" : (i%3===1 ? "#ff4df3" : "#f37a1f");
      ctx.fillRect(x, y, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloor(time){
    ctx.fillStyle = "#130f19";
    ctx.fillRect(-camX, GROUND_Y, WORLD_W, H - GROUND_Y);

    const tile = 64;
    for(let x=0;x<WORLD_W;x+=tile){
      const s = Math.sin((x*0.02) + time*3)*0.5 + 0.5;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = s>0.62 ? "#2ee6ff" : (s>0.34 ? "#8a4dff" : "#f37a1f");
      ctx.fillRect(x - camX, GROUND_Y + 6, tile - 2, 34);
    }
    ctx.globalAlpha = 1;

    const signX = 1180;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#2ee6ff";
    ctx.fillRect(signX - camX, 210, 280, 42);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#ff4df3";
    ctx.fillRect(signX - camX + 8, 218, 264, 26);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "900 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("SPACE / CZCHÓW", signX - camX + 38, 238);
  }

  function drawHUD(){
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(0,0,W,52);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Odwaga:", 18, 34);

    for(let i=0;i<3;i++){
      ctx.globalAlpha = i < player.courage ? 1 : 0.22;
      ctx.fillStyle = "#2ee6ff";
      ctx.fillRect(108 + i*26, 18, 18, 18);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "750 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Cel: podejdź do niej i naciśnij TANIEC", 220, 33);
  }

  function drawPickup(p, time){
    if (p.taken) return;
    const bob = Math.sin(time*5 + p.x*0.01)*10;
    const x = (p.x - camX) | 0;
    const y = (p.y + bob) | 0;

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(46,230,255,0.9)";
    ctx.fillRect(x - 10, y - 10, 20, 20);

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(243,122,31,0.9)";
    ctx.fillRect(x - 4, y - 26, 8, 8);
    ctx.globalAlpha = 1;
  }

  function drawSprite(sprite, x, y, w, h){
    const sx = (x - camX + w/2 - sprite.width/2) | 0;
    const sy = (y + h - sprite.height) | 0;
    ctx.drawImage(sprite, sx, sy);
  }

  function drawCrowd(time){
    for(const c of crowd){
      const sway = Math.sin(time*2 + c.phase)*c.amp;
      c._x = c.x + sway;
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.col;
      ctx.fillRect((c._x - camX)|0, c.y|0, c.w|0, c.h|0);
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(){
    for(const p of particles){
      const a = Math.max(0, Math.min(1, p.life/1.15));
      ctx.globalAlpha = a;
      ctx.fillStyle = (p.kind === "heart") ? "rgba(243,122,31,0.85)" : "rgba(46,230,255,0.85)";
      ctx.fillRect((p.x - camX)|0, p.y|0, (p.kind === "heart")?6:4, (p.kind === "heart")?6:4);
      ctx.globalAlpha = 1;
    }
  }

  function update(dt, time){
    camX = clamp(player.x - W*0.35, 0, WORLD_W - W);
    if (pausedByPortrait) return;

    if (state === "PLAY"){
      const dir = (input.left?-1:0) + (input.right?1:0);
      player.vx = dir * player.speed;
      player.x = clamp(player.x + player.vx * dt, SAFE, WORLD_W - SAFE);

      for(const c of crowd){
        const cx = c._x ?? c.x;
        if (aabb(player.x, player.y, player.w, player.h, cx, c.y, c.w, c.h)){
          player.x -= Math.sign(player.vx || 1) * 130 * dt;
          if (Math.random() < 0.08) spawnParticle(player.x + player.w/2, player.y + 20, "heart");
        }
      }

      for(const p of couragePickups){
        if (!p.taken && aabb(player.x, player.y, player.w, player.h, p.x-12, p.y-12, 24, 24)){
          p.taken = true;
          player.courage = Math.min(3, player.courage + 1);
          for(let i=0;i<10;i++) spawnParticle(p.x, p.y, (i%2===0)?"spark":"heart");
          haptic(15);
        }
      }

      const nearHer = aabb(player.x, player.y, player.w, player.h, girl.x-24, girl.y, girl.w+48, girl.h);
      if (nearHer && player.courage >= 3){
        setHint("Jesteś obok niej. Naciśnij TANIEC, żeby poprosić do tańca.");
        if (input.actPressed){
          state = "DANCE";
          tDance = 0;
          input.actPressed = false;
          for(let i=0;i<26;i++) spawnParticle(girl.x, girl.y + 10, "heart");
          haptic(20);
        }
      } else if (nearHer && player.courage < 3){
        setHint("Jesteś blisko niej, ale brakuje odwagi. Zbierz 3x ✨ (Odwaga).");
      } else {
        setHint("POZIOM 1: Pierwszy taniec\nZbierz 3x Odwaga (✨) i podejdź do niej. Następnie naciśnij TANIEC.");
      }
    }

    if (state === "DANCE"){
      tDance += dt;
      if (Math.random() < 0.22) spawnParticle(girl.x + rand(-24,24), girl.y + rand(0,40), "heart");
      if (tDance > 2.2){
        state = "WIN";
        setHint("LEVEL COMPLETED\nZostaliście razem całą noc - tańcząc, pijąc drinki, razem ze znajomymi.");
        haptic(35);
      }
    }

    particles = particles.filter(p=>p.life>0);
    for(const p of particles){
      p.life -= dt;
      p.vy += 440*dt;
      p.x += p.vx*dt;
      p.y += p.vy*dt;
    }
  }

  function draw(time){
    drawNeonBG(time);
    drawFloor(time);
    drawCrowd(time);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "800 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Kolega", (friend.x - camX)|0, (friend.y - 12)|0);
    ctx.globalAlpha = 1;

    for(const p of couragePickups) drawPickup(p, time);

    ctx.globalAlpha = 0.20;
    ctx.fillStyle = "rgba(255,77,243,0.75)";
    for(const g of girls) ctx.fillRect((g.x - camX)|0, g.y|0, g.w|0, g.h|0);
    ctx.globalAlpha = 1;

    drawSprite(SPR_GIRL, girl.x, girl.y, girl.w, girl.h);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "900 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Ona", (girl.x - camX + 6)|0, (girl.y - 10)|0);

    drawSprite(SPR_PLAYER, player.x, player.y, player.w, player.h);

    drawParticles();
    drawHUD();

    if (state === "WIN"){
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#000";
      ctx.fillRect(0,0,W,H);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.font = "950 42px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("LEVEL COMPLETED", (W*0.30)|0, (H*0.45)|0);
    }

    if (pausedByPortrait){
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = "#000";
      ctx.fillRect(0,0,W,H);
      ctx.globalAlpha = 1;
    }
  }

  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.033, (now - last)/1000);
    last = now;
    const time = now/1000;

    const shouldPause = !isLandscape();
    if (shouldPause !== pausedByPortrait){
      pausedByPortrait = shouldPause;
      portraitOverlay.style.display = pausedByPortrait ? "flex" : "none";
    }

    update(dt, time);
    draw(time);

    input.actPressed = false;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
