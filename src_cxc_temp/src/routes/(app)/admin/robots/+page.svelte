<script lang="ts">
	import { apiService } from '$lib/services/api.service';
	import type { PageData } from './$types';

	export let data: PageData;

	let filtroCliente: string = 'todos';
	let cargando: Record<string, boolean> = {};
	let mensajeExito: string | null = null;
	let mensajeError: string | null = null;
	let robotsActualizados = data.robots;

	$: robotsFiltrados = robotsActualizados.filter(
		(r) => filtroCliente === 'todos' || r.cliente_id === filtroCliente
	);

	const toggleRobot = async (robotId: string, nuevoEstado: boolean, nombreRobot: string) => {
		cargando[robotId] = true;
		mensajeExito = null;
		mensajeError = null;

		try {
			const respuesta = await apiService.toggleRobot(robotId, nuevoEstado);

			if (respuesta.success) {
				// Actualizar estado local
				robotsActualizados = robotsActualizados.map((r) =>
					r.id === robotId ? { ...r, esta_activa: nuevoEstado } : r
				);

				const accion = nuevoEstado ? 'Activado' : 'Desactivado';
				mensajeExito = `✅ ${nombreRobot} ${accion.toLowerCase()} correctamente`;

				// Limpiar mensaje después de 3 segundos
				setTimeout(() => {
					mensajeExito = null;
				}, 3000);
			} else {
				mensajeError = 'Error al cambiar el estado del robot';
			}
		} catch (error) {
			mensajeError = error instanceof Error ? error.message : 'Error desconocido';
			console.error('Error toggleando robot:', error);
		} finally {
			cargando[robotId] = false;
		}
	};

	const getEstadoBadgeColor = (estaActivo: boolean) => {
		return estaActivo ? 'bg-green-500/15 text-green-700' : 'bg-red-500/15 text-red-700';
	};

	const getEstadoIcono = (estaActivo: boolean) => {
		return estaActivo ? '✅' : '⛔';
	};
</script>

<div class="py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-foreground">Control de Robots</h1>
			<p class="mt-2 text-muted-foreground">Activa o desactiva robots RPA de todos tus clientes</p>
		</div>

		<!-- Mensajes -->
		{#if mensajeExito}
			<div class="mb-6 p-4 bg-green-500/15 text-green-700 rounded-lg animate-pulse">
				{mensajeExito}
			</div>
		{/if}

		{#if mensajeError}
			<div class="mb-6 p-4 bg-red-500/15 text-red-700 rounded-lg">
				{mensajeError}
			</div>
		{/if}

		<!-- Filtro por cliente -->
		<div class="mb-6 flex gap-3 flex-wrap">
			<button
				on:click={() => (filtroCliente = 'todos')}
				class={`px-4 py-2 rounded-lg transition ${
					filtroCliente === 'todos'
						? 'bg-blue-500 text-white'
						: 'bg-card text-foreground border border-border'
				}`}
			>
				📋 Todos ({data.robots.length})
			</button>
			{#each data.clientes as cliente (cliente.id)}
				<button
					on:click={() => (filtroCliente = cliente.id)}
					class={`px-4 py-2 rounded-lg transition ${
						filtroCliente === cliente.id
							? 'bg-blue-500 text-white'
							: 'bg-card text-foreground border border-border'
					}`}
				>
					🏢 {cliente.nombre} ({data.robots.filter((r) => r.cliente_id === cliente.id).length})
				</button>
			{/each}
		</div>

		<!-- Grid de robots -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#if robotsFiltrados.length === 0}
				<div class="col-span-full text-center py-12 bg-card rounded-lg border border-border">
					<p class="text-muted-foreground text-lg">No hay robots para mostrar</p>
				</div>
			{:else}
				{#each robotsFiltrados as robot (robot.id)}
					<div class="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition p-6">
						<!-- Encabezado -->
						<div class="flex items-start justify-between mb-4">
							<div>
								<div class="flex items-center gap-2">
									<span class="text-2xl">🤖</span>
									<h3 class="font-semibold text-foreground text-lg">{robot.nombre}</h3>
								</div>
								<p class="text-sm text-muted-foreground mt-1">
									Cliente: <strong class="text-foreground">{robot.clienteNombre}</strong>
								</p>
							</div>
							<span class={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadgeColor(robot.esta_activa)}`}>
								{getEstadoIcono(robot.esta_activa)} {robot.esta_activa ? 'Activo' : 'Inactivo'}
							</span>
						</div>

						<!-- Información -->
						<div class="space-y-3 mb-6 text-sm text-muted-foreground">
							{#if robot.descripcion}
								<p><strong class="text-foreground">Descripción:</strong> {robot.descripcion}</p>
							{/if}
							{#if robot.frecuencia}
								<p><strong class="text-foreground">Frecuencia:</strong> {robot.frecuencia}</p>
							{/if}
							{#if robot.created_at}
								<p><strong class="text-foreground">Creado:</strong> {new Date(robot.created_at).toLocaleDateString('es-ES')}</p>
							{/if}
						</div>

						<!-- Botón de control -->
						{#if robot.esta_activa}
							<button
								on:click={() => toggleRobot(robot.id, false, robot.nombre)}
								disabled={cargando[robot.id]}
								class="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
							>
								{cargando[robot.id] ? 'Desactivando...' : '🔴 Desactivar Robot'}
							</button>
						{:else}
							<button
								on:click={() => toggleRobot(robot.id, true, robot.nombre)}
								disabled={cargando[robot.id]}
								class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
							>
								{cargando[robot.id] ? 'Activando...' : '🟢 Activar Robot'}
							</button>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		<!-- Stats generales -->
		<div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="bg-card rounded-lg border border-border p-6 text-center">
				<p class="text-4xl font-bold text-blue-600">{data.robots.length}</p>
				<p class="text-muted-foreground mt-2">Robots totales</p>
			</div>
			<div class="bg-card rounded-lg border border-border p-6 text-center">
				<p class="text-4xl font-bold text-green-600">{data.robots.filter((r) => r.esta_activa).length}</p>
				<p class="text-muted-foreground mt-2">Activos</p>
			</div>
			<div class="bg-card rounded-lg border border-border p-6 text-center">
				<p class="text-4xl font-bold text-red-600">{data.robots.filter((r) => !r.esta_activa).length}</p>
				<p class="text-muted-foreground mt-2">Desactivados</p>
			</div>
		</div>
	</div>
</div>
