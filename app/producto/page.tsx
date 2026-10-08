import { permanentRedirect } from "next/navigation";

/** La página de ventas ahora es la principal (`/`); se conserva el enlace anterior. */
export default function ProductPage() {
  permanentRedirect("/");
}
