# GREVEN — AI Research Portfolio

> Une exploration à l'intérieur d'un réseau de neurones.
> Portfolio de recherche en intelligence artificielle d'Evan Greven — Machine
> Learning, réseaux de neurones, Reinforcement Learning et systèmes d'IA.

The portfolio is designed as a journey **inside** a living neural network. Each
section is a specialised neuron; selecting one activates it, sends a pulse along
its axons, and flies the camera through the network to the destination page.

![Reference: dark neural landing with the GREVEN wordmark split by a 3D neural network]()

## Stack

- **Next.js 14** (App Router) · **TypeScript** (strict)
- **three 0.168** · **@react-three/fiber v8** · **@react-three/drei v9** · **@react-three/postprocessing**
- **GSAP + ScrollTrigger** (cinematic camera travel)
- **Lenis** (scroll-driven exploration)
- **Zustand** (scene state shared between HTML and WebGL)
- **CSS Modules + CSS custom properties** (bespoke editorial design tokens)
- **Vitest** (unit) · **Playwright** (e2e) · **ESLint** · **Prettier**

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the full
analysis, architecture, component plan and roadmap.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional; sensible defaults are used
npm run dev                  # http://localhost:3000
```

## Scripts

| Script              | Description                   |
| ------------------- | ----------------------------- |
| `npm run dev`       | Start the dev server          |
| `npm run build`     | Production build              |
| `npm run start`     | Serve the production build    |
| `npm run lint`      | ESLint (next config)          |
| `npm run typecheck` | `tsc --noEmit` (strict)       |
| `npm run test`      | Unit tests (Vitest)           |
| `npm run test:e2e`  | End-to-end tests (Playwright) |
| `npm run format`    | Prettier write                |

Before any important push: `npm run lint && npm run typecheck && npm run build`.

## Project structure

```
src/
  app/          App Router routes + shared layout (persistent WebGL canvas)
  components/   layout · navigation · typography · ui
  scenes/       NeuralCanvas · Network · Neuron · Axon · Synapse · NeuralPulse ·
                CameraRig · SceneLighting · PostProcessing
  transitions/  inter-page neural travel orchestration
  sections/     rich per-page content (ML-focused only)
  hooks/        parallax · quality · reduced-motion …
  stores/       Zustand scene store
  shaders/      GLSL (neuron · axon · pulse)
  data/         sections · network config · content
  lib/          prng · noise · network generator · device detection
  styles/       tokens.css · globals.css · CSS Modules
  types/        shared types
docs/           implementation plan + component & content docs
tests/          unit (Vitest) · e2e (Playwright)
```

## Design language

Dark, warm, mineral and calm. Palette anchored on Deep Olive `#24261E`, Eerie
Black `#282119`, Moss Grey `#3D4034`, Warm Stone `#736B5C` and Pearl `#F2D0A7`
(typography and light points), with Seal Brown / Rich Crimson for depth. No neon,
no rainbow gradients, no aggressive metallic gloss. Japanese influence lives in
composition, restraint and typography — never in cliché imagery. All section
illustrations are Machine-Learning visualisations (graphs, embeddings, layers,
latent spaces), never decorative architecture or landscapes.

## Accessibility & performance

Full keyboard navigation, visible focus, real HTML mirrors of every interactive
neuron, `prefers-reduced-motion` support, and a complete no-WebGL fallback.
Three adaptive quality tiers (high / medium / low) with device-capability
detection, instanced geometry, capped DPR and progressive loading.

## License

All rights reserved.
