<script lang="ts">
	import { page } from '$app/state';
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import NavigationSidebar from '$lib/components/app/nav/NavigationSidebar.svelte';
	import Breadcrumb from '$lib/components/app/nav/breadcrumb.svelte';

	let { data, children } = $props();

	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>

<div class="flex min-h-screen bg-background">
	<!-- Sidebar general: oculto en rutas /admin -->
	{#if !isAdmin}
		<NavigationSidebar />
	{/if}

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col transition-all duration-300 {isAdmin ? 'ml-0' : 'ml-0 lg:ml-64'}" id="main-canvas">
		<MainNav session={data.session} user={data.user} perfil={data.perfilNav} />

		{#if !isAdmin}
			<main id="content" class="pt-16 lg:pt-20 px-4 sm:px-6 lg:px-8 pb-12 w-full max-w-7xl mx-auto">
				<div class="py-4">
					<Breadcrumb />
				</div>

				<div class="space-y-6">
					{@render children()}
				</div>
			</main>
		{:else}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	/* Adjust margin based on sidebar state if we were using a context, 
	   but for now we use a standard responsive approach or fixed. */
	:global(#main-canvas) {
		/* Add some breathing room for the sidebar */
		transition: margin-left 0.3s ease-in-out;
	}
</style>



