<script lang="ts">
	import { page } from '$app/state';
	import { sidebar } from '$lib/stores/sidebar.svelte';

	let currentPath = $derived(page.url.pathname);

	const navItems = [
		{ label: 'General',      href: '/general',  icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
		{ label: 'Aplicaciones', href: '/apps',     icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
		{ label: 'Clientes',     href: '/clientes', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
		{ label: 'Bitácora',     href: '/logs',     icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
		{ label: 'Nuestro Equipo', href: '/equipo', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
	];

	function closeMobile() { sidebar.open = false; }

	$effect(() => {
		currentPath;
		sidebar.open = false;
	});
</script>

{#if sidebar.open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 z-40 lg:hidden" onclick={closeMobile}></div>
{/if}

<aside
	class="fixed top-0 left-0 h-screen w-64 bg-card border-r border-border
	       z-50 flex flex-col shadow-2xl transition-transform duration-300
	       {sidebar.open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
	       lg:left-6 lg:top-24 lg:h-[calc(100vh-7rem)] lg:rounded-2xl lg:border lg:shadow-xl"
>
	<!-- Header -->
	<div class="p-5 border-b border-border">
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 bg-gradient-to-br from-[#0f2140] to-[#1a6bb5] rounded-xl
				            flex items-center justify-center shrink-0 shadow-md">
					<span class="text-white font-bold text-sm">SX</span>
				</div>
				<div>
					<p class="font-bold text-sm text-foreground leading-tight">SX Desarrollos</p>
					<p class="text-[10px] text-muted-foreground font-medium">Transformación Digital</p>
				</div>
			</div>
			<button
				onclick={closeMobile}
				class="lg:hidden p-1.5 rounded-lg hover:bg-accent transition-colors
				       text-muted-foreground hover:text-foreground"
				aria-label="Cerrar menú"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Nav -->
	<nav class="flex-1 overflow-y-auto py-4 px-3">
		<p class="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
			Gestión Principal
		</p>
		<div class="space-y-1 mb-6">
			{#each navItems.slice(0, 4) as item}
				{@const active = page.url.pathname.startsWith(item.href)}
				<a href={item.href}
				   class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
				          {active
				            ? 'bg-accent text-accent-foreground shadow-sm border border-border'
				            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}">
					<svg class="w-[18px] h-[18px] shrink-0 {active ? 'text-cyan-500' : 'text-muted-foreground'}"
					     fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon}/>
					</svg>
					<span class="font-medium text-sm">{item.label}</span>
				</a>
			{/each}
		</div>

		<p class="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
			Equipo
		</p>
		<div class="space-y-1">
			{@const item = navItems[4]}
			{@const active = page.url.pathname.startsWith(item.href)}
			<a href={item.href}
			   class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
			          {active
			            ? 'bg-accent text-accent-foreground shadow-sm border border-border'
			            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}">
				<svg class="w-[18px] h-[18px] shrink-0 {active ? 'text-cyan-500' : 'text-muted-foreground'}"
				     fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon}/>
				</svg>
				<span class="font-medium text-sm">{item.label}</span>
			</a>
		</div>
	</nav>

	<!-- Footer -->
	<div class="p-4 border-t border-border">
		<div class="flex items-center gap-3 px-2">
			<div class="w-8 h-8 rounded-full bg-accent border border-border
			            flex items-center justify-center text-xs font-bold text-foreground">
				SX
			</div>
			<div class="overflow-hidden">
				<p class="text-[10px] text-muted-foreground font-medium">Versión 1.0.0</p>
				<p class="text-xs text-foreground truncate font-medium">SoporteXperto</p>
			</div>
		</div>
	</div>
</aside>