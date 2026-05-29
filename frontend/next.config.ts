import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this directory. A stray lockfile higher up the
  // tree made Next infer the wrong root; this keeps Turbopack's file tracing
  // scoped to the frontend app.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
