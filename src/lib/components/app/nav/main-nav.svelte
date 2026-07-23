<script lang="ts">
  /**
   * @module MainNavigation
   * @description This component renders the main navigation header of the application.
   * It includes the site logo, a theme toggle (light/dark switch), and a user account dropdown.
   * The logo is dynamically sourced from `siteConfig` and switches between light and dark versions.
   */
	import Account from './account.svelte';
	import LightSwitch from './light-switch.svelte';
	import { siteConfig } from '$lib/config/site';
</script>

<header
	class="sticky inset-x-0 top-0 z-50 flex flex-wrap border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 md:flex-nowrap md:justify-start"
>
	<div
		class="flex w-full basis-full items-center justify-between px-2 py-2.5 sm:px-5 xl:grid xl:grid-cols-3"
		aria-label="Global"
	>
		<!-- 👇 Aquí agregamos el logo -->
		<div class="flex items-center md:gap-x-3 xl:col-span-1">
			<a href="/" class="flex items-center gap-2">
				<img src={siteConfig.logo} alt={siteConfig.title} class="h-10 w-auto dark:hidden" />
				<img src={siteConfig.logoDark} alt={siteConfig.title} class="hidden h-10 w-auto dark:block" />
				<!-- <span class="font-semibold text-lg">{siteConfig.title}</span> -->
			</a>
		</div>

		<div class="flex items-center justify-end gap-x-2 xl:col-span-2">
			<LightSwitch />
			<Account />
		</div>
	</div>
</header>