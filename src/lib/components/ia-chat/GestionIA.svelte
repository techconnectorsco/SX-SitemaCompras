<script lang="ts">
	interface UsuarioPermiso {
		id: string;
		email: string;
		nombre: string;
		role: string;
		estado: string;
		modulos: string[];
		esIaAdmin: boolean;
		esIaConsumo: boolean;
	}

	interface EstadoAdmin {
		puedeGestionar: boolean;
		puedeVerConsumo: boolean;
		soyIaAdmin: boolean;
		hayAlgunIaAdmin: boolean;
		modulos: Array<{ id: string; nombre: string }>;
		capacidadAdmin: string;
		capacidadConsumo: string;
		usuarios: UsuarioPermiso[];
	}

	let estado = $state<EstadoAdmin | null>(null);
	let seccion = $state<'permisos' | 'consumo'>('permisos');
	let cargando = $state(true);
	let mensaje = $state('');

	// --- Consumo ---
	let vista = $state<'usuario' | 'dia' | 'resumen' | 'detalle'>('usuario');
	let desde = $state('');
	let hasta = $state('');
	let moduloFiltro = $state('');
	let datosConsumo = $state<any>(null);
	let cargandoConsumo = $state(false);

	const monedaFmt = (n: number) =>
		new Intl.NumberFormat('es-CR', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 4,
			maximumFractionDigits: 4
		}).format(n || 0);

	const fechaFmt = (epoch: number) => new Date(epoch * 1000).toLocaleString('es-CR');

	// Fechas inclusivas: desde = inicio del día, hasta = fin del día (para que la factura cuadre).
	const epochInicio = (d: string) =>
		d ? Math.floor(new Date(d + 'T00:00:00').getTime() / 1000) : undefined;
	const epochFin = (d: string) =>
		d ? Math.floor(new Date(d + 'T23:59:59').getTime() / 1000) : undefined;

	async function cargarEstado() {
		cargando = true;
		mensaje = '';
		try {
			const r = await fetch('/api/ia/admin');
			if (!r.ok) {
				mensaje = r.status === 403 ? 'No tenés acceso a esta sección.' : 'Error al cargar.';
				estado = null;
				return;
			}
			estado = await r.json();
			// Si no puede gestionar permisos, arranca en consumo.
			seccion = estado?.puedeGestionar ? 'permisos' : 'consumo';
			if (seccion === 'consumo') cargarConsumo();
		} catch {
			mensaje = 'No pude conectar con el servidor.';
		} finally {
			cargando = false;
		}
	}

	async function accion(body: Record<string, unknown>) {
		const r = await fetch('/api/ia/admin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!r.ok) {
			const e = await r.json().catch(() => ({}));
			mensaje = e?.message ?? 'Acción rechazada.';
			return;
		}
		await cargarEstado();
	}

	function toggleModulo(u: UsuarioPermiso, modulo: string, tiene: boolean) {
		accion({ accion: tiene ? 'revocar' : 'otorgar', userId: u.id, modulo });
	}
	function toggleIaAdmin(u: UsuarioPermiso) {
		if (!estado) return;
		accion({
			accion: u.esIaAdmin ? 'revocar' : 'otorgar',
			userId: u.id,
			modulo: estado.capacidadAdmin
		});
	}
	function toggleIaConsumo(u: UsuarioPermiso) {
		if (!estado) return;
		accion({
			accion: u.esIaConsumo ? 'revocar' : 'otorgar',
			userId: u.id,
			modulo: estado.capacidadConsumo
		});
	}
	function bootstrap() {
		accion({ accion: 'bootstrap' });
	}

	async function cargarConsumo() {
		cargandoConsumo = true;
		datosConsumo = null;
		try {
			const params = new URLSearchParams({ vista });
			const di = epochInicio(desde);
			const hf = epochFin(hasta);
			if (di) params.set('desde', String(di));
			if (hf) params.set('hasta', String(hf));
			if (moduloFiltro) params.set('modulo', moduloFiltro);
			const r = await fetch(`/api/ia/auditoria?${params.toString()}`);
			if (r.ok) datosConsumo = (await r.json()).datos;
		} finally {
			cargandoConsumo = false;
		}
	}

	$effect(() => {
		cargarEstado();
	});
</script>

<div class="gestion-ia">
	{#if mensaje}
		<p class="aviso">{mensaje}</p>
	{/if}

	{#if cargando}
		<p class="cargando">Cargando…</p>
	{:else if estado}
		<div class="tabs">
			{#if estado.puedeGestionar}
				<button class:activo={seccion === 'permisos'} onclick={() => (seccion = 'permisos')}>
					Permisos por usuario
				</button>
			{/if}
			{#if estado.puedeVerConsumo}
				<button
					class:activo={seccion === 'consumo'}
					onclick={() => {
						seccion = 'consumo';
						cargarConsumo();
					}}
				>
					Consumo
				</button>
			{/if}
		</div>

		{#if seccion === 'permisos' && estado.puedeGestionar}
			{#if !estado.hayAlgunIaAdmin}
				<div class="bootstrap">
					<p>Todavía no hay un administrador de IA. Como sos ADMIN, podés tomar ese rol.</p>
					<button class="btn-primario" onclick={bootstrap}
						>Convertirme en administrador de IA</button
					>
				</div>
			{/if}

			<table>
				<thead>
					<tr>
						<th>Usuario</th>
						<th>Rol</th>
						{#each estado.modulos as m (m.id)}
							<th class="centro">{m.nombre}</th>
						{/each}
						<th class="centro">Admin IA</th>
						<th class="centro">Ver consumo</th>
					</tr>
				</thead>
				<tbody>
					{#each estado.usuarios as u (u.id)}
						<tr>
							<td>
								<div class="nombre">{u.nombre}</div>
								<div class="email">{u.email}</div>
							</td>
							<td><span class="badge">{u.role}</span></td>
							{#each estado.modulos as m (m.id)}
								{@const tiene = u.modulos.includes(m.id)}
								<td class="centro">
									<input
										type="checkbox"
										checked={tiene}
										onchange={() => toggleModulo(u, m.id, tiene)}
										aria-label={`${m.nombre} para ${u.nombre}`}
									/>
								</td>
							{/each}
							<td class="centro">
								<input
									type="checkbox"
									checked={u.esIaAdmin}
									disabled={u.role !== 'ADMIN'}
									onchange={() => toggleIaAdmin(u)}
									aria-label={`Admin IA para ${u.nombre}`}
									title={u.role !== 'ADMIN' ? 'Solo usuarios ADMIN pueden ser admin de IA' : ''}
								/>
							</td>
							<td class="centro">
								<input
									type="checkbox"
									checked={u.esIaConsumo}
									disabled={u.role !== 'ADMIN'}
									onchange={() => toggleIaConsumo(u)}
									aria-label={`Ver consumo para ${u.nombre}`}
									title={u.role !== 'ADMIN' ? 'Solo usuarios ADMIN pueden ver el consumo' : ''}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="nota">
				«Admin IA» gestiona todo. «Ver consumo» es solo lectura del gasto (pensado para los
				administradores del cliente). Ambos requieren rol ADMIN.
			</p>
		{/if}

		{#if seccion === 'consumo' && estado.puedeVerConsumo}
			<div class="filtros">
				<label>Desde <input type="date" bind:value={desde} /></label>
				<label>Hasta <input type="date" bind:value={hasta} /></label>
				<label>
					Módulo
					<select bind:value={moduloFiltro}>
						<option value="">Todos</option>
						{#each estado.modulos as m (m.id)}
							<option value={m.id}>{m.nombre}</option>
						{/each}
					</select>
				</label>
				<label>
					Vista
					<select bind:value={vista}>
						<option value="usuario">Por usuario</option>
						<option value="dia">Por día</option>
						<option value="resumen">Total del período</option>
						<option value="detalle">Detalle</option>
					</select>
				</label>
				<button class="btn-primario" onclick={cargarConsumo}>Consultar</button>
			</div>

			{#if cargandoConsumo}
				<p class="cargando">Cargando…</p>
			{:else if datosConsumo}
				{#if vista === 'resumen'}
					<div class="tarjetas">
						<div class="tarjeta">
							<span>Interacciones</span><strong>{datosConsumo.interacciones ?? 0}</strong>
						</div>
						<div class="tarjeta">
							<span>Tokens</span><strong
								>{(datosConsumo.tokens_total ?? 0).toLocaleString('es-CR')}</strong
							>
						</div>
						<div class="tarjeta destacada">
							<span>Costo del período</span><strong>{monedaFmt(datosConsumo.costo)}</strong>
						</div>
					</div>
				{:else if vista === 'usuario'}
					<table>
						<thead
							><tr
								><th>Usuario</th><th class="der">Interac.</th><th class="der">Tokens</th><th
									class="der">Costo</th
								></tr
							></thead
						>
						<tbody>
							{#each datosConsumo as f}
								<tr
									><td>{f.usuario_nombre ?? f.user_id}</td><td class="der">{f.interacciones}</td><td
										class="der">{f.tokens_total.toLocaleString('es-CR')}</td
									><td class="der">{monedaFmt(f.costo)}</td></tr
								>
							{/each}
						</tbody>
					</table>
				{:else if vista === 'dia'}
					<table>
						<thead
							><tr
								><th>Día</th><th class="der">Interac.</th><th class="der">Tokens</th><th class="der"
									>Costo</th
								></tr
							></thead
						>
						<tbody>
							{#each datosConsumo as f}
								<tr
									><td>{f.dia}</td><td class="der">{f.interacciones}</td><td class="der"
										>{f.tokens_total.toLocaleString('es-CR')}</td
									><td class="der">{monedaFmt(f.costo)}</td></tr
								>
							{/each}
						</tbody>
					</table>
				{:else if vista === 'detalle'}
					<table>
						<thead
							><tr
								><th>Fecha</th><th>Usuario</th><th>Modelo</th><th class="der">Tokens</th><th
									class="der">Costo</th
								></tr
							></thead
						>
						<tbody>
							{#each datosConsumo as f}
								<tr
									><td>{fechaFmt(f.fecha)}</td><td>{f.usuario_nombre ?? f.user_id}</td><td
										>{f.modelo}</td
									><td class="der">{f.tokens_total.toLocaleString('es-CR')}</td><td class="der"
										>{monedaFmt(f.costo)}</td
									></tr
								>
							{/each}
						</tbody>
					</table>
				{/if}
			{/if}
		{/if}
	{/if}
</div>

<style>
	.gestion-ia {
		font-size: 0.9rem;
		color: #0f172a;
	}
	.tabs {
		display: flex;
		gap: 0.5rem;
		border-bottom: 1px solid #e2e8f0;
		margin-bottom: 1rem;
	}
	.tabs button {
		background: none;
		border: none;
		padding: 0.6rem 0.9rem;
		cursor: pointer;
		color: #64748b;
		border-bottom: 2px solid transparent;
		font-size: 0.9rem;
	}
	.tabs button.activo {
		color: #1d4ed8;
		border-bottom-color: #1d4ed8;
		font-weight: 600;
	}
	.aviso {
		background: #fef9c3;
		border: 1px solid #fde68a;
		color: #854d0e;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		margin-bottom: 0.75rem;
	}
	.cargando {
		color: #64748b;
		padding: 1rem 0;
	}
	.bootstrap {
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 8px;
		padding: 0.9rem;
		margin-bottom: 1rem;
	}
	.btn-primario {
		background: #1d4ed8;
		color: #fff;
		border: none;
		border-radius: 8px;
		padding: 0.5rem 0.9rem;
		cursor: pointer;
		font-size: 0.88rem;
	}
	.btn-primario:hover {
		background: #1e40af;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	th,
	td {
		padding: 0.5rem 0.6rem;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}
	th {
		color: #64748b;
		font-weight: 600;
	}
	.centro {
		text-align: center;
	}
	.der {
		text-align: right;
	}
	.nombre {
		font-weight: 500;
	}
	.email {
		color: #94a3b8;
		font-size: 0.78rem;
	}
	.badge {
		background: #f1f5f9;
		border-radius: 6px;
		padding: 0.1rem 0.45rem;
		font-size: 0.75rem;
		color: #475569;
	}
	.nota {
		color: #94a3b8;
		font-size: 0.78rem;
		margin-top: 0.6rem;
	}
	.filtros {
		display: flex;
		gap: 0.8rem;
		align-items: flex-end;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}
	.filtros label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.78rem;
		color: #64748b;
	}
	.filtros input,
	.filtros select {
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		padding: 0.35rem 0.5rem;
		font-size: 0.85rem;
	}
	.tarjetas {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.7rem;
	}
	.tarjeta {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.tarjeta span {
		color: #64748b;
		font-size: 0.78rem;
	}
	.tarjeta strong {
		font-size: 1.05rem;
	}
	.tarjeta.destacada {
		background: #eff6ff;
		border-color: #bfdbfe;
	}
	.tarjeta.destacada strong {
		color: #1d4ed8;
	}
</style>
