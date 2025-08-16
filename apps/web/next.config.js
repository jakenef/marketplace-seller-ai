/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@upseller/shared'],
  experimental: {
    outputFileTracingIncludes: {
      '/**/*': ['../../packages/shared/dist/**/*'],
    },
  },
};

module.exports = nextConfig;
