// The screenshot scenes behind ?shot=start|drive|chase|complete.
// Each stages a real game state (real world, real renderer, real HUD) and returns the
// screen to draw; the same seed always gives the same frame.
import { PLACES } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_COMPLETE } from './render.js';
import { startMission } from './missions.js';

function placeChase(world) {
  const s = world.state;
  s.wanted = 3;
  const truck = world.state.vehicles.find((v) => v.kind === 'truck');
  truck.x = 1500;
  truck.y = 1500;
  truck.angle = 0;
  truck.speed = 420;
  truck.parked = false;
  s.player.onFoot = false;
  s.player.vehicle = truck;
  s.player.x = truck.x;
  s.player.y = truck.y;
  s.player.angle = 0;
  s.police = [
    { kind: 'police', x: 1290, y: 1470, angle: 0, speed: 470, w: 60, h: 32, radius: 32, ramCd: 0 },
    { kind: 'police', x: 1240, y: 1540, angle: 0.1, speed: 450, w: 60, h: 32, radius: 32, ramCd: 0 },
  ];
  s.marker = { x: 3330, y: 1500, label: 'EAST GATE' };
  world.say('M3 — Midway Run: they are right behind you!', 6);
}

export function stageShot(name, world) {
  const s = world.state;
  if (name === 'drive') {
    // Mission 2 in progress: the stolen truck, heading for the Ferris wheel.
    startMission(s, 1);
    s.missionPhase = 'deliver';
    s.marker = { ...PLACES.wheelBase };
    s.wanted = 1;
    const truck = s.vehicles.find((v) => v.kind === 'truck');
    truck.x = 1900;
    truck.y = 1500;
    truck.angle = 0;
    truck.speed = 280;
    truck.parked = false;
    s.player.onFoot = false;
    s.player.vehicle = truck;
    s.player.x = truck.x;
    s.player.y = truck.y;
    s.player.angle = 0;
    s.cash = 520;
    world.say('Truck is yours. Deliver it to the Ferris wheel.', 6);
    return { screen: SCREEN_PLAY, best: 520 };
  }
  if (name === 'chase') {
    startMission(s, 2);
    s.missionPhase = 'run';
    s.cash = 1320;
    placeChase(world);
    return { screen: SCREEN_PLAY, best: 1320 };
  }
  if (name === 'complete') {
    startMission(s, 3);
    s.missionIndex = 3;
    s.missionPhase = 'go';
    s.cash = 7820;
    s.wanted = 0;
    s.marker = null;
    s.completed = true;
    const truck = s.vehicles.find((v) => v.kind === 'truck');
    truck.x = 1800;
    truck.y = 2150;
    truck.angle = -Math.PI / 2;
    truck.speed = 0;
    truck.parked = false;
    s.player.onFoot = false;
    s.player.vehicle = truck;
    s.player.x = truck.x;
    s.player.y = truck.y;
    s.player.angle = -Math.PI / 2;
    return { screen: SCREEN_COMPLETE, best: 7820 };
  }
  // Default: start — title screen over the entrance plaza, player on foot at the gate.
  startMission(s, 0);
  s.player.x = 1800;
  s.player.y = 2150;
  s.player.onFoot = true;
  s.player.vehicle = null;
  s.cash = 120;
  return { screen: SCREEN_TITLE, best: 0 };
}
