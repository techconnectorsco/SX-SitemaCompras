<script lang="ts">
	let { data } = $props();

	const accesosRapidos = [
		{
			href: '/admin/solicitudes',
			titulo: 'Solicitudes de Acceso',
			descripcion: 'Aprobar o rechazar solicitudes de registro de clientes.',
			color: 'amber',
			icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
		},
		{
			href: '/admin/clientes',
			titulo: 'Gestión de Clientes',
			descripcion: 'Agregar nuevos clientes, editar información y asignar servicios.',
			color: 'blue',
			icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
		},
		{
			href: '/admin/robots',
			titulo: 'Robots / Automatizaciones',
			descripcion: 'Controlar estado, activar o desactivar robots RPA de clientes.',
			color: 'cyan',
			icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
		},
		{
			href: '/admin/proyectos',
			titulo: 'Proyectos Software',
			descripcion: 'Gestionar proyectos como sito.cr, gestor de compras y más.',
			color: 'purple',
			icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
		},
		{
			href: '/admin/casos-exito',
			titulo: 'Casos de Éxito',
			descripcion: 'Subir y editar casos de éxito con imágenes y métricas para la landing.',
			color: 'emerald',
			icon: 'M5 3h14M5 3a2 2 0 00-2 2v2a5 5 0 004 4.9M5 3v4a5 5 0 004 4.9m10-8.9a2 2 0 012 2v2a5 5 0 01-4 4.9m0 0a5 5 0 01-6 0m6 0V17m-6-2.1V17m0 0h6m-6 0H9m3 0v4'
		},
		{
			href: '/admin/usuarios',
			titulo: 'Usuarios',
			descripcion: 'Ver usuarios registrados, roles y permisos del sistema.',
			color: 'slate',
			icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
		}
	];

	const colorMap: Record<string, { card: string; iconBg: string; iconText: string; border: string; hover: string }> = {
		amber:   { card: 'bg-amber-500/10',   iconBg: 'bg-amber-500',   iconText: 'text-white', border: 'border-amber-500/30',   hover: 'hover:border-amber-500/60' },
		blue:    { card: 'bg-blue-500/10',     iconBg: 'bg-blue-500',    iconText: 'text-white', border: 'border-blue-500/30',    hover: 'hover:border-blue-500/60' },
		cyan:    { card: 'bg-cyan-500/10',     iconBg: 'bg-cyan-600',    iconText: 'text-white', border: 'border-cyan-500/30',    hover: 'hover:border-cyan-500/60' },
		purple:  { card: 'bg-purple-500/10',   iconBg: 'bg-purple-500',  iconText: 'text-white', border: 'border-purple-500/30',  hover: 'hover:border-purple-500/60' },
		emerald: { card: 'bg-emerald-500/10',  iconBg: 'bg-emerald-500', iconText: 'text-white', border: 'border-emerald-500/30', hover: 'hover:border-emerald-500/60' },
		slate:   { card: 'bg-slate-500/10',    iconBg: 'bg-slate-600',   iconText: 'text-white', border: 'border-slate-500/30',   hover: 'hover:border-slate-500/60' }
	};
</script>

<div>
		<!-- Header -->
		<div class="mb-10">
			<div class="flex items-center gap-3 mb-2">
				<div class="w-10 h-10 bg-gradient-to-br from-[#0f2140] to-[#1a6bb5] rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
				</div>
				<div>
					<h1 class="text-2xl font-bold text-foreground">Administración</h1>
					<p class="text-sm text-muted-foreground">Plataforma SX — Transformación Digital</p>
				</div>
			</div>
		</div>

		<!-- Accesos Rápidos -->
		<div class="mb-8">
			<h2 class="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
				<svg class="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
				</svg>
				Accesos Rápidos
			</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each accesosRapidos as item}
					{@const c = colorMap[item.color] || colorMap.slate}
					<a
						href={item.href}
						class="group p-5 {c.card} border-2 {c.border} {c.hover} rounded-xl hover:shadow-md transition-all duration-200"
					>
						<div class="flex items-start gap-4">
							<div class="{c.iconBg} p-2.5 rounded-xl {c.iconText} shadow-sm group-hover:scale-105 transition-transform">
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon}/>
								</svg>
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-semibold text-foreground">{item.titulo}</p>
								<p class="text-sm text-muted-foreground mt-0.5 leading-relaxed">{item.descripcion}</p>
							</div>
							<svg class="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
							</svg>
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- Info Banner -->
		<div class="bg-gradient-to-r from-[#0a1628] to-[#162d50] rounded-2xl p-6 text-white">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
					<svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
				</div>
				<div>
					<h3 class="font-semibold text-white">Panel de Administración SX</h3>
					<p class="text-sm text-slate-300 mt-0.5">
						Desde aquí puedes gestionar clientes, aprobar solicitudes de acceso, controlar robots RPA, administrar proyectos de software y editar los casos de éxito que se muestran en la landing page.
					</p>
				</div>
			</div>
		</div>

		<!-- Tareas Pendientes (placeholder para futuro) -->
		<div class="mt-8 bg-card rounded-xl border border-border p-6">
			<h3 class="text-base font-bold text-foreground mb-4 flex items-center gap-2">
				<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
				</svg>
				Pendientes
			</h3>
			<div class="space-y-3">
				<a href="/admin/solicitudes" class="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-colors group">
					<div class="flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
						<span class="text-sm text-foreground font-medium">Revisar solicitudes de acceso pendientes</span>
					</div>
					<svg class="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
					</svg>
				</a>
				<a href="/admin/clientes" class="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors group">
					<div class="flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-blue-400"></span>
						<span class="text-sm text-foreground font-medium">Agregar nuevos clientes al sistema</span>
					</div>
					<svg class="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
					</svg>
				</a>
				<a href="/admin/casos-exito" class="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors group">
					<div class="flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-emerald-400"></span>
						<span class="text-sm text-foreground font-medium">Subir casos de éxito con imágenes a la landing</span>
					</div>
					<svg class="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
					</svg>
				</a>
			</div>
		</div>
</div>