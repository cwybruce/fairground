// The fairground itself: the map, the people in it, the vehicles, the wanted system and the
// mission flow. The world advances in fixed 1/60 s steps; the renderer only paints state.
import { FIELD, START_CASH, PAYOUTS, PLAYER, TRUCK, BUMPER, GUARD, POLICE, WANTED, BUSTED_KEEP, PLACES } from './config.js';
import { pick } from './random.js';
import { startMission, updateMission } from './missions.js';

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Push a circle out of a rectangle; returns true when it touched. */
function pushOutRect(circle, rect) {
  const nx = clamp(circle.x, rect.x, rect.x + rect.w);
  const ny = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - nx;
  const dy = circle.y - ny;
  const d2 = dx * dx + dy * dy;
  const r = circle.radius;
  if (d2 >= r * r) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    circle.x = nx + (dx / d) * r;
    circle.y = ny + (dy / d) * r;
  } else {
    circle.y = rect.y - r;
  }
  return true;
}

const STALLS = [
  { x: 2050, y: 1400, w: 200, h: 120, color: '#e2547e', label: 'PRIZE STALL' },
  { x: 2400, y: 1400, w: 180, h: 120, color: '#f2b63c', label: 'RING TOSS' },
  { x: 1250, y: 1400, w: 200, h: 120, color: '#2fb8a6', label: 'COTTON CANDY' },
  { x: 1600, y: 1400, w: 180, h: 120, color: '#8a5fd0', label: 'POPCORN' },
  { x: 1250, y: 900, w: 220, h: 130, color: '#8a5fd0', label: 'FORTUNE TELLER' },
  { x: 1600, y: 900, w: 200, h: 130, color: '#d84a3a', label: 'FUN HOUSE' },
  { x: 2750, y: 1400, w: 200, h: 120, color: '#2fb8a6', label: 'DUNK TANK' },
  { x: 3000, y: 1050, w: 220, h: 130, color: '#e2547e', label: 'HAUNTED' },
  { x: 700, y: 1400, w: 200, h: 120, color: '#f2b63c', label: 'TICKETS' },
  { x: 1000, y: 1700, w: 200, h: 110, color: '#d84a3a', label: 'HOT DOGS' },
  { x: 2600, y: 1700, w: 200, h: 110, color: '#2fb8a6', label: 'LEMONADE' },
];

const WHEEL = { x: 2800, y: 600, r: 250 };
const ARENA = { x: 450, y: 400, w: 520, h: 420 };
const COASTER = [
  [300, 260], [900, 180], [1500, 260], [2100, 180], [2600, 260], [3200, 200],
];
const TREES = [
  [350, 2200], [900, 2250], [3300, 900], [3400, 2100], [200, 900], [3200, 300], [120, 300],
];
const RING_WAYPOINTS = [
  [420, 420], [3180, 420], [3180, 1980], [420, 1980],
];
const GUARD_HOMES = [
  [1200, 1250], [2100, 1250], [2900, 1250], [1600, 1900], [2500, 1900], [3100, 1700],
];
const PED_ZONES = [
  { x: 500, y: 1250, w: 2600, h: 500 },
  { x: 1200, y: 850, w: 2000, h: 450 },
  { x: 1400, y: 2000, w: 1200, h: 280 },
];

export function createWorld(random) {
  const state = {
    time: 0,
    cash: START_CASH,
    wanted: 0,
    wantedTimer: 0,
    missionIndex: 0,
    missionPhase: 'go',
    marker: null,
    missionTitle: '',
    missionObjective: '',
    message: '',
    messageT: 0,
    channel: 0,
    channelActive: false,
    wheelAngle: 0,
    screen: 'title',
    completed: false,
    busted: false,
    best: 0,
    player: {
      x: PLACES.spawn.x, y: PLACES.spawn.y, angle: -Math.PI / 2,
      onFoot: true, vehicle: null, hp: PLAYER.hp, gunCd: 0,
      radius: PLAYER.radius, speed: 0,
    },
    vehicles: [],
    guards: [],
    peds: [],
    police: [],
    particles: [],
  };

  function spawnVehicles() {
    state.vehicles = [
      { kind: 'truck', x: PLACES.truckParked.x, y: PLACES.truckParked.y, angle: 0, speed: 0, w: TRUCK.width, h: TRUCK.height, radius: 34, parked: true },
      { kind: 'bumper', x: PLACES.bumperParked.x, y: PLACES.bumperParked.y, angle: 0, speed: 0, w: BUMPER.width, h: BUMPER.height, radius: 24, parked: true },
      { kind: 'traffic', x: 420, y: 420, angle: 0, speed: 200, w: 56, h: 30, radius: 30, wp: 1 },
      { kind: 'traffic', x: 3180, y: 1980, angle: Math.PI, speed: 200, w: 56, h: 30, radius: 30, wp: 3 },
    ];
  }

  function spawnGuards() {
    state.guards = GUARD_HOMES.map(([x, y], i) => ({
      x, y, homeX: x, homeY: y, angle: 0, hp: GUARD.hp, shootCd: 0.5 + i * 0.3,
      radius: GUARD.radius, tx: x, ty: y, retarget: 0, chasing: false, alive: true,
    }));
  }

  function spawnPeds() {
    state.peds = [];
    for (let i = 0; i < 36; i += 1) {
      const zone = pick(random, PED_ZONES);
      const x = zone.x + random() * zone.w;
      const y = zone.y + random() * zone.h;
      state.peds.push({
        x, y, tx: x, ty: y, speed: 30 + random() * 40,
        hue: pick(random, ['#f2b63c', '#e2547e', '#2fb8a6', '#f5ead2', '#8a5fd0']),
        radius: 11, phase: random() * TAU,
      });
    }
  }

  function reset() {
    state.time = 0;
    state.cash = START_CASH;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.missionIndex = 0;
    state.channel = 0;
    state.channelActive = false;
    state.completed = false;
    state.busted = false;
    state.particles = [];
    state.police = [];
    state.player.x = PLACES.spawn.x;
    state.player.y = PLACES.spawn.y;
    state.player.angle = -Math.PI / 2;
    state.player.onFoot = true;
    state.player.vehicle = null;
    state.player.hp = PLAYER.hp;
    state.player.gunCd = 0;
    spawnVehicles();
    spawnGuards();
    spawnPeds();
    startMission(state, 0);
  }

  function say(message, seconds = 4) {
    state.message = message;
    state.messageT = seconds;
  }

  function addWanted(n) {
    state.wanted = clamp(state.wanted + n, 0, WANTED.max);
    state.wantedTimer = 0;
  }

  function setMarker(x, y, label) {
    state.marker = { x, y, label };
  }

  function clearMarker() {
    state.marker = null;
  }

  function pay(amount) {
    state.cash += amount;
  }

  function spawnParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      if (state.particles.length > 220) return;
      const a = random() * TAU;
      const s = speed * (0.4 + random() * 0.8);
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + random() * 0.4, color, size: 2 + random() * 3 });
    }
  }

  function damagePlayer(amount) {
    const p = state.player;
    p.hp = Math.max(0, p.hp - amount);
    spawnParticles(p.x, p.y, '#e5534b', 6, 160);
    if (p.hp <= 0) bust();
  }

  function bust() {
    state.busted = true;
    state.cash = Math.floor(state.cash * BUSTED_KEEP);
    say('Busted! The carnies take their cut. Press Space to get back up.', 6);
  }

  function respawnAfterBust() {
    const p = state.player;
    const starts = [PLACES.spawn, PLACES.truckParked, PLACES.wheelBase, PLACES.eastCheckpoint];
    const at = starts[state.missionIndex] || PLACES.spawn;
    p.x = at.x;
    p.y = at.y + 60;
    p.angle = -Math.PI / 2;
    p.onFoot = true;
    p.vehicle = null;
    p.hp = PLAYER.hp;
    state.wanted = 1;
    state.busted = false;
    state.police = [];
    startMission(state, state.missionIndex);
    say('Back on your feet. The job is still on.', 4);
  }

  function enterVehicle(vehicle) {
    const p = state.player;
    p.onFoot = false;
    p.vehicle = vehicle;
    vehicle.parked = false;
    p.x = vehicle.x;
    p.y = vehicle.y;
    p.angle = vehicle.angle;
    if (vehicle.kind === 'truck' && state.missionIndex === 1) addWanted(1);
    say(vehicle.kind === 'truck' ? 'The truck is yours. Deliver it to the Ferris wheel.' : 'Bumper car! Slow, but it turns on a dime.');
  }

  function exitVehicle() {
    const p = state.player;
    const v = p.vehicle;
    if (!v) return;
    p.onFoot = true;
    p.vehicle = null;
    p.x = v.x + Math.cos(v.angle + Math.PI / 2) * 50;
    p.y = v.y + Math.sin(v.angle + Math.PI / 2) * 50;
    p.angle = v.angle;
  }

  function collideWorld(circle) {
    for (const stall of STALLS) pushOutRect(circle, stall);
    const dw = dist(circle.x, circle.y, WHEEL.x, WHEEL.y);
    const minD = WHEEL.r + circle.radius * 0.6;
    if (dw < minD && dw > 0.001) {
      circle.x = WHEEL.x + ((circle.x - WHEEL.x) / dw) * minD;
      circle.y = WHEEL.y + ((circle.y - WHEEL.y) / dw) * minD;
    }
    circle.x = clamp(circle.x, 40, FIELD.width - 40);
    circle.y = clamp(circle.y, 40, FIELD.height - 40);
  }

  function stepPlayer(dt, dir, mouse, shooting) {
    const p = state.player;
    p.gunCd = Math.max(0, p.gunCd - dt);
    if (p.onFoot) {
      const len = Math.hypot(dir.x, dir.y) || 1;
      const nx = dir.x / len;
      const ny = dir.y / len;
      const moving = dir.x !== 0 || dir.y !== 0;
      p.x += nx * PLAYER.walkSpeed * dt * (moving ? 1 : 0);
      p.y += ny * PLAYER.walkSpeed * dt * (moving ? 1 : 0);
      if (moving) p.angle = Math.atan2(ny, nx);
      collideWorld(p);
      if (shooting && p.gunCd <= 0) {
        p.gunCd = PLAYER.gunCooldown;
        shootToward(mouse);
      }
    } else {
      driveVehicle(p.vehicle, dt, dir);
    }
  }

  function driveVehicle(v, dt, dir) {
    const spec = v.kind === 'bumper' ? BUMPER : TRUCK;
    const p = state.player;
    if (dir.y < 0) v.speed += spec.accel * dt;
    else if (dir.y > 0) v.speed -= spec.brake * dt;
    else v.speed -= Math.sign(v.speed) * 140 * dt;
    if (Math.abs(v.speed) < 4 && dir.y === 0) v.speed = 0;
    v.speed = clamp(v.speed, -spec.reverseMax, spec.maxSpeed);
    const steer = (dir.x !== 0 ? dir.x : 0) * spec.turn * dt * clamp(Math.abs(v.speed) / 120, 0, 1);
    v.angle += steer * Math.sign(v.speed || 1);
    v.x += Math.cos(v.angle) * v.speed * dt;
    v.y += Math.sin(v.angle) * v.speed * dt;
    const before = { x: v.x, y: v.y };
    collideWorld(v);
    if (Math.abs(v.x - before.x) > 0.01 || Math.abs(v.y - before.y) > 0.01) v.speed *= 0.55;
    p.x = v.x;
    p.y = v.y;
    p.angle = v.angle;
    p.speed = Math.abs(v.speed);
    if (Math.abs(v.speed) > 300 && random() < dt * 6) {
      spawnParticles(v.x - Math.cos(v.angle) * 30, v.y - Math.sin(v.angle) * 30, '#6b5a7a', 1, 40);
    }
  }

  function shootToward(mouse) {
    const p = state.player;
    const wx = mouse.worldX;
    const wy = mouse.worldY;
    const angle = Math.atan2(wy - p.y, wx - p.x);
    let bestGuard = null;
    let bestD = Infinity;
    for (const g of state.guards) {
      if (!g.alive) continue;
      const d = dist(p.x, p.y, g.x, g.y);
      if (d > PLAYER.gunRange) continue;
      const ga = Math.atan2(g.y - p.y, g.x - p.x);
      let diff = Math.abs(ga - angle);
      if (diff > Math.PI) diff = TAU - diff;
      if (diff < 0.09 && d < bestD) {
        bestD = d;
        bestGuard = g;
      }
    }
    world.audio && world.audio.gunshot();
    if (bestGuard) {
      bestGuard.hp -= PLAYER.gunDamage;
      spawnParticles(bestGuard.x, bestGuard.y, '#ffd94d', 8, 200);
      if (bestGuard.hp <= 0) {
        bestGuard.alive = false;
        spawnParticles(bestGuard.x, bestGuard.y, '#e2547e', 14, 240);
        say('Guard down. The midway is watching now.');
      }
    } else {
      const ex = p.x + Math.cos(angle) * 120;
      const ey = p.y + Math.sin(angle) * 120;
      spawnParticles(ex, ey, '#ffd94d', 3, 120);
    }
    if (state.wanted < 1) addWanted(1);
  }

  function stepGuards(dt) {
    const p = state.player;
    for (const g of state.guards) {
      if (!g.alive) continue;
      g.shootCd -= dt;
      const d = dist(g.x, g.y, p.x, p.y);
      const alerted = state.wanted >= 1 && d < 560;
      g.chasing = alerted;
      if (alerted) {
        const a = Math.atan2(p.y - g.y, p.x - g.x);
        g.x += Math.cos(a) * GUARD.chaseSpeed * dt;
        g.y += Math.sin(a) * GUARD.chaseSpeed * dt;
        g.angle = a;
        // Guards only shoot at a player on foot: a driver behind a truck door is not a
        // target they can hit, and the police cars are the threat while driving.
        if (p.onFoot && d < GUARD.shootRange && g.shootCd <= 0) {
          g.shootCd = GUARD.shootInterval;
          if (random() < GUARD.hitChance) {
            damagePlayer(GUARD.damage);
            world.audio && world.audio.hurt();
          } else {
            spawnParticles(p.x + (random() - 0.5) * 60, p.y + (random() - 0.5) * 60, '#ffd94d', 3, 120);
          }
        }
      } else {
        g.retarget -= dt;
        if (g.retarget <= 0) {
          g.retarget = 2 + random() * 3;
          g.tx = g.homeX + (random() - 0.5) * 300;
          g.ty = g.homeY + (random() - 0.5) * 300;
        }
        const a = Math.atan2(g.ty - g.y, g.tx - g.x);
        const dd = dist(g.x, g.y, g.tx, g.ty);
        if (dd > 12) {
          g.x += Math.cos(a) * 70 * dt;
          g.y += Math.sin(a) * 70 * dt;
          g.angle = a;
        }
      }
      collideWorld(g);
    }
  }

  function stepPolice(dt) {
    const p = state.player;
    if (state.wanted >= 3) {
      while (state.police.length < 2) {
        const a = random() * TAU;
        state.police.push({
          kind: 'police', x: clamp(p.x + Math.cos(a) * 750, 80, FIELD.width - 80),
          y: clamp(p.y + Math.sin(a) * 750, 80, FIELD.height - 80),
          angle: 0, speed: 0, w: POLICE.width, h: POLICE.height, radius: 32, ramCd: 0,
        });
      }
    } else if (state.police.length > 0) {
      state.police = [];
    }
    for (const c of state.police) {
      c.ramCd -= dt;
      const a = Math.atan2(p.y - c.y, p.x - c.x);
      let diff = a - c.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      c.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      c.speed = POLICE.speed;
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      collideWorld(c);
      const d = dist(c.x, c.y, p.x, p.y);
      if (d < 64 && c.ramCd <= 0) {
        c.ramCd = POLICE.ramCooldown;
        damagePlayer(POLICE.ramDamage);
        world.audio && world.audio.hurt();
        const ka = Math.atan2(p.y - c.y, p.x - c.x);
        p.x += Math.cos(ka) * 40;
        p.y += Math.sin(ka) * 40;
        collideWorld(p);
        if (p.vehicle) {
          p.vehicle.speed *= 0.4;
        }
      }
    }
  }

  function stepTraffic(dt) {
    for (const t of state.vehicles) {
      if (t.kind !== 'traffic') continue;
      const wp = RING_WAYPOINTS[t.wp];
      const a = Math.atan2(wp[1] - t.y, wp[0] - t.x);
      let diff = a - t.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      t.angle += clamp(diff, -2.2 * dt, 2.2 * dt);
      t.x += Math.cos(t.angle) * t.speed * dt;
      t.y += Math.sin(t.angle) * t.speed * dt;
      if (dist(t.x, t.y, wp[0], wp[1]) < 40) t.wp = (t.wp + 1) % RING_WAYPOINTS.length;
    }
  }

  function stepPeds(dt) {
    const p = state.player;
    for (const ped of state.peds) {
      const d = dist(ped.x, ped.y, p.x, p.y);
      let tx = ped.tx;
      let ty = ped.ty;
      if (d < 130 && !p.onFoot) {
        tx = ped.x + (ped.x - p.x) * 2;
        ty = ped.y + (ped.y - p.y) * 2;
      } else if (dist(ped.x, ped.y, ped.tx, ped.ty) < 20 || random() < dt * 0.05) {
        const zone = pick(random, PED_ZONES);
        tx = zone.x + random() * zone.w;
        ty = zone.y + random() * zone.h;
        ped.tx = tx;
        ped.ty = ty;
      }
      const a = Math.atan2(ty - ped.y, tx - ped.x);
      const dd = dist(ped.x, ped.y, tx, ty);
      const speed = d < 130 && !p.onFoot ? ped.speed * 2.2 : ped.speed;
      if (dd > 8) {
        ped.x += Math.cos(a) * speed * dt;
        ped.y += Math.sin(a) * speed * dt;
      }
      ped.phase += dt * 2;
      collideWorld(ped);
    }
  }

  function stepParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
  }

  function stepWanted(dt) {
    if (state.wanted <= 0) return;
    const p = state.player;
    let near = false;
    for (const g of state.guards) {
      if (g.alive && dist(g.x, g.y, p.x, p.y) < WANTED.decayRange) { near = true; break; }
    }
    if (!near) {
      for (const c of state.police) {
        if (dist(c.x, c.y, p.x, p.y) < WANTED.decayRange) { near = true; break; }
      }
    }
    if (!near) {
      state.wantedTimer += dt;
      if (state.wantedTimer >= WANTED.decaySeconds) {
        state.wantedTimer = 0;
        state.wanted = Math.max(0, state.wanted - 1);
      }
    } else {
      state.wantedTimer = 0;
    }
  }

  function step(dt, input, paused, actions) {
    state.time += dt;
    state.wheelAngle += dt * 0.18;
    if (state.messageT > 0) state.messageT -= dt;
    stepParticles(dt);
    if (paused) {
      // Attract mode behind the title screen: the crowd and the traffic keep moving.
      stepPeds(dt);
      stepTraffic(dt);
      return 0;
    }
    const p = state.player;
    if (p.hp < PLAYER.hp && !state.busted) {
      p.hp = Math.min(PLAYER.hp, p.hp + PLAYER.regen * dt);
    }
    const mouse = input.mouse();
    const camX = clamp(p.x - FIELD.viewW / 2, 0, FIELD.width - FIELD.viewW);
    const camY = clamp(p.y - FIELD.viewH / 2, 0, FIELD.height - FIELD.viewH);
    const worldMouse = {
      worldX: camX + mouse.x * (FIELD.viewW / 1280),
      worldY: camY + mouse.y * (FIELD.viewH / 720),
    };
    if (!state.busted && !state.completed) {
      const dir = input.direction();
      const shooting = dir.shooting || (actions & 8) !== 0;
      stepPlayer(dt, dir, worldMouse, shooting);
      stepGuards(dt);
      stepPolice(dt);
      stepTraffic(dt);
      stepPeds(dt);
      stepWanted(dt);
      updateMission(world, state, dt, actions || 0);
    }
    const v = p.vehicle;
    world.audio && world.audio.engine(v ? Math.abs(v.speed) : 0, v ? (v.kind === 'bumper' ? BUMPER.maxSpeed : TRUCK.maxSpeed) : 1);
    world.audio && world.audio.siren(state.wanted, dt);
    return 0;
  }

  const world = {
    state,
    layout: { stalls: STALLS, wheel: WHEEL, arena: ARENA, coaster: COASTER, trees: TREES, ring: RING_WAYPOINTS },
    audio: null,
    reset,
    step,
    say,
    addWanted,
    setMarker,
    clearMarker,
    pay,
    spawnParticles,
    damagePlayer,
    bust,
    respawnAfterBust,
    enterVehicle,
    exitVehicle,
    dist,
  };

  reset();
  return world;
}
