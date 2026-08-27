/** @type {import('next').NextConfig} */
const isTauriBuild = process.env.TAURI_BUILD === 'true' || process.env.TAURI_ENV_PLATFORM !== undefined;

const nextConfig = {
  output: isTauriBuild ? 'export' : 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
