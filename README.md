# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Sound Detective

Use Node.js 22.18+ on macOS or another desktop platform.

```sh
npm ci
npm run dev
```

Open [Yaadify](http://localhost:5173/). Start with MemoMart at the centre of the honeycomb. ChooseMax, MindFlip, FactFlip, and Sound Detective unlock at 100, 200, 300, and 400 total active points respectively. Tap **Start listening** to play Identify the Sound. The 120-second timer starts with the first sound. Players can finish early and save their score, and practice is untimed. Runs start at level 1 with familiar sounds. Correct answers earn points equal to the current level and move the player up one level. Wrong answers move them down one level, to a minimum of 1.

### Audio pack

The prototype bundles 23 original, synthesized demo effects. They are packaged with the web build and require no external audio URLs. Run `python3 scripts/generate-sound-detective.py` to recreate the WAV files. To extend the pack, add an entry to `src/game/soundDetective/soundPack.ts` and a corresponding `<id>.wav` in `public/audio/sound-detective/`. Keep each clip about 1–3 seconds with gentle fades and similar loudness. When adding a real recording, check its redistribution terms, retain its credit and license, and update the audio pack label in the game.

### Checks and simulation

```sh
npm run build
npm test
npm run test:sound-sim
```

The development URL [Sound Detective QA](http://localhost:5173/?soundQA=1) also exposes the 1,000-session simulation and error report.

### Yaadify scores

Each game’s active score halves every 24 hours and is replaced when a new run beats it. The honeycomb’s unlocks use the sum of active scores. A game can lock again when the total falls below its threshold. All-time bests and run results are retained.
