import type { NextConfig } from "next";
import { BUSINESS_HOME_SOURCE, BUSINESS_SOURCE } from "./lib/domain/routes";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `/{negocio}/mesa/3/menu` se sirve con la pantalla `/mesa/3/menu`; el negocio se lee de la URL.
  async rewrites() {
    return [
      { source: BUSINESS_SOURCE, destination: "/:section/:rest*" },
      // `/casa-verde` es la página de inicio del negocio.
      { source: BUSINESS_HOME_SOURCE, destination: "/negocio/:negocio" },
    ];
  },
};

export default nextConfig;
