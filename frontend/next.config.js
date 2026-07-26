/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone build for lightweight Docker containers
  output: "standalone",

  // React Strict Mode for detecting side-effects in dev
  reactStrictMode: true,

  // Transpile Three.js and React Three Fiber packages for SSR compatibility
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // Proxy API requests to backend service in development/docker environments
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },

  // Custom Webpack configurations for 3D graphics rendering safety
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent server-side rendering errors for browser-only canvas utilities
      config.externals = [...(config.externals || []), "canvas"];
    }

    // Fallback handling for node modules in browser bundle
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },
};

module.exports = nextConfig;
