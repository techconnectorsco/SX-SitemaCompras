// src/lib/brand/quimicas-unidas.ts

import type { BrandConfig } from './types';

export const quimicasUnidasBrand: BrandConfig = {
  nombreCliente: 'Químicas Unidas',
  subtitulo:     'Departamento de Crédito y Cobro',
  logoUrl:       '/QU.png',

  correoRevisionDefault: 'credito@qu.cr',
  correoLogsDefault:     'credito@qu.cr',

  css: {
    primary:        '#3d5fa0',   // azul principal
    primaryHover:   '#2d4a8a',   // azul oscuro para hover
    primaryLight:   '#eef2fa',   // azul muy claro para fondos
    primaryBorder:  '#3d5fa040', // azul con opacidad para bordes
    primaryText:    '#2d4a8a',   // texto azul sobre fondo blanco
    primaryRing:    '#3d5fa033', // focus ring
    secondary:      '#288FCC',   // azul claro — segunda línea en gráficas
    secondaryBg:    '#288FCCE6', // azul claro con opacidad para barras
  },
};