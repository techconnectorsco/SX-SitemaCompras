<script lang="ts">
	/**
	 * @module SxNav
	 * @description Navbar compartida del sistema: landing, accesos y auth.
	 *
	 * Reemplaza a `app/nav/main-nav.svelte` y a `landing/landing-nav.svelte`.
	 * Lo único que cambia entre contextos son los enlaces del centro y la acción
	 * principal de la derecha; la marca, el botón de tema y el menú de cuenta son
	 * siempre los mismos.
	 *
	 * Estilos: `$lib/styles/sx-nav.css`, todo bajo el scope `.sxnav`.
	 */
	import { Activity, Settings } from 'lucide-svelte';
	import { toggleMode } from 'mode-watcher';
	import { page } from '$app/state';

	import { siteConfig } from '$lib/config/site';
	import { AUTH_PATHS } from '$lib/features/auth/config/auth';
	import SxAccount from './sx-account.svelte';

	import '$lib/styles/sx-nav.css';

	let { context = 'app' }: { context?: 'landing' | 'app' } = $props();

	const user = $derived(page.data.user);
	/**
	 * Se lee de `page.data.user` y no de `page.data.session`: fuera del grupo
	 * `(app)` la sesión es solo `{ id }`, así que `session.user.role` es
	 * `undefined` y el enlace de administración nunca aparecería en la landing
	 * ni en las vistas de autenticación.
	 */
	const isAdmin = $derived(page.data.user?.role === 'ADMIN');
</script>

<header class="sxnav">
	<div class="head-in">
		<a
			class="brand"
			href={context === 'landing' ? '#inicio' : '/'}
			aria-label="{siteConfig.title}, inicio"
		>
			<img class="logo-l" src={siteConfig.logo} alt={siteConfig.title} />
			<img class="logo-d" src={siteConfig.logoDark} alt="" />
		</a>

		<span class="vdiv"></span>

		<div class="lockup">
			<span class="lockup-t">Centro de Operaciones Inteligentes</span>
			<span class="lockup-s">Grupo SoporteXperto</span>
		</div>

		<nav class="nav" aria-label="Principal">
			{#if context === 'landing'}
				<a href="#accesos">Accesos</a>
				<a href="#proceso">Cómo funciona</a>
			{:else}
				<a href="/monitoreo">
					<Activity size={16} />
					Monitoreo
				</a>
			{/if}
			{#if isAdmin}
				<a href="/admin">
					<Settings size={16} />
					Administración
				</a>
			{/if}
		</nav>

		<div class="hdr-act">
			<button
				type="button"
				class="theme-btn"
				onclick={toggleMode}
				aria-label="Cambiar entre tema claro y oscuro"
			>
				<svg
					class="ic-moon"
					viewBox="0 0 24 24"
					width="18"
					height="18"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
				</svg>
				<svg
					class="ic-sun"
					viewBox="0 0 24 24"
					width="18"
					height="18"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="4" />
					<path
						d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
					/>
				</svg>
			</button>

			{#if user}
				<!-- Con sesión basta el menú de cuenta: las tarjetas de accesos de la
				     landing ya llevan a cada módulo. -->
				<SxAccount />
			{:else if context === 'landing'}
				<a class="btn btn-sec btn-compact" href={AUTH_PATHS.REGISTER}>Solicitar acceso</a>
			{/if}
		</div>
	</div>
</header>
