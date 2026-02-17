import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // 允许局域网访问时加载 _next 静态资源（解决跨域转圈问题）
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.50.76"],
};

export default nextConfig;
