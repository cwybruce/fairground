// The four story jobs. Each mission is a small phase machine: the world calls updateMission
// every step, and the mission sets the marker, the objective card and the payout when it pays.
// Cash: $120 start, +400, +800, +1500, +5000, for a $7,820 final take.
// Actions arrive as a parameter (main.js takes them once per frame); INTERACT is bit 4.
import { PAYOUTS, PLAYER, PLACES } from './config.js';

export const ACTION_INTERACT = 4;

export const MISSIONS = [
  {
    title: 'M1 — Prize Till',
    briefing: 'Lift the prize-till cash at the prize stall, then bring it to the fortune teller.',
    objective: 'Reach the PRIZE STALL and lift the till (E), then return to the FORTUNE TELLER.',
    target: PLACES.prizeStall,
  },
  {
    title: 'M2 — Borrowed Security',
    briefing: 'Steal the security pickup and drive it to the Ferris wheel. Expect heat.',
    objective: 'Steal the SECURITY TRUCK (E) and deliver it to the FERRIS WHEEL.',
    target: PLACES.wheelBase,
  },
  {
    title: 'M3 — Midway Run',
    briefing: 'Run the midway to the east gate. The police will not let you cruise.',
    objective: 'Drive to the EAST GATE checkpoint. Wanted level 3 — they will chase.',
    target: PLACES.eastCheckpoint,
  },
  {
    title: 'M4 — Last Gate',
    briefing: 'One last walk to the main gate. Get out before the lights go down.',
    objective: 'Reach the MAIN GATE to vanish with the take.',
    target: PLACES.mainGate,
  },
];

export function startMission(state, index) {
  const def = MISSIONS[index];
  state.missionIndex = index;
  state.missionTitle = def.title;
  state.missionObjective = def.objective;
  state.channel = 0;
  state.channelActive = false;
  if (index === 0) {
    state.missionPhase = 'go';
    state.marker = { ...PLACES.prizeStall };
  } else if (index === 1) {
    state.missionPhase = 'go';
    state.marker = { ...PLACES.truckParked };
  } else if (index === 2) {
    state.missionPhase = 'run';
    state.marker = { ...PLACES.eastCheckpoint };
  } else {
    state.missionPhase = 'go';
    state.marker = { ...PLACES.mainGate };
  }
}

function completeMission(world, state) {
  const index = state.missionIndex;
  world.pay(PAYOUTS[index]);
  if (world.audio) world.audio.jingle();
  if (index >= MISSIONS.length - 1) {
    state.completed = true;
    state.marker = null;
    state.missionObjective = 'Clean getaway. Final take $7,820.';
    world.say('Clean getaway — $7,820. The fairground is yours.', 6);
    return;
  }
  const next = index + 1;
  if (next === 2) state.wanted = 3;
  if (next === 3) state.wanted = 2;
  startMission(state, next);
  world.say(`${MISSIONS[next].title}: ${MISSIONS[next].briefing}`, 5);
}

export function updateMission(world, state, dt, actions) {
  const p = state.player;
  const index = state.missionIndex;

  // Enter or leave a vehicle with E.
  if (actions & ACTION_INTERACT) {
    if (p.onFoot) {
      let best = null;
      let bestD = Infinity;
      for (const v of state.vehicles) {
        if (v.kind === 'traffic' || v.kind === 'police') continue;
        const d = world.dist(p.x, p.y, v.x, v.y);
        if (d < PLAYER.interactRange && d < bestD) {
          bestD = d;
          best = v;
        }
      }
      if (best) {
        world.enterVehicle(best);
        if (index === 1) state.missionPhase = 'deliver';
      } else if (index === 0 && state.missionPhase === 'channel') {
        state.channelActive = true;
        state.channelStartX = p.x;
        state.channelStartY = p.y;
      }
    } else {
      world.exitVehicle();
    }
  }

  if (index === 0) {
    if (state.missionPhase === 'go') {
      if (world.dist(p.x, p.y, PLACES.prizeStall.x, PLACES.prizeStall.y) < 110) {
        state.missionPhase = 'channel';
        world.say('Press E to lift the till. Stay still — the till takes a moment.', 4);
      }
    } else if (state.missionPhase === 'channel') {
      if (state.channelActive) {
        const moved = world.dist(p.x, p.y, state.channelStartX, state.channelStartY);
        if (moved > 30) {
          state.channelActive = false;
          state.channel = 0;
          world.say('You moved — the lift is blown. Press E and stay still.', 3);
        } else {
          state.channel += dt;
          if (state.channel >= PLAYER.channelTime) {
            state.channelActive = false;
            state.channel = 0;
            world.addWanted(1);
            state.missionPhase = 'return';
            state.marker = { ...PLACES.fortuneTeller };
            if (world.audio) world.audio.pickup();
            world.say('Till lifted. Bring it to the fortune teller — and stay out of sight.', 4);
          }
        }
      }
    } else if (state.missionPhase === 'return') {
      if (world.dist(p.x, p.y, PLACES.fortuneTeller.x, PLACES.fortuneTeller.y) < 110) {
        completeMission(world, state);
      }
    }
    return;
  }

  if (index === 1) {
    if (state.missionPhase === 'deliver' && !p.onFoot && p.vehicle && p.vehicle.kind === 'truck') {
      if (world.dist(p.x, p.y, PLACES.wheelBase.x, PLACES.wheelBase.y) < 130 && Math.abs(p.vehicle.speed) < 90) {
        completeMission(world, state);
      }
    }
    return;
  }

  if (index === 2) {
    if (world.dist(p.x, p.y, PLACES.eastCheckpoint.x, PLACES.eastCheckpoint.y) < 130) {
      completeMission(world, state);
    }
    return;
  }

  if (index === 3) {
    if (world.dist(p.x, p.y, PLACES.mainGate.x, PLACES.mainGate.y) < 120) {
      completeMission(world, state);
    }
  }
}
