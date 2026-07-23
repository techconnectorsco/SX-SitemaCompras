<script>
	import MainNav from '$lib/components/app/nav/main-nav.svelte';
	import Sidebar from '$lib/components/app/nav/sidebar.svelte';
    import Breadcrumb from '$lib/components/app/nav/breadcrumb.svelte';;
</script>


	<!-- Barra superior -->
	<MainNav />

	<!-- Sidebar (solo en pantallas grandes) -->
	<!--<Sidebar />-->

	<!-- Contenido principal -->
	<main id="content">
		<Breadcrumb />
	
		<div class="space-y-5 p-2 sm:p-5 sm:py-0 md:pt-5">
			<slot />
		</div>
	</main>


