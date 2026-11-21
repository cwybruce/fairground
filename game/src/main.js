// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between five screens: title, play, paused, complete and busted.
//
// ?seed=N fixes the crowd and patrol pattern. ?shot=start|drive|chase|complete (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_CONTINUE, ACTION_MUTE, ACTION_SHOOT, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_COMPLETE, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { startMission } from './missions.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
world.audio = audio;
// Test hook for the play-test driver (read-only state for the autopilot).
window.__world = world;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save.cash !== 'number' || typeof save.missionIndex !== 'number') return null;
    return save;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: world.state.cash,
      missionIndex: world.state.missionIndex,
    }));
  } catch {
    // Storage can be off: the run then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.layout);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.audio = audio;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Four jobs before closing.');
  }

  function continueGame() {
    const save = readSave();
    if (!save) return;
    world.reset();
    world.audio = audio;
    world.state.cash = save.cash;
    startMission(world.state, save.missionIndex);
    if (save.missionIndex === 2) world.state.wanted = 3;
    if (save.missionIndex === 3) world.state.wanted = 2;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Continuing. ${world.state.missionTitle}.`);
  }

  function endGame() {
    screen = SCREEN_COMPLETE;
    if (world.state.cash > best) {
      best = world.state.cash;
      saveBest(best);
    }
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Storage can be off.
    }
    announce(`Clean getaway. Final take $${world.state.cash}. Best $${best}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & (ACTION_CONFIRM | ACTION_SHOOT)) {
        audio.unlock();
        startGame();
      } else if (actions & ACTION_CONTINUE) {
        audio.unlock();
        continueGame();
      }
      return actions & ~ACTION_SHOOT;
    }
    if (screen === SCREEN_COMPLETE || screen === SCREEN_BUSTED) {
      if (actions & (ACTION_CONFIRM | ACTION_SHOOT)) {
        if (screen === SCREEN_BUSTED) {
          world.respawnAfterBust();
          screen = SCREEN_PLAY;
          announce('Back on your feet.');
        } else {
          startGame();
        }
      }
      return actions & ~ACTION_SHOOT;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    return actions;
  }

  function step(dt, actions) {
    if (screen === SCREEN_TITLE) {
      world.step(dt, input, true, 0);
      return;
    }
    world.step(dt, input, false, actions);
    if (world.state.completed) {
      endGame();
    } else if (world.state.busted && screen === SCREEN_PLAY) {
      screen = SCREEN_BUSTED;
      announce('Busted. The carnies take their cut.');
    } else if (world.state.missionIndex !== step.lastMission) {
      step.lastMission = world.state.missionIndex;
      writeSave();
    }
  }
  step.lastMission = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      // One-shot actions go to the first sub-step only, so a single E press cannot
      // enter and immediately leave a vehicle in the same frame.
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(STEP, first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, world.layout);
  }

  // Leaving the tab pauses a running game rather than letting the midway run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  canvas.addEventListener('mousedown', () => audio.unlock());
  announce('Fairground. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
