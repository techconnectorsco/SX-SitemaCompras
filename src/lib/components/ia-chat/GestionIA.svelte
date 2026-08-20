<script lang="ts">
	let vista = $state<'usuario' | 'dia' | 'resumen' | 'detalle'>('usuario');
	let desde = $state('');
	let hasta = $state('');
	let datosConsumo = $state<any>(null);
	let cargando = $state(true);
	let mensaje = $state('');

	const monedaFmt = (n: number) =>
		new Intl.NumberFormat('es-CR', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 4,
			maximumFractionDigits: 4
		}).format(n || 0);
	const fechaFmt = (epoch: number) => new Date(epoch * 1000).toLocaleString('es-CR');
	const epochInicio = (d: string) =>
		d ? Math.floor(new Date(d + 'T00:00:00').getTime() / 1000) : undefined;
	const epochFin = (d: string) =>
		d ? Math.floor(new Date(d + 'T23:59:59').getTime() / 1000) : undefined;

	async function cargarConsumo() {
		cargando = true;
		mensaje = '';
		try {
			const params = new URLSearchParams({ vista });
			const di = epochInicio(desde);
			const hf = epochFin(hasta);
			if (di) params.set('desde', String(di));
			if (hf) params.set('hasta', String(hf));
			const r = await fetch(`/api/ia/auditoria?${params}`);
			if (!r.ok) {
				mensaje =
					r.status === 403 ? 'No tenés acceso a esta sección.' : 'No se pudo cargar el consumo.';
				return;
			}
			datosConsumo = (await r.json()).datos;
		} catch {
			mensaje = 'No pude conectar con el servidor.';
		} finally {
			cargando = false;
		}
	}

	$effect(() => {
		cargarConsumo();
	});
</script>

<div class="gestion-ia">
	{#if mensaje}<p class="aviso">{mensaje}</p>{/if}
	<div class="filtros">
		<label>Desde <input type="date" bind:value={desde} /></label>
		<label>Hasta <input type="date" bind:value={hasta} /></label>
		<label
			>Vista
			<select bind:value={vista}>
				<option value="usuario">Por usuario</option><option value="dia">Por día</option>
				<option value="resumen">Total del período</option><option value="detalle">Detalle</option>
			</select>
		</label>
		<button onclick={cargarConsumo}>Consultar</button>
	</div>

	{#if cargando}<p class="cargando">Cargando…</p>
	{:else if datosConsumo && vista === 'resumen'}
		<div class="tarjetas">
			<div><span>Interacciones</span><strong>{datosConsumo.interacciones ?? 0}</strong></div>
			<div>
				<span>Tokens</span><strong
					>{(datosConsumo.tokens_total ?? 0).toLocaleString('es-CR')}</strong
				>
			</div>
			<div><span>Costo del período</span><strong>{monedaFmt(datosConsumo.costo)}</strong></div>
		</div>
	{:else if datosConsumo && vista === 'usuario'}
		<table>
			<thead><tr><th>Usuario</th><th>Interac.</th><th>Tokens</th><th>Costo</th></tr></thead><tbody
				>{#each datosConsumo as f}<tr
						><td>{f.usuario_nombre ?? f.user_id}</td><td>{f.interacciones}</td><td
							>{f.tokens_total.toLocaleString('es-CR')}</td
						><td>{monedaFmt(f.costo)}</td></tr
					>{/each}</tbody
			>
		</table>
	{:else if datosConsumo && vista === 'dia'}
		<table>
			<thead><tr><th>Día</th><th>Interac.</th><th>Tokens</th><th>Costo</th></tr></thead><tbody
				>{#each datosConsumo as f}<tr
						><td>{f.dia}</td><td>{f.interacciones}</td><td
							>{f.tokens_total.toLocaleString('es-CR')}</td
						><td>{monedaFmt(f.costo)}</td></tr
					>{/each}</tbody
			>
		</table>
	{:else if datosConsumo && vista === 'detalle'}
		<table>
			<thead
				><tr><th>Fecha</th><th>Usuario</th><th>Modelo</th><th>Tokens</th><th>Costo</th></tr></thead
			><tbody
				>{#each datosConsumo as f}<tr
						><td>{fechaFmt(f.fecha)}</td><td>{f.usuario_nombre ?? f.user_id}</td><td>{f.modelo}</td
						><td>{f.tokens_total.toLocaleString('es-CR')}</td><td>{monedaFmt(f.costo)}</td></tr
					>{/each}</tbody
			>
		</table>
	{/if}
</div>

<style>
	.gestion-ia {
		font-size: 0.9rem;
		color: #0f172a;
	}
	.filtros {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: end;
		margin-bottom: 1rem;
	}
	label {
		display: grid;
		gap: 0.25rem;
		color: #475569;
	}
	input,
	select {
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		padding: 0.4rem 0.5rem;
		background: transparent;
	}
	button {
		background: #1d4ed8;
		color: #fff;
		border: 0;
		border-radius: 6px;
		padding: 0.5rem 0.85rem;
		cursor: pointer;
	}
	.aviso {
		color: #854d0e;
		background: #fef9c3;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
	}
	.cargando {
		color: #64748b;
	}
	.tarjetas {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.tarjetas div {
		display: grid;
		gap: 0.3rem;
		padding: 0.8rem;
		min-width: 10rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: left;
		padding: 0.55rem;
		border-bottom: 1px solid #e2e8f0;
	}
</style>
