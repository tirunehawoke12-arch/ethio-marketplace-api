/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },              // Render ነጻ (512MB) ላይ build ቀላል እንዲሆን
  experimental: { cpus: 1, workerThreads: false },
  productionBrowserSourceMaps: false,
};
