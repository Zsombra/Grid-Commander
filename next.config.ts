import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Traced dependencies only, copied into a runtime image with no toolchain.
   *
   * Without this a container has to carry the whole `node_modules` tree — build
   * dependencies, drizzle-kit, vitest and all — to run one server. See the
   * Dockerfile.
   */
  output: 'standalone',
  // Tokens are decrypted server-side only; nothing here is exposed to the client.
  serverExternalPackages: ['postgres'],

  /**
   * Teach webpack the mapping the rest of the toolchain already applies.
   *
   * This project imports with `.js` specifiers that resolve to `.ts` files —
   * correct under `moduleResolution: "bundler"`, and what `tsc` and vitest both
   * do. Next's webpack does not, so without this it looks for a `.js` file that
   * was never emitted and the whole application fails to resolve.
   *
   * Webpack only, and webpack is the supported path — dev and build alike.
   * Proven 2026-08-01: `next dev --turbopack` (Next 15.1) cannot resolve
   * these specifiers through the `@/` alias (`Module not found:
   * '@/…/describe-grant.query.js'`, /connect answers 500), and Turbopack's
   * configuration offers no `extensionAlias` equivalent to teach it. Use
   * `next dev` without the flag. (`turbopack-build-unproven`, closed.)
   */
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
