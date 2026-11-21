# Fairground — Dossier

**Fairground** is a 2D open-world carnival crime game set at dusk in Port Vane.
You are a grifter working the midway before closing. Four story jobs, one night:

1. **M1 — Prize Till** — Lift the prize-till cash at the prize stall on foot, then
   bring it to the fortune teller. (+$400)
2. **M2 — Borrowed Security** — Steal the security pickup truck and deliver it to
   the Ferris wheel. (+$800)
3. **M3 — Midway Run** — Outrun carnival security and police to the east gate
   checkpoint at wanted level 3. (+$1,500)
4. **M4 — Last Gate** — Reach the main gate for a clean getaway. (+$5,000)

Start with $120; a clean run takes **$7,820**.

## World and systems

- A fixed 3600×2400 fairground: midway stalls (prize stall, ring toss, cotton
  candy, popcorn, fortune teller, fun house, dunk tank, haunted house, tickets,
  hot dogs, lemonade), a turning Ferris wheel, a bumper-car arena, a roller
  coaster silhouette, ring-road traffic, and wandering crowds.
- On foot (WASD, mouse-aimed pistol, E to interact) and driving (pickup truck and
  a bumper car; W/S accelerate and brake, A/D steer).
- A 0–5 star wanted system: guards chase and shoot at a player on foot, police
  interceptors ram the truck at wanted 3+. Wanted decays when no one is near.
- HP with slow regeneration; getting busted costs 10% of your cash and respawns
  you at the current mission's start.
- HUD (cash, wanted stars, HP, mission card, speed) and a live minimap of the
  whole fairground. Best run and continue save in localStorage.
- All art is drawn in code on canvas; all sound is synthesized WebAudio (engine,
  siren, gunshots, jingles). Zero external assets, zero network requests.

## Controls

- **WASD / arrows** — move / drive · **Mouse** — aim · **Click / Space** — shoot
- **E** — interact / enter or leave a vehicle · **Space** — start / get back up
- **C** — continue from save · **P** — pause · **M** — mute

## Screenshots (1280×720 JPEG, seed 1)

### 1-start.jpg — The title screen over the entrance plaza
The title card over the fairground at dusk: "Port Vane Fair — 18:47, the last
trains are running. You are the grifter. Four jobs before closing. Lift, steal,
outrun, vanish." HUD shows $120, no wanted stars, 100 HP; the mission card reads
M1 — Prize Till; the minimap (top right) shows the whole fairground with the
Ferris wheel glowing at the north end. Best run $0, missions done 0/4.

### 2-drive.jpg — M2, the stolen truck on the midway
Mid-delivery in M2 — Borrowed Security: the player is driving the yellow
SECURITY pickup at 101 km/h past the cotton candy, popcorn, prize stall and
ring toss stalls. Cash $520, one wanted star, 100 HP. The banner reads "Truck
is yours. Deliver it to the Ferris wheel." The minimap shows the truck (white
dot) heading north toward the wheel marker.

### 3-chase.jpg — M3, police on your tail
Mid-chase in M3 — Midway Run: two blue POLICE interceptors are right behind the
security truck as it threads the midway between the cotton candy and popcorn
stalls at 151 km/h. Cash $1,320, three wanted stars, 100 HP. The banner reads
"M3 — Midway Run: they are right behind you!" and the mission card points at
the EAST GATE checkpoint on the minimap.

### 4-complete.jpg — Clean getaway
The completion screen after M4 — Last Gate: "CLEAN GETAWAY — COMPLETE. Final
take: $7,820. Four jobs, one night, no witnesses who matter. Press Space to
run it again." HUD shows $7,820, wanted stars cleared, 100 HP, the truck parked
at the main gate at 0 km/h.

## Play-test

Driven end to end in headless Chromium with real keyboard and mouse input:
M1 lifted and returned ($520), M2 truck stolen and delivered ($1,320, wanted 3),
M3 east gate reached under police rams ($2,820), M4 main gate reached —
completed, final take $7,820. 0 console errors, 0 external requests in every run.
