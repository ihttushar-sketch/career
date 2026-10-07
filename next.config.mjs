/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // content is read from disk at build/request time — no external network needed
  env: {
    CONTENT_ROOT: 'thinking-universe',
  },
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
