import { MonitoringKitOptions } from '../interfaces/monitoring-options.interface';

/**
 * Vista HTML nativa autocontenida para `/status` (Telemetría de Procesador, Memoria, Heap, Event Loop y RPS).
 * Diseñada bajo los lineamientos del Libro de Marca SoporteXperto v1.0.
 * Cero dependencias externas: dibuja gráficas en vivo sobre Canvas HTML5 consultando `/health/telemetry`.
 */
export function renderRealtimeStatusHtml(options?: MonitoringKitOptions): string {
	const appName = options?.appName ?? 'Monitor de Telemetría en Tiempo Real';
	const appBadge = options?.appBadge ?? 'SYS';

	return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>
    (function () {
      function apply() {
        var m = null;
        try { m = localStorage.getItem('mode-watcher-mode'); } catch (e) { m = null; }
        m = m || 'system';
        var dark = m === 'dark' ||
          (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      }
      apply();
      try {
        window.addEventListener('storage', function (e) {
          if (!e.key || e.key === 'mode-watcher-mode') apply();
        });
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
      } catch (e) { /* navegador sin soporte: queda el valor inicial */ }
      window.addEventListener('message', function (e) {
        if (e.origin === location.origin && e.data && e.data.type === 'sx-theme') apply();
      });
    })();
  </script>
  <title>${escapeServerHtml(appName)} · Telemetría — SoporteXperto</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --sx-azul-profundo: #0D1E3D;
      --sx-azul-noche:    #0B1A35;
      --sx-azul-pizarra:  #1C394F;
      --sx-azul-acento:   #1A73C2;
      --sx-azul-claro:    #EAF3FC;
      --sx-verde:         #22A06B;
      --sx-verde-claro:   #E9F6F0;
      --sx-blanco:        #FFFFFF;
      --sx-nieve:         #FBFDFF;
      --sx-bruma:         #F3F7FC;
      --sx-borde:         #E7EEF6;
      --sx-borde-int:     #E9EFF6;
      --sx-gris-azul:     #D8E2EE;
      --sx-gris-etiqueta: #93A2B5;
      --sx-gris-apoyo:    #7C8DA3;
      --sx-gris-cuerpo:   #56687E;
      --sx-shadow:        0 14px 32px rgba(13, 30, 61, 0.06);

      /* Tokens de ROL: --sx-blanco y --sx-azul-profundo se usaban a la vez como
         fondo y como texto, y así no se pueden invertir en modo oscuro.
         En claro valen lo mismo que el color que sustituyen. */
      --sx-superficie:        #FFFFFF;
      --sx-texto-on-dark:     #FFFFFF;
      --sx-texto-fuerte:      #0D1E3D;
      --sx-superficie-inversa:#0D1E3D;

      /* Relleno bajo las sparklines. Los traza el canvas, que no entiende de
         CSS: el JS lee estas variables con getComputedStyle. */
      --sx-chart-fill-acento:  rgba(26, 115, 194, 0.12);
      --sx-chart-fill-fuerte:  rgba(13, 30, 61, 0.10);
      --sx-chart-fill-verde:   rgba(34, 160, 107, 0.12);
      --sx-chart-fill-pizarra: rgba(28, 57, 79, 0.10);
      --font-display:     'Sora', 'Segoe UI Semibold', sans-serif;
      --font-body:        'Manrope', 'Segoe UI', sans-serif;
      --font-mono:        Consolas, 'SF Mono', ui-monospace, monospace;
    }

    /* Modo oscuro. Alineado con la landing y con el dashboard que embebe esta
       vista. El tema lo fija el script del <head> leyendo el mismo
       localStorage que usa mode-watcher en la app. */
    :root[data-theme='dark'] {
      --sx-superficie:        #12294A;
      --sx-nieve:             #0B1A35;
      --sx-bruma:             rgba(255, 255, 255, 0.08);
      --sx-borde:             rgba(255, 255, 255, 0.10);
      --sx-borde-int:         rgba(255, 255, 255, 0.08);
      --sx-gris-azul:         rgba(255, 255, 255, 0.18);

      --sx-texto-fuerte:      #FFFFFF;
      --sx-texto-on-dark:     #FFFFFF;
      --sx-azul-pizarra:      #E3ECF7;
      --sx-gris-cuerpo:       rgba(255, 255, 255, 0.72);
      --sx-gris-apoyo:        rgba(255, 255, 255, 0.55);
      --sx-gris-etiqueta:     rgba(255, 255, 255, 0.55);

      /* Más claro que la superficie, para que los badges se despeguen. */
      --sx-superficie-inversa:#2A4A78;

      --sx-azul-acento:       #5DAAE8;
      --sx-azul-claro:        rgba(26, 115, 194, 0.22);
      --sx-verde:             #4CC38A;
      --sx-verde-claro:       rgba(34, 160, 107, 0.16);
      --sx-shadow:            0 14px 32px rgba(0, 0, 0, 0.35);

      --sx-chart-fill-acento:  rgba(93, 170, 232, 0.18);
      --sx-chart-fill-fuerte:  rgba(255, 255, 255, 0.12);
      --sx-chart-fill-verde:   rgba(76, 195, 138, 0.18);
      --sx-chart-fill-pizarra: rgba(227, 236, 247, 0.12);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-body);
      background: var(--sx-nieve);
      color: var(--sx-gris-cuerpo);
      padding: 20px 24px 32px;
      -webkit-font-smoothing: antialiased;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 18px;
      margin-bottom: 22px;
      border-bottom: 1px solid var(--sx-borde);
    }

    .title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .badge-sigla {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: var(--sx-superficie-inversa);
      color: var(--sx-texto-on-dark);
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .title-text h1 {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      color: var(--sx-texto-fuerte);
      letter-spacing: -0.4px;
    }

    .title-text p {
      font-size: 12px;
      color: var(--sx-gris-apoyo);
      font-family: var(--font-mono);
    }

    .span-selector {
      display: inline-flex;
      background: var(--sx-bruma);
      border: 1px solid var(--sx-borde);
      border-radius: 999px;
      padding: 3px;
      gap: 4px;
    }

    .span-btn {
      border: none;
      background: transparent;
      color: var(--sx-gris-cuerpo);
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .span-btn.active {
      background: var(--sx-superficie-inversa);
      color: var(--sx-texto-on-dark);
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .chart-card {
      background: var(--sx-superficie);
      border: 1px solid var(--sx-borde);
      border-radius: 16px;
      padding: 18px;
      box-shadow: var(--sx-shadow);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .chart-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .chart-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.3px;
      color: var(--sx-gris-etiqueta);
    }

    .chart-value {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 600;
      color: var(--sx-texto-fuerte);
      letter-spacing: -0.9px;
      line-height: 1.1;
      margin-top: 4px;
    }

    .chart-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--sx-azul-claro);
      color: var(--sx-azul-acento);
      white-space: nowrap;
    }

    .chart-pill.ok {
      background: var(--sx-verde-claro);
      color: var(--sx-verde);
    }

    .canvas-wrap {
      width: 100%;
      height: 120px;
      position: relative;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .chart-foot {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: var(--sx-gris-apoyo);
      border-top: 1px solid var(--sx-borde-int);
      padding-top: 8px;
    }

    @media (max-width: 1024px) {
      .charts-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .charts-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="header-bar">
    <div class="title-group">
      <span class="badge-sigla">${escapeServerHtml(appBadge.slice(0, 3).toUpperCase())}</span>
      <div class="title-text">
        <h1>${escapeServerHtml(appName)}</h1>
        <p id="host-meta">Sincronizando telemetría del servidor...</p>
      </div>
    </div>

    <div class="span-selector" role="group" aria-label="Ventana de tiempo">
      <button type="button" class="span-btn active" onclick="setSpan('1m', this)">1 min (1s)</button>
      <button type="button" class="span-btn" onclick="setSpan('5m', this)">5 min (5s)</button>
      <button type="button" class="span-btn" onclick="setSpan('15m', this)">15 min (15s)</button>
    </div>
  </header>

  <main class="charts-grid">
    <article class="chart-card">
      <div class="chart-top">
        <div>
          <div class="chart-label">Uso de Procesador (CPU)</div>
          <div class="chart-value" id="val-cpu">0,0 %</div>
        </div>
        <span class="chart-pill" id="pill-cores">CPU</span>
      </div>
      <div class="canvas-wrap"><canvas id="chart-cpu"></canvas></div>
      <div class="chart-foot"><span id="foot-cpu-min">Mín: 0 %</span><span id="foot-cpu-max">Máx: 0 %</span></div>
    </article>

    <article class="chart-card">
      <div class="chart-top">
        <div>
          <div class="chart-label">Memoria RAM (RSS)</div>
          <div class="chart-value" id="val-mem">0 MB</div>
        </div>
        <span class="chart-pill" id="pill-total-mem">RAM</span>
      </div>
      <div class="canvas-wrap"><canvas id="chart-mem"></canvas></div>
      <div class="chart-foot"><span id="foot-mem-min">Mín: 0 MB</span><span id="foot-mem-max">Máx: 0 MB</span></div>
    </article>

    <article class="chart-card">
      <div class="chart-top">
        <div>
          <div class="chart-label">Memoria Heap V8</div>
          <div class="chart-value" id="val-heap">0 MB</div>
        </div>
        <span class="chart-pill ok">Node.js V8</span>
      </div>
      <div class="canvas-wrap"><canvas id="chart-heap"></canvas></div>
      <div class="chart-foot"><span id="foot-heap-min">Mín: 0 MB</span><span id="foot-heap-max">Máx: 0 MB</span></div>
    </article>

    <article class="chart-card">
      <div class="chart-top">
        <div>
          <div class="chart-label">Event Loop Lag</div>
          <div class="chart-value" id="val-lag">0 ms</div>
        </div>
        <span class="chart-pill ok">Asíncrono</span>
      </div>
      <div class="canvas-wrap"><canvas id="chart-lag"></canvas></div>
      <div class="chart-foot"><span id="foot-lag-min">Mín: 0 ms</span><span id="foot-lag-max">Máx: 0 ms</span></div>
    </article>

    <article class="chart-card">
      <div class="chart-top">
        <div>
          <div class="chart-label">Peticiones / Seg (RPS)</div>
          <div class="chart-value" id="val-rps">0 req/s</div>
        </div>
        <span class="chart-pill">Throughput</span>
      </div>
      <div class="canvas-wrap"><canvas id="chart-rps"></canvas></div>
      <div class="chart-foot"><span id="foot-rps-min">Mín: 0</span><span id="foot-rps-max">Pico: 0 req/s</span></div>
    </article>

    <article class="chart-card">
      <div class="chart-top">
        <div>
          <div class="chart-label">Tiempo de Respuesta</div>
          <div class="chart-value" id="val-rt">0 ms</div>
        </div>
        <span class="chart-pill">Latencia</span>
      </div>
      <div class="canvas-wrap"><canvas id="chart-rt"></canvas></div>
      <div class="chart-foot"><span id="foot-rt-min">Mín: 0 ms</span><span id="foot-rt-max">Máx: 0 ms</span></div>
    </article>
  </main>

  <script>
    let currentSpan = '1m';
    let latestPayload = null;

    function setSpan(span, btn) {
      currentSpan = span;
      document.querySelectorAll('.span-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      if (latestPayload) renderAll(latestPayload);
    }

    function fmt(n) {
      return Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 });
    }

    // El canvas no entiende de CSS: los colores del tema se leen de las
    // variables del documento. Como drawSparkline se reejecuta en cada poll,
    // al cambiar de tema las gráficas se repintan solas.
    function cssVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function drawSparkline(canvasId, values, colorHex, fillHex) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // Líneas guía sutiles
      ctx.strokeStyle = cssVar('--sx-borde-int');
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const y = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (!values || values.length === 0) return;
      const pts = values.length === 1 ? [values[0], values[0]] : values;
      const maxVal = Math.max(...pts, 1);
      const minVal = 0;
      const padTop = 10;
      const padBottom = 8;
      const usableH = h - padTop - padBottom;

      const coords = pts.map((v, idx) => {
        const x = (idx / (pts.length - 1)) * w;
        const norm = (v - minVal) / (maxVal - minVal || 1);
        const y = padTop + usableH * (1 - Math.min(1, Math.max(0, norm)));
        return { x, y };
      });

      // Área rellena
      ctx.beginPath();
      ctx.moveTo(coords[0].x, h);
      coords.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(coords[coords.length - 1].x, h);
      ctx.closePath();
      ctx.fillStyle = fillHex;
      ctx.fill();

      // Línea principal
      ctx.beginPath();
      coords.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    function updateMetricCard(key, values, currentVal, unit) {
      document.getElementById('val-' + key).innerText = fmt(currentVal) + ' ' + unit;
      const minV = values.length ? Math.min(...values) : 0;
      const maxV = values.length ? Math.max(...values) : 0;
      document.getElementById('foot-' + key + '-min').innerText = 'Mín: ' + fmt(minV) + ' ' + unit;
      document.getElementById('foot-' + key + '-max').innerText = 'Máx: ' + fmt(maxV) + ' ' + unit;
    }

    function renderAll(data) {
      document.getElementById('host-meta').innerText =
        data.hostname + ' · ' + data.platform + ' · Activo ' + Math.floor(data.uptimeSeconds / 60) + 'm ' + (data.uptimeSeconds % 60) + 's';
      document.getElementById('pill-cores').innerText = data.cpuCores + ' núcleos';
      document.getElementById('pill-total-mem').innerText = 'Total ' + fmt(data.totalMemoryMb) + ' MB';

      const series = (data.spans && data.spans[currentSpan]) || [];
      const cur = data.current || {};

      const cpuArr = series.map(p => p.cpuPercent);
      const memArr = series.map(p => p.memoryRssMb);
      const heapArr = series.map(p => p.memoryHeapMb);
      const lagArr = series.map(p => p.eventLoopLagMs);
      const rpsArr = series.map(p => p.rps);
      const rtArr = series.map(p => p.avgResponseTimeMs);

      updateMetricCard('cpu', cpuArr, cur.cpuPercent, '%');
      updateMetricCard('mem', memArr, cur.memoryRssMb, 'MB');
      updateMetricCard('heap', heapArr, cur.memoryHeapMb, 'MB');
      updateMetricCard('lag', lagArr, cur.eventLoopLagMs, 'ms');
      updateMetricCard('rps', rpsArr, cur.rps, 'req/s');
      updateMetricCard('rt', rtArr, cur.avgResponseTimeMs, 'ms');

      drawSparkline('chart-cpu', cpuArr, cssVar('--sx-azul-acento'), cssVar('--sx-chart-fill-acento'));
      drawSparkline('chart-mem', memArr, cssVar('--sx-texto-fuerte'), cssVar('--sx-chart-fill-fuerte'));
      drawSparkline('chart-heap', heapArr, cssVar('--sx-verde'), cssVar('--sx-chart-fill-verde'));
      drawSparkline('chart-lag', lagArr, cssVar('--sx-azul-pizarra'), cssVar('--sx-chart-fill-pizarra'));
      drawSparkline('chart-rps', rpsArr, cssVar('--sx-azul-acento'), cssVar('--sx-chart-fill-acento'));
      drawSparkline('chart-rt', rtArr, cssVar('--sx-texto-fuerte'), cssVar('--sx-chart-fill-fuerte'));
    }

    async function pollTelemetry() {
      try {
        const res = await fetch('/health/telemetry');
        if (!res.ok) return;
        const data = await res.json();
        latestPayload = data;
        renderAll(data);
      } catch (e) {
        // Silenciar errores transitorios de red
      }
    }

    window.addEventListener('resize', () => {
      if (latestPayload) renderAll(latestPayload);
    });

    pollTelemetry();
    setInterval(pollTelemetry, 1500);
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
