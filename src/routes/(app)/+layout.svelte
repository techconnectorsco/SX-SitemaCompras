<script>
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import Sidebar from '$lib/components/app/nav/sidebar.svelte';
	import Breadcrumb from '$lib/components/app/nav/breadcrumb.svelte';
	import { page } from '$app/stores';

	$: esRutaAdmin = $page.url.pathname.startsWith('/admin');
</script>

<div class:appAdmin={esRutaAdmin} class="flex min-h-screen flex-col">
	<!-- Barra superior -->
	<MainNav />

	<!-- Sidebar (solo en pantallas grandes) -->
	<!--<Sidebar />-->

	<!-- Contenido principal -->
	<main id="content" class:mainAdmin={esRutaAdmin} class="flex min-h-0 flex-1 flex-col">
		<Breadcrumb />

		{#if esRutaAdmin}
			<div class="flex min-h-0 flex-1 flex-col">
				<slot />
			</div>
		{:else}
			<div class="space-y-5 p-2 sm:p-5 sm:py-0 md:pt-5">
				<slot />
			</div>
		{/if}
	</main>
</div>

<style>
	.appAdmin {
		height: 100dvh;
		overflow: hidden;
	}

	.mainAdmin {
		overflow: hidden;
	}
</style>
