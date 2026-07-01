# GREVEN — AI Research Portfolio · Implementation Plan

> Portfolio de recherche en intelligence artificielle d'Evan Greven.
> Une exploration à l'intérieur d'un réseau de neurones vivant.

This document is the single source of truth for the build. It records the
analysis of the reference mockup, the finalized technical architecture, the
Three.js component plan, the performance strategy, and the step-by-step
roadmap. Decisions delegated to the developer by the brief are recorded here
with their rationale.

---

## 1. Analyse de la maquette de référence

The dark reference mockup is a design spec sheet. Observations that drive the
build:

- **Fond très sombre**, minéral et chaud. Deep olive / eerie black dominate.
  No pure black, no bright surfaces.
- **Titre GREVEN** en serif éditoriale à fort contraste, séparé en `GRE` /
  `VEN` par un **réseau de neurones 3D central** dont les branches passent
  devant et derrière le texte pour créer de la profondeur.
- **Composition asymétrique, éditoriale, japonaise** : beaucoup de vide, texte
  d'intro discret en haut-gauche (`SITE OVERVIEW`), palette + typographie
  documentées à gauche, navigation verticale à droite (`ACCUEIL`, `RECHERCHE`,
  `PROJETS`, `PUBLICATIONS`, À PROPOS`, `CONTACT`).
- **Caractères japonais discrets** avec sens défini : 知 美 道 質 特, un par
  section, plus 静·遠·質·道·特 en pied de hero.
- **Palette** documentée dans la maquette : `#24261E`, `#3D4034`, `#736B5C`,
  `#F2D0A7` (Pearl = typographie principale et points lumineux).
- **Typographie** : Noto Serif JP (titres), Inter / Noto Sans JP (UI/textes).
- **Interactions principales** illustrées : `HOVER` (le neurone réagit),
  `CLICK` (activation + détachement), `TRANSITION` (la caméra suit le neurone),
  `ARRIVÉE` (fondu vers la page).
- **Architecture du site** : 5 neurones de navigation, chacun une "région" du
  même réseau, chaque carte avec son kanji, son titre, sa description, et un
  lien `retour au réseau`.
- **Séquence de voyage** documentée en 5 temps : Sélection → Activation →
  Voyage → Approche → Arrivée. C'est le cœur de l'identité.
- **Retour au réseau** : bouton toujours présent en bas à gauche.

> Les vignettes "paysage" de la maquette sont des placeholders de mise en page.
> Le brief interdit explicitement maisons / temples / jardins / paysages
> décoratifs comme illustrations principales. **Toutes les illustrations de
> section seront des visualisations liées au Machine Learning** (graphes,
> embeddings, couches, flux de données, espaces latents), rendues dans la
> même palette sombre.

---

## 2. Décisions techniques (déléguées au développeur par le brief)

| Sujet | Décision | Rationale |
|-------|----------|-----------|
| Framework | **Next.js 14 (App Router)** | Stable sur Node 18.20 (l'env local). Canvas 3D persistant entre routes via layout partagé. |
| Langage | **TypeScript strict** | Exigé. `strict: true`, `noUncheckedIndexedAccess`. |
| 3D | **three 0.168 + @react-three/fiber v8 + @react-three/drei v9** | Combo éprouvé sur React 18 / Node 18. Évite le dependency hell R3F v9/React 19. |
| Post-processing | **@react-three/postprocessing v2** | DoF, bloom subtil, vignette — désactivable par niveau de qualité. |
| Animation | **GSAP 3 + ScrollTrigger** | Timelines de caméra cinématiques, interruptibles. |
| Scroll | **Lenis** | Scroll narratif fluide, justifié par le scroll-driven neural exploration. |
| État de scène | **Zustand 4** | Store léger partagé HTML ↔ WebGL (neurone actif, phase de transition, qualité). |
| Styling | **CSS Modules + CSS custom properties** | Design éditorial bespoke, contrôle précis des tokens, pas de utility-soup. Le brief laisse le choix « selon la solution la plus propre ». |
| Bruit procédural | **simplex-noise 4** | Génération organique déterministe des positions/mouvements. |
| PRNG | **mulberry32 (seed fixe)** | Réseau déterministe reproductible. |
| Tests | **Vitest** (unit) + **Playwright** (e2e) | Exigés. |
| Qualité | **ESLint (next) + Prettier** | Exigés. |

React 18 / Next 14 est retenu plutôt que Next 15 / React 19 pour la
compatibilité robuste avec Node 18.20.4 installé et l'écosystème R3F v8/drei v9,
le mieux documenté. À migrer si Node est mis à niveau.

---

## 3. Palette & Design tokens

```
Primaires
  Eerie Black   #282119   fonds profonds
  Deep Olive    #24261E   fond général structurant
  Moss Grey     #3D4034   surfaces / séparateurs
  Warm Stone    #736B5C   texte secondaire, dendrites
  Pearl         #F2D0A7   typographie principale, points lumineux, impulsions

Secondaires (parcimonie)
  Seal Brown    #65371F   profondeur, ombres chaudes
  Rich Crimson  #321D1C   ombres profondes
  Velvet Plum   #785C59   accents discrets
  Café Ole      #9A817A   texte tertiaire
  Allspice      #CBAAA2   highlights doux
  Tucson Tan    #E5BE9E   highlights chauds
```

Règles : fond toujours très sombre ; Pearl avec retenue ; aucun bleu/violet
néon ; aucun dégradé arc-en-ciel ; aucun glow métallique excessif ; contrastes
conformes WCAG AA pour le texte réel.

---

## 4. Typographie

- Titres : **Noto Serif JP** (via `next/font`), fallback serif éditoriale.
- Grand GREVEN : Noto Serif JP en très grand, letter-spacing serré, Pearl.
- UI / textes : **Inter** + **Noto Sans JP** pour les kanji.
- Le mot GREVEN reste du **vrai texte HTML** (jamais rendu dans WebGL) →
  netteté parfaite + accessibilité + SEO. Le réseau 3D est un calque derrière/
  devant via z-index et depth.

Kanji documentés (`src/data/sections.ts`) :

| Section | Kanji | Sens |
|---------|-------|------|
| Recherche | 知 | connaissance |
| Projets | 美 | beauté / accomplissement |
| Publications | 道 | voie / chemin |
| À propos | 質 | essence / qualité |
| Contact | 特 | singularité |

---

## 5. Architecture des dossiers

```
src/
  app/                     # App Router : routes + layout partagé (canvas persistant)
    layout.tsx
    page.tsx               # Accueil
    recherche/page.tsx
    projets/page.tsx
    publications/page.tsx
    a-propos/page.tsx
    contact/page.tsx
  components/
    layout/                # Shell, grille éditoriale, footer "retour au réseau"
    navigation/            # Nav latérale, menu mobile
    typography/            # Heading, Kanji, Eyebrow, GrevenTitle
    ui/                    # Logo EG (SVG), Cursor, ScrollHint, QualityToggle
  scenes/
    NeuralCanvas/          # <Canvas> R3F persistant + providers
    Network/               # assemblage du graphe
    Neuron/                # corps cellulaire (instancié)
    Axon/                  # connexions tubes/lignes Catmull-Rom
    Synapse/               # nœuds secondaires
    NeuralPulse/           # impulsions le long des axones
    CameraRig/             # trajets de caméra GSAP
    SceneLighting/         # éclairage cinématique
    PostProcessing/        # DoF, bloom, vignette (par qualité)
  transitions/             # orchestration voyage inter-pages
  sections/                # contenu riche par page (ML uniquement)
  hooks/                   # usePointerParallax, useQuality, useReducedMotion...
  stores/                  # sceneStore (Zustand)
  shaders/                 # GLSL neurone / axone / pulse
  data/                    # sections.ts, network.config.ts, content/*
  lib/                     # prng, noise, network-generator, device-detect
  styles/                  # tokens.css, globals.css, CSS Modules
  types/                   # types partagés
docs/                      # ce plan + docs composants/contenu
tests/                     # unit (Vitest) + e2e (Playwright)
```

Le `<Canvas>` est **monté une seule fois** dans le layout racine et **persiste
entre les routes** → transitions continues, pas de recréation de contexte WebGL.

---

## 6. Plan des composants Three.js

### Génération déterministe (`lib/network-generator.ts`)
- Seed fixe → `mulberry32`. simplex-noise pour l'irrégularité organique.
- Sort : `NeuronNode[]` (dont 5 neurones de navigation à positions stables),
  `SynapseNode[]`, `AxonEdge[]` (courbes Catmull-Rom), niveaux de profondeur.
- Densité au centre, diffus en périphérie ; longueurs de connexion variées ;
  tailles de nœuds variées. Tout piloté par `data/network.config.ts`.

### Rendu
- **Neuron** : `InstancedMesh` de corps cellulaires, matériau mat légèrement
  translucide (custom shader : subsurface fake + fresnel doux, teintes olive/
  pierre, points Pearl). Les 5 neurones de nav ont une intensité distincte.
- **Axon** : `TubeGeometry` sur courbes Catmull-Rom (high) ou `Line2` épaissies
  (medium/low). Les branches suivent le mouvement de leur neurone parent.
- **Synapse** : petits nœuds instanciés en périphérie.
- **NeuralPulse** : point lumineux Pearl animé le long d'une courbe (uniform
  `uProgress`), déclenché au hover/click.
- **Mouvement** : `useFrame` avec noise → respiration lente, micro-drift,
  parallaxe souris, réaction scroll modérée. Zéro allocation par frame ;
  buffers pré-alloués ; matrices réutilisées.

### Caméra & transitions (`CameraRig` + `transitions/`)
Séquence en 9 temps du brief (Sélection → Activation → Impulsion → Isolement →
Accélération → Voyage → Décélération → Transformation → Arrivée). Timeline GSAP
le long d'une courbe Catmull-Rom vers le neurone cible. Interruptible.
`prefers-reduced-motion` → fondu court sans mouvement caméra. Durée 1.6–2.8 s.

### Éclairage
Key light Pearl douce, fill olive très discret, ombres chaudes (Seal Brown /
Rich Crimson). Aucun reflet métallique agressif.

---

## 7. Niveaux de qualité & performance

Détection capteurs (sans données perso) → 3 niveaux :

| | high | medium | low |
|-|------|--------|-----|
| Neurones/synapses | 100% | ~60% | ~35% |
| Axons | TubeGeometry | Line2 | Line simple |
| Post-processing | DoF+bloom+vignette | vignette | off |
| Ombres | activées | réduites | off |
| DPR | ≤2 | ≤1.5 | 1 |

Règles : `InstancedMesh` partout où pertinent ; pas de géométrie/allocations
dans `useFrame` ; shaders compilés une fois ; DPR plafonné ; chargement
progressif ; **fallback complet sans WebGL** (HTML statique éditorial + nav).

---

## 8. Accessibilité

Nav clavier complète ; focus visible ; chaque neurone interactif doublé d'un
lien HTML réel ; `aria-label` pertinents ; ordre de tab cohérent ; contenu
lisible sans WebGL ; `prefers-reduced-motion` respecté ; aucune info portée
uniquement par la couleur.

---

## 9. SEO & métadonnées

`title` = « GREVEN — AI Research Portfolio ». Description ML/IA. Open Graph,
Twitter cards, sitemap, robots.txt, favicon EG, métadonnées par page, JSON-LD
`Person`.

---

## 10. Responsive

Desktop : expérience complète. Tablette : moins de branches, nav simplifiée,
trajets caméra plus courts. Mobile : composition dédiée (GREVEN central, réseau
allégé, logo visible, menu discret, interactions tactiles, voyage plus court,
pas de scroll horizontal). Pas un simple downscale du desktop.

---

## 11. Risques de performance & mitigations

| Risque | Mitigation |
|--------|-----------|
| TubeGeometry coûteuse (beaucoup d'axones) | Instancing / Line2 en medium-low ; budget d'edges par qualité. |
| Recompilation shader | Matériaux mémoïsés, uniforms mutés, pas de remount. |
| Allocation par frame | Vecteurs/matrices pré-alloués hors `useFrame`. |
| Fuite contexte WebGL entre routes | Canvas persistant unique dans le layout. |
| DoF floutant le texte / neurone actif | Texte hors WebGL (HTML) ; focus DoF géré pour épargner le nœud actif. |
| Mobile GPU faible | Auto-downgrade qualité + fallback sans WebGL. |
| Path avec espace (`T5 EVO`) | Chemins gérés, scripts npm sans hypothèse de chemin. |

---

## 12. Roadmap (13 étapes, commits imposés)

1. `chore: initialize project and implementation plan` — **ce document**.
2. `chore: initialize Next.js portfolio foundation` — scaffold, deps, config,
   structure, README, build/lint/typecheck verts.
3. `feat: create GREVEN visual identity and design system` — tokens, fonts,
   composants typo, grille, logo EG SVG, navigation.
4. `feat: add initial persistent neural WebGL scene` — canvas permanent, caméra,
   lumière, quelques neurones, perf/responsive de base.
5. `feat: build organic animated neural network` — générateur déterministe,
   corps/dendrites/axones, profondeur, mouvement organique, matériaux, qualité.
6. `feat: implement GREVEN neural landing experience` — composition accueil.
7. `feat: add interactive neural navigation` — hover/focus/sélection/impulsion.
8. `feat: create cinematic neural travel transitions` — CameraRig + voyage.
9. `feat: add research portfolio sections` — 5 pages + data séparée (ML only).
10. `feat: add scroll-driven neural exploration` — scroll ↔ neurones + retour réseau.
11. `perf: optimize neural experience across devices` — responsive/a11y/perf/audit.
12. `test: add portfolio interaction and navigation coverage` — Vitest + Playwright + docs.
13. `release: complete GREVEN AI research portfolio` — build prod, checks, push final.

Workflow git : branche `feat/neural-portfolio`, commits atomiques, push régulier,
PR vers `main` à la fin. Pas de force-push, pas de réécriture d'historique
distant, pas de secret commité (`.env.example` documenté).
