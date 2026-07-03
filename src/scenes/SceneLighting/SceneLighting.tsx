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
      <ambientLight color="#343328" intensity={0.4} />

      {/* Soft warm key, front-upper-left — patined beige, never white. */}
      <directionalLight color="#b79a72" intensity={1.15} position={[-4, 6, 8]} />

      {/* Warm rim from below-right (Seal Brown) for depth. */}
      <pointLight color="#65371f" intensity={9} distance={40} decay={2} position={[6, -4, -6]} />

      {/* Very faint front bounce so the near fibres never go pitch black. */}
      <pointLight color="#8a7050" intensity={3} distance={28} decay={2} position={[3, 2, 6]} />

      {/* Back rim (spec: "back light for separation") — detaches the dark
          membranes from the dark backdrop without brightening the scene. */}
      <directionalLight color="#8a7050" intensity={0.35} position={[0, 3, -8]} />
    </>
  );
}
