/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] },
};
export default nextConfig;
