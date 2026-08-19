<script lang="ts">
	import { quimicasUnidasBrand } from '$lib/brand/quimicas-unidas';

	const brand = quimicasUnidasBrand;

	interface Factura {
		documento:    string;
		fechaFactura: string;
		fechaVence:   string;
		montoFactura: number;
		saldoFactura: number;
		moneda:       string;
		vencido?:     boolean;
	}

	interface ClienteCxC {
		id:        string;
		nombre:    string;
		telefono:  string;
		correo:    string;
		direccion: string;
		contacto:  string;
		facturas:  Factura[];
	}

	const clientes: ClienteCxC[] = [
		{
			id:        '100254',
			nombre:    'INDUSTRIA DE ALIMENTOS S.A.',
			telefono:  '+506 2222-3333',
			correo:    'devs@techconnectors.co',
			direccion: 'San José, Costa Rica. Edificio Principal.',
			contacto:  'Juan Pérez',
			facturas: [
				{ documento: 'FAC-1002', fechaFactura: '2026-03-18', fechaVence: '2026-04-17', montoFactura: 3200.00,  saldoFactura: 3200.00,  moneda: 'CRC', vencido: false },
				{ documento: 'FAC-1008', fechaFactura: '2026-04-07', fechaVence: '2026-05-07', montoFactura: 4100.00,  saldoFactura: 4100.00,  moneda: 'CRC', vencido: false },
				{ documento: 'FAC-1001', fechaFactura: '2026-02-21', fechaVence: '2026-03-23', montoFactura: 1500.50,  saldoFactura: 1500.50,  moneda: 'USD', vencido: true  },
				{ documento: 'REC-500',  fechaFactura: '2026-03-23', fechaVence: '2026-03-23', montoFactura: -1500.50, saldoFactura: -1500.50, moneda: 'USD', vencido: false },
				{ documento: 'FAC-1005', fechaFactura: '2026-04-02', fechaVence: '2026-05-02', montoFactura: 850.75,   saldoFactura: 850.75,   moneda: 'USD', vencido: false },
			],
		},
		{
			id:        '100301',
			nombre:    'DISTRIBUIDORA CENTRAL S.R.L.',
			telefono:  '+506 2555-1111',
			correo:    'finanzas@distcentral.com',
			direccion: 'Alajuela, Costa Rica. Zona Industrial Norte.',
			contacto:  'María Rodríguez',
			facturas: [
				{ documento: 'FAC-2010', fechaFactura: '2026-03-01', fechaVence: '2026-03-31', montoFactura: 8500.00,  saldoFactura: 8500.00,  moneda: 'CRC', vencido: true  },
				{ documento: 'FAC-2015', fechaFactura: '2026-04-05', fechaVence: '2026-05-05', montoFactura: 1200.00,  saldoFactura: 1200.00,  moneda: 'USD', vencido: false },
				{ documento: 'FAC-2018', fechaFactura: '2026-04-10', fechaVence: '2026-05-10', montoFactura: 3750.00,  saldoFactura: 3750.00,  moneda: 'CRC', vencido: false },
			],
		},
		{
			id:        '100412',
			nombre:    'GRUPO IMPORTADORA TICA S.A.',
			telefono:  '+506 2788-4400',
			correo:    'cuentas@importadoratica.cr',
			direccion: 'Cartago, Costa Rica. Parque Empresarial.',
			contacto:  'Roberto Jiménez',
			facturas: [
				{ documento: 'FAC-3001', fechaFactura: '2026-02-10', fechaVence: '2026-03-12', montoFactura: 15000.00, saldoFactura: 15000.00, moneda: 'USD', vencido: true  },
				{ documento: 'FAC-3002', fechaFactura: '2026-03-20', fechaVence: '2026-04-19', montoFactura: 7200.50,  saldoFactura: 7200.50,  moneda: 'USD', vencido: true  },
				{ documento: 'FAC-3010', fechaFactura: '2026-04-08', fechaVence: '2026-05-08', montoFactura: 4300.00,  saldoFactura: 4300.00,  moneda: 'CRC', vencido: false },
			],
		},
	];

	let clienteSeleccionado = $state<ClienteCxC | null>(null);
	let procesando          = $state(false);
	let progreso            = $state(0);
	let etapa               = $state('');
	let resultado           = $state<{ ok: boolean; mensaje: string } | null>(null);
	let correoDemo          = $state('');
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	const etapas = [
		{ pct: 8,  msg: 'Conectando con el sistema de facturación...' },
		{ pct: 18, msg: 'Obteniendo facturas del cliente...' },
		{ pct: 30, msg: 'Calculando saldos pendientes...' },
		{ pct: 45, msg: 'Generando control de atraso...' },
		{ pct: 58, msg: 'Construyendo PDF del estado de cuenta...' },
		{ pct: 70, msg: 'Preparando correo electrónico...' },
		{ pct: 82, msg: 'Autenticando con servidor de correo...' },
		{ pct: 92, msg: 'Enviando correo al cliente...' },
		{ pct: 98, msg: 'Verificando entrega...' },
	];

	function fmt(v: number, moneda: string): string {
		return `${v.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
	}

	function totalPorMoneda(moneda: string): number {
		return (clienteSeleccionado?.facturas ?? [])
			.filter(f => f.moneda === moneda)
			.reduce((s, f) => s + f.saldoFactura, 0);
	}

	const monedasUnicas = $derived(
		clienteSeleccionado
			? [...new Set(clienteSeleccionado.facturas.map(f => f.moneda))]
			: []
	);

	function focusIn(e: FocusEvent) {
		const el = e.currentTarget as HTMLElement;
		el.style.borderColor = 'var(--brand-primary)';
		el.style.boxShadow = '0 0 0 3px var(--brand-primary-ring)';
	}

	function focusOut(e: FocusEvent) {
		const el = e.currentTarget as HTMLElement;
		el.style.borderColor = '';
		el.style.boxShadow = '';
	}

	async function procesarEnvio() {
		if (!clienteSeleccionado || procesando) return;
		procesando = true;
		progreso   = 0;
		resultado  = null;
		etapa      = 'Iniciando proceso...';

		const DURACION_MS = 60_000;
		const inicio      = Date.now();

		timerInterval = setInterval(() => {
			const elapsed = Date.now() - inicio;
			const frac    = Math.min(elapsed / DURACION_MS, 1);
			progreso      = Math.round(frac * 100);
			for (let i = etapas.length - 1; i >= 0; i--) {
				if (progreso >= etapas[i].pct) { etapa = etapas[i].msg; break; }
			}
		}, 200);

		await new Promise(r => setTimeout(r, DURACION_MS));

		try {
			const res = await fetch('/api/cxc/send-email', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ cliente: clienteSeleccionado, correoExtra: correoDemo.trim() || null }),
			});
			const data = await res.json();
			resultado = res.ok
				? { ok: true,  mensaje: data.mensaje ?? 'Correo enviado exitosamente.' }
				: { ok: false, mensaje: data.message ?? 'Error al enviar el correo.' };
		} catch {
			resultado = { ok: false, mensaje: 'Error de conexión con el servidor.' };
		} finally {
			if (timerInterval) clearInterval(timerInterval);
			progreso   = 100;
			etapa      = resultado?.ok ? '¡Proceso completado!' : 'El proceso terminó con errores.';
			procesando = false;
		}
	}

	function resetear() {
		resultado  = null;
		progreso   = 0;
		etapa      = '';
		procesando = false;
	}
</script>

<div
	class="space-y-8 animate-fade-in"
	style="
		--brand-primary:        {brand.css.primary};
		--brand-primary-hover:  {brand.css.primaryHover};
		--brand-primary-light:  {brand.css.primaryLight};
		--brand-primary-border: {brand.css.primaryBorder};
		--brand-primary-text:   {brand.css.primaryText};
		--brand-primary-ring:   {brand.css.primaryRing};
	"
>
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
		<div>
			<p class="text-xs font-bold uppercase tracking-[0.18em] mb-2" style="color: var(--brand-primary-text)">
				{brand.subtitulo}
			</p>
			<h1 class="text-3xl font-bold text-foreground leading-tight">
				Simulador Estado de Cuenta
			</h1>
			<p class="text-muted-foreground mt-2 text-sm max-w-lg leading-relaxed">
				Selecciona un cliente, procesa su estado de cuenta y envíalo automáticamente por correo con el PDF adjunto.
			</p>
		</div>
		<div class="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-2xl flex-shrink-0 border"
			style="background-color: var(--brand-primary-light); border-color: var(--brand-primary-border)">
			<span class="w-2 h-2 rounded-full animate-pulse" style="background-color: var(--brand-primary)"></span>
			<span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--brand-primary-text)">
				Módulo CxC
			</span>
		</div>
	</div>

	<!-- Layout principal -->
	<div class="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">

		<!-- Columna izquierda -->
		<div class="space-y-6">

			<!-- Selector de clientes -->
			<div class="bg-card border border-border rounded-2xl p-6 shadow-sm">
				<h2 class="text-sm font-bold text-foreground mb-4">Seleccionar Cliente</h2>
				<div class="space-y-3">
					{#each clientes as cliente}
						{@const activo = clienteSeleccionado?.id === cliente.id}
						<button
							onclick={() => { clienteSeleccionado = cliente; resetear(); }}
							disabled={procesando}
							class="w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all duration-200 disabled:opacity-50 border-border hover:bg-accent"
							style={activo ? `background-color: var(--brand-primary-light); border-color: var(--brand-primary-border);` : ''}
						>
							<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
								style={activo ? `background-color: var(--brand-primary); color: white;` : 'background-color: var(--muted); color: var(--foreground);'}>
								{cliente.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0,2)}
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-semibold text-sm text-foreground truncate">{cliente.nombre}</p>
								<p class="text-xs text-muted-foreground truncate">{cliente.correo}</p>
							</div>
							<div class="text-right flex-shrink-0">
								<p class="text-xs text-muted-foreground">{cliente.facturas.length} docs</p>
								{#if activo}
									<span class="inline-block mt-1 w-2 h-2 rounded-full" style="background-color: var(--brand-primary)"></span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Tabla de facturas -->
			{#if clienteSeleccionado}
				<div class="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
					<div class="px-6 py-4 border-b border-border">
						<h2 class="text-sm font-bold text-foreground">Detalle de Facturas</h2>
						<p class="text-xs text-muted-foreground mt-0.5">
							{clienteSeleccionado.id} — {clienteSeleccionado.nombre}
						</p>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-xs">
							<thead>
								<tr class="bg-muted/50">
									<th class="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">Documento</th>
									<th class="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">F. Factura</th>
									<th class="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider">F. Vence</th>
									<th class="px-4 py-3 text-right font-semibold text-muted-foreground uppercase tracking-wider">Monto</th>
									<th class="px-4 py-3 text-right font-semibold text-muted-foreground uppercase tracking-wider">Saldo</th>
									<th class="px-4 py-3 text-center font-semibold text-muted-foreground uppercase tracking-wider">Moneda</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border">
								{#each clienteSeleccionado.facturas as f}
									<tr class="hover:bg-muted/30 transition-colors {f.vencido && f.saldoFactura > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}">
										<td class="px-4 py-3 font-medium">{f.documento}</td>
										<td class="px-4 py-3">{f.fechaFactura}</td>
										<td class="px-4 py-3">{f.fechaVence}</td>
										<td class="px-4 py-3 text-right font-mono">{f.montoFactura.toLocaleString('es-CR', {minimumFractionDigits:2})}</td>
										<td class="px-4 py-3 text-right font-mono">{f.saldoFactura.toLocaleString('es-CR', {minimumFractionDigits:2})}</td>
										<td class="px-4 py-3 text-center">
											<span
												class="px-2 py-0.5 rounded-full text-[10px] font-bold border {f.moneda === 'USD' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}"
												style={f.moneda !== 'USD' ? `background-color: var(--brand-primary-light); color: var(--brand-primary-text); border-color: var(--brand-primary-border);` : ''}>
												{f.moneda}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="px-6 py-4 border-t border-border bg-muted/30 flex flex-wrap gap-6 justify-end">
						{#each monedasUnicas as m}
							<div class="text-right">
								<p class="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Total saldo {m}</p>
								<p class="text-lg font-extrabold text-foreground font-mono">{fmt(totalPorMoneda(m), m)}</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Columna derecha -->
		<div class="space-y-5">

			{#if clienteSeleccionado}
				<div class="bg-card border border-border rounded-2xl p-5 shadow-sm">
					<h3 class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Datos del cliente</h3>
					<div class="space-y-2 text-sm">
						<div class="flex gap-2">
							<span class="text-muted-foreground w-20 flex-shrink-0">Nombre</span>
							<span class="font-medium text-foreground text-xs leading-snug">{clienteSeleccionado.nombre}</span>
						</div>
						<div class="flex gap-2">
							<span class="text-muted-foreground w-20 flex-shrink-0">Correo</span>
							<span class="font-medium text-foreground text-xs truncate">{clienteSeleccionado.correo}</span>
						</div>
						<div class="flex gap-2">
							<span class="text-muted-foreground w-20 flex-shrink-0">Teléfono</span>
							<span class="font-medium text-foreground text-xs">{clienteSeleccionado.telefono}</span>
						</div>
						<div class="flex gap-2">
							<span class="text-muted-foreground w-20 flex-shrink-0">Contacto</span>
							<span class="font-medium text-foreground text-xs">{clienteSeleccionado.contacto}</span>
						</div>
					</div>
				</div>
			{/if}

			<div class="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
				<div>
					<h3 class="text-sm font-bold text-foreground">Envío de Estado de Cuenta</h3>
					<p class="text-xs text-muted-foreground mt-1">Genera el PDF y envía el correo al cliente seleccionado.</p>
				</div>

				<!-- Correo demo -->
				<div class="space-y-1.5">
					<label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider" for="correo-demo">
						Correo de prueba <span class="normal-case font-normal">(opcional)</span>
					</label>
					<div class="relative">
						<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
						     fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
							      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
						</svg>
						<input
							id="correo-demo"
							type="email"
							bind:value={correoDemo}
							disabled={procesando}
							placeholder="tu@correo.com"
							class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background
							       text-sm text-foreground placeholder:text-muted-foreground/50
							       focus:outline-none disabled:opacity-50 transition-all"
							onfocus={focusIn}
							onblur={focusOut}
						/>
					</div>
					{#if correoDemo.trim()}
						<p class="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
							<svg class="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
							</svg>
							Se enviará también a: <strong>{correoDemo.trim()}</strong>
						</p>
					{:else}
						<p class="text-[11px] text-muted-foreground/60">Déjalo vacío para enviar solo al correo del cliente.</p>
					{/if}
				</div>

				<!-- Resultado -->
				{#if resultado}
					<div class="rounded-xl px-4 py-3 border text-sm font-medium flex items-start gap-3
					            {resultado.ok
					              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
					              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'}">
						{#if resultado.ok}
							<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
						{:else}
							<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
						{/if}
						<span>{resultado.mensaje}</span>
					</div>
				{/if}

				<!-- Barra de progreso -->
				{#if procesando || (progreso > 0 && !resultado) || resultado}
					<div class="space-y-2">
						<div class="flex justify-between items-center text-xs">
							<span class="text-muted-foreground font-medium truncate pr-2">{etapa}</span>
							<span class="font-bold text-foreground flex-shrink-0">{progreso}%</span>
						</div>
						<div class="w-full bg-muted rounded-full h-2.5 overflow-hidden">
							<div
								class="h-2.5 rounded-full transition-all duration-300 {resultado?.ok ? 'bg-emerald-500' : resultado ? 'bg-red-500' : ''}"
								style="width: {progreso}%; {!resultado ? 'background-color: var(--brand-primary);' : ''}"
							></div>
						</div>
						{#if procesando}
							<div class="grid grid-cols-1 gap-1.5 pt-1">
								{#each etapas as e}
									<div class="flex items-center gap-2 text-[11px] {progreso >= e.pct ? 'text-foreground' : 'text-muted-foreground/40'}">
										{#if progreso >= e.pct}
											<svg class="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 111.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
											</svg>
										{:else}
											<span class="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex-shrink-0"></span>
										{/if}
										<span>{e.msg}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Botón principal -->
				<button
					onclick={procesarEnvio}
					disabled={!clienteSeleccionado || procesando}
					class="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl
					       font-semibold text-sm transition-all duration-200
					       disabled:opacity-50 disabled:cursor-not-allowed"
					style={procesando
						? `background-color: var(--brand-primary-light); color: var(--brand-primary-text); border: 1px solid var(--brand-primary-border);`
						: `background-color: var(--brand-primary); color: white;`}
					onmouseenter={(e) => { if (!procesando) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--brand-primary-hover)'; }}
					onmouseleave={(e) => { if (!procesando) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--brand-primary)'; }}
				>
					{#if procesando}
						<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
						</svg>
						Procesando...
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
						</svg>
						{clienteSeleccionado ? `Enviar a ${clienteSeleccionado.correo}` : 'Selecciona un cliente'}
					{/if}
				</button>

				{#if !clienteSeleccionado}
					<p class="text-center text-xs text-muted-foreground">
						Selecciona un cliente de la lista para habilitar el envío.
					</p>
				{/if}
			</div>

			<div class="bg-muted/40 border border-border rounded-2xl p-4 space-y-2">
				<p class="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Configuración de envío</p>
				<div class="space-y-1.5 text-xs text-muted-foreground">
					<div class="flex gap-2">
						<span class="w-20 flex-shrink-0">Protocolo</span>
						<span class="font-medium text-foreground">Microsoft Graph API</span>
					</div>
					<div class="flex gap-2">
						<span class="w-20 flex-shrink-0">Adjunto</span>
						<span class="font-medium text-foreground">PDF estado de cuenta</span>
					</div>
					<div class="flex gap-2">
						<span class="w-20 flex-shrink-0">Procesamiento</span>
						<span class="font-medium text-foreground">~60 segundos</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(14px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in { animation: fade-in 0.45s ease-out forwards; }
</style>