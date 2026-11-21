// Every tuning number and colour in one place. The world is a fixed 3600x2400 fairground;
// the renderer shows a 1280x720 window of it and scales to the browser, so no rule below
// depends on the screen size.

export const FIELD = { width: 3600, height: 2400, viewW: 1280, viewH: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Cash: the run starts at $120; missions pay 400, 800, 1500, 5000, for a $7,820 final take. */
export const START_CASH = 120;
export const PAYOUTS = [400, 800, 1500, 5000];

export const PLAYER = {
  radius: 16,
  walkSpeed: 250,
  hp: 100,
  regen: 2.5,
  gunRange: 560,
  gunCooldown: 0.25,
  gunDamage: 1,
  interactRange: 90,
  channelTime: 1.5,
};

export const TRUCK = {
  width: 64,
  height: 34,
  accel: 420,
  brake: 620,
  maxSpeed: 540,
  reverseMax: 180,
  turn: 2.6,
};

export const BUMPER = {
  width: 44,
  height: 30,
  accel: 300,
  brake: 500,
  maxSpeed: 300,
  reverseMax: 120,
  turn: 3.4,
};

export const GUARD = {
  radius: 15,
  hp: 3,
  chaseSpeed: 205,
  shootRange: 430,
  shootInterval: 1.25,
  hitChance: 0.34,
  damage: 6,
  sight: 300,
};

export const POLICE = {
  width: 60,
  height: 32,
  speed: 570,
  ramDamage: 9,
  ramCooldown: 1.0,
};

export const WANTED = {
  max: 5,
  decaySeconds: 16,
  decayRange: 620,
};

export const BUSTED_KEEP = 0.9;

/** Mission targets, in world coordinates. */
export const PLACES = {
  prizeStall: { x: 2230, y: 1500, label: 'PRIZE STALL' },
  fortuneTeller: { x: 1450, y: 1010, label: 'FORTUNE TELLER' },
  truckParked: { x: 1900, y: 1680, label: 'SECURITY TRUCK' },
  wheelBase: { x: 2800, y: 1010, label: 'FERRIS WHEEL' },
  eastCheckpoint: { x: 3330, y: 1500, label: 'EAST GATE' },
  mainGate: { x: 1800, y: 2310, label: 'MAIN GATE' },
  bumperParked: { x: 760, y: 830, label: 'BUMPER CAR' },
  spawn: { x: 1800, y: 2150, label: 'ENTRANCE' },
};

export const PALETTE = {
  ground: '#241a30',
  dirt: '#2e2138',
  road: '#191223',
  roadLine: '#8a7a4a',
  grass: '#1e2b1a',
  stallPink: '#e2547e',
  stallYellow: '#f2b63c',
  stallTeal: '#2fb8a6',
  stallPurple: '#8a5fd0',
  stallRed: '#d84a3a',
  wheel: '#f2b63c',
  wheelHub: '#e2547e',
  text: '#f5ead2',
  muted: '#b9a8c9',
  panel: 'rgba(16, 10, 24, 0.82)',
  gold: '#f2b63c',
  danger: '#e5534b',
  police: '#4f8ff7',
  guard: '#e07b39',
  player: '#ffd94d',
  hp: '#7ddb6a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best run and the continue save are kept between visits (this browser only). */
export const BEST_KEY = 'fairground.best';
export const SAVE_KEY = 'fairground.save';
