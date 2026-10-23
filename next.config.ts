import type { NextConfig } from 'next';
const config: NextConfig = { poweredByHeader: false, serverExternalPackages: ['@resvg/resvg-js'], outputFileTracingIncludes: {'/api/service/*': ['./assets/fonts/Lato-Regular.ttf','./node_modules/@img/**/*','./node_modules/@resvg/**/*']} };
export default config;
