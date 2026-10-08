import type { NextConfig } from "next";
import { BUSINESS_SOURCE } from "./lib/domain/routes";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `/{negocio}/mesa/3/menu` se sirve con la pantalla `/mesa/3/menu`; el negocio se lee de la URL.
  async rewrites() {
    return [{ source: BUSINESS_SOURCE, destination: "/:section/:rest*" }];
  },
};

export default nextConfig;
