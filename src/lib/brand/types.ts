// src/lib/brand/types.ts

export interface BrandConfig {
  // ── Identidad ─────────────────────────────────────────────────────────
  nombreCliente: string;
  subtitulo:     string;
  logoUrl?:      string;

  // ── Correos ───────────────────────────────────────────────────────────
  correoRevisionDefault: string;
  correoLogsDefault:     string;

  // ── Colores ───────────────────────────────────────────────────────────
  css: {
    primary:       string;   // color principal — botones, acentos, banda
    primaryHover:  string;   // hover del botón principal
    primaryLight:  string;   // fondo suave — chips, badges, hero bg
    primaryBorder: string;   // borde sutil con opacidad
    primaryText:   string;   // texto de color sobre fondo blanco
    primaryRing:   string;   // focus ring con opacidad
    secondary?:    string;   // color secundario — segunda línea/barra en gráficas
    secondaryBg?:  string;   // secundario con opacidad para barras Chart.js
  };
}