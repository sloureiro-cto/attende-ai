const IMAGE_DOMAINS = [
  "js-workspace-1.s3.us-east-2.amazonaws.com",
  "itl-js-workspace-staging.s3.us-east-2.amazonaws.com",
  "itl-js-workspace.s3.us-east-2.amazonaws.com",
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "js-workspace-1.s3.amazonaws.com",
  "app.jsynq.com",
]

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  // Optional: a separate build output folder (e.g. NEXT_DIST_DIR=.next-build) so a build can run next to `next dev`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  eslint: {
    // No ESLint setup in this repo; type errors still fail the build.
    ignoreDuringBuilds: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async headers() {
    // The app is for signed-in customers only: never indexable, on every response (the middleware only
    // covers pages; this also covers static files and API responses the middleware matcher skips).
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]
  },
  experimental: {
    // The Attende API (server/) runs these on Node as plain packages instead of bundling them.
    serverComponentsExternalPackages: ["mongoose", "stripe"],
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  images: {
    domains: IMAGE_DOMAINS,
  },
}

module.exports = config
