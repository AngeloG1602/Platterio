"use client";

/** Último recurso si falla el layout raíz: sin dependencias de estilos ni del store. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es-CO">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#FAF7F2",
          color: "#1C1917",
        }}
      >
        <main
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, margin: 0 }}>No pudimos cargar Platterio</h1>
            <p style={{ color: "#44403C", maxWidth: 360 }}>
              Recarga la página. Si el problema sigue, reinicia los datos de la demo desde el hub.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 16,
                height: 44,
                padding: "0 20px",
                borderRadius: 12,
                border: 0,
                background: "#B24424",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
