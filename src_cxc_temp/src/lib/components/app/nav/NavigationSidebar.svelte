<script lang="ts">
	import { page } from '$app/state';
	import {
		LayoutDashboard,
		Users,
		FileText,
		ChevronLeft,
		ChevronRight,
		Globe,
		UsersRound,
		X
	} from 'lucide-svelte';
	import { sidebar } from '$lib/stores/sidebar.svelte';

	let collapsed = $state(false);

	const navItems = [
		{ label: 'General',       href: '/general',  icon: 'dashboard' },
		{ label: 'Aplicaciones',  href: '/apps',     icon: 'globe'     },
		{ label: 'Clientes',      href: '/clientes', icon: 'building'  },
		{ label: 'Bitácora',      href: '/logs',     icon: 'file'      },
		{ label: 'CxC',           href: '/cxc',      icon: 'cxc'       },
	];

	const icons: Record<string, string> = {
		dashboard: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
		globe:     'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		building:  'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
		file:      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		team:      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
		cxc:       'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z',
	};

	function toggleSidebar() { collapsed = !collapsed; }
	function closeMobile()   { sidebar.open = false; }

	let currentPath = $derived(page.url.pathname);

	$effect(() => {
		currentPath;
		sidebar.open = false;
	});

	function isActive(href: string): boolean {
		return currentPath.startsWith(href);
	}
</script>

<!-- Mobile backdrop -->
{#if sidebar.open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 z-40 lg:hidden" onclick={closeMobile}></div>
{/if}

<aside
	class="fixed top-[72px] left-0 h-[calc(100vh-72px)] bg-card text-foreground border-r border-border
	       transition-all duration-300 z-50 flex flex-col shadow-2xl
	       {collapsed ? 'w-16 lg:w-[72px]' : 'w-64'}
	       {sidebar.open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
	       lg:left-6 lg:top-24 lg:h-[calc(100vh-7rem)] lg:rounded-2xl lg:border lg:shadow-xl"
>

<!-- Header -->
<div class="border-b border-border flex items-center justify-center
            {collapsed ? 'p-4' : 'p-4 lg:p-5'}">
    {#if collapsed}
        <div class="w-9 h-9 bg-gradient-to-br from-[#0f2140] to-[#1a6bb5] rounded-xl
                    flex items-center justify-center shadow-md">
            <span class="text-white font-bold text-sm">SX</span>
        </div>
    {:else}
        <div class="flex items-center gap-3 w-full">
            <div class="w-9 h-9 bg-gradient-to-br from-[#0f2140] to-[#1a6bb5] rounded-xl
                        flex items-center justify-center shrink-0 shadow-md">
                <span class="text-white font-bold text-sm">SX</span>
            </div>
            <div class="overflow-hidden">
                <p class="font-bold text-sm text-foreground leading-tight">SX Desarrollos</p>
                <p class="text-[10px] text-muted-foreground font-medium">Transformación Digital</p>
            </div>
        </div>
    {/if}
</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto py-4 px-3">

		<!-- Sección principal -->
		{#if !collapsed}
			<p class="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
				Gestión Principal
			</p>
		{/if}

		<div class="space-y-1 mb-6">
			{#each navItems as item}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
					       {active
					         ? 'bg-accent text-accent-foreground shadow-sm border border-border'
					         : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
					title={collapsed ? item.label : ''}
				>
					<svg
						class="w-[18px] h-[18px] shrink-0 {active ? 'text-cyan-500' : 'text-muted-foreground'}"
						fill="none" stroke="currentColor" viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
						      d={icons[item.icon]}/>
					</svg>
					{#if !collapsed}
						<span class="font-medium text-sm truncate">{item.label}</span>
					{/if}
				</a>
			{/each}
		</div>

		<!-- Sección equipo -->
		{#if !collapsed}
			<p class="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
				Equipo
			</p>
		{/if}

		<div class="space-y-1">
			<a
				href="/equipo"
				class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
				       {isActive('/equipo')
				         ? 'bg-accent text-accent-foreground shadow-sm border border-border'
				         : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
				title={collapsed ? 'Nuestro Equipo' : ''}
			>
				<svg
					class="w-[18px] h-[18px] shrink-0 {isActive('/equipo') ? 'text-cyan-500' : 'text-muted-foreground'}"
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
					      d={icons['team']}/>
				</svg>
				{#if !collapsed}
					<span class="font-medium text-sm truncate">Nuestro Equipo</span>
				{/if}
			</a>
		</div>
	</nav>

	<!-- Footer -->
	<div class="p-4 border-t border-border">
		<!-- Toggle collapse — solo desktop -->
		<button
			onclick={toggleSidebar}
			class="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-lg
			       bg-accent hover:bg-accent/80 transition-colors
			       text-accent-foreground text-xs font-medium"
		>
			{#if collapsed}
				<ChevronRight class="w-4 h-4" />
			{:else}
				<ChevronLeft class="w-4 h-4" />
				<span>Colapsar</span>
			{/if}
		</button>

		{#if !collapsed}
			<div class="mt-4 flex items-center gap-3 px-2">
				<div class="w-8 h-8 rounded-full bg-accent border border-border
				            flex items-center justify-center text-xs font-bold text-foreground">
					SX
				</div>
				<div class="overflow-hidden">
					<p class="text-[10px] text-muted-foreground font-medium">Versión 1.0.0</p>
					<p class="text-xs text-foreground truncate font-medium">SoporteXperto</p>
				</div>
			</div>
		{/if}
	</div>
</aside>