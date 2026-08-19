<script lang="ts">
	import { onMount } from 'svelte';
	import ChatConsulta from './ChatConsulta.svelte';

	let consultas = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let consultaSeleccionada = $state<string | null>(null);

	// Filtros
	let filtroRol = $state<'todas' | 'cliente' | 'propietario'>('todas');
	let filtroEstado = $state<'todas' | 'new' | 'in_progress' | 'closed'>('todas');

	let consultasFiltradas = $derived(() => {
		let resultado = consultas;

		if (filtroEstado !== 'todas') {
			resultado = resultado.filter((c) => c.estado === filtroEstado);
		}

		// Ordenar por fecha de actualización (más reciente primero)
		return resultado.sort((a, b) => {
			const dateA = new Date(a.fecha_actualizacion || a.fecha_creacion);
			const dateB = new Date(b.fecha_actualizacion || b.fecha_creacion);
			return dateB.getTime() - dateA.getTime();
		});
	});

	async function cargarConsultas() {
		loading = true;
		error = null;

		try {
			const res = await fetch('/api/consultas');
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar consultas');
			}

			consultas = data.consultas || [];
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function abrirChat(consultaId: string) {
		consultaSeleccionada = consultaId;
	}

	function cerrarChat() {
		consultaSeleccionada = null;
		cargarConsultas(); // Recargar para actualizar estados
	}

	onMount(() => {
		cargarConsultas();
	});
</script>

<div class="lista-consultas">
	{#if consultaSeleccionada}
		<ChatConsulta consultaId={consultaSeleccionada} onClose={cerrarChat} />
	{:else}
		<div class="header">
			<h2>Mis Solicitudes</h2>
			<div class="filtros">
				<select bind:value={filtroEstado}>
					<option value="todas">Todas</option>
					<option value="new">Nuevas</option>
					<option value="in_progress">En progreso</option>
					<option value="closed">Cerradas</option>
				</select>
			</div>
		</div>

		{#if loading}
			<div class="loading">Cargando solicitudes...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else if consultasFiltradas().length === 0}
			<div class="empty">
				<p>No tienes solicitudes {filtroEstado !== 'todas' ? `en estado "${filtroEstado}"` : ''}</p>
			</div>
		{:else}
			<div class="consultas-grid">
				{#each consultasFiltradas() as consulta}
				<button class="consulta-card" onclick={() => abrirChat(consulta.id)}>
						<div class="consulta-header">
							<h3>{consulta.anuncios?.titulo || 'Propiedad'}</h3>
							<span class="estado estado-{consulta.estado}">
								{consulta.estado === 'new'
									? 'Nueva'
									: consulta.estado === 'in_progress'
										? 'En proceso'
										: 'Cerrada'}
							</span>
						</div>
						<p class="consulta-mensaje">{consulta.mensaje}</p>
						<div class="consulta-footer">
							<span class="consulta-fecha">
								{new Date(consulta.fecha_actualizacion || consulta.fecha_creacion).toLocaleDateString()}
							</span>
							{#if consulta.anuncios?.precio}
								<span class="consulta-precio">
									₡{consulta.anuncios.precio.toLocaleString()}
								</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.lista-consultas {
		padding: 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.filtros select {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: white;
		cursor: pointer;
	}

	.loading,
	.error,
	.empty {
		padding: 3rem;
		text-align: center;
	}

	.error {
		color: #dc2626;
	}

	.empty p {
		color: #9ca3af;
		margin: 0;
	}

	.consultas-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.consulta-card {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		background: white;
		text-align: left;
		width: 100%;
		font-family: inherit;
		font-size: inherit;
	}

	.consulta-card:hover {
		border-color: #10b981;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.consulta-header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.consulta-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		flex: 1;
	}

	.estado {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.estado-new {
		background: #dbeafe;
		color: #1e40af;
	}

	.estado-in_progress {
		background: #fef3c7;
		color: #92400e;
	}

	.estado-closed {
		background: #f3f4f6;
		color: #6b7280;
	}

	.consulta-mensaje {
		margin: 0 0 1rem 0;
		color: #4b5563;
		font-size: 0.875rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.consulta-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.consulta-precio {
		font-weight: 600;
		color: #10b981;
	}
</style>
