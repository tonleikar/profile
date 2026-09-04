# three.js scene — plan

## Diagnosis: why it renders as "3 blobs"

From inspecting `src/three-scene.js`, `assets/sfgh.obj` and `assets/sfgh-mesh.glb`:

1. **The model is actually four separate letter meshes** — `sfgh`, `sfgh.001`, `sfgh.002`,
   `sfgh.003` (= S, F, G, H) — in *both* the `.obj` and the `.glb`. The geometry is fine.
   Everything below is rendering / framing.

2. **It is not centred.** Bounding box: x `-0.73 → 0.81`, y `-0.01 → 0.47`, z `-0.31 → 0`.
   The centre sits at roughly **(0.04, 0.23, -0.16)**, not the origin. The camera looks at
   (0,0,0), so the word floats above the centre of the frame and partly out of view — the
   outer letters (S, H) fall off the edges, leaving you with "3 shapes".

3. **The material is unlit.** `MeshBasicMaterial` ignores every light in the scene, so the
   `DirectionalLight` + `castShadow` currently do nothing. Four flat single-colour
   silhouettes with no shading merge into blobs wherever two letters are close — you lose
   the letter edges entirely.

4. **Wrong asset.** You load the 252 KB `.obj` with `OBJLoader`. The 73 KB `.glb` is the
   same geometry — smaller, clean normals, named nodes — and loads with `GLTFLoader`.

5. **Framing is hard-coded.** `camera.position.z = 2.5` with no fit-to-object logic. The
   word is ~3:1 wide, so on a narrow screen it either overflows or becomes tiny.

## Target behaviour

- Four clearly readable, lit letters: **S F G H**, each with visible form and separated edges.
- Idle: the letters drift *ever so slightly* — small continuous bob / tilt, each letter
  slightly out of phase so it feels organic rather than a rigid block.
- Scroll: while scrolling, that motion is exaggerated — the letters swing / rotate more,
  then ease back to the gentle idle once scrolling stops.
- "Nicer lighting": a proper key + fill + rim setup so the letters catch light on one side
  and have a subtle edge highlight against the dark background.
- Honours `prefers-reduced-motion` — freeze to one well-composed static frame.

## Plan

### 1. Swap to GLTF + the `.glb`
- `GLTFLoader` loading `assets/sfgh-mesh.glb` instead of `OBJLoader` + `.obj`.
- Keep the four nodes as individual objects (needed for per-letter motion). Collect them
  into a `letters[]` array, add them to a parent `THREE.Group` (`word`).
- Once confirmed working, delete `sfgh.obj` / `sfgh.mtl` (keep `.glb`).

### 2. Centre and frame it
- `new THREE.Box3().setFromObject(word)` → centre + size.
- Re-centre the group so the word's centre is at the origin, while keeping each letter's
  own offset from centre (so we animate each letter around its home position).
- Fit the camera: from the word size + canvas aspect ratio, compute the camera distance so
  the word fills a tunable fraction of the viewport — **whichever of width/height is the
  binding constraint**, so the word always fits fully. Recompute on resize.
- Dead-on camera (looking straight down `-z`), same scene on mobile — on a narrow / portrait
  screen the width becomes the binding constraint, so the word just gets smaller and stays
  fully visible.

### 2a. Containment — letters stay "in a box"
- After fitting the camera, compute the visible rectangle of the frustum at the word's
  z-plane, inset by a margin → a **safe box** in world coordinates.
- The idle + scroll motion is all small offsets from each letter's home position. Cap the
  *total* possible offset (idle amplitude + max scroll boost, plus each letter's rotation
  half-swing expressed as a positional allowance for its far corner) so it is strictly less
  than the gap between the resting word and the safe-box edge.
- Result: the letters can drift and swing, but the maths guarantees they can never cross
  the screen edge. Recompute the caps on every resize.
- Belt-and-braces option: also hard-`clamp()` each letter's final position to the safe box
  each frame, so nothing escapes even if the amplitude numbers are later edited too high.

### 3. Material + lighting
- Material: one shared `MeshStandardMaterial`, colour pulled from the existing site palette
  (`#cd6667` pink / `#b6bd67` greeny-yellow / `#8abfb7` teal / `#7fa2be` light-blue).
  Wire the colour values as named constants at the top of the file so they can be swapped
  by hand later. `roughness` ~0.5, `metalness` ~0.1.
- Lights:
  - Low `AmbientLight` or `HemisphereLight` so shadow sides aren't pure black.
  - Key `DirectionalLight`, upper-front-left, main intensity.
  - Fill `DirectionalLight`, opposite side, ~30% intensity, optionally tinted.
  - Rim / back light to pop the top edges against the dark background.
- No real-time shadows (`castShadow`) — not worth the cost; lighting alone gives the form.
- `renderer.toneMapping = ACESFilmicToneMapping` + modest exposure for a nicer roll-off;
  set `outputColorSpace` correctly.

### 4. Idle motion
- Per letter, store `basePosition` / `baseRotation`.
- Each frame, with `t = clock.getElapsedTime()`, for letter `i`:
  - `rotation.x = base + sin(t*0.6 + i*1.3) * 0.06`
  - `rotation.y = base + sin(t*0.4 + i*2.1) * 0.08`
  - `position.y = base + sin(t*0.5 + i*0.7) * 0.02`
  - (starting values — tune to taste; amplitudes deliberately tiny)

### 5. Scroll exaggeration
- Keep a `scrollEnergy` value, default 0.
- On `scroll` (passive listener): `delta = abs(scrollY - lastScrollY)`, add a scaled amount
  to `scrollEnergy`, clamped to a max.
- Each frame: `scrollEnergy *= 0.9` (decays toward 0).
- Multiply the idle amplitudes by `(1 + scrollEnergy * k)` — gentle at rest, larger while
  scrolling, settles afterwards.
- Optionally also nudge `word.rotation.y` directly by the scroll delta (also damped) for a
  "the scroll physically pushed it" feel.

### 6. Render loop / lifecycle
- Single `requestAnimationFrame` loop driven by a `THREE.Clock`.
- `prefers-reduced-motion`: skip animation updates, render one composed frame, don't rAF.
- Pause the loop on `document.hidden` (visibilitychange) to save battery.
- Keep `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

### 7. Dependency handling — CDN vs self-host

Today: `index.html` has an import map pointing `three` and `three/addons/` at
`https://cdn.jsdelivr.net/npm/three@0.185.1/...`. The browser downloads three.js from
jsdelivr on page load. (`three` in `package.json` + `node_modules/` is currently unused —
vestigial.)

**Option A — stay on the CDN (jsdelivr)**
- *How:* leave the import map as-is; the browser fetches three from jsdelivr (cached by the
  browser after first visit, and jsdelivr sets long cache lifetimes).
- *Pros:*
  - Zero weight added to your repo / GitHub Pages — the ~600 KB–1 MB of three.js core +
    loaders never enters git.
  - Nothing to maintain but the version string; bumping versions is a one-line change.
  - jsdelivr is a fast, reliable, free global CDN built for exactly this.
- *Cons:*
  - Runtime dependency on a third party: if jsdelivr is unreachable (some corporate / school
    networks, some countries, the odd aggressive blocker), the scene fails to load. Your
    `try/catch` in `index.js` already degrades gracefully — the rest of the site is fine,
    you just lose the background.
  - The visitor's browser makes a request to a third-party domain (minor privacy point;
    the page is no longer fully self-contained).
  - Supply-chain trust: you're trusting jsdelivr to serve authentic three.js. It's
    reputable and you've pinned an exact version, which is the main mitigation. A
    Subresource Integrity hash is possible but fiddly with ES-module import maps.
  - Can't develop offline.

**Option B — self-host (vendor the files into the repo)**
- *How:* download `three.module.js` + `GLTFLoader.js` (and any files they import) once,
  commit them to `assets/vendor/three/`, repoint the import map at those local paths. Still
  no build step.
- *Pros:*
  - Fully self-contained — no third-party runtime requests, works offline / on any network,
    can never break because of someone else's outage.
  - Deterministic: the exact bytes you tested are the bytes you ship.
  - Matches the rest of the site's "hand-authored, no external deps" character (fonts aside).
- *Cons:*
  - Adds ~600 KB–1 MB of vendored JS to the repo and the Pages deploy (well within GitHub
    Pages' limits — just repo clutter).
  - You own updates: new version = re-download, re-commit, re-check that the loader's
    `import` specifiers still resolve.
  - You must grab the whole import chain. `GLTFLoader` is fairly self-contained; some other
    loaders pull in more addon files.

**Option C — bundler (Vite / esbuild)** — `npm install` + a build step that outputs one
minified `bundle.js`. Smallest, cleanest result, but introduces the build tooling the site
has so far deliberately avoided. Not recommended here.

**Recommendation:** the scene is decorative, has a graceful fallback, and jsdelivr is
faster than GitHub Pages if anything — **Option A (CDN) is fine and lower-effort.** Choose
Option B only if "no external dependencies, works everywhere" matters to you on principle.

---

## Decisions (locked in)

| Question | Choice |
|---|---|
| Placement | **Fixed full-screen background** (`#bg` canvas, as now) |
| Containment | Letters **must stay within the screen** — "as if in a box" (see §2a) |
| Colour | **Existing site palette colours**; exposed as constants for manual editing later |
| Camera angle | **Dead-on** |
| Mobile | **Same scene**, just scaled down to fit |
| Self-host vs CDN | **Stay on the CDN** (jsdelivr, pinned to `three@0.185.1`) |

## Rough sequencing

1. ✅ GLTF loader + `.glb` + centre + camera fit + containment box.
2. ✅ Material + lighting.
3. ✅ Idle motion.
4. ✅ Scroll exaggeration.
5. ✅ Lifecycle polish (pause when tab hidden, reduced-motion static frame).
6. ✅ Delete `.obj` / `.mtl`; drop unused `three` dep from package.json / node_modules.

three.js stays on the jsdelivr CDN, import map pinned to `three@0.185.1`.

## Built — status

`src/three-scene.js` rewritten. Verified in-browser:

- All four letters **S F G H** render, lit, greeny-yellow, centred, spanning 72% of the
  binding viewport axis.
- Containment holds: idle drift ≈ ±0.02–0.03 world units; a sustained scroll pushes it to
  ≈ ±0.08–0.12 plus ≤0.09 rad whole-word pitch, then eases back to idle. Zero
  screen-edge violations even under continuous scroll hammering (each letter's offset is
  hard-clamped to the safe box every frame).
- Model normals in the `.glb` are unreliable → material uses `flatShading` for clean
  even facets. `FOV = 30` (long lens) stops the wide word fanning open into its side walls.
- Lighting: hemisphere (teal/dark) + warm key + light-blue fill + dim teal rim, ACES tone
  mapping. All colours are constants at the top of the file.
- No console errors or three.js warnings.

### Tunables (top of `src/three-scene.js`)

| Constant | Does what | Current |
|---|---|---|
| `COLOR.*` | letter material + the four lights | palette hexes |
| `FILL_FRACTION` | how much of the screen the word spans at rest | `0.72` |
| `FOV` | lens length — lower = flatter, less side-wall | `30` |
| `EDGE_MARGIN` | guaranteed gap to the screen edge | `0.14` |
| `IDLE.posAmp` / `IDLE.rotAmp` | resting drift / tilt size | `0.03` / `0.07` |
| `IDLE.speed` | overall idle tempo | `1.0` |
| `SCROLL.gain` | how much scrolling multiplies the idle motion | `1.8` |
| `SCROLL.pitchMax` | max whole-word nod from scrolling (radians) | `0.10` |
| `SCROLL.decay` / `SCROLL.pitchDecay` | how fast it settles after scrolling stops | `0.92` / `0.9` |

### Not yet judged (needs your eyes on the live page)

- `FILL_FRACTION = 0.72` makes the word fairly dominant over the content behind it —
  drop toward `0.55–0.6` if it should read more as ambient background.
- Motion amplitudes are set conservative; nudge `IDLE.*` / `SCROLL.gain` once you've
  watched it scroll.
- Couldn't observe live motion through automation (headless tabs freeze
  `requestAnimationFrame`) — the numbers are verified, the feel isn't.
