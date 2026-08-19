<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		consultaId: string;
		onClose?: () => void;
	}

	let { consultaId, onClose }: Props = $props();

	let consulta = $state<any>(null);
	let mensajes = $state<any[]>([]);
	let rol = $state<'cliente' | 'propietario'>('cliente');
	let nuevoMensaje = $state('');
	let loading = $state(true);
	let sending = $state(false);
	let error = $state<string | null>(null);

	async function cargarConsulta() {
		loading = true;
		error = null;

		try {
			const res = await fetch(`/api/consultas/${consultaId}`);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar la consulta');
			}

			consulta = data.consulta;
			mensajes = data.mensajes || [];
			rol = data.rol;
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function enviarMensaje() {
		if (!nuevoMensaje.trim()) return;

		sending = true;
		error = null;

		try {
			const res = await fetch(`/api/consultas/${consultaId}/mensajes`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mensaje: nuevoMensaje })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al enviar mensaje');
			}

			// Agregar el nuevo mensaje a la lista
			mensajes = [...mensajes, data.mensaje];
			nuevoMensaje = '';

			// Scroll al final
			setTimeout(() => {
				const container = document.getElementById('mensajes-container');
				if (container) {
					container.scrollTop = container.scrollHeight;
				}
			}, 100);
		} catch (err: any) {
			error = err.message;
		} finally {
			sending = false;
		}
	}

	async function cerrarConsulta() {
		if (!confirm('¿Estás seguro de cerrar esta consulta? No podrás enviar más mensajes.')) {
			return;
		}

		try {
			const res = await fetch(`/api/consultas/${consultaId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cerrar: true })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cerrar consulta');
			}

			alert('Consulta cerrada exitosamente');
			if (onClose) onClose();
		} catch (err: any) {
			alert(err.message);
		}
	}

	onMount(() => {
		cargarConsulta();
	});
</script>

<div class="chat-consulta">
	{#if loading}
		<div class="loading">Cargando...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if consulta}
		<!-- Header -->
		<div class="chat-header">
			<div class="header-info">
				<h3>{consulta.anuncios?.titulo || 'Consulta'}</h3>
				<p class="text-sm text-gray-600">
					{rol === 'cliente' ? 'Tu consulta' : 'Consulta recibida'} • 
					{consulta.estado === 'closed' ? 'Cerrada' : 'Activa'}
				</p>
			</div>
			<div class="header-actions">
				{#if consulta.estado !== 'closed'}
					<button onclick={cerrarConsulta} class="btn-cerrar">
						Cerrar consulta
					</button>
				{/if}
				{#if onClose}
					<button onclick={onClose} class="btn-volver">
						Volver
					</button>
				{/if}
			</div>
		</div>

		<!-- Mensaje inicial -->
		<div class="mensaje-inicial">
			<div class="mensaje-header">
				<strong>{consulta.nombre}</strong>
				<span class="text-sm text-gray-500">
					{new Date(consulta.fecha_creacion).toLocaleDateString()}
				</span>
			</div>
			<p>{consulta.mensaje}</p>
			{#if consulta.telefono}
				<p class="text-sm text-gray-600">Teléfono: {consulta.telefono}</p>
			{/if}
		</div>

		<!-- Mensajes -->
		<div id="mensajes-container" class="mensajes-container">
			{#if mensajes.length === 0}
				<p class="no-mensajes">No hay mensajes adicionales. ¡Empieza la conversación!</p>
			{:else}
				{#each mensajes as mensaje}
					{@const esCliente = mensaje.usuario_id === consulta.cliente_id}
					<div class="mensaje" class:es-mio={esCliente === (rol === 'cliente')}>
						<div class="mensaje-contenido">
							<p>{mensaje.mensaje}</p>
							<span class="mensaje-fecha">
								{new Date(mensaje.creado_en).toLocaleString()}
							</span>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Input de mensaje -->
		{#if consulta.estado !== 'closed'}
			<div class="mensaje-input">
				<textarea
					bind:value={nuevoMensaje}
					placeholder="Escribe tu mensaje..."
					rows="3"
					onkeydown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							enviarMensaje();
						}
					}}
				></textarea>
				<button onclick={enviarMensaje} disabled={sending || !nuevoMensaje.trim()} class="btn-enviar">
					{sending ? 'Enviando...' : 'Enviar'}
				</button>
			</div>
		{:else}
			<div class="consulta-cerrada">
				<p>Esta consulta está cerrada. No se pueden enviar más mensajes.</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.chat-consulta {
		display: flex;
		flex-direction: column;
		height: 100%;
		max-height: 700px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
	}

	.loading,
	.error {
		padding: 2rem;
		text-align: center;
	}

	.error {
		color: #dc2626;
	}

	.chat-header {
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-info h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-cerrar,
	.btn-volver {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-cerrar {
		background: #dc2626;
		color: white;
		border: none;
	}

	.btn-cerrar:hover {
		background: #b91c1c;
	}

	.btn-volver {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-volver:hover {
		background: #e5e7eb;
	}

	.mensaje-inicial {
		padding: 1rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.mensaje-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.mensajes-container {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.no-mensajes {
		text-align: center;
		color: #9ca3af;
		padding: 2rem;
	}

	.mensaje {
		display: flex;
	}

	.mensaje.es-mio {
		justify-content: flex-end;
	}

	.mensaje-contenido {
		max-width: 70%;
		padding: 0.75rem;
		border-radius: 8px;
		background: #f3f4f6;
	}

	.mensaje.es-mio .mensaje-contenido {
		background: #10b981;
		color: white;
	}

	.mensaje-contenido p {
		margin: 0 0 0.25rem 0;
	}

	.mensaje-fecha {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.mensaje-input {
		padding: 1rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		gap: 0.5rem;
	}

	.mensaje-input textarea {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		resize: none;
		font-family: inherit;
	}

	.mensaje-input textarea:focus {
		outline: none;
		border-color: #10b981;
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
	}

	.btn-enviar {
		padding: 0.5rem 1.5rem;
		background: #10b981;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	.btn-enviar:hover:not(:disabled) {
		background: #059669;
	}

	.btn-enviar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.consulta-cerrada {
		padding: 1rem;
		background: #fef3c7;
		border-top: 1px solid #fbbf24;
		text-align: center;
	}

	.consulta-cerrada p {
		margin: 0;
		color: #92400e;
	}
</style>
