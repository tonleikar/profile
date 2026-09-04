# Portfolio site — review & improvement notes

## What this project is

A personal portfolio / CV site for **Sam Gorman-Hailey**, a career-changing full-stack
dev (Le Wagon-style Rails + Hotwire/Stimulus stack, with a ~10-year videography
background). Hand-written static site — no framework, no build step — deployed on
GitHub Pages at `samhailey.com` (CNAME + `tonleikar/profile` repo). The README and
`package.json` both make a point of "written by me, no AI."

The aesthetic is deliberate and consistent: terminal/hacker vibe — IBM Plex Mono,
near-black `#1f1f1f`, dashed borders, a greeny-yellow / teal / pink / blue palette,
lowercase section headings, `full_stack_dev` in snake_case, a joke source comment.
It's got personality, which is the right instinct for a portfolio.

Three pages:

- `index.html` — the real one: intro, skills, about, 4 projects (WAXXEE, bard,
  Startup Copilot, videography), contact.
- `projects.html` — stale placeholder content, not linked from anywhere.
- `cv.html` — a CV screenshot + PDF, orphaned (the link is commented out at
  `index.html:87`).

Recent commits added a three.js WebGL background rendering an OBJ model of your
initials, a 100-node mouse-follower "tail," a scroll-to-top button, and a CSS grid
background. The uncommitted diff makes the WebGL canvas transparent so the CSS grid
shows through, and swaps ambient light for a directional light.

---

## Improvements

### Content & credibility (highest impact — this *is* a work sample)

- [ ] **`projects.html` is placeholder junk** — `[Target Problem]`, `[Specific Task]`,
  Lorem-style filler. It's deployed, so anyone who finds it sees unfinished work.
  Either finish it or delete it; the real projects on `index.html` are already better.
- [ ] **`cv.html` is orphaned.** Decide: link it or remove it. A CV as a flat PNG
  isn't selectable, doesn't reflow on mobile, and is invisible to assistive tech.
  Linking straight to the PDF (already in `assets/`) is better; an HTML CV is better still.
- [ ] **Proofread the project copy.** Typos in text recruiters read first:
  "descreiption," "proffesional," "paramaters," "liscence," "operatered,"
  "expereience," "Alexander Armstron," "This ended up becoming a real passion project
  for and something." On a dev portfolio, sloppy prose reads as sloppy work.
- [ ] **Add the basics employers scan for:** location, what you're looking for (role
  type, full-time/contract), availability. Right now there's no "hire me" signal
  beyond "decided to make it my career."
- [ ] The **brake-fluid comment** (`index.html:12`) is funny, but the people who view
  source are exactly the technical audience you're courting. Your call — just know
  it's public.

### Broken / buggy

- [ ] **LinkedIn link is broken.** `href="www.linkedin.com/in/sam-fgh"`
  (`index.html:198`, and in `projects.html` / `cv.html`) has no `https://`, so it
  resolves as a relative path → 404. The footer uses the correct absolute URL, so
  it's just these inline ones.
- [ ] **Duplicate `<meta viewport>`** in `projects.html` and `cv.html` heads.

### Performance (the site is multiple MB for what is mostly text)

- [ ] **`images/square-pp.jpeg` is 1.9 MB** for a 100px display. `bard.png` 938 KB,
  `sfh logo.png` 489 KB, `StartupCopilot.png` 427 KB, `waxxee.png` 355 KB, CV PNG
  303 KB. Resize to display size, compress, serve WebP, add `width`/`height`
  attributes to prevent layout shift, and `loading="lazy"` on below-the-fold images.
- [ ] **You ship a 252 KB `sfgh.obj` when a 73 KB `sfgh-mesh.glb` already exists** in
  `assets/`. Use `GLTFLoader` + the glb — smaller and faster to parse.
- [ ] **Font Awesome is `@import`-ed as the entire icon CSS for 3 icons**, and
  `@import` blocks rendering. Inline 3 SVGs and drop the dependency.
- [ ] **Google Fonts request pulls every weight + italic** of IBM Plex Mono and
  Maitree. Trim to the 2–3 weights actually used.
- [ ] Reconsider whether the 3D background is worth its total cost (three.js module +
  loader + model) versus just the CSS grid + a static render.

### Accessibility & polish

- [ ] **Respect `prefers-reduced-motion`** — disable the mouse tail, the three.js
  loop, and smooth-scroll for users who ask for less motion. Also consider skipping
  the 100-node blurred tail on touch devices (no pointer, and it's heavy on low-end
  phones).
- [ ] **Heading structure:** every section header is an `<h1>`. There should be one
  `<h1>` ("Sam Gorman-Hailey") and section titles as `<h2>`.
- [ ] **No `<meta name="description">` or Open Graph tags.** When you paste
  `samhailey.com` into LinkedIn or a message, it won't unfurl with a
  title/description/image. Add OG title, description, and a preview image.
- [ ] `<title>` is `sam-fgh` on all three pages; make them distinct.
- [ ] Skills are `<div>`s with hover styling and `cursor: default` — they look
  clickable but aren't. A `<ul>` reads better semantically.

### Structure & maintainability

- [ ] **Three HTML files with copy-pasted `<head>` and `<footer>`** — which is why the
  LinkedIn link is broken in three places. A tiny static generator (Eleventy, Astro)
  or even a JS footer include would remove the duplication.
- [ ] **The palette is written as comments at the top of `style.css`** — promote them
  to real `:root` custom properties and replace the hardcoded hex values
  (`#b6bd67` etc. are scattered everywhere).
- [ ] **The "dashed border + shadow + backdrop-blur panel" treatment is copy-pasted**
  across `.content`, `.project`, `footer`, `.profile-picture`. Extract a `.panel` class.
- [ ] `.tools` / `.tool` in `projects.css` are dead (replaced by `.skills`).
- [ ] Add `apple-touch-icon` and a couple of favicon sizes.

### On the README TODO

- [ ] "Add click sound on hover of buttons" — skip this. Hover/click sounds on a
  website are almost universally disliked and will annoy the recruiters you want to
  impress.
