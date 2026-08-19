// src/lib/brand/ejemplo-cliente-b.ts
// Ejemplo con paleta completamente diferente — verde corporativo

import type { BrandConfig } from './types';

export const clienteBBrand: BrandConfig = {
  nombreCliente: 'Distribuidora Nacional',
  subtitulo:     'Departamento de Crédito y Cobro',
  logoUrl:       '/logoSX.jpg',

  correoRevisionDefault: 'credito@distribuidora.com',
  correoLogsDefault:     'logs@distribuidora.com',

  css: {
    primary:       '#1a6b3c',   // verde corporativo principal
    primaryHover:  '#145530',   // verde más oscuro para hover y dark mode
    primaryLight:  '#eaf4ee',   // verde muy claro para fondos y hero
    primaryBorder: '#1a6b3c30', // verde con opacidad para bordes
    primaryText:   '#145530',   // texto verde oscuro sobre fondo blanco
    primaryRing:   '#1a6b3c25', // focus ring

    secondary:     '#4caf7d',   // verde claro complementario — segunda línea en gráficas
    secondaryBg:   '#4caf7dE6', // verde claro con opacidad para barras Chart.js
  },
};