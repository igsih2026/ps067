# Codex PR workflow — Person 1, Day 1 (Cesium core)

## Before the first prompt (do this once)

1. **Commit both docs into the repo as plain markdown** — `docs/frontend-brief.md` and `docs/notes.md` (your brain dump). Codex reads committed files far more reliably than re-pasted PDF text, and on a free tier, referencing a file path costs nothing while re-pasting two pages every prompt burns your budget fast.
2. **Add `docs/STATUS.md`** with three sections: `## Backend progress`, `## Frontend progress`, `## Open decisions`. The green highlighting in your doc doesn't survive PDF→text conversion for me, and it won't survive it for Codex either if you just hand over the PDF — write those items out as plain bullets here, once, by hand. This file becomes your continuity anchor across sessions.
3. **Fill in `Open decisions`** with the two blockers below as soon as you know them:
   - Cesium ion access token — do you have one, or is a self-hosted terrain source planned?
   - Target ocean region / bounding box for the default camera view
4. TypeScript vs JS is already settled by your own file structure (`.jsx` throughout) — no action needed.

## Reusable prompt template

```
OBJECTIVE
<one sentence, one PR's worth of work — no more>

CONTEXT
Read docs/frontend-brief.md (interaction model, non-goals) and docs/STATUS.md
(current state) before starting. This is Person 1's track (globe/Cesium core).

SCOPE
Only touch: components/globe/*, hooks/useCesiumViewer.js
Do not touch: components/panels/*, services/*, store/vizStore.js, backend/*

REFERENCE
Consult https://github.com/CesiumGS/cesiumjs-skills for the relevant setup
pattern before writing custom code — prefer their approach over improvising
one from scratch.

ACCEPTANCE CRITERIA
<concrete and testable, e.g. "npm run dev shows X with zero console errors">

NON-GOALS FOR THIS PR
<explicitly excluded, so scope doesn't creep into the next PR's work>

OUTPUT
One PR. Commit message + PR description summarizing what changed.
Append a one-line entry to docs/STATUS.md under Frontend progress.
```

## Day 1 — three PRs

### PR1 — scaffold + bare viewer mount

```
OBJECTIVE
Get a bare CesiumJS viewer rendering in the app, no terrain or camera
targeting yet — this PR only proves the render pipeline works end to end.

CONTEXT
Read docs/frontend-brief.md and docs/STATUS.md first. Check the current repo
state — if a Vite + React app already exists under frontend/ (from backend
team setup or otherwise), use it; do not scaffold a competing one.

SCOPE
Only touch: components/globe/CesiumViewer.jsx, hooks/useCesiumViewer.js,
App.jsx (just to mount CesiumViewer), Vite config (for Cesium's static
asset copy + CESIUM_BASE_URL — this is a known Vite+Cesium gotcha, handle it).
Do not touch: anything under components/panels/, services/, store/, backend/.

REFERENCE
Consult https://github.com/CesiumGS/cesiumjs-skills for the recommended
Vite integration pattern before improvising the asset/base-url setup.

ACCEPTANCE CRITERIA
`npm run dev` renders a default Cesium globe (blue ellipsoid, no terrain)
that responds to mouse drag/zoom, with zero console errors.

NON-GOALS FOR THIS PR
No terrain, no camera positioning, no markers, no panels, no store wiring.

OUTPUT
One PR. Append a line to docs/STATUS.md → Frontend progress.
```

### PR2 — real terrain

```
PR1 (scaffold + bare viewer) is merged. Read the updated docs/STATUS.md.

OBJECTIVE
Replace the default ellipsoid with real Cesium World Terrain.

CONTEXT / SCOPE / REFERENCE
Same as PR1's template fields — still components/globe/* and
hooks/useCesiumViewer.js only.

SPECIAL INSTRUCTION
Check for a VITE_CESIUM_ION_TOKEN value in .env. If it is missing, stop and
ask the user for one rather than hardcoding a placeholder token — this is a
real credential and must never be committed to the repo. Confirm .env is in
.gitignore, and add a .env.example with the empty variable name if one
doesn't exist yet.

ACCEPTANCE CRITERIA
Globe shows real terrain and bathymetry (visible mountains/seafloor
relief), not a flat ellipsoid. Zero console errors.

NON-GOALS FOR THIS PR
No camera target change yet — that's PR3.

OUTPUT
One PR. Append a line to docs/STATUS.md → Frontend progress.
```

### PR3 — default camera position

```
PR2 (real terrain) is merged. Read the updated docs/STATUS.md.

OBJECTIVE
On load, fly the camera to the project's target ocean region instead of
Cesium's default global view.

CONTEXT / SCOPE / REFERENCE
Same as before.

SPECIAL INSTRUCTION
Check docs/STATUS.md → Open decisions for the target region/bounding box.
If it isn't defined there, stop and ask the user rather than guessing
coordinates.

ACCEPTANCE CRITERIA
On load (no user interaction), the camera is already oriented over the
target region.

NON-GOALS FOR THIS PR
No user-triggered fly-to yet — the 2D-map-click-to-3D-anchor flow is Day 3
work, not this PR.

OUTPUT
One PR. Append a line to docs/STATUS.md → Frontend progress.
```

## Free-tier notes

- Never re-paste the brief text into a prompt — reference `docs/frontend-brief.md` by path. Codex reading a committed file doesn't cost you extra prompt length.
- One objective per session. Resist bundling PR2 and PR3 together even though both are small — a clean, individually reviewable PR beats one larger diff that's harder to debug if something breaks.
- Let Codex write the `docs/STATUS.md` update itself as the PR's last step — one less manual thing for you, and it's what makes the next prompt cheap to write.
- Once Day 1 is done, the same template carries into Day 2 (float markers, land-click validation) — just swap the OBJECTIVE, ACCEPTANCE CRITERIA, and NON-GOALS fields; SCOPE and REFERENCE stay the same since it's still Person 1's track.
