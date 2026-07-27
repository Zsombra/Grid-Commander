import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tokens are decrypted server-side only; nothing here is exposed to the client.
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
