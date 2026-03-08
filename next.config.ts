import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-core",
    "@tensorflow/tfjs-backend-webgl",
    "@tensorflow/tfjs-backend-cpu",
    "@tensorflow/tfjs-converter",
    "@tensorflow/tfjs-layers",
    "@tensorflow-models/blazeface",
    "@tensorflow-models/pose-detection",
  ],
};

export default nextConfig;
