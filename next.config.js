/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is actually a static site with API routes
  output: 'standalone',
  trailingSlash: true,
  distDir: '.next'
}

module.exports = nextConfig