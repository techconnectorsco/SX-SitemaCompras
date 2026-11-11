<script lang="ts">
	/**
	 * Landing pública del Centro de Operaciones Inteligentes (COI).
	 *
	 * Port del diseño "Landing COI SoporteXperto" (Claude Design). Todo el sistema
	 * visual vive bajo el scope `.coi` en `landing-coi.css`, importado solo aquí,
	 * de modo que nada de esto se filtra al resto de la aplicación.
	 */
	import { BarChart3, Package, Share2, Sparkles, Tag, Zap } from 'lucide-svelte';

	import { siteConfig } from '$lib/config/site';
	import { AUTH_PATHS } from '$lib/features/auth/config/auth';
	import { ACCESOS, ORIGENES } from '$lib/config/landing';
	import SxNav from '$lib/components/nav/sx-nav.svelte';
	import LandingFooter from '$lib/components/landing/landing-footer.svelte';
	import HeroNetwork from '$lib/components/landing/hero-network.svelte';

	import '$lib/styles/landing-coi.css';

	const CARACTERISTICAS = [
		{
			icono: Sparkles,
			titulo: 'Creación de contenido con IA',
			desc: 'Genera copy, hashtags y estrategias de publicación con inteligencia artificial para todas tus marcas.'
		},
		{
			icono: BarChart3,
			titulo: 'Indicadores en tiempo real',
			desc: 'KPIs semanales, mensuales, trimestrales y anuales con análisis por bodega y sucursal.'
		},
		{
			icono: Package,
			titulo: 'Gestión de inventarios',
			desc: 'Control de inventarios mínimos, alertas de stock bajo y análisis de rotación por sucursal.'
		},
		{
			icono: Tag,
			titulo: 'Gestión multi-marca',
			desc: 'Administra múltiples marcas con prompts personalizados, brand assets y estrategias diferenciadas.'
		},
		{
			icono: Zap,
			titulo: 'Alertas inteligentes',
			desc: 'Notificaciones automáticas por producto, lead time y umbrales personalizados.'
		},
		{
			icono: Share2,
			titulo: 'Meta Hub y publicación',
			desc: 'Publica en Facebook e Instagram, gestiona pautas y monitorea el rendimiento de tus campañas.'
		}
	];

	const PROCESO = [
		{
			titulo: 'Conecta tus datos',
			desc: 'El COI se conecta a tu ERP y lee solo las bodegas y marcas que selecciones.'
		},
		{
			titulo: 'Analiza y propone',
			desc: 'Genera forecast, alertas y borradores de contenido a partir de tus datos y tus marcas.'
		},
		{
			titulo: 'Revisa y decide',
			desc: 'Apruebas, ajustas o descartas antes de que algo se compre o se publique.'
		}
	];

	/**
	 * Cascada del bloque de cierre: los orígenes abren y cierran la lista y los
	 * accesos ocupan el centro, como en el diseño. El escalonado (margen, opacidad
	 * y tamaño) se calcula por distancia al centro para que siga siendo simétrico
	 * aunque cambie la cantidad de módulos.
	 */
	const cascada = (() => {
		const filas = [...ORIGENES.slice(0, 2), ...ACCESOS, ...ORIGENES.slice(2)].map((f) => ({
			sigla: f.sigla,
			titulo: f.titulo
		}));

		const centro = (filas.length - 1) / 2;
		const pasos = [
			{ op: 0.95, size: 18.8, m: 68 },
			{ op: 0.9, size: 18.4, m: 72 },
			{ op: 0.7, size: 17.4, m: 84 },
			{ op: 0.5, size: 16.2, m: 108 },
			{ op: 0.3, size: 15.1, m: 144 }
		];

		return filas.map((f, i) => {
			const d = Math.min(Math.round(Math.abs(i - centro)), pasos.length - 1);
			return { ...f, ...pasos[d] };
		});
	})();
</script>

<svelte:head>
	<title>{siteConfig.title} - Centro de Operaciones Inteligentes</title>
	<meta
		name="description"
		content="Compras con forecast, facturación, cuentas por cobrar y contenido con IA para tus marcas. Entra a cada módulo desde un mismo lugar."
	/>
</svelte:head>

<div class="coi">
	<SxNav context="landing" />

	<main>
		<!-- 1 · Hero -->
		<section
			id="inicio"
			class="hero"
			style="position:relative;overflow:hidden;padding:96px 0 72px;min-height:640px"
		>
			<div
				class="blob"
				style="width:560px;height:560px;left:-160px;top:-140px;background:radial-gradient(circle,rgba(26,115,194,.20),rgba(26,115,194,0) 68%)"
			></div>
			<div
				class="blob"
				style="width:480px;height:480px;right:-160px;top:40px;animation-duration:30s;background:radial-gradient(circle,rgba(13,30,61,.14),rgba(13,30,61,0) 68%)"
			></div>

			<HeroNetwork />

			<div
				class="wrap"
				style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center"
			>
				<p class="eyebrow rise">COI · Centro de Operaciones Inteligentes</p>

				<div
					class="rise"
					style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:22px;animation-delay:.08s"
				>
					<span class="chip chip-inf">Forecast predictivo</span>
					<span class="chip chip-inf">IA generativa</span>
					<span class="chip chip-inf">Meta: Facebook e Instagram</span>
					<span class="chip chip-ok">Con revisión humana</span>
				</div>

				<h1 class="h-hero rise" style="max-width:940px;margin-top:28px;animation-delay:.16s">
					Toda tu operación, en un solo centro de control<span style="color:var(--accent)">.</span>
				</h1>

				<p class="lead rise" style="max-width:640px;margin-top:24px;animation-delay:.24s">
					Compras con forecast, facturación, cuentas por cobrar y contenido con IA para tus marcas.
					Entra a cada módulo desde un mismo lugar y deja que el sistema proponga; tú decides.
				</p>

				<div
					class="rise"
					style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:36px;animation-delay:.32s"
				>
					<a class="btn btn-pri" href="#accesos"
						>Acceder al sistema <span aria-hidden="true">→</span></a
					>
					<a class="btn btn-sec" href="#solicitar">Solicitar acceso</a>
				</div>
			</div>
		</section>

		<!-- 2 · Accesos -->
		<section
			id="accesos"
			class="sec"
			style="background:var(--bg-alt);padding:64px 0;border-top:1px solid var(--bd-in);border-bottom:1px solid var(--bd-in)"
		>
			<div class="wrap">
				<div class="sec-head">
					<p class="eyebrow">Accesos</p>
					<h2 class="h-sec" style="margin-top:14px">Entra al módulo que necesitas</h2>
					<p class="p-sec" style="margin-top:18px">
						Cada acceso te lleva directo al sistema correspondiente.
					</p>
				</div>

				<div class="grid-auto">
					{#each ACCESOS as acceso (acceso.sigla)}
						<a
							class="card acc"
							href={acceso.href}
							target={acceso.externo ? '_blank' : null}
							rel={acceso.externo ? 'noopener noreferrer' : null}
							data-sveltekit-reload={acceso.reload ? '' : null}
						>
							<div style="display:flex;align-items:center;justify-content:space-between">
								<span class="sig">{acceso.sigla}</span>
							</div>
							<h3 class="h-card">{acceso.titulo}</h3>
							<p class="p-card">{acceso.sub}</p>
							<span class="acc-go">
								{acceso.externo ? 'Abrir sistema' : 'Ingresar al sistema'}
								<i aria-hidden="true">{acceso.externo ? '↗' : '→'}</i>
							</span>
						</a>
					{/each}
				</div>
			</div>
		</section>

		<!-- 3 · Características -->
		<section id="modulos" class="sec" style="padding:64px 0 24px">
			<div class="wrap">
				<div class="sec-head">
					<p class="eyebrow">Qué incluye</p>
					<h2 class="h-sec" style="margin-top:14px">Características principales</h2>
					<p class="p-sec" style="margin-top:18px">
						Módulos especializados que integran automatización, inteligencia artificial y gestión
						operativa.
					</p>
				</div>

				<div class="grid-auto-lg">
					{#each CARACTERISTICAS as item (item.titulo)}
						{@const Icono = item.icono}
						<article class="card mod">
							<span class="mod-ico"><Icono size={22} /></span>
							<h3 class="h-card">{item.titulo}</h3>
							<p class="p-card">{item.desc}</p>
						</article>
					{/each}
				</div>
			</div>
		</section>

		<!-- 4 · Proceso -->
		<section id="proceso" class="sec" style="padding:64px 0 24px">
			<div class="wrap">
				<div class="sec-head">
					<p class="eyebrow">Cómo funciona</p>
					<h2 class="h-sec" style="margin-top:14px">El sistema propone y ejecuta; tú decides</h2>
					<p class="p-sec" style="margin-top:18px">
						Implementación acompañada por SoporteXperto, con el control siempre en tu equipo.
					</p>
				</div>

				<div class="grid-auto-lg">
					{#each PROCESO as paso (paso.titulo)}
						<div class="card" style="padding:28px;display:flex;flex-direction:column;gap:12px">
							<span class="sig sig-n" aria-hidden="true">→</span>
							<h3 class="h-card">{paso.titulo}</h3>
							<p class="p-card">{paso.desc}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- 5 · Cierre -->
		<section id="solicitar" class="wrap sec" style="padding-top:48px;padding-bottom:64px">
			<div class="cta">
				<div
					class="blob"
					style="width:440px;height:440px;right:-80px;top:10px;background:radial-gradient(circle,rgba(26,115,194,.38),rgba(26,115,194,0) 68%)"
				></div>

				<div class="cta-copy">
					<p class="eyebrow" style="color:rgba(255,255,255,.72)">Acceso al COI</p>
					<h2 class="h-close" style="margin-top:14px;font-size:40px;letter-spacing:-1.5px">
						¿Listo para transformar tu operación?
					</h2>
					<p
						style="max-width:520px;margin:14px 0 0;font:400 16px/1.6 Manrope,sans-serif;color:rgba(255,255,255,.72);text-wrap:pretty"
					>
						Accede a la plataforma y potencia tus procesos de compras y creación de contenido con
						inteligencia artificial.
					</p>
					<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:24px">
						<a class="btn btn-wh" href={AUTH_PATHS.REGISTER}>
							Solicitar acceso <span aria-hidden="true">→</span>
						</a>
						<a class="btn btn-out" href="mailto:{siteConfig.contact.email}">
							Hablar con SoporteXperto
						</a>
					</div>
				</div>

				<div class="cta-vis" aria-hidden="true">
					<svg class="cta-chev" viewBox="0 0 200 400" preserveAspectRatio="none" focusable="false">
						<polyline
							points="196,0 14,200 196,400"
							fill="none"
							stroke="rgba(255,255,255,.14)"
							stroke-width="1"
						/>
						<polyline
							points="196,0 44,200 196,400"
							fill="none"
							stroke="rgba(255,255,255,.14)"
							stroke-width="1"
						/>
						<polyline
							points="196,0 74,200 196,400"
							fill="none"
							stroke="rgba(255,255,255,.14)"
							stroke-width="1"
						/>
						<polyline
							points="196,0 104,200 196,400"
							fill="none"
							stroke="rgba(255,255,255,.14)"
							stroke-width="1"
						/>
					</svg>
					{#each cascada as fila (fila.sigla)}
						<div class="cta-row" style="--m:{fila.m}px;opacity:{fila.op}">
							<i>{fila.sigla}</i><span style="font-size:{fila.size}px">{fila.titulo}</span>
						</div>
					{/each}
				</div>
			</div>
		</section>
	</main>

	<LandingFooter />
</div>
