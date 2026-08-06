<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Megaphone, Calendar, Clock, Check, Send, CheckCircle2, AlertTriangle } from 'lucide-svelte';

	interface ScheduleEntry {
		id: string;
		date: any; // CalendarDate
		title: string;
		brand: string;
		network: string;
		status: string;
		time: string;
		tone: string;
		copy: string;
		notes: string;
		imageName: string;
		imagePreview: string | null;
	}

	let { entries = $bindable() } = $props<{ entries: ScheduleEntry[] }>();

	let activeFilter = $state<'Aprobados' | 'Publicados' | 'Todos'>('Aprobados');
	let publishingId = $state<string | null>(null);

	// Log de publicaciones anteriores simulado
	let publishLogs = $state<Array<{
		id: string;
		timestamp: string;
		brand: string;
		network: string;
		title: string;
		status: '200 OK' | 'Error API';
		logId: string;
	}>>([
		{ id: 'log-1', timestamp: '2026-06-08 09:32', brand: 'Vedoba', network: 'Instagram', title: 'Lanzamiento Lubricantes Verdes', status: '200 OK', logId: 'ig_media_9823472' },
		{ id: 'log-2', timestamp: '2026-06-05 14:15', brand: 'Outlet', network: 'Facebook', title: 'Liquidación de Temporada', status: '200 OK', logId: 'fb_post_8374823' },
		{ id: 'log-3', timestamp: '2026-06-02 18:00', brand: 'Grupo VYO', network: 'Ambas', title: 'Anuncio Corporativo', status: '200 OK', logId: 'fb_post_1928472' }
	]);

	const readyEntries = $derived.by(() => {
		if (activeFilter === 'Aprobados') {
			return entries.filter(e => e.status === 'Aprobado' || e.status === 'Programado');
		} else if (activeFilter === 'Publicados') {
			// Simulación de los ya enviados
			return [];
		}
		return entries;
	});

	function publishNow(entry: ScheduleEntry) {
		publishingId = entry.id;
		
		setTimeout(() => {
			publishingId = null;
			
			// Cambiar estado a borrado/publicado o añadir notas de publicación
			entries = entries.map(e => {
				if (e.id === entry.id) {
					return { ...e, status: 'Programado', notes: `${e.notes}\n[Publicado vía Meta API]: ${new Date().toISOString()}`.trim() };
				}
				return e;
			});

			// Añadir al log
			const now = new Date();
			const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
			
			publishLogs = [
				{
					id: `log-${Date.now()}`,
					timestamp: timeStr,
					brand: entry.brand,
					network: entry.network,
					title: entry.title,
					status: '200 OK',
					logId: entry.network === 'Instagram' ? `ig_media_${Math.floor(Math.random()*9000000)+1000000}` : `fb_post_${Math.floor(Math.random()*9000000)+1000000}`
				},
				...publishLogs
			];

			toast.success('¡Publicado con éxito en Meta!', {
				description: `El contenido fue entregado a Facebook/Instagram API. ID de publicación guardado.`
			});
		}, 1500);
	}
</script>

<div class="space-y-6">
	<!-- Cola de publicación -->
	<Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
		<div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-900">
			<div>
				<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
					<Megaphone class="h-4 w-4 text-[#253166] dark:text-blue-400 animate-bounce" />
					Cola de Envío API (Meta Graph API)
				</h3>
				<p class="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
					Publicaciones aprobadas por el equipo de revisión humana, listas para impactar en redes sociales.
				</p>
			</div>
			
			<div class="flex gap-1.5">
				<button 
					type="button"
					onclick={() => activeFilter = 'Aprobados'}
					class="rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 {activeFilter === 'Aprobados' ? 'bg-[#253166] text-white dark:bg-blue-600' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'}"
				>
					Listos para Publicar ({entries.filter(e => e.status === 'Aprobado' || e.status === 'Programado').length})
				</button>
				<button 
					type="button"
					onclick={() => activeFilter = 'Todos'}
					class="rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 {activeFilter === 'Todos' ? 'bg-[#253166] text-white dark:bg-blue-600' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'}"
				>
					Todos ({entries.length})
				</button>
			</div>
		</div>

		<div class="mt-5 space-y-4">
			{#if readyEntries.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-3xl dark:border-slate-800">
					<CheckCircle2 class="h-8 w-8 text-emerald-500" />
					<p class="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">No hay publicaciones pendientes de envío</p>
					<p class="text-xs text-slate-500 mt-1 max-w-sm dark:text-slate-400">
						Todo el contenido del mes ha sido publicado o está en fase previa de boceto y revisión.
					</p>
				</div>
			{:else}
				{#each readyEntries as entry (entry.id)}
					<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40 rounded-2xl hover:shadow-sm transition">
						<div class="flex items-start gap-4">
							<!-- Mini preview o icono -->
							<div class="h-14 w-14 rounded-xl bg-gradient-to-br from-[#253166] to-orange-500 flex items-center justify-center text-white shrink-0 shadow-inner">
								<Megaphone class="h-5 w-5" />
							</div>
							<div class="space-y-1">
								<div class="flex flex-wrap items-center gap-2">
									<span class="rounded-full bg-[#253166]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#253166] dark:bg-[#253166]/20 dark:text-blue-300">
										{entry.brand}
									</span>
									<span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
										{entry.network}
									</span>
									<Badge variant={entry.status === 'Programado' ? 'success' : 'secondary'}>
										{entry.status}
									</Badge>
								</div>
								<h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.title}</h4>
								<p class="text-xs text-slate-500 line-clamp-1 dark:text-slate-400">{entry.copy || 'Sin copy redactado.'}</p>
							</div>
						</div>

						<div class="flex items-center gap-4 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0 shrink-0">
							<div class="text-right text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
								<div class="flex items-center gap-1.5 justify-end">
									<Calendar class="h-3 w-3" />
									<span>{entry.date.day}/{entry.date.month}/{entry.date.year}</span>
								</div>
								<div class="flex items-center gap-1.5 justify-end mt-0.5">
									<Clock class="h-3 w-3" />
									<span>{entry.time} hs</span>
								</div>
							</div>
							
							<div class="flex gap-2 w-full md:w-auto">
								<Button 
									class="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white"
									onclick={() => publishNow(entry)}
									disabled={publishingId === entry.id}
								>
									{#if publishingId === entry.id}
										<span class="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
										Conectando API...
									{:else}
										<Send class="h-3.5 w-3.5 mr-2" />
										Publicar en Meta
									{/if}
								</Button>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</Card.Root>

	<!-- Logs históricos -->
	<Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
		<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
			Historial de Publicaciones (publishing_logs)
		</h3>
		<p class="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
			Registro de transacciones asíncronas con la API de Meta Graph para auditoría de campañas.
		</p>

		<div class="mt-4 overflow-x-auto">
			<table class="w-full border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-slate-100 text-slate-400 dark:border-slate-900">
						<th class="py-3 font-semibold">Fecha/Hora</th>
						<th class="py-3 font-semibold">Marca</th>
						<th class="py-3 font-semibold">Red Social</th>
						<th class="py-3 font-semibold">Publicación</th>
						<th class="py-3 font-semibold">Estado API</th>
						<th class="py-3 font-semibold">Log ID</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-900">
					{#each publishLogs as log (log.id)}
						<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
							<td class="py-3 text-slate-500">{log.timestamp}</td>
							<td class="py-3 font-medium text-slate-900 dark:text-slate-200">{log.brand}</td>
							<td class="py-3 text-slate-600 dark:text-slate-400">{log.network}</td>
							<td class="py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{log.title}</td>
							<td class="py-3">
								<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
									<Check class="h-3 w-3" />
									{log.status}
								</span>
							</td>
							<td class="py-3 font-mono text-[10px] text-slate-400">{log.logId}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card.Root>
</div>
