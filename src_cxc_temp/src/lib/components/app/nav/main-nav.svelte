<script lang="ts">
  /**
   * @module MainNavigation
   * @description Navigation header with logo, theme toggle and user account dropdown.
   */
	import Account from './account-icon.svelte';
	import { siteConfig } from '$lib/config/site';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import { page } from '$app/state';
	import { sidebar } from '$lib/stores/sidebar.svelte';
	import { adminSidebar } from '$lib/stores/sidebar.svelte';

	// Solo recibir session, user y opcional perfil (para avatar)
	let {
		session = null,
		user = null,
		perfil = null
	} = $props<{
		session?: any;
		user?: any;
		perfil?: any;
	}>();

	function handleToggleMode() {
		toggleMode();
	}

	let currentPath = $derived(page.url.pathname);
	let isAdmin = $derived(currentPath.startsWith('/admin'));

	function toggleMobileSidebar() {
		if (isAdmin) {
			adminSidebar.open = !adminSidebar.open;
		} else {
			sidebar.open = !sidebar.open;
		}
	}

	// Show hamburger only inside the app routes (not on landing/auth)
	let showHamburger = $derived(
		currentPath.startsWith('/admin') ||
		currentPath.startsWith('/general') ||
		currentPath.startsWith('/apps') ||
		currentPath.startsWith('/clientes') ||
		currentPath.startsWith('/logs') ||
		currentPath.startsWith('/equipo') ||
		currentPath.startsWith('/solicitar-acceso')
	);
</script>

<header
	class="fixed inset-x-0 top-0 z-50 border-b-2 bg-background shadow-md"
>
	<div
		class="flex w-full items-center justify-between px-4 py-2 sm:px-6 md:px-8 lg:px-16"
		aria-label="Global"
	>
		<!-- Left: hamburger (mobile, app routes only) + logo -->
		<div class="flex items-center gap-2 sm:gap-3">
			{#if showHamburger}
				<button
					onclick={toggleMobileSidebar}
					class="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors text-foreground"
					aria-label="Abrir menú"
				>
					<MenuIcon class="w-5 h-5" />
				</button>
			{/if}
			<a href="/" class="flex items-center gap-3 group">
				<img
					src={siteConfig.logo}
					alt={siteConfig.title}
					class="h-8 sm:h-9 md:h-10 lg:h-12 w-auto transition-transform duration-300 group-hover:scale-105 py-0.5"
				/>
			</a>
		</div>

		<!-- Right: theme toggle + account -->
		<div class="flex items-center gap-2">
			<Button onclick={handleToggleMode} variant="outline" size="icon" class="relative overflow-hidden">
				<SunIcon
					class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0 dark:-rotate-90"
				/>
				<MoonIcon
					class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:scale-100 dark:rotate-0"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>

			<div class="p-2 rounded-lg hover:bg-accent transition-colors">
				<Account {session} {user} {perfil} />
			</div>
		</div>
	</div>
</header>
