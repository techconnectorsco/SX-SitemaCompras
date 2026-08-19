// src/lib/brand/template.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  PLANTILLA DE LIBRO DE MARCA
//  Copiá este archivo, renombralo con el slug del cliente (ej: acme-corp.ts)
//  y completá todos los campos. Luego en +page.svelte cambiá solo el import:
//
//    import { acmeCorpBrand } from '$lib/brand/acme-corp';
//    const brand = acmeCorpBrand;
//
// ─────────────────────────────────────────────────────────────────────────────

import type { BrandConfig } from './types';

export const templateBrand: BrandConfig = {
  // ── Identidad ───────────────────────────────────────────────────────────
  nombreCliente: 'Nombre del Cliente',          // Aparece en el hero y pie de página
  subtitulo:     'Departamento de ...',          // Subtítulo bajo el nombre en el hero
  logoUrl:       '/logo-cliente.png',            // Ruta desde /static, ej: '/QU.png'

  // ── Correos por defecto ─────────────────────────────────────────────────
  correoRevisionDefault: 'credito@cliente.com',  // Pre-llena el input "Correo destino"
  correoLogsDefault:     'logs@cliente.com',     // Pre-llena el input "Correo de logs"

  // ── Colores de marca ────────────────────────────────────────────────────
  // Todos los valores son hexadecimales exactos — no uses nombres de Tailwind.
  css: {
    primary:       '#000000',   // Color principal: botones, banda hero, theads, badges
    primaryHover:  '#000000',   // Hover de botones y fondo hero en dark mode (más oscuro que primary)
    primaryLight:  '#f0f0f0',   // Fondo suave: hero light mode, hover de filas, headers de gráficas
    primaryBorder: '#00000025', // Borde sutil (primary + alfa ~15%) para cards y separadores
    primaryText:   '#000000',   // Texto de color sobre fondo blanco
    primaryRing:   '#00000020', // Focus ring en inputs (primary + alfa ~12%)

    // ── Color secundario (opcional) ───────────────────────────────────────
    // Se usa como segunda línea/barra en las gráficas (Vencido USD, Vencido CRC, etc.)
    // Si no se define, las gráficas usarán naranja por defecto.
    secondary:     '#000000',   // Segunda línea en gráficas — idealmente un color complementario de la marca
    secondaryBg:   '#000000E6', // Mismo color con opacidad ~90% para barras de Chart.js
  },
};