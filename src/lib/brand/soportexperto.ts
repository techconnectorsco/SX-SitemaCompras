import type { BrandConfig } from './types';

export const soporteXpertoBrand: BrandConfig = {
  nombreCliente: 'SoporteXperto',
  subtitulo:     'Departamento de Crédito y Cobro',
  // Reutilizamos la misma imagen del hero u otra, o lo dejamos sin logo para el mockup
  logoUrl:       '/logo-soportexperto.png', 

  correoRevisionDefault: 'credito@soportexperto.com',
  correoLogsDefault:     'logs@soportexperto.com',

  css: {
    primary:        '#1A73C2',   // azul principal de SoporteXperto
    primaryHover:   '#165A9A',   // azul oscuro para hover
    primaryLight:   '#eef2fa',   // azul muy claro para fondos
    primaryBorder:  '#1A73C240', // azul con opacidad para bordes
    primaryText:    '#0D1E3D',   // azul oscuro de texto
    primaryRing:    '#1A73C233', // focus ring
    secondary:      '#F9A11B',   // color secundario 
    secondaryBg:    '#F9A11BE6', // secundario con opacidad
  },
};
