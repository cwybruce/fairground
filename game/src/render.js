// Paints the fairground: a camera follows the player over the 3600x2400 map, then the HUD,
// the minimap and the screen panels (title, paused, complete, busted) go on top. All art is
// drawn in code — flat shapes, warm midway lights against a dusk ground.
import { FIELD, PALETTE, FONT, TRUCK, BUMPER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_COMPLETE = 'complete';
export const SCREEN_BUSTED = 'busted';

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.viewW;
  canvas.height = FIELD.viewH;

  function camera(state) {
    return {
      x: clamp(state.player.x - FIELD.viewW / 2, 0, FIELD.width - FIELD.viewW),
      y: clamp(state.player.y - FIELD.viewH / 2, 0, FIELD.height - FIELD.viewH),
    };
  }

  function drawGround(state, layout, cam) {
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 0, FIELD.viewW, FIELD.viewH);
    // Dirt patches and grass edges, in world space.
    ctx.fillStyle = PALETTE.dirt;
    const patches = [[700, 900, 420, 200], [2400, 2100, 520, 220], [400, 1800, 380, 200], [3100, 700, 300, 180]];
    for (const [x, y, w, h] of patches) {
      ctx.beginPath();
      ctx.ellipse(x - cam.x, y - cam.y, w / 2, h / 2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0 - cam.x, 0 - cam.y, FIELD.width, 120);
    ctx.fillRect(0 - cam.x, FIELD.height - 60 - cam.y, FIELD.width, 60);
    // Midway road band.
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(240 - cam.x, 1240 - cam.y, 3120, 520);
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.setLineDash([40, 30]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(240 - cam.x, 1500 - cam.y);
    ctx.lineTo(3360 - cam.x, 1500 - cam.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Ring road.
    ctx.strokeStyle = PALETTE.road;
    ctx.lineWidth = 46;
    ctx.strokeRect(420 - cam.x, 420 - cam.y, 2760, 1560);
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 26]);
    ctx.strokeRect(420 - cam.x, 420 - cam.y, 2760, 1560);
    ctx.setLineDash([]);
    // Entrance plaza.
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(1500 - cam.x, 2050 - cam.y, 600, 290);
    // String lights along the midway, twinkling with the clock.
    const colors = ['#f2b63c', '#e2547e', '#2fb8a6', '#f5ead2'];
    for (let x = 260; x <= 3340; x += 60) {
      for (const y of [1246, 1754]) {
        const tw = 0.55 + 0.45 * Math.sin(state.time * 3 + x * 0.02);
        ctx.globalAlpha = tw;
        ctx.fillStyle = colors[Math.floor(x / 60) % colors.length];
        ctx.beginPath();
        ctx.arc(x - cam.x, y - cam.y, 5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawStall(stall, cam) {
    const x = stall.x - cam.x;
    const y = stall.y - cam.y;
    ctx.fillStyle = stall.color;
    rr(ctx, x, y, stall.w, stall.h, 8);
    ctx.fill();
    // Awning stripes.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < stall.w; i += 36) {
      ctx.fillRect(x + i, y, 18, 22);
    }
    ctx.fillStyle = 'rgba(16,10,24,0.85)';
    rr(ctx, x + 8, y + stall.h - 42, stall.w - 16, 32, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stall.label, x + stall.w / 2, y + stall.h - 25);
  }

  function drawWheel(state, layout, cam) {
    const w = layout.wheel;
    const x = w.x - cam.x;
    const y = w.y - cam.y;
    ctx.strokeStyle = PALETTE.wheel;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(x, y, w.r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i += 1) {
      const a = state.wheelAngle + (i * TAU) / 8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * w.r, y + Math.sin(a) * w.r);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? '#e2547e' : '#f2b63c';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * w.r, y + Math.sin(a) * w.r, 16, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.wheelHub;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FERRIS WHEEL', x, y - w.r - 34);
  }

  function drawArena(state, layout, cam) {
    const a = layout.arena;
    const x = a.x - cam.x;
    const y = a.y - cam.y;
    ctx.fillStyle = '#2a1f3a';
    ctx.fillRect(x, y, a.w, a.h);
    ctx.strokeStyle = '#f5ead2';
    ctx.lineWidth = 6;
    ctx.setLineDash([24, 18]);
    ctx.strokeRect(x, y, a.w, a.h);
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BUMPER CARS', x + a.w / 2, y + 34);
    // Two decorative cars circling the arena.
    for (let i = 0; i < 2; i += 1) {
      const t = state.time * 0.25 + i * Math.PI;
      const cx = x + a.w / 2 + Math.cos(t) * 170;
      const cy = y + a.h / 2 + Math.sin(t) * 120;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t + Math.PI / 2);
      ctx.fillStyle = i ? '#2fb8a6' : '#e2547e';
      rr(ctx, -22, -15, 44, 30, 8);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCoaster(layout, cam) {
    ctx.strokeStyle = '#5a4a72';
    ctx.lineWidth = 8;
    ctx.beginPath();
    layout.coaster.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x - cam.x, y - cam.y);
      else ctx.lineTo(x - cam.x, y - cam.y);
    });
    ctx.stroke();
    ctx.fillStyle = '#5a4a72';
    for (const [x, y] of layout.coaster) {
      ctx.fillRect(x - cam.x - 4, y - cam.y, 8, 90);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('THE SCREAMER', 1500 - cam.x, 150 - cam.y);
  }

  function drawVehicle(v, cam, time) {
    const x = v.x - cam.x;
    const y = v.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(v.angle);
    if (v.kind === 'truck') {
      ctx.fillStyle = '#c9a227';
      rr(ctx, -32, -17, 64, 34, 6);
      ctx.fill();
      ctx.fillStyle = '#3a2f16';
      ctx.fillRect(8, -15, 22, 30);
      ctx.fillStyle = '#f5ead2';
      ctx.font = 'bold 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('SECURITY', -8, 3);
    } else if (v.kind === 'bumper') {
      ctx.fillStyle = '#e2547e';
      rr(ctx, -22, -15, 44, 30, 9);
      ctx.fill();
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
    } else if (v.kind === 'police') {
      ctx.fillStyle = '#2b3f66';
      rr(ctx, -30, -16, 60, 32, 6);
      ctx.fill();
      ctx.fillStyle = '#f5ead2';
      ctx.font = 'bold 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 3);
      const flash = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#3b82ff';
      ctx.beginPath();
      ctx.arc(-12, -14, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = flash ? '#3b82ff' : '#ff3b30';
      ctx.beginPath();
      ctx.arc(12, -14, 6, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#7a6a8a';
      rr(ctx, -28, -15, 56, 30, 6);
      ctx.fill();
      ctx.fillStyle = '#f5ead2';
      ctx.font = 'bold 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('STAFF', 0, 3);
    }
    ctx.restore();
  }

  function drawPed(ped, cam) {
    const x = ped.x - cam.x;
    const y = ped.y - cam.y + Math.sin(ped.phase) * 2;
    ctx.fillStyle = ped.hue;
    ctx.beginPath();
    ctx.arc(x, y, ped.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(16,10,24,0.6)';
    ctx.beginPath();
    ctx.arc(x, y - 3, 4, 0, TAU);
    ctx.fill();
  }

  function drawGuard(g, cam) {
    if (!g.alive) return;
    const x = g.x - cam.x;
    const y = g.y - cam.y;
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(x, y, g.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(g.angle) * 24, y + Math.sin(g.angle) * 24);
    ctx.stroke();
    if (g.chasing) {
      ctx.fillStyle = '#e5534b';
      ctx.font = 'bold 16px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 24);
    }
  }

  function drawPlayer(state, cam) {
    const p = state.player;
    if (!p.onFoot) return;
    const x = p.x - cam.x;
    const y = p.y - cam.y;
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(x, y, p.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2f16';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(p.angle) * 26, y + Math.sin(p.angle) * 26);
    ctx.stroke();
    ctx.fillStyle = '#3a2f16';
    ctx.beginPath();
    ctx.arc(x, y - 4, 5, 0, TAU);
    ctx.fill();
  }

  function drawParticles(state, cam) {
    for (const pt of state.particles) {
      ctx.globalAlpha = clamp(pt.life / 0.5, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - cam.x - pt.size / 2, pt.y - cam.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawMarker(state, cam) {
    const m = state.marker;
    if (!m) return;
    const x = m.x - cam.x;
    const y = m.y - cam.y;
    const pulse = 1 + 0.12 * Math.sin(state.time * 4);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 34 * pulse, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, TAU);
    ctx.fill();
    const d = Math.round(Math.hypot(state.player.x - m.x, state.player.y - m.y));
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(`${d}m  →  ${m.label}`, x, y - 52);
  }

  function drawMinimap(state, layout) {
    const mx = FIELD.viewW - 252;
    const my = 12;
    const mw = 240;
    const mh = 160;
    const sx = mw / FIELD.width;
    const sy = mh / FIELD.height;
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, mx - 6, my - 6, mw + 12, mh + 12, 10);
    ctx.fill();
    ctx.fillStyle = '#2e2138';
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#3a2b4a';
    ctx.fillRect(mx, my + 1240 * sy, mw, 520 * sy);
    ctx.fillStyle = PALETTE.wheel;
    ctx.beginPath();
    ctx.arc(mx + layout.wheel.x * sx, my + layout.wheel.y * sy, 12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e2547e';
    for (const s of layout.stalls) {
      ctx.fillRect(mx + s.x * sx, my + s.y * sy, Math.max(2, s.w * sx), Math.max(2, s.h * sy));
    }
    if (state.marker) {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(mx + state.marker.x * sx, my + state.marker.y * sy, 4, 0, TAU);
      ctx.fill();
    }
    for (const c of state.police) {
      ctx.fillStyle = '#3b82ff';
      ctx.beginPath();
      ctx.arc(mx + c.x * sx, my + c.y * sy, 3.5, 0, TAU);
      ctx.fill();
    }
    for (const g of state.guards) {
      if (!g.alive) continue;
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(mx + g.x * sx, my + g.y * sy, 2.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,234,210,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('PORT VANE FAIRGROUND', mx + mw / 2, my + mh + 18);
  }

  function drawHud(state) {
    const p = state.player;
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, 12, 12, 250, 108, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('FAIRGROUND', 24, 42);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText('$' + state.cash.toLocaleString('en-US'), 24, 72);
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < state.wanted ? '★' : '☆';
    ctx.fillStyle = state.wanted >= 3 ? '#ff6b5e' : PALETTE.gold;
    ctx.font = '22px ' + FONT;
    ctx.fillText(stars, 24, 100);
    ctx.fillStyle = '#3a2b4a';
    ctx.fillRect(140, 82, 104, 12);
    ctx.fillStyle = PALETTE.hp;
    ctx.fillRect(140, 82, 104 * clamp(p.hp / 100, 0, 1), 12);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '12px ' + FONT;
    ctx.fillText(Math.ceil(p.hp) + ' HP', 140, 106);

    if (state.messageT > 0 && state.message) {
      ctx.fillStyle = PALETTE.panel;
      const w = Math.min(760, ctx.measureText(state.message).width + 36);
      rr(ctx, (FIELD.viewW - w) / 2, 14, w, 40, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = '16px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(state.message, FIELD.viewW / 2, 40);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = PALETTE.panel;
    rr(ctx, 12, FIELD.viewH - 96, 460, 84, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 17px ' + FONT;
    ctx.fillText(state.missionTitle, 24, FIELD.viewH - 66);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '14px ' + FONT;
    wrapText(state.missionObjective, 24, FIELD.viewH - 44, 436, 18);
    if (state.channelActive && state.channel > 0) {
      ctx.fillStyle = '#3a2b4a';
      ctx.fillRect(24, FIELD.viewH - 26, 200, 8);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(24, FIELD.viewH - 26, 200 * clamp(state.channel / 1.5, 0, 1), 8);
    }

    const speed = p.onFoot ? 0 : Math.round(Math.abs(p.vehicle.speed) * 0.36);
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, FIELD.viewW - 168, FIELD.viewH - 64, 156, 52, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(p.onFoot ? 'ON FOOT' : p.vehicle.kind === 'truck' ? 'PICKUP TRUCK' : 'BUMPER CAR', FIELD.viewW - 24, FIELD.viewH - 42);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText(speed + ' km/h', FIELD.viewW - 24, FIELD.viewH - 18);
    ctx.textAlign = 'left';
  }

  function wrapText(text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(10, 6, 16, 0.72)';
    ctx.fillRect(0, 0, FIELD.viewW, FIELD.viewH);
    const w = 760;
    const h = 130 + lines.length * 30;
    const x = (FIELD.viewW - w) / 2;
    const y = (FIELD.viewH - h) / 2;
    ctx.fillStyle = 'rgba(16, 10, 24, 0.95)';
    rr(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    rr(ctx, x, y, w, h, 16);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.viewW / 2, y + 66);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '18px ' + FONT;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.viewW / 2, y + 112 + i * 30);
    });
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best, layout) {
    const cam = camera(state);
    drawGround(state, layout, cam);
    drawCoaster(layout, cam);
    drawArena(state, layout, cam);
    for (const stall of layout.stalls) drawStall(stall, cam);
    drawWheel(state, layout, cam);
    for (const t of state.vehicles) drawVehicle(t, cam, state.time);
    for (const c of state.police) drawVehicle(c, cam, state.time);
    for (const ped of state.peds) drawPed(ped, cam);
    for (const g of state.guards) drawGuard(g, cam);
    drawPlayer(state, cam);
    drawParticles(state, cam);
    drawMarker(state, cam);

    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state);
      drawMinimap(state, layout);
      if (screen === SCREEN_PAUSED) {
        drawPanel('PAUSED', ['Press P to keep working the midway.', 'M mute · E interact · Space shoot'], PALETTE.gold);
      }
      return;
    }
    if (screen === SCREEN_TITLE) {
      drawHud(state);
      drawMinimap(state, layout);
      drawPanel('FAIRGROUND', [
        'Port Vane Fair — 18:47, the last trains are running.',
        'You are the grifter. Four jobs before closing. Lift, steal, outrun, vanish.',
        `Best run: $${(best || 0).toLocaleString('en-US')}  ·  Missions done: ${state.completed ? 4 : state.missionIndex} / 4`,
        '',
        'Press Space or click to start  ·  Continue with C if you have a save',
      ], PALETTE.gold);
      return;
    }
    if (screen === SCREEN_COMPLETE) {
      drawHud(state);
      drawPanel('CLEAN GETAWAY — COMPLETE', [
        `Final take: $${state.cash.toLocaleString('en-US')}`,
        'Four jobs, one night, no witnesses who matter.',
        'Press Space to run it again.',
      ], PALETTE.gold);
      return;
    }
    if (screen === SCREEN_BUSTED) {
      drawHud(state);
      drawPanel('BUSTED', [
        'Security walks you to the gate. They keep 10% of the take.',
        `Cash kept: $${state.cash.toLocaleString('en-US')}`,
        'Press Space to get back on your feet.',
      ], PALETTE.danger);
    }
  }

  return { draw, camera };
}
