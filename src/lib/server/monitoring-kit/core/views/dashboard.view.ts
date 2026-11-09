import { MonitoringKitOptions } from '../interfaces/monitoring-options.interface';

/**
 * Generador de vista HTML para el Centro Consolidado de Operaciones y Monitoreo.
 * Diseñado bajo los lineamientos normativos del Libro de Marca SoporteXperto v1.0.
 * 100% dinámico: renderiza automáticamente tarjetas KPI para 0, 1 o N bases de datos/servicios
 * configurados en `probes`, además de métricas del proceso (RAM/Uptime), Tráfico y Seguridad.
 */
export function renderConsolidatedDashboardHtml(options?: MonitoringKitOptions): string {
	const appName = options?.appName ?? 'Centro Consolidado de Operaciones y Salud API';
	const appBadge = options?.appBadge ?? 'API';
	const appSubtitle =
		options?.appSubtitle ??
		'Monitoreo unificado en tiempo real de bases de datos, recursos de servidor, tráfico y auditoría de accesos.';
	const statusMonitorPath = options?.statusMonitorPath ?? '/status';
	const swaggerDocsPath = options?.swaggerDocsPath ?? '/api/docs';
	const currentYear = new Date().getFullYear();

	return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeServerHtml(appName)} — SoporteXperto</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Institucionales (Sección 3.1 y 15.1) */
      --sx-azul-profundo:   #0D1E3D;
      --sx-azul-noche:      #0B1A35;
      --sx-azul-medio:      #12294A;
      --sx-azul-pizarra:    #1C394F;
      --sx-azul-acento:     #1A73C2;
      --sx-azul-claro:      #EAF3FC;

      /* Semánticos (Sección 3.3) */
      --sx-verde:           #22A06B;
      --sx-verde-claro:     #E9F6F0;

      /* Neutros de estructura (Sección 3.2) */
      --sx-blanco:          #FFFFFF;
      --sx-nieve:           #FBFDFF;
      --sx-bruma:           #F3F7FC;
      --sx-borde:           #E7EEF6;
      --sx-borde-int:       #E9EFF6;
      --sx-gris-azul:       #D8E2EE;
      --sx-gris-etiqueta:   #93A2B5;
      --sx-gris-apoyo:      #7C8DA3;
      --sx-gris-cuerpo:     #56687E;
      --sx-gris-nav:        #47586E;

      /* Elevación y sombra (Sección 5.3) */
      --sx-shadow-1:        0 18px 40px rgba(13, 30, 61, 0.05);
      --sx-shadow-2:        0 18px 40px rgba(13, 30, 61, 0.07);
      --sx-shadow-btn:      0 18px 40px rgba(13, 30, 61, 0.18);

      /* Pila tipográfica (Sección 4.1) */
      --font-display:       'Sora', 'Segoe UI Semibold', 'Helvetica Neue', sans-serif;
      --font-body:          'Manrope', 'Segoe UI', 'Helvetica Neue', sans-serif;
      --font-mono:          Consolas, 'SF Mono', ui-monospace, monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-family: var(--font-body);
      color: var(--sx-gris-cuerpo);
      background-color: var(--sx-blanco);
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: var(--sx-blanco);
      color: var(--sx-gris-cuerpo);
      font-family: var(--font-body);
      font-size: 16px;
      line-height: 1.62;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow-x: hidden;
    }

    /* Enlaces base (Sección 11.3) */
    a {
      color: var(--sx-azul-acento);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    a:hover {
      color: var(--sx-azul-profundo);
    }

    /* Foco accesible (Sección 14.1) */
    a:focus-visible,
    button:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--sx-azul-acento);
      outline-offset: 2px;
    }

    /* Manchas radiales difusas autorizadas (Sección 6.3) */
    .ambient-glow {
      position: absolute;
      width: 520px;
      height: 520px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(26, 115, 194, 0.16), rgba(26, 115, 194, 0) 68%);
      filter: blur(60px);
      pointer-events: none;
      z-index: 0;
    }
    .ambient-glow.top-right {
      top: -140px;
      right: -120px;
    }
    .ambient-glow.top-left {
      top: 120px;
      left: -180px;
      background: radial-gradient(circle, rgba(13, 30, 61, 0.08), rgba(13, 30, 61, 0) 68%);
    }

    /* Contenedor maestro (Sección 10.1) */
    .container {
      width: 100%;
      max-width: 1180px;
      margin: 0 auto;
      padding: 0 24px;
      position: relative;
      z-index: 1;
    }

    /* Cabecera fija institucional (Sección 2.4 y 12.6) */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--sx-borde);
      padding: 14px 0;
    }
    .topbar-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    /* Lockup con producto o unidad (Sección 2.4) */
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-mark {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 38px;
    }
    .brand-monogram {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: var(--sx-azul-profundo);
      color: var(--sx-blanco);
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 13px;
      letter-spacing: -0.3px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand-wordmark {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 17px;
      letter-spacing: -0.5px;
      color: var(--sx-azul-profundo);
      line-height: 1;
    }
    .brand-divider {
      width: 1px;
      height: 30px;
      background-color: var(--sx-gris-azul);
      flex-shrink: 0;
    }
    .product-lockup {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .product-lockup-name {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 13.5px;
      letter-spacing: -0.3px;
      color: var(--sx-azul-pizarra);
      line-height: 1.2;
    }
    .product-lockup-desc {
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 1.6px;
      color: var(--sx-gris-etiqueta);
      line-height: 1.2;
    }

    /* Navegación y acciones de cabecera (Sección 12.1 y 12.6) */
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 22px;
      flex-wrap: wrap;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 22px;
      flex-wrap: wrap;
    }
    .nav-link {
      font-family: var(--font-body);
      font-weight: 600;
      font-size: 14px;
      line-height: 1.4;
      color: var(--sx-gris-nav);
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      transition: color 0.2s ease;
    }
    .nav-link:hover {
      color: var(--sx-azul-profundo);
    }
    .nav-link .arrow {
      margin-left: 9px;
      color: var(--sx-azul-acento);
      font-weight: 700;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    /* Botones en píldora (Sección 5.2 y 12.1) */
    .btn {
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 13.5px;
      line-height: 1;
      border-radius: 999px;
      padding: 12px 22px;
      min-height: 44px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
      white-space: nowrap;
    }
    .btn-secondary {
      background: var(--sx-blanco);
      color: var(--sx-azul-pizarra);
      border: 1px solid var(--sx-gris-azul);
    }
    .btn-secondary:hover {
      background: var(--sx-bruma);
      border-color: var(--sx-azul-acento);
      color: var(--sx-azul-profundo);
    }
    .btn-primary {
      background: linear-gradient(120deg, var(--sx-azul-acento), var(--sx-azul-profundo));
      color: var(--sx-blanco);
      border: none;
      box-shadow: var(--sx-shadow-btn);
      padding: 13px 26px;
    }
    .btn-primary:hover {
      color: var(--sx-blanco);
      opacity: 0.94;
    }

    /* Cabecera de página / Introducción (Sección 9 y 11) */
    .page-intro {
      padding: 48px 0 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 24px;
    }
    .intro-copy {
      max-width: 660px;
    }
    .eyebrow {
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2.2px;
      line-height: 1.3;
      color: var(--sx-azul-acento);
      margin-bottom: 12px;
      display: block;
    }
    .page-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 36px;
      letter-spacing: -1.4px;
      line-height: 1.1;
      color: var(--sx-azul-profundo);
      margin-bottom: 12px;
    }
    .page-subtitle {
      font-family: var(--font-body);
      font-weight: 400;
      font-size: 16.5px;
      line-height: 1.62;
      color: var(--sx-gris-cuerpo);
      text-wrap: pretty;
    }
    .intro-status-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    .micro-label {
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      line-height: 1.3;
      color: var(--sx-gris-etiqueta);
    }

    /* Etiquetas de estado (Sección 12.2: solo texto, sin icono, radio 999px) */
    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 13px;
      border-radius: 999px;
      font-family: var(--font-body);
      font-size: 11.5px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }
    .status-pill.positive {
      background-color: var(--sx-verde-claro);
      color: var(--sx-verde);
    }
    .status-pill.info {
      background-color: var(--sx-azul-claro);
      color: var(--sx-azul-acento);
    }
    .status-pill.neutral {
      background-color: var(--sx-bruma);
      color: var(--sx-gris-apoyo);
    }
    /* Estados de advertencia o caída derivados del azul profundo (Sección 3.3) */
    .status-pill.attention {
      background-color: var(--sx-gris-azul);
      color: var(--sx-azul-profundo);
    }
    .status-pill.critical {
      background-color: var(--sx-azul-profundo);
      color: var(--sx-blanco);
    }

    /* Cuadrícula de tarjetas KPI (Sección 5.2, 5.5, 11.1 y 12.4) */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      margin-bottom: 48px;
    }
    .kpi-card {
      background: var(--sx-blanco);
      border: 1px solid var(--sx-borde);
      border-radius: 18px;
      padding: 22px;
      box-shadow: var(--sx-shadow-2);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      transition: border-color 0.2s ease;
    }
    .kpi-card:hover {
      border-color: var(--sx-gris-azul);
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .kpi-title {
      font-family: var(--font-body);
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      line-height: 1.3;
      color: var(--sx-gris-etiqueta);
    }
    /* Contenedor de siglas de 2 letras (Sección 6.4: 34px, radio 11px) */
    .entity-sigla {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background-color: var(--sx-azul-claro);
      color: var(--sx-azul-acento);
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kpi-value {
      font-family: var(--font-display);
      font-size: 38px;
      font-weight: 600;
      letter-spacing: -1.6px;
      line-height: 1;
      color: var(--sx-azul-profundo);
    }
    .kpi-value.accent {
      color: var(--sx-azul-acento);
    }
    .kpi-value.positive {
      color: var(--sx-verde);
    }
    .kpi-sub {
      font-family: var(--font-body);
      font-size: 13.5px;
      line-height: 1.4;
      color: var(--sx-gris-cuerpo);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--sx-borde-int);
      flex-wrap: wrap;
    }
    .kpi-sub strong {
      font-weight: 700;
      color: var(--sx-azul-pizarra);
    }

    /* Sistema de pestañas (Sección 11.1) */
    .tabs-bar {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--sx-borde);
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: transparent;
      color: var(--sx-gris-nav);
      border: none;
      padding: 12px 18px;
      min-height: 44px;
      border-bottom: 2px solid transparent;
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      cursor: pointer;
      transition: color 0.2s ease, border-color 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .tab-btn:hover {
      color: var(--sx-azul-profundo);
    }
    .tab-btn.active {
      color: var(--sx-azul-acento);
      border-bottom-color: var(--sx-azul-acento);
    }
    .tab-count {
      background: var(--sx-bruma);
      color: var(--sx-gris-apoyo);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 999px;
    }
    .tab-btn.active .tab-count {
      background: var(--sx-azul-claro);
      color: var(--sx-azul-acento);
    }
    .tab-count.alert {
      background: var(--sx-azul-profundo);
      color: var(--sx-blanco);
    }

    /* Vistas de contenido y paneles (Sección 12.4) */
    .main-section {
      flex: 1;
      padding-bottom: 84px;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .panel {
      background: var(--sx-blanco);
      border: 1px solid var(--sx-borde);
      border-radius: 20px;
      padding: 26px;
      box-shadow: var(--sx-shadow-2);
      margin-bottom: 24px;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }
    .panel-heading-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .panel-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.6px;
      line-height: 1.25;
      color: var(--sx-azul-profundo);
    }
    .panel-meta {
      font-family: var(--font-body);
      font-size: 13.5px;
      color: var(--sx-gris-cuerpo);
    }
    .panel-meta strong {
      font-weight: 700;
      color: var(--sx-azul-pizarra);
    }
    .search-input {
      background: var(--sx-nieve);
      border: 1px solid var(--sx-gris-azul);
      color: var(--sx-azul-profundo);
      font-family: var(--font-body);
      padding: 10px 16px;
      min-height: 44px;
      border-radius: 999px;
      font-size: 13.5px;
      width: 300px;
      max-width: 100%;
      transition: border-color 0.2s ease, background-color 0.2s ease;
    }
    .search-input::placeholder {
      color: var(--sx-gris-etiqueta);
    }
    .search-input:focus {
      background: var(--sx-blanco);
      border-color: var(--sx-azul-acento);
    }

    /* Tablas institucionales (Sección 8.2 y 12.4) */
    .data-table-wrapper {
      overflow-x: auto;
      max-height: 520px;
      border: 1px solid var(--sx-borde);
      border-radius: 14px;
      background: var(--sx-blanco);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      text-align: left;
    }
    th {
      background: var(--sx-azul-profundo);
      color: var(--sx-blanco);
      font-family: var(--font-body);
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.4px;
      padding: 13px 16px;
      border-bottom: 1px solid var(--sx-borde);
      position: sticky;
      top: 0;
      z-index: 10;
      white-space: nowrap;
    }
    td {
      padding: 13px 16px;
      border-bottom: 1px solid var(--sx-borde-int);
      color: var(--sx-gris-cuerpo);
      vertical-align: middle;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    tbody tr:hover td {
      background: var(--sx-nieve);
    }

    /* Elementos técnicos en tablas (Sección 4.1 y 12.2) */
    .code-inline {
      font-family: var(--font-mono);
      font-size: 12.5px;
      color: var(--sx-azul-pizarra);
      background: var(--sx-bruma);
      padding: 3px 8px;
      border-radius: 10px;
    }
    .ip-tag {
      font-family: var(--font-mono);
      color: var(--sx-azul-acento);
      font-weight: 600;
      font-size: 12.5px;
    }
    .timestamp-tag {
      color: var(--sx-gris-etiqueta);
      font-size: 12px;
      white-space: nowrap;
    }
    .method-tag {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--sx-azul-claro);
      color: var(--sx-azul-acento);
      display: inline-block;
      margin-right: 6px;
    }
    .method-tag.write {
      background: var(--sx-bruma);
      color: var(--sx-azul-pizarra);
    }
    .method-tag.delete {
      background: var(--sx-azul-profundo);
      color: var(--sx-blanco);
    }
    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: var(--sx-gris-apoyo);
      font-size: 14.5px;
    }

    /* Contenedor de captura/iframe (Sección 6.2 y 12.4) */
    .iframe-surface {
      background: var(--sx-nieve);
      border: 1px solid var(--sx-borde);
      border-radius: 14px;
      overflow: hidden;
    }
    .iframe-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: var(--sx-bruma);
      border-bottom: 1px solid var(--sx-borde-int);
    }
    .window-dots {
      display: flex;
      gap: 6px;
    }
    .window-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--sx-gris-azul);
    }
    .window-context {
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 700;
      color: var(--sx-gris-apoyo);
    }
    .iframe-box {
      width: 100%;
      height: 680px;
      background: var(--sx-blanco);
    }
    .iframe-box iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Visor de código JSON (Sección 3.2 y 4.1) */
    pre.code-viewer {
      background: var(--sx-bruma);
      border: 1px solid var(--sx-borde-int);
      color: var(--sx-azul-profundo);
      padding: 20px;
      border-radius: 14px;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.55;
      overflow-x: auto;
      max-height: 520px;
    }

    /* Pie de página institucional (Sección 12.7) */
    .site-footer {
      background-color: var(--sx-azul-noche);
      color: rgba(255, 255, 255, 0.72);
      padding: 72px 0 34px;
      margin-top: auto;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
      gap: 48px;
      padding-bottom: 48px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.10);
    }
    .footer-brand {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .footer-brand-mark {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .footer-monogram {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: rgba(255, 255, 255, 0.12);
      color: var(--sx-blanco);
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .footer-wordmark {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 18px;
      letter-spacing: -0.5px;
      color: var(--sx-blanco);
    }
    .footer-desc {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.72);
      max-width: 320px;
    }
    .footer-col-title {
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      color: rgba(255, 255, 255, 0.45);
      margin-bottom: 14px;
      display: block;
    }
    .footer-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13.5px;
    }
    .footer-list a {
      color: rgba(255, 255, 255, 0.72);
    }
    .footer-list a:hover {
      color: var(--sx-blanco);
    }
    .footer-legal {
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.45);
    }

    /* Animación de entrada única (Sección 13.1 y 13.2) */
    .reveal-once {
      animation: sxFadeUp 0.7s cubic-bezier(0.22, 0.7, 0.3, 1) forwards;
    }
    @keyframes sxFadeUp {
      from {
        opacity: 0;
        transform: translateY(18px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Puntos de quiebre responsivos (Sección 10.3 y 11.2) */
    @media (max-width: 1239px) {
      .kpi-grid {
        gap: 16px;
      }
      .footer-grid {
        gap: 32px;
      }
    }

    @media (max-width: 1023px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .footer-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 767px) {
      .container {
        padding: 0 20px;
      }
      .page-intro {
        padding: 32px 0 24px;
      }
      .page-title {
        font-size: 28px;
        letter-spacing: -0.9px;
      }
      .page-subtitle {
        font-size: 16px;
      }
      .intro-status-box {
        align-items: flex-start;
      }
      .kpi-grid {
        grid-template-columns: 1fr;
      }
      .kpi-value {
        font-size: 32px;
      }
      .footer-grid {
        grid-template-columns: 1fr;
        gap: 28px;
      }
      .search-input {
        width: 100%;
      }
    }

    /* Respeto estricto a prefers-reduced-motion (Sección 13.2) */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- Manchas ambientales decorativas (Sección 6.3) -->
  <div class="ambient-glow top-right" aria-hidden="true"></div>
  <div class="ambient-glow top-left" aria-hidden="true"></div>

  <!-- Cabecera fija institucional (Sección 12.6) -->
  <header class="topbar">
    <div class="container topbar-inner">
      <div class="brand-lockup">
        <div class="brand-mark">
          <span class="brand-monogram" aria-hidden="true">SX</span>
          <span class="brand-wordmark">SoporteXperto</span>
        </div>
        <div class="brand-divider" aria-hidden="true"></div>
        <div class="product-lockup">
          <span class="product-lockup-name">${escapeServerHtml(appName)}</span>
          <span class="product-lockup-desc">Transformación Digital · ${escapeServerHtml(appBadge)}</span>
        </div>
      </div>

      <div class="topbar-right">
        <nav class="nav-links" aria-label="Accesos técnicos">
          <a class="nav-link" href="${escapeServerHtml(statusMonitorPath)}" target="_blank" rel="noopener">
            Status Monitor <span class="arrow" aria-hidden="true">→</span>
          </a>
          <a class="nav-link" href="${escapeServerHtml(swaggerDocsPath)}" target="_blank" rel="noopener">
            Swagger Docs <span class="arrow" aria-hidden="true">→</span>
          </a>
        </nav>
        <div class="topbar-actions">
          <button type="button" class="btn btn-secondary" id="btn-toggle-timer" onclick="toggleAutoRefresh()">
            Auto (3 s): Activo
          </button>
          <button type="button" class="btn btn-primary" onclick="loadSummary()">
            Actualizar métricas
          </button>
        </div>
      </div>
    </div>
  </header>

  <main class="container main-section reveal-once">
    <!-- Introducción y estado operativo general -->
    <section class="page-intro">
      <div class="intro-copy">
        <span class="eyebrow">Centro de operaciones y salud</span>
        <h1 class="page-title">${escapeServerHtml(appName)}</h1>
        <p class="page-subtitle">${escapeServerHtml(appSubtitle)}</p>
      </div>
      <div class="intro-status-box">
        <span class="micro-label">Estado general del servicio</span>
        <span id="general-badge" class="status-pill info">Sincronizando estado</span>
      </div>
    </section>

    <!-- Cuadrícula dinámica de tarjetas KPI -->
    <section class="kpi-grid" id="kpi-grid" aria-label="Indicadores clave de salud">
      <!-- Renderizado dinámicamente según los probes y métricas del servidor -->
    </section>

    <!-- Navegación por pestañas -->
    <nav class="tabs-bar" aria-label="Vistas de diagnóstico">
      <button type="button" class="tab-btn active" onclick="switchTab('tab-security')">
        Auditoría de accesos e IPs
        <span class="tab-count alert" id="tab-security-count">0</span>
      </button>
      <button type="button" class="tab-btn" onclick="switchTab('tab-traffic')">
        Tráfico API reciente
        <span class="tab-count" id="tab-traffic-count">0</span>
      </button>
      <button type="button" class="tab-btn" onclick="switchTab('tab-charts')">
        Procesador, memoria y RPS en tiempo real
      </button>
      <button type="button" class="tab-btn" onclick="switchTab('tab-raw')">
        Diagnóstico crudo (JSON)
      </button>
    </nav>

    <!-- TAB 1: Auditoría de Seguridad -->
    <section id="tab-security" class="tab-content active" aria-label="Auditoría de seguridad">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-heading-group">
            <span class="micro-label">Control de acceso</span>
            <h2 class="panel-title">Intentos de acceso denegados (HTTP 401 y 403)</h2>
          </div>
          <input
            type="text"
            id="security-search"
            class="search-input"
            placeholder="Filtrar por IP, ruta, motivo o usuario"
            aria-label="Filtrar eventos de seguridad"
            oninput="filterSecurityTable()"
          >
        </div>
        <div class="data-table-wrapper">
          <table id="security-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>IP del cliente</th>
                <th>Método y ruta</th>
                <th>Estado HTTP</th>
                <th>Motivo del bloqueo</th>
                <th>Usuario / Roles</th>
                <th>Agente / Navegador</th>
              </tr>
            </thead>
            <tbody id="security-table-body">
              <tr>
                <td colspan="7" class="empty-state">Consultando registros de auditoría...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 2: Tráfico API Reciente -->
    <section id="tab-traffic" class="tab-content" aria-label="Tráfico API reciente">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-heading-group">
            <span class="micro-label">Trazabilidad HTTP</span>
            <h2 class="panel-title">Solicitudes recientes interceptadas</h2>
            <p class="panel-meta" id="traffic-metrics-bar"></p>
          </div>
          <input
            type="text"
            id="traffic-search"
            class="search-input"
            placeholder="Filtrar por ruta, método, código o IP"
            aria-label="Filtrar tráfico reciente"
            oninput="filterTrafficTable()"
          >
        </div>
        <div class="data-table-wrapper">
          <table id="traffic-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>IP origen</th>
                <th>Método</th>
                <th>Ruta solicitada</th>
                <th>Estado</th>
                <th>Latencia</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody id="traffic-table-body">
              <tr>
                <td colspan="7" class="empty-state">Sin solicitudes registradas en el buffer actual.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 3: Gráficas en Tiempo Real -->
    <section id="tab-charts" class="tab-content" aria-label="Métricas de servidor en tiempo real">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-heading-group">
            <span class="micro-label">Telemetría continua</span>
            <h2 class="panel-title">Monitor visual de procesador, memoria y tráfico</h2>
          </div>
          <a class="nav-link" href="${escapeServerHtml(statusMonitorPath)}" target="_blank" rel="noopener">
            Abrir vista completa <span class="arrow" aria-hidden="true">→</span>
          </a>
        </div>
        <div class="iframe-surface">
          <div class="iframe-topbar" aria-hidden="true">
            <div class="window-dots">
              <span class="window-dot"></span>
              <span class="window-dot"></span>
              <span class="window-dot"></span>
            </div>
            <span class="window-context">Telemetría Socket.io · ${escapeServerHtml(statusMonitorPath)}</span>
          </div>
          <div class="iframe-box">
            <iframe src="${escapeServerHtml(statusMonitorPath)}" title="Monitor de estado del servidor en tiempo real"></iframe>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 4: JSON Crudo -->
    <section id="tab-raw" class="tab-content" aria-label="Respuesta JSON cruda">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-heading-group">
            <span class="micro-label">Inspección técnica</span>
            <h2 class="panel-title">Diagnóstico crudo (/health/summary)</h2>
          </div>
          <button type="button" class="btn btn-secondary" id="btn-copy-json" onclick="copyJson()">
            Copiar JSON
          </button>
        </div>
        <pre id="json-viewer" class="code-viewer">Cargando respuesta de /health/summary...</pre>
      </div>
    </section>
  </main>

  <!-- Pie de página institucional en Azul Noche (Sección 12.7) -->
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="footer-brand-mark">
            <span class="footer-monogram" aria-hidden="true">SX</span>
            <span class="footer-wordmark">SoporteXperto</span>
          </div>
          <p class="footer-desc">
            Departamento de Transformación Digital. Plataformas propias, integraciones y observabilidad operativa con trazabilidad visible.
          </p>
        </div>

        <div>
          <span class="footer-col-title">Plataforma</span>
          <ul class="footer-list">
            <li>${escapeServerHtml(appName)}</li>
            <li>Unidad: ${escapeServerHtml(appBadge)}</li>
            <li>Endpoint: /health/summary</li>
          </ul>
        </div>

        <div>
          <span class="footer-col-title">Herramientas</span>
          <ul class="footer-list">
            <li><a href="${escapeServerHtml(statusMonitorPath)}" target="_blank" rel="noopener">Monitor en tiempo real →</a></li>
            <li><a href="${escapeServerHtml(swaggerDocsPath)}" target="_blank" rel="noopener">Documentación OpenAPI →</a></li>
          </ul>
        </div>

        <div>
          <span class="footer-col-title">Lineamientos</span>
          <ul class="footer-list">
            <li>Monitoreo con control humano</li>
            <li>Auditoría HTTP 401 y 403</li>
            <li>Trazabilidad en memoria</li>
          </ul>
        </div>
      </div>

      <div class="footer-legal">
        <span>SoporteXperto · Departamento de Transformación Digital</span>
        <span>© ${currentYear} SoporteXperto. Documento y consola de uso interno.</span>
      </div>
    </div>
  </footer>

  <script>
    let currentData = null;
    let autoRefreshTimer = null;
    let isAutoRefresh = true;

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

      const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
      if (targetBtn) targetBtn.classList.add('active');

      const targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.add('active');
    }

    function toggleAutoRefresh() {
      isAutoRefresh = !isAutoRefresh;
      const btn = document.getElementById('btn-toggle-timer');
      if (isAutoRefresh) {
        btn.innerText = 'Auto (3 s): Activo';
        startAutoRefresh();
      } else {
        btn.innerText = 'Auto (3 s): Pausado';
        clearInterval(autoRefreshTimer);
      }
    }

    function startAutoRefresh() {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = setInterval(() => {
        if (isAutoRefresh) loadSummary();
      }, 3000);
    }

    async function loadSummary() {
      try {
        const res = await fetch('/health/summary');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        currentData = data;
        renderSummary(data);
      } catch (err) {
        console.error('Error al cargar métricas:', err);
        const badge = document.getElementById('general-badge');
        badge.className = 'status-pill critical';
        badge.innerText = 'Sin conexión con el servidor';
      }
    }

    function renderSummary(data) {
      // 1. Etiqueta de estado general (Sección 12.2: solo texto, sin icono)
      const badge = document.getElementById('general-badge');
      if (data.system.status === 'ok') {
        badge.className = 'status-pill positive';
        badge.innerText = 'Operativo · Activo ' + data.system.uptimeHuman;
      } else if (data.system.status === 'degraded') {
        badge.className = 'status-pill attention';
        badge.innerText = 'Servicio degradado · En revisión';
      } else {
        badge.className = 'status-pill critical';
        badge.innerText = 'Atención requerida · Servicio caído';
      }

      // 2. Renderizar tarjetas KPI dinámicamente
      renderKpiGrid(data);

      // 3. Contadores de pestañas
      document.getElementById('tab-security-count').innerText = data.security.totalBlocked;

      // 4. Tablas
      renderSecurityTable(data.security.events);
      renderTrafficTable(data.traffic);

      // 5. JSON Raw
      document.getElementById('json-viewer').innerText = JSON.stringify(data, null, 2);
    }

    /**
     * Genera siglas autorizadas de 2 letras para identificar entidades (Sección 6.4),
     * descartando cualquier emoji o símbolo no alfanumérico.
     */
    function resolveEntitySigla(preferred, label, fallback) {
      const cleanPreferred = String(preferred || '').replace(/[^a-zA-Z0-9]/g, '').trim();
      if (cleanPreferred.length >= 2) {
        return cleanPreferred.slice(0, 2).toUpperCase();
      }
      const words = String(label || '')
        .replace(/[^a-zA-Z0-9\\s]/g, ' ')
        .trim()
        .split(/\\s+/)
        .filter(Boolean);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      if (words.length === 1 && words[0].length >= 2) {
        return words[0].slice(0, 2).toUpperCase();
      }
      return fallback || 'SX';
    }

    function renderKpiGrid(data) {
      const grid = document.getElementById('kpi-grid');
      const cardsHtml = [];

      // A. Tarjeta de Proceso y Memoria Node.js
      cardsHtml.push(
        '<article class="kpi-card">' +
          '<div class="kpi-header">' +
            '<span class="kpi-title">Proceso y memoria RAM</span>' +
            '<span class="entity-sigla" aria-hidden="true">PR</span>' +
          '</div>' +
          '<div class="kpi-value">' + formatNumber(data.system.memoryRssMb) + ' MB</div>' +
          '<div class="kpi-sub">' +
            '<span>Heap: <strong>' + formatNumber(data.system.memoryHeapMb) + ' MB</strong></span>' +
            '<span class="status-pill info">Node ' + escapeHtml(data.system.nodeVersion) + '</span>' +
          '</div>' +
        '</article>'
      );

      // B. Tarjetas dinámicas por cada probe de Base de Datos / Servicio externo
      const dbEntries = Object.entries(data.databases || {});
      for (const [key, db] of dbEntries) {
        const isUp = db.status === 'up';
        const statusValueClass = isUp ? 'kpi-value positive' : 'kpi-value';
        const statusText = isUp ? 'Operativo' : 'Inactivo';
        const latencyText = isUp ? (formatNumber(db.responseTimeMs) + ' ms') : (db.error || 'Sin respuesta');
        const pillClass = isUp ? 'status-pill positive' : 'status-pill critical';
        const pillText = db.badge || (isUp ? 'Sincronizado' : 'Caído');
        const label = db.label || key;
        const sigla = resolveEntitySigla(db.icon, label, 'DB');

        cardsHtml.push(
          '<article class="kpi-card">' +
            '<div class="kpi-header">' +
              '<span class="kpi-title">' + escapeHtml(label) + '</span>' +
              '<span class="entity-sigla" aria-hidden="true">' + escapeHtml(sigla) + '</span>' +
            '</div>' +
            '<div class="' + statusValueClass + '">' + statusText + '</div>' +
            '<div class="kpi-sub">' +
              '<span>Respuesta: <strong>' + escapeHtml(String(latencyText)) + '</strong></span>' +
              '<span class="' + pillClass + '">' + escapeHtml(pillText) + '</span>' +
            '</div>' +
          '</article>'
        );
      }

      // C. Tarjeta de Rendimiento API
      const m = data.traffic.metrics;
      cardsHtml.push(
        '<article class="kpi-card">' +
          '<div class="kpi-header">' +
            '<span class="kpi-title">Tráfico y latencia API</span>' +
            '<span class="entity-sigla" aria-hidden="true">TR</span>' +
          '</div>' +
          '<div class="kpi-value accent">' + formatNumber(m.avgResponseTimeMs) + ' ms</div>' +
          '<div class="kpi-sub">' +
            '<span>Total: <strong>' + formatNumber(m.totalRequests) + ' solicitudes</strong></span>' +
            '<span class="status-pill positive">2xx: ' + formatNumber(m.status2xx) + '</span>' +
          '</div>' +
        '</article>'
      );

      // D. Tarjeta de Seguridad y Bloqueos
      const lastIp = (data.security.events && data.security.events.length > 0)
        ? data.security.events[0].ip
        : 'Sin registros';
      const secPillClass = data.security.totalBlocked > 0 ? 'status-pill attention' : 'status-pill neutral';
      const secPillText = data.security.totalBlocked > 0 ? 'Con alertas' : 'Sin bloqueos';

      cardsHtml.push(
        '<article class="kpi-card">' +
          '<div class="kpi-header">' +
            '<span class="kpi-title">Auditoría HTTP 401 y 403</span>' +
            '<span class="entity-sigla" aria-hidden="true">AU</span>' +
          '</div>' +
          '<div class="kpi-value">' + formatNumber(data.security.totalBlocked) + '</div>' +
          '<div class="kpi-sub">' +
            '<span>Última IP: <strong class="ip-tag">' + escapeHtml(lastIp) + '</strong></span>' +
            '<span class="' + secPillClass + '">' + secPillText + '</span>' +
          '</div>' +
        '</article>'
      );

      grid.innerHTML = cardsHtml.join('');
    }

    function getMethodTagClass(method) {
      const m = String(method || '').toUpperCase();
      if (m === 'DELETE') return 'method-tag delete';
      if (m === 'POST' || m === 'PUT' || m === 'PATCH') return 'method-tag write';
      return 'method-tag';
    }

    function renderSecurityTable(events) {
      const tbody = document.getElementById('security-table-body');
      if (!events || events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se registran accesos denegados en el periodo actual.</td></tr>';
        return;
      }

      tbody.innerHTML = events.map(e => {
        const time = new Date(e.timestamp).toLocaleTimeString('es-CR', { hour12: false }) + ' · ' + new Date(e.timestamp).toLocaleDateString('es-CR');
        const pillClass = e.statusCode === 401 ? 'status-pill critical' : 'status-pill attention';
        const statusLabel = e.statusCode === 401 ? '401 No autorizado' : '403 Prohibido';
        const methodClass = getMethodTagClass(e.method);
        const userText = e.email
          ? (escapeHtml(e.email) + (e.roles && e.roles.length ? ' (' + escapeHtml(e.roles.join(', ')) + ')' : ''))
          : '<span style="color:var(--sx-gris-etiqueta)">No autenticado</span>';

        return '<tr>' +
          '<td class="timestamp-tag">' + time + '</td>' +
          '<td><span class="ip-tag">' + escapeHtml(e.ip) + '</span></td>' +
          '<td><span class="' + methodClass + '">' + escapeHtml(e.method) + '</span> <code class="code-inline">' + escapeHtml(e.url) + '</code></td>' +
          '<td><span class="' + pillClass + '">' + statusLabel + '</span></td>' +
          '<td>' + escapeHtml(e.reason || '-') + '</td>' +
          '<td>' + userText + '</td>' +
          '<td style="color:var(--sx-gris-apoyo); font-size:12px;">' + escapeHtml(e.userAgent || '-') + '</td>' +
        '</tr>';
      }).join('');
    }

    function renderTrafficTable(traffic) {
      const tbody = document.getElementById('traffic-table-body');
      document.getElementById('tab-traffic-count').innerText = traffic.requests.length;

      const m = traffic.metrics;
      document.getElementById('traffic-metrics-bar').innerHTML =
        'Total acumulado: <strong>' + formatNumber(m.totalRequests) + ' solicitudes</strong> · ' +
        'Latencia media: <strong>' + formatNumber(m.avgResponseTimeMs) + ' ms</strong> · ' +
        'Respuestas 2xx: <strong>' + formatNumber(m.status2xx) + '</strong> · ' +
        '4xx: <strong>' + formatNumber(m.status4xx) + '</strong> · ' +
        '5xx: <strong>' + formatNumber(m.status5xx) + '</strong>';

      if (!traffic.requests || traffic.requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Aún no se han interceptado solicitudes HTTP.</td></tr>';
        return;
      }

      tbody.innerHTML = traffic.requests.map(r => {
        const time = new Date(r.timestamp).toLocaleTimeString('es-CR', { hour12: false });
        let statusClass = 'status-pill positive';
        if (r.statusCode >= 300 && r.statusCode < 400) statusClass = 'status-pill info';
        if (r.statusCode >= 400 && r.statusCode < 500) statusClass = 'status-pill attention';
        if (r.statusCode >= 500) statusClass = 'status-pill critical';
        const methodClass = getMethodTagClass(r.method);

        return '<tr>' +
          '<td class="timestamp-tag">' + time + '</td>' +
          '<td><span class="ip-tag">' + escapeHtml(r.ip) + '</span></td>' +
          '<td><span class="' + methodClass + '">' + escapeHtml(r.method) + '</span></td>' +
          '<td><code class="code-inline">' + escapeHtml(r.url) + '</code></td>' +
          '<td><span class="' + statusClass + '">HTTP ' + r.statusCode + '</span></td>' +
          '<td>' + formatNumber(r.responseTimeMs) + ' ms</td>' +
          '<td>' + (r.userEmail ? escapeHtml(r.userEmail) : '<span style="color:var(--sx-gris-etiqueta)">Anónimo</span>') + '</td>' +
        '</tr>';
      }).join('');
    }

    function filterSecurityTable() {
      const query = document.getElementById('security-search').value.toLowerCase();
      const rows = document.querySelectorAll('#security-table-body tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    }

    function filterTrafficTable() {
      const query = document.getElementById('traffic-search').value.toLowerCase();
      const rows = document.querySelectorAll('#traffic-table-body tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    }

    function copyJson() {
      if (!currentData) return;
      const btn = document.getElementById('btn-copy-json');
      navigator.clipboard.writeText(JSON.stringify(currentData, null, 2)).then(() => {
        const originalText = btn.innerText;
        btn.innerText = 'JSON copiado al portapapeles';
        setTimeout(() => {
          btn.innerText = originalText;
        }, 2000);
      });
    }

    /**
     * Formateo numérico según Sección 7.2: separador decimal de coma y separador de miles de punto.
     */
    function formatNumber(val) {
      const num = Number(val);
      if (Number.isNaN(num)) return String(val ?? '0');
      return num.toLocaleString('es-ES');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Inicializar
    loadSummary();
    startAutoRefresh();
  </script>
</body>
</html>`;
}

function escapeServerHtml(str: string): string {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
