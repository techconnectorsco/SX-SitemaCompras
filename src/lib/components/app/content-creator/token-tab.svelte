<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Shield, Coins, AlertOctagon, History, Settings, RefreshCw, BarChart2 } from 'lucide-svelte';

	let currentRole = $state<'Super Admin' | 'Admin por País' | 'Analista'>('Super Admin');
	let selectedCountry = $state<string>('Costa Rica');

	// Cuotas editables por rol
	let quotas = $state<Record<string, number>>({
		'Admin por País': 5000000,
		'Analista': 1000000
	});

	// Registro de consumos
	let tokenLogs = $state<Array<{
		id: string;
		user: string;
		role: string;
		model: string;
		task: string;
		tokens: number;
		cost: number;
		timestamp: string;
	}>>([
		{ id: 't-1', user: 'Carlos M.', role: 'Analista', model: 'Gemini 2.5 Flash', task: 'Generación de Copy', tokens: 1240, cost: 0.0037, timestamp: '10 mins ago' },
		{ id: 't-2', user: 'Fernanda G.', role: 'Admin por País', model: 'Claude 3.5 Sonnet', task: 'Redacción Blog SEO', tokens: 8200, cost: 0.1230, timestamp: '1 hour ago' },
		{ id: 't-3', user: 'Carlos M.', role: 'Analista', model: 'Imagen 4 Standard', task: 'Composición de Imagen', tokens: 1, cost: 0.0400, timestamp: '3 hours ago' },
		{ id: 't-4', user: 'Sofia V.', role: 'Super Admin', model: 'Gemini 2.5 Pro', task: 'Planificador Campaña', tokens: 14500, cost: 0.1812, timestamp: '1 day ago' }
	]);

	let monthlySpent = $derived.by(() => {
		// Simular acumulado del mes
		if (selectedCountry === 'Costa Rica') return 1240500;
		if (selectedCountry === 'Panamá') return 480200;
		return 120500;
	});

	let limitForRole = $derived.by(() => {
		if (currentRole === 'Super Admin') return Infinity;
		if (currentRole === 'Admin por País') return quotas['Admin por País'];
		return quotas['Analista'];
	});

	let limitPercentage = $derived.by(() => {
		if (limitForRole === Infinity) return 0;
		return Math.min(100, Math.round((monthlySpent / limitForRole) * 100));
	});

	function saveQuotas() {
		toast.success('Cuotas de límite de tokens actualizadas');
	}

	function resetLogs() {
		toast.success('Logs de auditoría actualizados en tiempo real');
	}
</script>

<div class="space-y-6">
	<!-- Control de Rol y Configuración de Cuotas -->
	<div class="grid gap-6 lg:grid-cols-[1fr_360px]">
		
		<!-- Cuadro de Mando del Consumo -->
		<Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
			<div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-900">
				<div>
					<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
						<Coins class="h-4 w-4 text-amber-500" />
						Gestor de Tokens y Costos de IA
					</h3>
					<p class="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
						Monitoreo del consumo de APIs (Gemini & Claude) y límites asignados por perfil organizativo.
					</p>
				</div>
				
				<div class="flex gap-2">
					<select 
						bind:value={selectedCountry}
						class="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950"
					>
						<option value="Costa Rica">Costa Rica</option>
						<option value="Panamá">Panamá</option>
						<option value="Guatemala">Guatemala</option>
					</select>
				</div>
			</div>

			<!-- Visualización de Consumo actual -->
			<div class="mt-5 space-y-4">
				<div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
					<span>Rol Simulado: <span class="font-semibold text-[#0D1E3D] dark:text-blue-400">{currentRole}</span></span>
					<span>Límite de Rol: {limitForRole === Infinity ? 'Ilimitado (Auditable)' : `${limitForRole.toLocaleString()} tokens`}</span>
				</div>

				<div class="space-y-1.5">
					<div class="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
						<span>Tokens Consumidos ({selectedCountry})</span>
						<span>{monthlySpent.toLocaleString()} tokens ({limitPercentage}%)</span>
					</div>
					<div class="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
						<div 
							class="h-full rounded-full transition-all duration-500 {limitPercentage > 80 ? 'bg-rose-500' : limitPercentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}"
							style="width: {limitForRole === Infinity ? '15%' : limitPercentage}%"
						></div>
					</div>
				</div>

				<!-- Avisos de Riesgo/Alerta -->
				{#if limitPercentage > 80 && currentRole !== 'Super Admin'}
					<div class="flex gap-3 items-start p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs dark:bg-rose-950/20 dark:border-rose-950 dark:text-rose-400">
						<AlertOctagon class="h-4 w-4 shrink-0 mt-0.5" />
						<div>
							<p class="font-semibold">Alerta de Cuota Crítica</p>
							<p class="mt-0.5">Estás cerca de agotar la cuota mensual asignada para tu rol. Ponte en contacto con el administrador para solicitar una ampliación.</p>
						</div>
					</div>
				{:else if currentRole === 'Super Admin'}
					<div class="flex gap-3 items-start p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs dark:bg-emerald-950/20 dark:border-emerald-950 dark:text-emerald-400">
						<Shield class="h-4 w-4 shrink-0 mt-0.5" />
						<div>
							<p class="font-semibold">Modo de Administración Activo</p>
							<p class="mt-0.5">Como Super Admin posees acceso auditable sin restricciones. Puedes ajustar las cuotas preestablecidas para los roles de menor rango en el menú lateral.</p>
						</div>
					</div>
				{/if}
			</div>
		</Card.Root>

		<!-- Selector de Simulación de Rol (Exclusivo para la demo del front) -->
		<Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
			<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
				<Settings class="h-4 w-4 text-slate-500" />
				Ajustes de Demo y Cuotas
			</h3>
			<p class="text-xs text-slate-500 mt-0.5 dark:text-slate-400">Prueba cómo cambian las alertas del sistema cambiando de rol.</p>

			<div class="mt-4 space-y-4">
				<div>
					<label class="text-xs font-semibold text-slate-700 dark:text-slate-300" for="role-select">Cambiar Rol</label>
					<select 
						id="role-select"
						bind:value={currentRole}
						class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950"
					>
						<option value="Super Admin">Super Admin</option>
						<option value="Admin por País">Admin por País</option>
						<option value="Analista">Analista</option>
					</select>
				</div>

				{#if currentRole === 'Super Admin'}
					<div class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-900">
						<div>
							<label class="text-xs font-semibold text-slate-700 dark:text-slate-300" for="quota-admin-input">
								Cuota Admin País (tokens)
							</label>
							<input 
								id="quota-admin-input"
								type="number" 
								bind:value={quotas['Admin por País']} 
								class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950" 
							/>
						</div>
						<div>
							<label class="text-xs font-semibold text-slate-700 dark:text-slate-300" for="quota-analyst-input">
								Cuota Analista (tokens)
							</label>
							<input 
								id="quota-analyst-input"
								type="number" 
								bind:value={quotas['Analista']} 
								class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950" 
							/>
						</div>
						<Button class="w-full" onclick={saveQuotas}>Actualizar cuotas</Button>
					</div>
				{/if}
			</div>
		</Card.Root>
	</div>

	<!-- Tabla de Auditoría -->
	<Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
		<div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-900">
			<div>
				<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
					<History class="h-4 w-4 text-slate-500" />
					Bitácora de Consumo Reciente (token_usage_log)
				</h3>
				<p class="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
					Auditoría detallada de las llamadas a LLMs por usuario y costo financiero aproximado.
				</p>
			</div>
			<Button variant="outline" size="sm" onclick={resetLogs}>
				<RefreshCw class="h-3.5 w-3.5 mr-1.5" />
				Refrescar
			</Button>
		</div>

		<div class="mt-4 overflow-x-auto">
			<table class="w-full border-collapse text-left text-xs">
				<thead>
					<tr class="border-b border-slate-100 text-slate-400 dark:border-slate-900">
						<th class="py-3 font-semibold">Usuario</th>
						<th class="py-3 font-semibold">Modelo</th>
						<th class="py-3 font-semibold">Acción Realizada</th>
						<th class="py-3 font-semibold">Tokens Usados</th>
						<th class="py-3 font-semibold">Costo USD</th>
						<th class="py-3 font-semibold">Momento</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-900">
					{#each tokenLogs as log (log.id)}
						<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
							<td class="py-3 font-medium text-slate-900 dark:text-slate-200">{log.user} ({log.role})</td>
							<td class="py-3 text-slate-600 dark:text-slate-400">{log.model}</td>
							<td class="py-3 text-slate-700 dark:text-slate-300">{log.task}</td>
							<td class="py-3 font-mono">{log.tokens.toLocaleString()}</td>
							<td class="py-3 font-mono text-emerald-600 dark:text-emerald-400">${log.cost.toFixed(4)}</td>
							<td class="py-3 text-slate-400">{log.timestamp}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card.Root>
</div>
