<script lang="ts">
	import {
		Settings,
		Database,
		Clock,
		Activity,
		Play,
		TriangleAlert,
		CircleCheck,
		Users,
		ShieldCheck,
		FileJson,
		Bot
	} from 'lucide-svelte';
	import { Card } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy } from 'svelte';

	// Componentes hijos
	import ProcesamintoHistorial from '$lib/components/app/admin/procesamiento-historial.svelte';
	import GestionUsuarios from '$lib/components/app/admin/gestion-usuarios.svelte';
	import BackupRestauracion from '$lib/components/app/admin/backup-restauracion.svelte';
	import ExportJson from '$lib/components/app/admin/export-json.svelte';
	import ExportPedidos from '$lib/components/app/admin/export-pedidos.svelte';
	import GestionBodegasExcluidas from '$lib/components/app/admin/gestion-bodegas-excluidas.svelte';
	import ConsultarSKUBodegas from '$lib/components/app/admin/consultar-sku-bodegas.svelte';
	import SimularForecast from '$lib/components/app/admin/simular-forecast.svelte';
	import GestionIA from '$lib/components/ia-chat/GestionIA.svelte';
	import GestionMarcasLt from '$lib/components/app/admin/gestion-marcas-lt.svelte';

	let { data = $bindable(), user = $bindable() } = $props();

	// Estados
	let procesando = $state(false);
	let progreso = $state(0);
	let totalSKUs = $state(0);
	let procesados = $state(0);
	let mensaje = $state('');
	let ultimoProcesamiento = $state<any>(null);

	// Estados para gestión de usuarios
	let estadisticas = $state({
		usuariosTotales: 0,
		usuariosPendientes: 0,
		usuariosActivos: 0
	});

	// --- FUNCIONES ---
	async function cargarUltimoProcesamiento() {
		try {
			const res = await fetch('/api/admin/ultimo-procesamiento');
			if (res.ok) ultimoProcesamiento = await res.json();
		} catch (error) {
			console.error(error);
		}
	}

	async function procesarForecast() {
		if (procesando) return;
		if (
			!confirm(
				'¿Está seguro de ejecutar el procesamiento de forecast?\n\nEsto puede tardar varios minutos.'
			)
		)
			return;

		procesando = true;
		progreso = 0;
		procesados = 0;
		mensaje = 'Iniciando procesamiento...';

		try {
			const res = await fetch('/api/admin/procesar-forecast', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			if (!res.ok) throw new Error('Error al iniciar procesamiento');

			const reader = res.body?.getReader();
			const decoder = new TextDecoder();

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					const chunk = decoder.decode(value);
					const lines = chunk.split('\n').filter((l) => l.trim());
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							try {
								const data = JSON.parse(line.substring(6));
								if (data.type === 'progress') {
									procesados = data.procesados;
									totalSKUs = data.total;
									progreso = (procesados / totalSKUs) * 100;
									mensaje = data.mensaje;
								}
								if (data.type === 'complete') {
									procesando = false;
									toast.success('Procesamiento completado', {
										description: `${data.totalSKUs} SKUs procesados.`
									});
									await cargarUltimoProcesamiento();
								}
								if (data.type === 'error') throw new Error(data.error);
							} catch (e) {
								console.error(e);
							}
						}
					}
				}
			}
		} catch (error) {
			console.error(error);
			toast.error('Error en procesamiento');
		} finally {
			procesando = false;
		}
	}

	onMount(() => {
		cargarUltimoProcesamiento();
	});

	onDestroy(() => {
		procesando = false;
	});
</script>

<div class="flex flex-1 flex-col p-8 space-y-10 max-w-7xl mx-auto pb-20">
	<div class="flex items-center justify-between border-b pb-6">
		<div>
			<div
				class="inline-flex items-center gap-2 rounded-full bg-orange-100 dark:bg-orange-900/30 px-3 py-1 mb-2"
			>
				<span
					class="text-[10px] font-bold tracking-wider text-orange-700 dark:text-orange-300 uppercase"
					>Admin Zone</span
				>
			</div>
			<h1 class="text-3xl font-bold tracking-tight">Administración del Sistema</h1>
			<p class="text-muted-foreground mt-1">Control de forecast, usuarios y seguridad.</p>
		</div>
		<div class="p-3 bg-muted/50 rounded-full">
			<Settings class="h-8 w-8 text-muted-foreground" />
		</div>
	</div>

	<section class="space-y-5">
		<div class="flex items-center gap-2">
			<div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
				<Database class="h-5 w-5 text-blue-600 dark:text-blue-400" />
			</div>
			<h2 class="text-xl font-semibold">Motor de Forecast</h2>
		</div>

		<Card class="overflow-hidden border-blue-100 dark:border-blue-900 shadow-sm">
			<div
				class="bg-blue-50/50 dark:bg-blue-950/20 p-6 border-b border-blue-100 dark:border-blue-900/50"
			>
				<div class="flex flex-col md:flex-row items-center justify-between gap-6">
					<div class="flex items-start gap-4 w-full md:w-auto">
						<div
							class="rounded-lg bg-white dark:bg-blue-950 p-3 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900"
						>
							<Activity class="h-6 w-6 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<h3 class="font-semibold text-lg">Ejecutar Nuevo Cálculo</h3>
							<p class="text-sm text-muted-foreground max-w-lg">
								Este proceso extrae la data actual de Exactus, calcula las proyecciones y actualiza
								la base de datos local.
							</p>

							{#if ultimoProcesamiento}
								<div class="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
									<div
										class="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border"
									>
										<Clock class="h-3 w-3" />
										<span
											>Última vez: {new Date(ultimoProcesamiento.fecha).toLocaleString(
												'es-CR'
											)}</span
										>
									</div>
									<div
										class="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border"
									>
										<span class="font-medium text-blue-600"
											>{ultimoProcesamiento.total.toLocaleString()}</span
										> SKUs
									</div>
								</div>
							{/if}
						</div>
					</div>

					<div class="w-full md:w-auto shrink-0">
						{#if !procesando}
							<button
								onclick={procesarForecast}
								class="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
							>
								<Play class="h-4 w-4 fill-current" />
								Iniciar Procesamiento
							</button>
						{:else}
							<div class="w-full md:w-64 space-y-2">
								<div class="flex justify-between text-xs font-medium">
									<span class="text-blue-600 animate-pulse">{mensaje}</span>
									<span>{progreso.toFixed(0)}%</span>
								</div>
								<Progress value={progreso} class="h-2 w-full" />
								<p class="text-xs text-center text-muted-foreground">
									{procesados.toLocaleString()} / {totalSKUs.toLocaleString()}
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</Card>

		<ProcesamintoHistorial />
	</section>

	<!-- ===== GESTIÓN DE BODEGAS ===== -->
	<section class="space-y-5">
		<div class="flex items-center gap-2">
			<div class="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
				<Database class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
			</div>
			<h2 class="text-xl font-semibold">Gestión de Bodegas</h2>
		</div>

		<div class="space-y-3">
			<h3 class="text-sm font-semibold text-muted-foreground">1️⃣ Configurar Bodegas Excluidas</h3>
			<GestionBodegasExcluidas />
		</div>

		<div class="border-t"></div>

		<div class="space-y-3">
			<h3 class="text-sm font-semibold text-muted-foreground">2️⃣ Consultar SKU por Bodega</h3>
			<ConsultarSKUBodegas />
		</div>

		<div class="border-t"></div>

		<div class="space-y-3">
			<h3 class="text-sm font-semibold text-muted-foreground">3️⃣ Simular Forecast</h3>
			<SimularForecast />
		</div>
	</section>

	<!-- ===== LEAD TIME POR PROVEEDOR ===== -->
	<section class="space-y-5">
		<div class="flex items-center gap-2">
			<div class="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-md">
				<Clock class="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
			</div>
			<h2 class="text-xl font-semibold">Lead Time por Proveedor</h2>
		</div>

		<GestionMarcasLt />
	</section>

	<div class="border-t"></div>

	<section class="space-y-5">
		<div class="flex items-center gap-2">
			<div class="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
				<Users class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
			</div>
			<h2 class="text-xl font-semibold">Usuarios y Accesos</h2>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<Card class="p-4 flex items-center gap-4 border-l-4 border-l-blue-500 shadow-sm">
				<div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
					<Users class="h-5 w-5 text-blue-600" />
				</div>
				<div>
					<p class="text-xs text-muted-foreground font-medium uppercase">Total Registrados</p>
					<p class="text-2xl font-bold">{estadisticas.usuariosTotales}</p>
				</div>
			</Card>
			<Card class="p-4 flex items-center gap-4 border-l-4 border-l-yellow-500 shadow-sm">
				<div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
					<TriangleAlert class="h-5 w-5 text-yellow-600" />
				</div>
				<div>
					<p class="text-xs text-muted-foreground font-medium uppercase">Pendientes</p>
					<p class="text-2xl font-bold">{estadisticas.usuariosPendientes}</p>
				</div>
			</Card>
			<Card class="p-4 flex items-center gap-4 border-l-4 border-l-green-500 shadow-sm">
				<div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
					<CircleCheck class="h-5 w-5 text-green-600" />
				</div>
				<div>
					<p class="text-xs text-muted-foreground font-medium uppercase">Activos</p>
					<p class="text-2xl font-bold">{estadisticas.usuariosActivos}</p>
				</div>
			</Card>
		</div>

		<GestionUsuarios onStatsUpdate={(nuevasStats) => (estadisticas = nuevasStats)} />
	</section>

	<div class="border-t"></div>

	<section class="space-y-5">
		<div class="flex items-center gap-2">
			<div class="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
				<FileJson class="h-5 w-5 text-purple-600 dark:text-purple-400" />
			</div>
			<h2 class="text-xl font-semibold">Exportar Datos (PowerBI)</h2>
		</div>

		<ExportJson />
		<ExportPedidos />
	</section>

	<div class="border-t"></div>

	<section class="space-y-5">
		<div class="flex items-center gap-2">
			<div class="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
				<ShieldCheck class="h-5 w-5 text-slate-600 dark:text-slate-400" />
			</div>
			<h2 class="text-xl font-semibold">Seguridad y Respaldo</h2>
		</div>

		<BackupRestauracion />
	</section>

	<section class="space-y-5">
		<div class="flex items-center gap-2">
			<div class="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
				<Bot class="h-5 w-5 text-slate-600 dark:text-slate-400" />
			</div>
			<h2 class="text-xl font-semibold">Inteligencia Artificial</h2>
		</div>

		<GestionIA />
	</section>
</div>
