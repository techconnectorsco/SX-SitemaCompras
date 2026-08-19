<script lang="ts">
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import Footer from '$lib/components/app/nav/footer.svelte';
	import { onMount } from 'svelte';
	import type { CasoExito } from '$lib/services/casos-exito.service';

	let { data } = $props();

	let currentCaseIndex = $state(0);
	let visible = $state(false);

	// Mapeo de tipo/industria → icono emoji (sin necesitar columna extra en BD)
const iconMap: Record<string, string> = {
	'rpa':          '🤖',
	'software':     '💻',
	'powerbi':      '📊',
	'integracion':  '🔗',
	'analytics':    '📈',
	'finanzas':     '💰',
	'contabilidad': '🧾',
	'operaciones':  '⚙️',
	'web':          '🌐',
};

function getIcon(caso: CasoExito): string {
	// Primero busca en metricas_publicas si el admin lo definió
	if (caso.metricas_publicas?.icon) return caso.metricas_publicas.icon;
	// Sino mapea por tipo o industria
	const key = (caso.tipo_automatizacion ?? caso.industria ?? '').toLowerCase();
	return iconMap[key] ?? '⚡';
}

// casosExito viene de data ahora
let casosExito = $derived(data.casosExito ?? []);

const logoHeightMap: Record<string, string> = {
    'samesa':          'h-12',
    'vedova-y-obando': 'h-14',
    'ae-logistics':    'h-18',
    'sito-cr':         'h-7',
    'soportexperto':   'h-10',
	'techconnectors':	'h-16',
};

function getLogoHeight(slug: string | undefined): string {
    return logoHeightMap[slug ?? ''] ?? 'h-10';
}

	const servicios = [
		{
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
			titulo: 'RPA Avanzado',
			desc: 'Bots que automatizan tareas repetitivas en sistemas Windows, web y legacy con precisión milimétrica.'
		},
		{
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>`,
			titulo: 'Nube y Contenedores',
			desc: 'Ecosistemas escalables con Docker y microservicios para procesar datos sin interrupciones.'
		},
		{
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
			titulo: 'Seguridad y Auditoría',
			desc: 'Cumplimiento riguroso de estándares de seguridad y trazabilidad en cada proceso automatizado.'
		},
		{
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
			titulo: 'Analytics en Tiempo Real',
			desc: 'Dashboards que convierten datos crudos en decisiones estratégicas al instante.'
		},
		{
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
			titulo: 'Integración de APIs',
			desc: 'Conectamos sistemas legados con plataformas modernas vía APIs, webhooks y middleware.'
		},
		{
			icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
			titulo: 'Soporte 24/7',
			desc: 'Monitoreo continuo y respuesta inmediata para que tus procesos nunca se detengan.'
		}
	];

	const pasos = [
		{ n: '01', t: 'Diagnóstico',    d: 'Analizamos tus procesos e identificamos los de mayor impacto para automatizar primero.' },
		{ n: '02', t: 'Diseño',         d: 'Creamos el flujo y definimos las reglas de negocio con tu equipo.' },
		{ n: '03', t: 'Implementación', d: 'Desarrollamos, probamos y desplegamos el robot integrado a tus sistemas.' },
		{ n: '04', t: 'Monitoreo 24/7', d: 'Supervisamos con alertas en tiempo real y optimizamos continuamente.' }
	];

	const nextCase = () => (currentCaseIndex = (currentCaseIndex + 1) % casosExito.length);

	onMount(() => {
		setTimeout(() => (visible = true), 80);
		const interval = setInterval(nextCase, 7000);
		return () => clearInterval(interval);
	});
</script>

<div class="flex min-h-screen flex-col">
	<MainNav session={data.session} user={data.user} />

	<main class="flex-1 pt-[72px]">

		<!-- ================================================
		     HERO
		     ================================================ -->
		<section class="relative min-h-[88vh] flex items-center px-4 sm:px-6 py-16 sm:py-20 overflow-hidden">

			<div class="hero-grid absolute inset-0 pointer-events-none"></div>

			<!-- Blobs decorativos -->
			<div class="blob-blue absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none"></div>
			<div class="blob-slate absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full blur-[100px] pointer-events-none"></div>

			<div
				class="relative z-10 w-full max-w-2xl transition-all duration-700 ease-out"
				class:opacity-100={visible} class:translate-y-0={visible}
				class:opacity-0={!visible}  class:translate-y-5={!visible}
			>
				<!-- Pill SX -->
				<a
					href="https://soportexperto.com"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 mb-6 sm:mb-8 rounded-full no-underline
					       border border-blue-300/60 dark:border-blue-500/30
					       bg-blue-500/10
					       hover:bg-blue-500/20
					       transition-colors duration-200"
				>
					<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
					<span class="text-xs text-muted-foreground hidden xs:inline">Una iniciativa de</span>
					<span class="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">SoporteXperto</span>
					<svg class="w-3 h-3 text-blue-500 opacity-80 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8">
						<path stroke-linecap="round" stroke-linejoin="round" d="M2.5 9.5l7-7M3.5 2.5h6v6"/>
					</svg>
				</a>

				<h1 class="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.07] tracking-tight mb-4 sm:mb-5 text-foreground">
					Automatización<br />
					<em class="not-italic text-blue-600 dark:text-blue-400">que genera valor</em>
				</h1>

				<div class="mb-7 sm:mb-9 pl-4 border-l-2 border-blue-500">
					<p class="text-sm sm:text-base leading-relaxed text-muted-foreground">
						Somos la
						<strong class="font-semibold text-foreground">Oficina de Transformación Digital</strong>
						de SoporteXperto — el equipo especializado en automatizar procesos empresariales para que tu organización
						opere más rápido, con menos errores y mayor rentabilidad.
					</p>
				</div>

				<!-- Botones -->
				<div class="flex flex-wrap gap-3 mb-8 sm:mb-12">
					<a href="/general"
					   class="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl no-underline font-semibold text-sm
					          bg-blue-600 hover:bg-blue-500 text-white
					          shadow-md shadow-blue-600/20
					          transition-all duration-200 hover:-translate-y-0.5">
						Comienza Ahora
						<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
					</a>
					<a href="#casos"
					   class="inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl no-underline font-semibold text-sm
					          border border-border text-foreground
					          hover:bg-muted
					          transition-colors duration-200">
						Ver Casos de Éxito
					</a>
				</div>

				<!-- Stats bar: grid 2x2 en mobile, fila en sm+ -->
				<div class="grid grid-cols-2 sm:grid-cols-4 rounded-xl overflow-hidden border border-border bg-card shadow-sm w-full sm:w-auto sm:inline-grid">
					{#each [
						{ v: '24+',   l: 'Procesos activos' },
						{ v: '15+',   l: 'Clientes en CR'   },
						{ v: '12k+',  l: 'Horas ahorradas'  },
						{ v: '99.8%', l: 'Tasa de éxito'    }
					] as s, i}
						<div class="flex flex-col px-4 sm:px-5 py-3 sm:py-3.5 gap-1
							{i % 2 === 0 ? 'border-r border-border' : ''}
							{i < 2 ? 'border-b sm:border-b-0 border-border' : ''}
							sm:not-last:border-r">
							<span class="text-lg sm:text-xl font-extrabold leading-none text-blue-600 dark:text-blue-400">{s.v}</span>
							<span class="text-[9px] sm:text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{s.l}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Terminal (siempre dark — bloque de código) -->
			<!-- ================================================
     TERMINAL HERO — reemplaza el bloque anterior
     ================================================ -->
<div class="absolute right-[4%] top-1/2 -translate-y-1/2 hidden xl:block z-10" style="width:420px">

	<!-- Glow ambiental detrás -->
	<div class="absolute inset-0 -z-10 pointer-events-none"
	     style="
	       background: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(59,130,246,0.18) 0%, transparent 70%);
	       transform: scale(1.3) translateY(4%);
	       filter: blur(24px);
	     ">
	</div>

	<!-- Tarjeta flotante: stats rápidas (arriba izquierda, sobresale) -->
	<div class="absolute -top-5 -left-12 z-20 px-4 py-3 rounded-2xl shadow-xl
	            border border-white/10
	            font-sans"
	     style="
	       background: rgba(15, 23, 42, 0.85);
	       backdrop-filter: blur(16px);
	       -webkit-backdrop-filter: blur(16px);
	       animation: floatA 5s ease-in-out infinite;
	     ">
		<p class="text-[9px] font-semibold uppercase tracking-widest mb-2" style="color:rgba(148,163,184,.6)">Hoy en producción</p>
		<div class="flex items-end gap-3">
			<div>
				<p class="text-2xl font-extrabold leading-none" style="color:#60a5fa">2,847</p>
				<p class="text-[9px] mt-0.5 font-medium" style="color:rgba(148,163,184,.7)">docs procesados</p>
			</div>
			<div class="pb-0.5">
				<!-- Mini sparkline SVG -->
				<svg width="54" height="24" viewBox="0 0 54 24" fill="none">
					<polyline
						points="0,22 9,16 18,18 27,10 36,12 45,5 54,2"
						stroke="#34d399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"
					/>
					<circle cx="54" cy="2" r="2.5" fill="#34d399"/>
				</svg>
			</div>
		</div>
	</div>

	<!-- Tarjeta flotante: alerta positiva (abajo derecha, sobresale) -->
	<div class="absolute -bottom-5 -right-8 z-20 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl
	            border border-white/10 font-sans"
	     style="
	       background: rgba(15, 23, 42, 0.85);
	       backdrop-filter: blur(16px);
	       -webkit-backdrop-filter: blur(16px);
	       animation: floatB 6s ease-in-out infinite;
	     ">
		<div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
		     style="background:rgba(52,211,153,.15)">
			<svg width="13" height="13" viewBox="0 0 20 20" fill="#34d399">
				<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
			</svg>
		</div>
		<div>
			<p class="text-[11px] font-semibold leading-tight" style="color:#f1f5f9">0 errores detectados</p>
			<p class="text-[9px]" style="color:rgba(148,163,184,.6)">Último ciclo · hace 3s</p>
		</div>
	</div>

	<!-- Terminal principal -->
	<div class="rounded-2xl overflow-hidden font-mono text-xs shadow-2xl ring-1"
	     style="
	       background: #0d1117;
	       box-shadow: 0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06);
	     ">

		<!-- Barra de título -->
		<div class="flex items-center justify-between px-4 py-3 border-b"
		     style="background:#161b22; border-color:rgba(255,255,255,.06)">
			<div class="flex items-center gap-1.5">
				<span class="w-3 h-3 rounded-full transition-opacity duration-150 hover:opacity-80 cursor-default"
				      style="background:#ff5f56"></span>
				<span class="w-3 h-3 rounded-full transition-opacity duration-150 hover:opacity-80 cursor-default"
				      style="background:#ffbd2e"></span>
				<span class="w-3 h-3 rounded-full transition-opacity duration-150 hover:opacity-80 cursor-default"
				      style="background:#27c93f"></span>
			</div>
			<div class="flex items-center gap-1.5 px-3 py-1 rounded-md"
			     style="background:rgba(255,255,255,.04)">
				<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2">
					<path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>
				</svg>
				<span style="color:rgba(255,255,255,.35); font-size:10px">sx-automation.py</span>
			</div>
			<div class="flex gap-1">
				{#each [1,2,3] as _}
					<span class="w-5 h-5 rounded flex items-center justify-center cursor-default hover:bg-white/5 transition-colors">
						<span class="w-2.5 h-px block" style="background:rgba(255,255,255,.2)"></span>
					</span>
				{/each}
			</div>
		</div>

		<!-- Pestañas tipo editor -->
		<div class="flex border-b" style="background:#161b22; border-color:rgba(255,255,255,.04)">
			<div class="flex items-center gap-1.5 px-4 py-2 border-r border-b-2"
			     style="border-right-color:rgba(255,255,255,.05); border-bottom-color:#3b82f6">
				<span style="color:#60a5fa; font-size:10px">●</span>
				<span style="color:#e2e8f0; font-size:10px">sx-automation.py</span>
			</div>
			<div class="flex items-center gap-1.5 px-4 py-2 border-r border-b-2 border-b-transparent"
			     style="border-right-color:rgba(255,255,255,.05)">
				<span style="color:rgba(255,255,255,.2); font-size:10px">○</span>
				<span style="color:rgba(255,255,255,.3); font-size:10px">config.yaml</span>
			</div>
		</div>

		<!-- Código -->
		<div class="px-5 py-5 leading-[1.9] text-[12.5px]">
			<p>
				<span class="code-ln">01</span>
				<span style="color:#79c0ff">import</span>
				<span style="color:#c9d1d9"> sx_rpa</span>
			</p>
			<p>
				<span class="code-ln">02</span>
				<span style="color:#79c0ff">from</span>
				<span style="color:#c9d1d9"> sx_rpa.notificaciones </span>
				<span style="color:#79c0ff">import</span>
				<span style="color:#c9d1d9"> Teams</span>
			</p>
			<p><span class="code-ln">03</span></p>
			<p>
				<span class="code-ln">04</span>
				<span style="color:#d2a8ff">bot</span>
				<span style="color:#c9d1d9"> = sx_rpa.</span>
				<span style="color:#e3b341">Robot</span>
				<span style="color:#c9d1d9">(</span>
				<span style="color:#56d364">"facturacion"</span>
				<span style="color:#c9d1d9">)</span>
			</p>
			<p>
				<span class="code-ln">05</span>
				<span style="color:#c9d1d9">bot.</span>
				<span style="color:#e3b341">configurar</span>
				<span style="color:#c9d1d9">(retries=</span>
				<span style="color:#f0883e">3</span>
				<span style="color:#c9d1d9">, timeout=</span>
				<span style="color:#f0883e">30</span>
				<span style="color:#c9d1d9">)</span>
			</p>
			<p><span class="code-ln">06</span></p>
			<p>
				<span class="code-ln">07</span>
				<span style="color:#79c0ff">for</span>
				<span style="color:#c9d1d9"> doc </span>
				<span style="color:#79c0ff">in</span>
				<span style="color:#c9d1d9"> bot.</span>
				<span style="color:#e3b341">pendientes</span>
				<span style="color:#c9d1d9">():</span>
			</p>
			<p>
				<span class="code-ln">08</span>
				<span style="color:#c9d1d9">    bot.</span>
				<span style="color:#e3b341">procesar</span>
				<span style="color:#c9d1d9">(doc)</span>
			</p>
			<p>
				<span class="code-ln">09</span>
				<span style="color:#c9d1d9">    Teams.</span>
				<span style="color:#e3b341">notificar</span>
				<span style="color:#c9d1d9">(doc.cliente, doc.monto)</span>
			</p>
			<p><span class="code-ln">10</span></p>
			<p>
				<span class="code-ln">11</span>
				<span style="color:#8b949e"># ✅  2,847 documentos procesados hoy</span>
			</p>
			<!-- Cursor parpadeante en la línea siguiente -->
			<p>
				<span class="code-ln">12</span>
				<span class="terminal-cursor"></span>
			</p>
		</div>

		<!-- Barra de estado — separada en 3 zonas como VS Code -->
		<div class="flex items-center justify-between px-4 py-0 text-[10px]"
		     style="background:#1f6feb; min-height:22px">
			<div class="flex items-center gap-3 h-full" style="color:rgba(255,255,255,.85)">
				<span class="flex items-center gap-1">
					<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
					main
				</span>
				<span>Python 3.11</span>
			</div>
			<div class="flex items-center gap-1.5" style="color:rgba(255,255,255,.75)">
				<span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background:#4ade80"></span>
				<span>Corriendo · 0 errores</span>
			</div>
			<div style="color:rgba(255,255,255,.65)">Ln 12, Col 1</div>
		</div>
	</div>
</div>
		</section>

		<!-- ================================================
		     TRUST BAR
		     ================================================ -->
		<div class="border-y border-border bg-muted px-6 py-5 text-center">
    <p class="text-[10px] uppercase tracking-[0.15em] font-semibold mb-3 text-muted-foreground">
        Integramos con tus herramientas actuales
    </p>
    <div class="flex flex-wrap justify-center gap-2">
        {#each [
            { name: 'Microsoft 365',    logo: '/microsoft.png' },
            { name: 'Dynamics 365',     logo: '/dynamics.png'  },
            { name: 'Power Automate',   logo: '/PA.png'        },
            { name: 'Azure',            logo: '/azure.png'     },
            { name: 'SAP',              logo: '/SAP.png'       },
            { name: 'Google Workspace', logo: '/google.png'    }
        ] as tool}
            <span class="inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-xs font-medium border border-border bg-card text-foreground">
                <img src={tool.logo} alt={tool.name} class="w-6 h-6 object-contain" />
                {tool.name}
            </span>
        {/each}
    </div>
</div>

		<!-- ================================================
		     SERVICIOS
		     ================================================ -->
		<section class="py-24 px-6">
			<div class="max-w-6xl mx-auto">

				<div class="text-center mb-14">
					<p class="text-xs font-bold uppercase tracking-[0.14em] mb-3 text-blue-600 dark:text-blue-400">
						Lo que ofrecemos
					</p>
					<h2 class="font-serif text-4xl font-bold tracking-tight mb-3 text-foreground">
						Una suite completa<br />de automatización
					</h2>
					<p class="max-w-lg mx-auto leading-relaxed text-sm text-muted-foreground">
						Desde robots RPA hasta pipelines en la nube, cubrimos todo el espectro de la automatización empresarial.
					</p>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden shadow-sm
				            bg-border border border-border">
					{#each servicios as s, i}
						<div
							class="group relative p-8 cursor-default transition-colors duration-200 bg-card hover:bg-muted"
							style="animation: fadeUp 0.4s ease {i * 55}ms both"
						>
							<div class="w-11 h-11 flex items-center justify-center rounded-lg mb-5 transition-all duration-200
							            border border-border bg-muted text-muted-foreground
							            group-hover:bg-blue-500/10 group-hover:border-blue-500/30
							            group-hover:text-blue-500">
								{@html s.icon}
							</div>
							<h3 class="text-sm font-bold mb-2 text-foreground">{s.titulo}</h3>
							<p class="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
							<span class="absolute bottom-5 right-5 font-semibold text-blue-500
							             opacity-0 -translate-x-1
							             group-hover:opacity-100 group-hover:translate-x-0
							             transition-all duration-200">→</span>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- ================================================
		     PROCESO
		     ================================================ -->
		<section class="py-24 px-6 bg-muted border-y border-border">
			<div class="max-w-6xl mx-auto">

				<div class="text-center mb-14">
					<p class="text-xs font-bold uppercase tracking-[0.14em] mb-3 text-blue-600 dark:text-blue-400">
						¿Cómo funciona?
					</p>
					<h2 class="font-serif text-4xl font-bold tracking-tight text-foreground">
						De cero a automatizado<br />en semanas, no meses
					</h2>
				</div>

				<div class="flex flex-wrap justify-center items-start gap-y-10">
					{#each pasos as step, i}
						<div class="flex items-start">
							<div class="text-center w-44 px-3">
								<div class="inline-flex items-center justify-center w-11 h-11 rounded-full mb-4
								            border-2 border-blue-500/40 bg-blue-500/10
								            text-blue-600 dark:text-blue-400 text-xs font-extrabold tracking-wider">
									{step.n}
								</div>
								<h3 class="text-sm font-bold mb-2 text-foreground">{step.t}</h3>
								<p class="text-xs leading-relaxed text-muted-foreground">{step.d}</p>
							</div>
							{#if i < 3}
								<div class="hidden md:block w-10 h-px mt-[22px] flex-shrink-0 bg-border"></div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</section>

<!-- ================================================
     CASOS DE ÉXITO
     ================================================ -->
<section id="casos" class="py-24 px-6">
	<div class="max-w-6xl mx-auto">

		<div class="text-center mb-14">
			<p class="text-xs font-bold uppercase tracking-[0.14em] mb-3 text-blue-600 dark:text-blue-400">
				Resultados reales
			</p>
			<h2 class="font-serif text-4xl font-bold tracking-tight text-foreground">
				Casos de Éxito
			</h2>
		</div>

		{#if casosExito.length === 0}
			<div class="text-center py-20 rounded-2xl border border-border bg-muted">
				<p class="text-4xl mb-4">🚀</p>
				<p class="text-sm font-semibold text-foreground mb-1">Próximamente</p>
				<p class="text-xs text-muted-foreground">Estamos preparando nuestros casos de éxito.</p>
			</div>
		{:else}
			<div class="flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-sm border border-border">

				<!-- Tabs -->
				<div class="md:w-72 flex-shrink-0 divide-y divide-border bg-muted">
					{#each casosExito as caso, i}
						<button
							onclick={() => (currentCaseIndex = i)}
							class="w-full flex items-start gap-3 px-5 py-5 text-left transition-colors duration-200
							       border-l-2
							       {i === currentCaseIndex
							         ? 'border-blue-500 bg-card'
							         : 'border-transparent hover:bg-card'}"
						>
							<span class="text-xl flex-shrink-0 mt-0.5">{getIcon(caso)}</span>
							<div>
								<p class="text-[10px] font-bold uppercase tracking-widest mb-1 text-blue-600 dark:text-blue-400">
									{caso.industria ?? caso.tipo_automatizacion ?? 'Caso'}
								</p>
								<p class="text-xs font-semibold leading-snug
								          {i === currentCaseIndex ? 'text-foreground' : 'text-muted-foreground'}">
									{caso.titulo}
								</p>
							</div>
						</button>
					{/each}
				</div>

				<!-- Panel del caso -->
				<div class="flex-1 bg-card">
					{#each casosExito as caso, i}
						{#if i === currentCaseIndex}
							<div class="caso-animate h-full">

								{#if caso.imagen_url}
									<div class="w-full h-48 overflow-hidden">
										<img src={caso.imagen_url} alt={caso.titulo} class="w-full h-full object-cover" />
									</div>
								{/if}

								<div class="p-8 md:p-12">

									<!-- Fila superior: badge izquierda, cliente derecha -->
									<div class="flex items-center justify-between mb-4">
										<span class="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
										            border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
											{caso.industria ?? caso.tipo_automatizacion ?? 'Automatización'}
										</span>

										{#if caso.mostrar_cliente && caso.clientes}
    <div class="flex items-center gap-2.5">
        {#if caso.clientes.logo_url}
            <img
                src={caso.clientes.logo_url}
                alt={caso.clientes.nombre}
                class="w-auto object-contain {getLogoHeight(caso.clientes.slug)}"
            />
        {/if}
    </div>
{/if}
									</div>

									<h3 class="font-serif text-2xl md:text-3xl font-bold tracking-tight mb-3 text-foreground">
										{caso.titulo}
									</h3>

									<p class="text-sm leading-relaxed mb-8 text-muted-foreground">
										{caso.descripcion}
									</p>

									{#if caso.metricas_publicas?.stats?.length}
										<div class="flex flex-wrap gap-4 mb-8">
											{#each caso.metricas_publicas.stats as stat}
												<div class="flex-1 min-w-[90px] px-5 py-4 rounded-xl border border-border bg-muted">
													<p class="text-2xl font-extrabold leading-none mb-1 text-blue-600 dark:text-blue-400">
														{stat.valor}
													</p>
													<p class="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
														{stat.label}
													</p>
												</div>
											{/each}
										</div>
									{/if}

									<a href="/auth?mode=register"
									   class="text-sm font-semibold no-underline transition-colors
									          text-blue-600 dark:text-blue-400 hover:text-blue-500">
										Hablar con un experto →
									</a>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Dots mobile -->
			<div class="flex justify-center gap-2 mt-5 md:hidden">
				{#each casosExito as _, i}
					<button
						onclick={() => (currentCaseIndex = i)}
						aria-label="Caso {i + 1}"
						class="h-1.5 rounded-full transition-all duration-200
						       {i === currentCaseIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-border'}">
					</button>
				{/each}
			</div>
		{/if}

	</div>
</section>

		<!-- ================================================
		     CTA FINAL — fondo oscuro fijo en ambos modos
		     (es un bloque de contraste intencional, como el terminal)
		     ================================================ -->
		<section class="relative py-28 px-6 overflow-hidden text-center"
		         style="background: linear-gradient(135deg, #0a1628 0%, #0f2140 50%, #0a1628 100%);">

			<div class="cta-grid absolute inset-0 opacity-10 pointer-events-none"></div>
			<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] rounded-full blur-[120px] pointer-events-none"
			     style="background: rgba(59,130,246,0.15)"></div>

			<div class="relative z-10 max-w-2xl mx-auto">

				<p class="inline-block px-4 py-1.5 rounded-full mb-6 text-xs font-bold uppercase tracking-widest
				          border border-blue-400/30 bg-white/10 text-blue-200">
					Listo para empezar
				</p>

				<h2 class="font-serif text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5 text-white">
					¿Cuántas horas pierde<br />tu equipo hoy?
				</h2>

				<p class="text-base leading-relaxed mb-10 max-w-md mx-auto" style="color: rgba(191,219,254,0.8)">
					Cada día sin automatización es tiempo y dinero que no recuperas.
					Conversemos — diseñamos tu solución en 72 horas.
				</p>

				<div class="flex flex-wrap gap-3 justify-center mb-7">
					<a href="/auth?mode=register"
					   class="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl no-underline font-bold text-sm
					          bg-white text-blue-950 hover:bg-blue-50
					          shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
						Solicitar Demo Gratuita
						<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
					</a>
					<a href="mailto:ventas@soportexperto.com"
					   class="inline-flex items-center px-7 py-3.5 rounded-xl no-underline font-semibold text-sm
					          border border-white/20 bg-white/10 text-white hover:bg-white/20
					          transition-colors duration-200">
						ventas@soportexperto.com
					</a>
				</div>

				<p class="text-xs tracking-wide mb-5" style="color: rgba(147,197,253,0.5)">
					Sin compromiso · Respuesta en menos de 24h · Implementación desde 2 semanas
				</p>

				<a href="https://soportexperto.com" target="_blank" rel="noopener noreferrer"
				   class="text-sm font-medium no-underline transition-colors"
				   style="color: rgba(147,197,253,0.65)"
				   onmouseenter={(e) => (e.currentTarget.style.color = 'white')}
				   onmouseleave={(e) => (e.currentTarget.style.color = 'rgba(147,197,253,0.65)')}>
					Conoce más sobre SoporteXperto →
				</a>
			</div>
		</section>

	</main>
	<Footer />
</div>

<style>
	.hero-grid {
		background-image:
			linear-gradient(rgb(100 116 139 / 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgb(100 116 139 / 0.08) 1px, transparent 1px);
		background-size: 56px 56px;
		-webkit-mask-image: radial-gradient(ellipse 90% 90% at 50% 0%, black 20%, transparent 100%);
		mask-image: radial-gradient(ellipse 90% 90% at 50% 0%, black 20%, transparent 100%);
	}

	.cta-grid {
		background-image:
			linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px);
		background-size: 48px 48px;
	}

	/* Blobs que se adaptan al tema */
	.blob-blue {
		background: oklch(0.7 0.15 230 / 0.15);
	}
	:global(.dark) .blob-blue {
		background: oklch(0.5 0.2 230 / 0.2);
	}
	.blob-slate {
		background: oklch(0.8 0.02 240 / 0.2);
	}
	:global(.dark) .blob-slate {
		background: oklch(0.3 0.05 240 / 0.25);
	}

	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0);    }
	}

	.caso-animate {
		animation: slideIn 0.28s ease both;
	}
	@keyframes slideIn {
		from { opacity: 0; transform: translateX(8px); }
		to   { opacity: 1; transform: translateX(0);   }
	}

	div :global(svg) {
		width: 20px;
		height: 20px;
	}

	.code-ln {
		display: inline-block;
		width: 2ch;
		margin-right: 20px;
		user-select: none;
		color: rgba(255,255,255,.18);
		text-align: right;
	}

	.terminal-cursor {
		display: inline-block;
		width: 7px;
		height: 14px;
		vertical-align: text-bottom;
		background: #60a5fa;
		border-radius: 1px;
		animation: blink 1.1s step-end infinite;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0; }
	}

	@keyframes floatA {
		0%, 100% { transform: translateY(0px)    rotate(-1deg); }
		50%       { transform: translateY(-8px)  rotate(0deg);  }
	}

	@keyframes floatB {
		0%, 100% { transform: translateY(0px)    rotate(1deg); }
		50%       { transform: translateY(-6px)  rotate(0deg); }
	}
</style>