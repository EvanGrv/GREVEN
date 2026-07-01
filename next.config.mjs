/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three / R3F ship untranspiled ESM helpers; let Next transpile them.
  transpilePackages: ['three'],
  eslint: {
    dirs: ['src', 'tests'],
  },
};

export default nextConfig;
