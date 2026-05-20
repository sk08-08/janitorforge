/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Set to false to fail the build on TypeScript errors so issues are visible
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
