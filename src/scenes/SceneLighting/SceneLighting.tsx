'use client';

/**
 * Cinematic, warm lighting for the neural scene.
 * A soft Pearl key light, a very discreet olive fill, and a warm rim from
 * below — no aggressive metallic highlights. Matches the reference's calm,
 * mineral atmosphere.
 */
export function SceneLighting() {
  return (
    <>
      {/* Ambient olive fill — keeps shadows warm rather than black. */}
      <ambientLight color="#3d4034" intensity={0.55} />

      {/* Pearl key light, front-upper-left. */}
      <directionalLight color="#f2d0a7" intensity={1.15} position={[-4, 6, 8]} />

      {/* Warm rim from below-right (Seal Brown) for depth. */}
      <pointLight color="#65371f" intensity={12} distance={40} decay={2} position={[6, -4, -6]} />

      {/* Faint pearl bounce to lift the far side of the network. */}
      <pointLight color="#e5be9e" intensity={6} distance={32} decay={2} position={[3, 2, 6]} />
    </>
  );
}
