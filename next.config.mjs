/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 保持 server-only 包不被打包进 server bundle
    serverComponentsExternalPackages: ['mysql2'],
  },
};

export default nextConfig;
