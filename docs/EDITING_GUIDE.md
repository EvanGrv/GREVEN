# Guide d'édition — GREVEN

Comment modifier le contenu, la scène 3D et vérifier que rien ne casse.
Public : Evan (ou tout contributeur futur). Aucune connaissance Three.js
n'est nécessaire pour la partie contenu.

---

## 1. Éditer le contenu (aucun code 3D)

| Quoi | Où |
| --- | --- |
| Textes des 5 sections (intro, listes, liens) | `src/data/content/index.ts` |
| Types du contenu (structure des groupes) | `src/data/content/types.ts` |
| Libellés de navigation + mot d'ambiance (eyebrow) | `src/data/sections.ts` |
| Titres d'onglet / OpenGraph / description SEO | `src/app/layout.tsx` (`metadata`) |
| Logo, tagline « ML Research Portfolio » | `src/components/ui/Logo/` |

Règles éditoriales héritées du brief :

- **Aucune publication ou diplôme inventé** — `publications` garde un état
  vide honnête tant qu'il n'y a rien de réel (un test le vérifie).
- L'email de contact attendu par les tests est `evangrevenn@gmail.com`.
- Le lien LinkedIn est un placeholder à confirmer avant mise en ligne.

Après édition : `npm test` — les tests de contenu valident la cohérence
(chaque section a un contenu, un visuel ML valide, etc.).

## 2. Régler la scène 3D

Tous les réglages artistiques vivent dans deux endroits :

### `src/data/network.config.ts` — la composition
- `navPositions` : position monde des 5 neurones cliquables.
  Le viewport à z=0 couvre ~±5.5 en x, ~±3.1 en y (caméra [0,0,9], fov 38).
  **Ne jamais placer un nœud près de [0,0,z>0]** : il se projetterait sur le
  soma central (fantôme de « second neurone » — un test le garde).
- `palette` : uniquement des tons chauds minéraux. Un test vérifie
  R ≥ G ≥ B et l'absence de blanc.

### `src/scenes/` — la matière et la lumière
- `Network/Network.tsx` : l'arbre radial (tout part du soma central via
  `originToward`), nombre de dendrites (`TENDRIL_COUNT`), couronnes par
  cellule, épaisseurs/évasement des fibres (`taperedTube(..., flare)`),
  matériaux translucides des fibres (`fiberMaterials`).
- `Neuron/useNeuronAsset.ts` : membrane des somas (rim + halo subsurface
  en shader ; **transmission réelle uniquement en tier `high`**).
- `SceneLighting/`, `PostProcessing/`, `NeuralCanvas/NeuralScene.tsx` :
  lumières, bloom/DoF/grain/vignette, environnement procédural.

Règles d'art-direction non négociables : arbre radial centre→extérieur
(pas de fibres de fond qui traversent le cadre), aucune silhouette
sphérique (le modèle rond `soma-a.glb` n'est plus utilisé), jamais de
néon/blanc, palette brun/olive/beige uniquement.

### Qualité et performance
- Tiers `high`/`medium`/`low` auto-détectés (`src/lib/device-detect.ts`) ;
  forçables via `?quality=high|medium|low` dans l'URL.
- Le `PerformanceMonitor` baisse la résolution puis, en dernier recours,
  rétrograde `high`→`medium` (coupe transmission + DoF). Ne pas activer la
  `transmission` three.js hors tier high : elle re-rend la scène à chaque
  frame.
- Modèles : GLB décimés (~5–11k tris) dans `public/models/`. Pipeline pour
  en ajouter : `npx @gltf-transform/cli simplify IN OUT --ratio 0.05
  --error 0.01` puis `optimize IN OUT --texture-size 1024 --compress false`
  (les exports Meshy n'ont pas de normales : elles sont recalculées au
  chargement).

## 3. Vérifier

```bash
npm run dev            # http://localhost:3000 — itération visuelle
npm test               # Vitest (contenu, config réseau, store, qualité)
npm run test:e2e       # Playwright — build prod + navigation réelle
npm run lint && npm run typecheck
```

Pièges connus :
- **Ne jamais lancer `npm run build` pendant qu'un serveur (dev ou start)
  tourne** : ils partagent `.next` et le serveur se corrompt (500).
  Arrêter le serveur, `rm -rf .next`, puis builder.
- Le rendu 3D est client-only (`ssr:false`) : un build vert ne prouve pas
  que la scène s'affiche — toujours vérifier dans un navigateur.
- La composition est déterministe (seed `greven-neural-v1`) : un même code
  produit exactement la même image, ce qui rend les captures comparables.

## 4. Carte des composants

```
src/
├── app/                    # Pages (layout racine = Canvas persistant + SEO)
├── components/
│   ├── navigation/         # SideNav (desktop), MobileNav, Navigation
│   ├── typography/         # GrevenTitle (GRE·VEN accessible)
│   └── ui/                 # Logo (EgMark serif), BackToNetwork…
├── scenes/                 # Tout le WebGL (voir §2)
├── transitions/            # NeuralTravel (voyage caméra GSAP)
├── stores/sceneStore.ts    # Zustand : qualité, hover/actif, voyage
├── hooks/                  # capabilities, parallax, reduced-motion
├── lib/                    # device-detect, prng déterministe
└── data/                   # CONTENU ÉDITABLE (voir §1) + network.config
```
