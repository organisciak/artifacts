import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // since this is a set of toy projects, be more permissive with type errors
    // so that little trinkets don't become big projects
    ignoreBuildErrors: true, 
  },
};

export default nextConfig;
