<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	export let data: PageData;
	export let form;

	let filtroEstado: 'pendiente' | 'aprobada' | 'rechazada' | 'todos' = 'pendiente';
	let solicitudAExpandir: string | null = null;
	let notasRechazar: Record<string, string> = {};
	let cargando = false;

	$: solicitudesFiltradas = data.solicitudes.filter(
		(s) => filtroEstado === 'todos' || s.estado === filtroEstado
	);

	const getEstadoBadgeColor = (estado: string) => {
		switch (estado) {
			case 'pendiente':
				return 'bg-yellow-500/15 text-yellow-700';
			case 'aprobada':
				return 'bg-green-500/15 text-green-700';
			case 'rechazada':
				return 'bg-red-500/15 text-red-700';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};

	const getEstadoIcono = (estado: string) => {
		switch (estado) {
			case 'pendiente':
				return '⏳';
			case 'aprobada':
				return '✅';
			case 'rechazada':
				return '❌';
			default:
				return '•';
		}
	};
</script>

<div class="py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-5xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-foreground">Solicitudes de Acceso</h1>
			<p class="mt-2 text-muted-foreground">Gestiona las solicitudes de acceso de usuarios a clientes</p>
		</div>

		<!-- Mensajes de éxito/error -->
		{#if form?.error}
			<div class="mb-6 p-4 bg-red-500/15 text-red-700 rounded-lg">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="mb-6 p-4 bg-green-500/15 text-green-700 rounded-lg">
				Solicitud procesada correctamente
			</div>
		{/if}

		<!-- Filtros -->
		<div class="mb-6 flex gap-3 flex-wrap">
			<button
				on:click={() => (filtroEstado = 'pendiente')}
				class={`px-4 py-2 rounded-lg transition ${
					filtroEstado === 'pendiente'
						? 'bg-yellow-500 text-white'
						: 'bg-card text-foreground border border-border'
				}`}
			>
				⏳ Pendientes ({data.solicitudes.filter((s) => s.estado === 'pendiente').length})
			</button>
			<button
				on:click={() => (filtroEstado = 'aprobada')}
				class={`px-4 py-2 rounded-lg transition ${
					filtroEstado === 'aprobada'
						? 'bg-green-500 text-white'
						: 'bg-card text-foreground border border-border'
				}`}
			>
				✅ Aprobadas ({data.solicitudes.filter((s) => s.estado === 'aprobada').length})
			</button>
			<button
				on:click={() => (filtroEstado = 'rechazada')}
				class={`px-4 py-2 rounded-lg transition ${
					filtroEstado === 'rechazada'
						? 'bg-red-500 text-white'
						: 'bg-card text-foreground border border-border'
				}`}
			>
				❌ Rechazadas ({data.solicitudes.filter((s) => s.estado === 'rechazada').length})
			</button>
			<button
				on:click={() => (filtroEstado = 'todos')}
				class={`px-4 py-2 rounded-lg transition ${
					filtroEstado === 'todos'
						? 'bg-blue-500 text-white'
						: 'bg-card text-foreground border border-border'
				}`}
			>
				📋 Todas ({data.solicitudes.length})
			</button>
		</div>

		<!-- Lista de solicitudes -->
		<div class="space-y-4">
			{#if solicitudesFiltradas.length === 0}
				<div class="text-center py-12 bg-card rounded-lg border border-border">
					<p class="text-muted-foreground text-lg">No hay solicitudes para mostrar</p>
				</div>
			{:else}
				{#each solicitudesFiltradas as solicitud (solicitud.id)}
					<div class="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition">
						<!-- Encabezado de solicitud (colapsable) -->
						<button
							on:click={() => {
								solicitudAExpandir =
									solicitudAExpandir === solicitud.id ? null : solicitud.id;
							}}
							class="w-full p-4 flex items-center justify-between hover:bg-muted transition"
						>
							<div class="flex-1 text-left">
								<div class="flex items-center gap-3">
									<span class="text-2xl">{getEstadoIcono(solicitud.estado)}</span>
									<div>
										<h3 class="font-semibold text-foreground">
											{solicitud.nombre_completo || solicitud.email}
										</h3>
										<p class="text-sm text-muted-foreground">{solicitud.email}</p>
									</div>
									<span class={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadgeColor(solicitud.estado)}`}>
										{solicitud.estado}
									</span>
								</div>
								<p class="mt-2 text-sm text-muted-foreground">
									📧 Solicita acceso a: <strong class="text-foreground">{solicitud.cliente_nombre}</strong>
								</p>
								<p class="text-xs text-muted-foreground mt-1">
									Creada: {new Date(solicitud.created_at).toLocaleDateString('es-ES')}
								</p>
							</div>
							<div class="ml-4 text-muted-foreground">
								{solicitudAExpandir === solicitud.id ? '▼' : '▶'}
							</div>
						</button>

						<!-- Detalles expandidos -->
						{#if solicitudAExpandir === solicitud.id}
							<div class="border-t border-border p-4 bg-muted space-y-4">
								<!-- Información del usuario -->
								<div class="grid grid-cols-2 gap-4">
									<div>
										<p class="text-sm font-medium text-foreground">Empresa</p>
										<p class="text-sm text-muted-foreground">{solicitud.perfil_empresa || '—'}</p>
									</div>
									<div>
										<p class="text-sm font-medium text-foreground">Cargo</p>
										<p class="text-sm text-muted-foreground">{solicitud.perfil_cargo || '—'}</p>
									</div>
									<div>
										<p class="text-sm font-medium text-foreground">Teléfono</p>
										<p class="text-sm text-muted-foreground">{solicitud.telefono || '—'}</p>
									</div>
									<div>
										<p class="text-sm font-medium text-foreground">Cliente solicitado</p>
										<p class="text-sm text-muted-foreground">{solicitud.cliente_nombre}</p>
									</div>
								</div>

								<!-- Mensaje de solicitud -->
								{#if solicitud.mensaje}
									<div class="bg-card p-3 rounded border border-border">
										<p class="text-sm font-medium text-foreground mb-2">Mensaje:</p>
										<p class="text-sm text-muted-foreground">{solicitud.mensaje}</p>
									</div>
								{/if}

								<!-- Notas del admin (si existe rechazo) -->
								{#if solicitud.notas_admin}
									<div class="bg-red-500/10 p-3 rounded border border-red-500/30">
										<p class="text-sm font-medium text-red-700 mb-2">Notas de rechazo:</p>
										<p class="text-sm text-red-600">{solicitud.notas_admin}</p>
									</div>
								{/if}

								<!-- Acciones según estado -->
								{#if solicitud.estado === 'pendiente'}
									<div class="flex gap-3 pt-4 border-t border-border">
										<!-- Aprobar -->
										<form
											method="POST"
											action="?/aprobar"
											use:enhance={() => {
												cargando = true;
												return async ({ update }) => {
													cargando = false;
													await update();
												};
											}}
											class="flex-1"
										>
											<input type="hidden" name="solicitudId" value={solicitud.id} />
											<button
												type="submit"
												disabled={cargando}
												class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
											>
												✅ Aprobar acceso
											</button>
										</form>

										<!-- Rechazar -->
										<div class="flex-1">
											<details class="group">
												<summary class="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition cursor-pointer text-center">
													❌ Rechazar
												</summary>
												<div class="absolute mt-2 p-3 bg-card border border-border rounded-lg shadow-lg z-10 w-80">
													<!-- svelte-ignore element_invalid_self_closing_tag -->
													<textarea
														bind:value={notasRechazar[solicitud.id]}
														placeholder="Motivo del rechazo (opcional)"
														class="w-full px-3 py-2 border border-input rounded text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-3"
														rows="3"
													/>
													<form
														method="POST"
														action="?/rechazar"
														use:enhance={() => {
															cargando = true;
															return async ({ update }) => {
																cargando = false;
																await update();
															};
														}}
													>
														<input type="hidden" name="solicitudId" value={solicitud.id} />
														<input type="hidden" name="notas" value={notasRechazar[solicitud.id] || ''} />
														<button
															type="submit"
															disabled={cargando}
															class="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50"
														>
															Confirmar rechazo
														</button>
													</form>
												</div>
											</details>
										</div>
									</div>
								{:else}
									<div class="bg-muted p-3 rounded text-center text-muted-foreground text-sm">
										Esta solicitud ya ha sido procesada
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
