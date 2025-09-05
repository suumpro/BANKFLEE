# Side-Scrolling Platformer Redesign Plan

## Vision
- Transform the current falling-dodger (Seoul Ginkgo Survival) into a Mario-like side-scrolling platformer while keeping a light Seoul/autumn vibe.
- Deliver tight platforming, readable levels, and a clean, testable code structure that fits the existing HTML5 Canvas + vanilla JS stack (Tauri stays as-is).

## Core Gameplay
- Movement: left/right with acceleration and friction; jump with coyote time and variable height; optional wall-slide later.
- World: tile-based levels, horizontal scrolling, platforms, gaps, spikes, and moving platforms (phase 2).
- Enemies: simple patrollers and jumpers (stomp to defeat, contact hurts).
- Collectibles: coins; optional Seoul-themed tokens. Goal: flag/door to finish level.
- Power-ups (theme reuse):
  - Mask: reduces gas-hazard damage (new hazard zones).
  - Umbrella: one-time shield or brief glide (hold jump to slow fall).
  - Boots: speed boost and longer jump.
  - Gas mask: immunity to gas hazards for duration.

## Controls
- Arrow keys / `A D`: move
- `Space` / `W` / `Up`: jump (hold for higher jump)
- `Esc` or on-screen button: pause

## Physics & Feel
- Gravity: ~0.6–0.9 px/frame²; Jump impulse tuned for 3–4 tile height.
- Horizontal: acceleration + friction; max run speed tuned for 4–6 tiles/sec.
- Coyote time: ~100 ms grace after leaving edges; jump buffer: ~100 ms.
- Collision: AABB vs tile grid; start with axis-resolved collisions; no slopes in v1.
- Fixed timestep for physics (e.g., 1/60s) with accumulator; render interpolated.

## World & Level Format
- Tile size: 32 px. Canvas 800x600 → visible grid 25x18 tiles; world scrolls horizontally.
- Layers: background (parallax), solid tiles, hazards, decorations (non-colliding).
- Entities: player spawn, enemies, coins, goal, power-up placements.
- Level JSON (example):
```json
{
  "tileSize": 32,
  "width": 200,
  "height": 18,
  "layers": {
    "solids": [ [0,0,0,1,1,1,...], ... ],
    "hazards": [ ... ],
    "decor": [ ... ]
  },
  "entities": {
    "player": { "x": 2, "y": 12 },
    "enemies": [ { "type": "patrol", "x": 20, "y": 12, "range": 6 } ],
    "coins": [ { "x": 8, "y": 10 }, { "x": 9, "y": 10 } ],
    "goal": { "x": 180, "y": 8 },
    "powerUps": [ { "type": "boots", "x": 40, "y": 10 } ]
  }
}
```

## Camera & Rendering
- Camera follows player with dead-zone; clamps to level bounds.
- Parallax background for city skyline; tilemap render for solids/hazards; entities drawn above.
- Keep rectangle placeholders initially; swap to sprites later.

## Systems & Modules (JS)
- Engine
  - `engine/loop`: fixed-step update, variable render
  - `engine/input`: key states, just-pressed buffer
  - `engine/audio`: existing Web Audio SFX (refactor from `game.js`)
  - `engine/physics`: tile collision utils, ray/AABB helpers
- Game
  - `game/tilemap`: loads JSON levels, provides `isSolid(x,y)`
  - `game/camera`: follows player, exposes `worldToScreen`
  - `game/player`: movement, jump, power-ups, state (idle/run/jump/fall)
  - `game/enemy`: base + `PatrolEnemy`
  - `game/collectible`: coin, goal, power-up pickups
  - `game/hazards`: spikes, gas zones
  - `game/level`: orchestrates tilemap/entities/camera
- UI
  - `ui/hud`: score, coins, lives/health, power-up icons

## Migration Plan (Phased)
1) Foundations
   - Introduce fixed-step loop and camera.
   - Add tilemap rendering; create a tiny test level (flat ground).
   - Replace `GROUND_Y` logic with tile collisions.
2) Player Platformer Movement
   - Horizontal accel/friction; coyote/jump-buffer; variable jump.
   - Convert `Player` to use tile collisions (remove screen-edge clamps).
3) Level + Goal Loop
   - Level loader, player spawn, coins, goal; HUD for coins/score.
4) Enemies & Hazards
   - Patrol enemy; spikes; damage and death, respawn or lives.
5) Power-ups Adaptation
   - Boots (speed), umbrella (glide shield), mask/gas-mask with gas zones.
6) Polish
   - Parallax background, particles on stomp/collect, SFX mapping, simple animations.

## Code Changes (Mapping from current code)
- `game.js:18` `class Game`: split responsibilities into `Level`, `Camera`, and `HUD`. Keep a thin `Game` controller.
- `game.js:546` `render()`: move background/ground draw to a `BackgroundRenderer`; add parallax layers.
- `game.js:649` `class Player`: replace screen bounds + `GROUND_Y` with tile-based collision checks; add horizontal accel/friction and jump buffer.
- Remove ginkgo spawners; keep particles/audio utilities; repurpose power-up logic.
- Add `levels/level1.json` and a loader that selects a level then starts play.

## HUD & Game Flow
- HUD: coins, score, lives/health, power-up timers.
- States: menu → playing → pause → level complete → next level.

## Audio
- Reuse Web Audio system; map events: jump, stomp, coin, hurt, power-up, goal, game over.

## Milestones
- M1: Flat ground, camera scroll, running/jumping feels good.
- M2: Basic level format, collectibles, goal, HUD.
- M3: Enemies, hazards, deaths; power-ups adapted.
- M4: Parallax, particles, SFX polish; Level 1 complete.

## Risks / Nice-to-haves
- Risks: collision edge cases, tuning time for good feel.
- Nice-to-haves: moving platforms, wall jump, level editor UI, sprite art.

## Open Questions
- Tile size 32 px OK? (Alternatively 16 or 48)
- Keep Seoul/ginkgo theme for items and hazards?
- Lives vs health bar preference?
- One big world vs multiple short levels?

