import type { NextConfig } from 'next';

/**
 * The app is entirely client-side — the fight, the drawing, the sound and the
 * encoding all happen in the browser — so it ships as a folder of static files
 * with no server behind it. `npm run build:static` adds the sub-path GitHub
 * Pages serves a project site from; a plain `next build` is the same app at the
 * root.
 */

const isStatic = process.env.NEXT_PUBLIC_STATIC_BUILD === '1';
const basePath = process.env.PAGES_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  ...(isStatic
    ? {
        output: 'export' as const,
        basePath,
        assetPrefix: basePath || undefined,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
