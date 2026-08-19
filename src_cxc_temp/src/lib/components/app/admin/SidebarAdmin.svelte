<script lang="ts">
//D:\Users\Usuario\Desktop\SX-Desarrollos\src\lib\components\app\admin\SidebarAdmin.svelte
	import { page } from '$app/state';
	import { adminSidebar } from '$lib/stores/sidebar.svelte';

	let currentPath = $derived(page.url.pathname);

	type MenuItem = { href: string; label: string; icon: string; exact?: boolean; badge?: boolean };

	const menuItems: { section: string; items: MenuItem[] }[] = [
		{
			section: 'General',
			items: [
				{ href: '/admin', label: 'Panel Admin', icon: 'dashboard', exact: true },
			]
		},
		{
			section: 'Gestión',
			items: [
				{ href: '/admin/solicitudes', label: 'Solicitudes', icon: 'inbox' },
				{ href: '/admin/clientes', label: 'Clientes', icon: 'building' },
				{ href: '/admin/robots', label: 'Robots / Automatizaciones', icon: 'bot' },
				{ href: '/admin/proyectos', label: 'Proyectos Software', icon: 'code' },
				{ href: '/admin/casos-exito', label: 'Casos de Éxito', icon: 'trophy' },
			]
		},
		{
			section: 'Sistema',
			items: [
				{ href: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
				{ href: '/admin/equipo',   label: 'Equipo',        icon: 'team'  },
			]
		}
	];

	function isActive(href: string, exact = false): boolean {
		if (exact) return currentPath === href;
		return currentPath.startsWith(href);
	}

	function closeMobile() {
		adminSidebar.open = false;
	}

	// Close on route change
	$effect(() => {
		currentPath;
		adminSidebar.open = false;
	});

	// SVG icon paths
	const icons: Record<string, string> = {
		dashboard: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
		inbox: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
		building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
		bot: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
		code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
		trophy: 'M5 3h14M5 3a2 2 0 00-2 2v2a5 5 0 004 4.9M5 3v4a5 5 0 004 4.9m10-8.9a2 2 0 012 2v2a5 5 0 01-4 4.9m0 0a5 5 0 01-6 0m6 0V17m-6-2.1V17m0 0h6m-6 0H9m3 0v4',
		users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		team: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
	};
</script>

<!-- Mobile backdrop overlay -->
{#if adminSidebar.open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/50 z-40 lg:hidden"
		onclick={closeMobile}
	></div>
{/if}

<aside
	class="fixed top-0 left-0 h-screen w-64 bg-card shadow-xl z-50 flex flex-col border-r border-border
		transition-transform duration-300
		{adminSidebar.open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
		lg:left-6 lg:top-24 lg:h-[calc(100vh-7rem)] lg:rounded-2xl lg:border lg:shadow-xl"
>
	<!-- Header -->
	<div class="p-4 lg:p-6 border-b border-border">
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 bg-linear-to-br from-[#0f2140] to-[#1a6bb5] rounded-xl flex items-center justify-center shrink-0">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
				</div>
				<div>
					<h2 class="text-base font-bold text-foreground">Panel Admin</h2>
					<p class="text-[11px] text-muted-foreground font-medium">SX Platform</p>
				</div>
			</div>
			<!-- Close button: only on mobile -->
			<button
				onclick={closeMobile}
				class="lg:hidden p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
				aria-label="Cerrar menú"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto py-4 px-3">
		{#each menuItems as group}
			<div class="mb-5">
				<p class="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.section}</p>
				<div class="space-y-1">
					{#each group.items as item}
						{@const active = isActive(item.href, item.exact ?? false)}
						<a
							href={item.href}
							class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
								{active
									? 'bg-accent text-accent-foreground shadow-sm border border-border'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
						>
							<svg class="w-[18px] h-[18px] shrink-0 {active ? 'text-cyan-500' : 'text-muted-foreground'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={icons[item.icon] || icons.dashboard}/>
							</svg>
							<span class="font-medium text-sm truncate">{item.label}</span>
							{#if item.badge}
								<span class="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</nav>

	<!-- Footer -->
	<div class="p-4 border-t border-border">
		<a
			href="/general"
			class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
		>
			<svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
			</svg>
			<span class="text-sm font-medium">Volver al Home</span>
		</a>
	</div>
</aside>
