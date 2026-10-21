<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type {
		AgenteSAP,
		ArbolAgenteZona,
		ClienteZona,
		EstadoGiraZonaResponse,
		MetodoEnvioGira,
		OrdenGiraZona,
		ResultadoGiraZona,
		ZonaConClientes
	} from '$lib/cxc/types';
	import type { BrandConfig } from '$lib/brand/types';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	let {
		apiBase = '/cuentasxcobrar/api',
		brand
	}: {
		apiBase?: string;
		brand: BrandConfig;
	} = $props();

	// ── Carga ──
	let cargandoAgentes = $state(false);
	let cargandoArbol = $state(false);
	let errorAgentes = $state<string | null>(null);
	let errorArbol = $state<string | null>(null);

	let agentes = $state<AgenteSAP[]>([]);
	let agenteSel = $state<AgenteSAP | null>(null);
	let arbol = $state<ArbolAgenteZona | null>(null);

	// ── Selección ──
	let seleccion = $state<Record<string, boolean>>({});

	/**
	 * Mostrar o no los clientes que no aportan nada al PDF de este agente.
	 * Apagado por defecto: antes se podía armar una gira entera de clientes sin
	 * nada pendiente y recibir un PDF vacío. Con el switch encendido vuelven,
	 * en gris y con el motivo, para que nadie se quede con la duda.
	 */
	let verSinCarga = $state(false);
	let zonasAbiertas = $state<Record<string, boolean>>({});
	let busquedaZona = $state<Record<string, string>>({});

	// ── Envío ──
	let metodo = $state<MetodoEnvioGira>('agente');
	let correoRevision = $state(brand.correoRevisionDefault);
	let confirmando = $state(false);
	let enviando = $state(false);
	let enviado = $state(false);
	let resultado = $state<{ ok: boolean; texto: string } | null>(null);

	// ── Seguimiento del trabajo encolado ──
	// El POST solo alcanza a decir "enviada": cuántos clientes quedaron fuera se
	// sabe recién cuando el worker termina de evaluar los documentos. Sin esto,
	// quien pide 10 clientes recibe un PDF con 7 y no se entera.
	type FaseSeguimiento = 'inactivo' | 'esperando' | 'listo' | 'fallo' | 'perdido';

	const SEGUIMIENTO_INTERVALO_MS = 4000;
	/** 45 × 4s = 3 minutos. La interfaz promete 1-2; si se pasa, algo se trabó. */
	const SEGUIMIENTO_MAX_INTENTOS = 45;

	let jobId = $state<string | null>(null);
	let fase = $state<FaseSeguimiento>('inactivo');
	let detalle = $state<ResultadoGiraZona | null>(null);
	let seguimientoNota = $state<string | null>(null);
	let temporizador: ReturnType<typeof setTimeout> | null = null;

	const seleccionados = $derived(Object.keys(seleccion).filter((c) => seleccion[c]));

	/** Los que de verdad aportan al PDF. Es el número que importa. */
	const totalElegibles = $derived(arbol?.totalElegibles ?? 0);

	/** Los que el árbol ofrece y no aportan nada. */
	const totalSinCarga = $derived(arbol?.totalNoElegibles ?? 0);

	/** Cuántas zonas tienen al menos un cliente visible con lo que está mostrándose. */
	const zonasVisibles = $derived(
		arbol ? arbol.zonas.filter((z) => visiblesDeZona(z).length).length : 0
	);

	/** cardCode → nombre de zona, para deducir la zona de la selección. */
	const zonaPorCliente = $derived.by(() => {
		const m = new Map<string, string>();
		if (!arbol) return m;
		for (const z of arbol.zonas) {
			for (const c of z.clientes) m.set(c.cardCode, z.zona.nombre);
		}
		for (const c of arbol.sinZona) m.set(c.cardCode, 'Sin zona asignada');
		return m;
	});

	/**
	 * Si toda la selección cae en una sola zona, ese nombre va al encabezado del
	 * PDF y al nombre del archivo. Si es mixta manda null, y el backend usará
	 * "Selección manual".
	 */
	const zonaDeSeleccion = $derived.by(() => {
		if (!seleccionados.length) return null;
		const nombres = new Set(seleccionados.map((c) => zonaPorCliente.get(c) ?? ''));
		return nombres.size === 1 ? [...nombres][0] : null;
	});

	/**
	 * cardCode → nombre, para nombrar los omitidos. Se lee del árbol, que sigue
	 * cargado después de enviar: `seleccion` se limpia, el árbol no.
	 */
	const nombrePorCliente = $derived.by(() => {
		const m = new Map<string, string>();
		if (!arbol) return m;
		for (const z of arbol.zonas) {
			for (const c of z.clientes) m.set(c.cardCode, c.cardName);
		}
		for (const c of arbol.sinZona) m.set(c.cardCode, c.cardName);
		return m;
	});

	/** `C0041 — ALMACENES EL COLONO`, o solo el código si no está en el árbol. */
	function etiquetaCliente(cardCode: string): string {
		const nombre = nombrePorCliente.get(cardCode);
		return nombre ? `${cardCode} — ${nombre}` : cardCode;
	}

	/**
	 * Los omitidos agrupados por motivo. "Sin documentos abiertos" y "ruteados a
	 * otro vendedor" son dos situaciones muy distintas para quien arma la gira: la
	 * primera significa que no hay nada que cobrar, la segunda que la deuda existe
	 * pero le toca a otro agente.
	 */
	const gruposOmitidos = $derived.by(() => {
		if (!detalle?.omitidos.length) return [];

		const d = detalle.omitidos_detalle;
		if (!d) {
			return [
				{
					titulo: 'Sin documentos pendientes, o ruteados a otro vendedor',
					codigos: detalle.omitidos,
					aviso: false
				}
			];
		}

		return [
			{
				titulo: 'Sin ningún documento abierto en el sistema: no hay nada que cobrar',
				codigos: d.sin_documentos,
				aviso: false
			},
			{
				titulo: 'Con documentos abiertos, pero ruteados a otro vendedor',
				codigos: d.otro_vendedor,
				aviso: false
			},
			{
				titulo: 'Sin ficha en el sistema: el código no existe',
				codigos: d.inexistentes,
				aviso: false
			},
			{
				titulo:
					'El sistema no respondió al consultarlos: NO se sabe qué deben. ' +
					'Volvé a intentar en un rato',
				codigos: d.no_evaluables ?? [],
				aviso: true
			}
		].filter((g) => g.codigos.length);
	});

	const ayudaMetodo = $derived(
		metodo === 'agente'
			? 'La gira se envía directo al correo del agente registrado.'
			: 'La gira llega al correo indicado abajo (por ejemplo, para reimprimirla en oficina). El agente no la recibe.'
	);

	onMount(cargarAgentes);

	async function cargarAgentes() {
		cargandoAgentes = true;
		errorAgentes = null;
		try {
			const res = await fetch(`${apiBase}/agentes`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			agentes = data.agentes;
		} catch (e) {
			errorAgentes = 'No se pudo cargar la lista de agentes. Verificá la conexión al sistema.';
			console.error(e);
		} finally {
			cargandoAgentes = false;
		}
	}

	async function elegirAgente(e: Event) {
		const cod = Number((e.currentTarget as HTMLSelectElement).value);
		agenteSel = agentes.find((a) => a.codigo === cod) ?? null;

		// Cambiar de agente invalida todo lo elegido hasta ahora.
		arbol = null;
		seleccion = {};
		zonasAbiertas = {};
		busquedaZona = {};
		resultado = null;
		enviado = false;
		// El árbol nuevo no sabría nombrar los omitidos del trabajo anterior.
		detenerSeguimiento();
		jobId = null;
		detalle = null;
		seguimientoNota = null;
		fase = 'inactivo';

		if (agenteSel) await cargarArbol(agenteSel.codigo);
	}

	async function cargarArbol(codigo: number) {
		cargandoArbol = true;
		errorArbol = null;
		try {
			const res = await fetch(`${apiBase}/arbol-agente?agente=${codigo}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			arbol = await res.json();
		} catch (e) {
			errorArbol = 'No se pudo cargar el árbol de zonas.';
			console.error(e);
		} finally {
			cargandoArbol = false;
		}
	}

	function reintentarArbol() {
		if (agenteSel) cargarArbol(agenteSel.codigo);
	}

	// ── Árbol ──

	function alternarZona(codigo: string) {
		zonasAbiertas[codigo] = !zonasAbiertas[codigo];
	}

	/** Zona "INACTIVAS": se muestra, pero avisada. */
	function esInactiva(nombre: string): boolean {
		return nombre.toUpperCase().includes('INACTIVA');
	}

	/** Los elegibles de una lista: los únicos que se pueden marcar. */
	function elegiblesDe(clientes: ClienteZona[]): ClienteZona[] {
		return clientes.filter((c) => c.elegible);
	}

	/** Lo que se muestra de una zona según el switch, sin aplicar la búsqueda. */
	function visiblesDeZona(entrada: ZonaConClientes): ClienteZona[] {
		return verSinCarga ? entrada.clientes : elegiblesDe(entrada.clientes);
	}

	function filtrar(clientes: ClienteZona[], texto: string): ClienteZona[] {
		const q = (texto ?? '').trim().toLowerCase();
		if (!q) return clientes;
		return clientes.filter(
			(c) => c.cardCode.toLowerCase().includes(q) || c.cardName.toLowerCase().includes(q)
		);
	}

	/**
	 * Cuántos están marcados, contando SOLO los elegibles. Que cuente solo
	 * elegibles no es un detalle: si contara todos, el checkbox de la zona
	 * quedaría permanentemente "indeterminado", porque los no elegibles no se
	 * pueden marcar y nunca llegarían al total.
	 */
	function marcados(clientes: ClienteZona[]): number {
		return elegiblesDe(clientes).filter((c) => seleccion[c.cardCode]).length;
	}

	/** Marca o desmarca la zona entera. Solo toca los elegibles. */
	function alternarTodaLaZona(clientes: ClienteZona[]) {
		const elegibles = elegiblesDe(clientes);
		const todos = elegibles.length > 0 && marcados(clientes) === elegibles.length;
		for (const c of elegibles) seleccion[c.cardCode] = !todos;
	}

	/** El texto que explica por qué un cliente está en gris. */
	function motivoLegible(c: ClienteZona): string {
		if (c.motivo === 'otro_vendedor') {
			return c.vendedorNombre
				? `tiene deuda, pero rutea a ${c.vendedorNombre}`
				: 'tiene deuda, pero rutea a otro vendedor';
		}
		return 'sin documentos abiertos';
	}

	const moneda = new Intl.NumberFormat('es-CR', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	/** `3 docs · ₡1.240.500`, con los dólares aparte si los hay. */
	function resumenCarga(c: ClienteZona): string {
		const partes: string[] = [`${c.docs} ${c.docs === 1 ? 'doc' : 'docs'}`];
		if (c.crc) partes.push(`₡${moneda.format(c.crc)}`);
		if (c.usd) partes.push(`$${moneda.format(c.usd)}`);
		return partes.join(' · ');
	}

	function limpiarSeleccion() {
		seleccion = {};
		resultado = null;
	}

	// ── Envío ──

	function abrirConfirmacion() {
		if (!seleccionados.length || !agenteSel) return;
		resultado = null;
		enviado = false;
		confirmando = true;
	}

	function cerrarConfirmacion() {
		confirmando = false;
	}

	function puedeEnviar() {
		if (!agenteSel || !seleccionados.length) return false;
		if (metodo === 'revision' && !correoRevision.trim()) return false;
		return true;
	}

	function detenerSeguimiento() {
		if (temporizador) {
			clearTimeout(temporizador);
			temporizador = null;
		}
	}

	/**
	 * Sondea `/estado-gira-zona` hasta que el worker termina, para poder mostrar
	 * cuántos clientes llegaron al PDF y cuáles quedaron fuera.
	 *
	 * Reencadena con setTimeout en vez de setInterval: así nunca hay dos
	 * consultas superpuestas si el sistema tarda más que el intervalo.
	 */
	async function seguirJob(id: string, intento = 1) {
		if (jobId !== id) return; // se disparó otra gira mientras esperábamos

		try {
			const res = await fetch(`${apiBase}/estado-gira-zona?job=${encodeURIComponent(id)}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as EstadoGiraZonaResponse;

			if (jobId !== id) return;

			if (data.estado === 'terminado' || data.estado === 'con_avisos') {
				detalle = data.resultado ?? null;
				fase = 'listo';
				detenerSeguimiento();
				return;
			}

			if (data.estado === 'error') {
				fase = 'fallo';
				seguimientoNota = data.resultado?.mensaje ?? 'El sistema reportó un error.';
				detenerSeguimiento();
				return;
			}

			if (data.estado === 'desconocido') {
				fase = 'perdido';
				seguimientoNota =
					'Se perdió el seguimiento del trabajo. Revisá el correo o los logs del sistema.';
				detenerSeguimiento();
				return;
			}

			// en_cola o procesando: seguir esperando.
			if (intento >= SEGUIMIENTO_MAX_INTENTOS) {
				fase = 'perdido';
				seguimientoNota =
					'La gira sigue en proceso después de 3 minutos. Dejó de consultarse; revisá el correo o los logs.';
				detenerSeguimiento();
				return;
			}

			temporizador = setTimeout(() => seguirJob(id, intento + 1), SEGUIMIENTO_INTERVALO_MS);
		} catch (e) {
			console.error('[gira-zona] error consultando estado:', e);
			if (intento >= SEGUIMIENTO_MAX_INTENTOS) {
				fase = 'perdido';
				seguimientoNota = 'No se pudo consultar el estado de la gira. Revisá el correo.';
				detenerSeguimiento();
				return;
			}
			temporizador = setTimeout(() => seguirJob(id, intento + 1), SEGUIMIENTO_INTERVALO_MS);
		}
	}

	async function enviarGira() {
		if (!puedeEnviar()) return;
		enviando = true;
		resultado = null;
		detenerSeguimiento();
		jobId = null;
		detalle = null;
		seguimientoNota = null;
		fase = 'inactivo';
		try {
			const body: OrdenGiraZona = {
				agenteCodigo: String(agenteSel!.codigo),
				cardCodes: seleccionados,
				metodo,
				correoRevision: metodo === 'revision' ? correoRevision.trim() : undefined,
				zonaNombre: zonaDeSeleccion ?? undefined
			};
			const res = await fetch(`${apiBase}/ejecutar-gira-zona`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await res.json().catch(() => ({}));
			resultado = {
				ok: res.ok,
				texto: res.ok
					? (data.mensaje ?? 'Gira enviada.')
					: (data.mensaje ?? data.message ?? 'No se pudo generar la gira.')
			};
			if (res.ok) {
				enviado = true;
				seleccion = {};

				if (data.job_id) {
					jobId = data.job_id;
					fase = 'esperando';
					seguirJob(data.job_id);
				} else {
					fase = 'perdido';
					seguimientoNota =
						'El sistema no devolvió identificador de trabajo: no se puede confirmar cuántos clientes entraron.';
				}
			}
		} catch (e) {
			resultado = { ok: false, texto: 'Error de red al generar la gira.' };
			console.error(e);
		} finally {
			enviando = false;
		}
	}

	/** Limpia la franja de seguimiento. No cancela nada: el trabajo ya terminó. */
	function descartarSeguimiento() {
		detenerSeguimiento();
		jobId = null;
		detalle = null;
		seguimientoNota = null;
		fase = 'inactivo';
	}

	function cerrarTodo() {
		confirmando = false;
		enviado = false;
		resultado = null;
	}

	// Cerrar el modal no cancela el seguimiento: el trabajo sigue en el sistema.
	// Solo se corta al desmontar el panel.
	onDestroy(detenerSeguimiento);
</script>

<div
	class="mt-6"
	style="
		--brand-primary:        {brand.css.primary};
		--brand-primary-hover:  {brand.css.primaryHover};
		--brand-primary-light:  {brand.css.primaryLight};
		--brand-primary-border: {brand.css.primaryBorder};
		--brand-primary-text:   {brand.css.primaryText};
		--brand-primary-ring:   {brand.css.primaryRing};
	"
>
	<!-- ══ SECCIÓN GIRA POR ZONA ════════════════════════════════════════════ -->
	<section class="rounded-xl border border-border bg-card shadow-sm">
		<div class="flex items-center gap-3 border-b border-border px-6 py-4">
			<div class="h-5 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
			<div>
				<h2 class="text-base font-semibold text-foreground">Gira por Zona</h2>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Generá la gira solo de una zona o de clientes puntuales, sin procesar la cartera completa
					del agente.
				</p>
			</div>
		</div>

		<div class="p-6">
			{#if errorAgentes}
				<div class="qz-error-caja mb-4 rounded-lg border px-4 py-3 text-sm">
					<p class="font-medium">{errorAgentes}</p>
					<button
						class="qz-error-btn mt-2 rounded-md px-3 py-1.5 text-xs font-medium"
						onclick={cargarAgentes}
					>
						Reintentar
					</button>
				</div>
			{:else if cargandoAgentes}
				<p class="text-sm text-muted-foreground">Cargando agentes…</p>
			{:else}
				<!-- ── Paso 1: agente ── -->
				<div>
					<label
						for="agente-gira-zona"
						class="mb-1 block text-xs font-medium text-muted-foreground"
					>
						Agente ({agentes.length} con correo asignado)
					</label>
					<select
						id="agente-gira-zona"
						class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all"
						onchange={elegirAgente}
					>
						<option value="">Seleccioná un agente…</option>
						{#each agentes as a (a.codigo)}
							<option value={a.codigo}>{a.nombre} — {a.correo}</option>
						{/each}
					</select>
				</div>

				<!-- ── Paso 2: árbol de zonas ── -->
				{#if errorArbol}
					<div class="qz-error-caja mt-4 rounded-lg border px-4 py-3 text-sm">
						<p class="font-medium">{errorArbol}</p>
						<button
							class="qz-error-btn mt-2 rounded-md px-3 py-1.5 text-xs font-medium"
							onclick={reintentarArbol}
						>
							Reintentar
						</button>
					</div>
				{:else if cargandoArbol}
					<p class="mt-4 text-sm text-muted-foreground">Cargando zonas…</p>
				{:else if arbol}
					<div class="mt-5 mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
						<p class="text-xs text-muted-foreground">
							<span class="font-medium text-foreground">{zonasVisibles}</span> zonas ·
							<span class="font-medium text-foreground">{totalElegibles}</span> clientes con
							pendientes
							{#if totalSinCarga}
								· <span class="text-muted-foreground">{totalSinCarga} sin carga</span>
							{/if}
						</p>

						{#if totalSinCarga}
							<button
								type="button"
								onclick={() => (verSinCarga = !verSinCarga)}
								class="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all"
								style={verSinCarga
									? `border-color: var(--brand-primary); background-color: var(--brand-primary-light); color: var(--brand-primary-text);`
									: 'border-color: var(--color-border); color: var(--color-muted-foreground);'}
							>
								<span
									class="h-3 w-3 rounded-sm border {verSinCarga
										? 'border-transparent'
										: 'border-current'}"
									style={verSinCarga ? `background-color: var(--brand-primary);` : ''}
								></span>
								{verSinCarga
									? `Ocultar clientes sin pendientes (${totalSinCarga})`
									: 'Mostrar todos los clientes'}
							</button>
						{/if}
					</div>

					<p class="mb-3 text-[13px] leading-relaxed text-muted-foreground">
						El árbol muestra solo los clientes que van a salir en el PDF de este agente, con los
						documentos que le rutean a él. Los montos son aproximados; el PDF manda.
					</p>

					<div class="space-y-2">
						{#each arbol.zonas as entrada (entrada.zona.codigo)}
							{@const enZona = visiblesDeZona(entrada)}
							{@const abierta = zonasAbiertas[entrada.zona.codigo] ?? false}
							{@const visibles = filtrar(enZona, busquedaZona[entrada.zona.codigo])}
							{@const nElegibles = entrada.totalElegibles}
							{@const nMarcados = marcados(entrada.clientes)}

							{#if enZona.length}
								<div class="overflow-hidden rounded-lg border border-border">
									<!-- Encabezado de zona -->
									<div
										class="flex items-center gap-3 px-3 py-2.5"
										style={nMarcados > 0 ? 'background-color: var(--brand-primary-light);' : ''}
									>
										<input
											type="checkbox"
											class="h-4 w-4 shrink-0 cursor-pointer"
											style="accent-color: var(--brand-primary)"
											checked={nElegibles > 0 && nMarcados === nElegibles}
											indeterminate={nMarcados > 0 && nMarcados < nElegibles}
											disabled={nElegibles === 0}
											onchange={() => alternarTodaLaZona(entrada.clientes)}
											aria-label="Seleccionar toda la zona {entrada.zona.nombre}"
										/>
										<button
											type="button"
											class="flex flex-1 items-center gap-2 text-left"
											onclick={() => alternarZona(entrada.zona.codigo)}
											aria-expanded={abierta}
										>
											{#if abierta}
												<ChevronDownIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
											{:else}
												<ChevronRightIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
											{/if}
											<span class="text-sm font-medium text-foreground">{entrada.zona.nombre}</span>
											<span class="font-mono text-[10px] text-muted-foreground"
												>({entrada.zona.codigo})</span
											>
											{#if esInactiva(entrada.zona.nombre)}
												<span
													class="qz-badge-inactiva shrink-0 rounded-full border px-2 py-0.5 text-[11px] leading-normal font-semibold"
												>
													Zona inactiva
												</span>
											{/if}
										</button>
										<span class="shrink-0 text-xs text-muted-foreground">
											{#if nMarcados > 0}
												<span class="font-semibold" style="color: var(--brand-primary-text)"
													>{nMarcados}</span
												>
												/
											{/if}
											{nElegibles} con pendientes
											{#if verSinCarga && entrada.totalNoElegibles}
												<span class="text-muted-foreground/70">
													· {entrada.totalNoElegibles} sin carga</span
												>
											{/if}
										</span>
									</div>

									<!-- Clientes de la zona -->
									{#if abierta}
										<div class="border-t border-border p-3">
											<input
												type="text"
												placeholder="Buscar por código o nombre…"
												bind:value={busquedaZona[entrada.zona.codigo]}
												class="mb-3 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none transition-all sm:max-w-xs"
											/>

											{#if !visibles.length}
												<p class="py-2 text-xs text-muted-foreground">
													Ningún cliente coincide con la búsqueda.
												</p>
											{:else}
												<div class="overflow-x-auto">
													<table class="w-full text-left text-xs">
														<thead class="text-muted-foreground">
															<tr class="border-b border-border">
																<th class="w-8 py-1.5"></th>
																<th class="py-1.5 pr-3 font-medium">Código</th>
																<th class="py-1.5 pr-3 font-medium">Nombre</th>
																<th class="py-1.5 pr-3 font-medium">Teléfono</th>
																<th class="py-1.5 pr-3 font-medium">Cuenta</th>
																<th class="py-1.5 font-medium">Pendiente</th>
															</tr>
														</thead>
														<tbody>
															{#each visibles as c (c.cardCode)}
																<tr
																	class="border-b border-border/50 last:border-0 {c.elegible
																		? 'font-semibold hover:bg-accent/50'
																		: 'opacity-85'}"
																>
																	<td class="py-1.5">
																		<input
																			type="checkbox"
																			class="h-4 w-4 {c.elegible
																				? 'cursor-pointer'
																				: 'cursor-not-allowed'}"
																			style="accent-color: var(--brand-primary)"
																			bind:checked={seleccion[c.cardCode]}
																			disabled={!c.elegible}
																			aria-label="Seleccionar {c.cardCode}"
																		/>
																	</td>
																	<td class="py-1.5 pr-3 font-mono text-foreground">{c.cardCode}</td
																	>
																	<td class="py-1.5 pr-3 text-foreground">{c.cardName}</td>
																	<td class="py-1.5 pr-3 text-muted-foreground">
																		{c.telefono || '—'}
																	</td>
																	<td class="py-1.5 pr-3 text-muted-foreground">
																		{#if c.fatherCard}
																			<span class="whitespace-nowrap">
																				Sucursal de <span class="font-mono">{c.fatherCard}</span>
																			</span>
																		{:else}
																			—
																		{/if}
																	</td>
																	<td class="py-1.5 whitespace-nowrap">
																		{#if c.elegible}
																			<span class="text-foreground">{resumenCarga(c)}</span>
																		{:else}
																			<span class="text-muted-foreground italic"
																				>{motivoLegible(c)}</span
																			>
																		{/if}
																	</td>
																</tr>
															{/each}
														</tbody>
													</table>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/if}
						{/each}

						{#if arbol.sinZona.length}
							<div class="rounded-lg border border-dashed border-border px-3 py-2.5">
								<span class="text-sm font-medium text-foreground">Sin zona asignada</span>
								<span class="ml-2 text-xs text-muted-foreground">
									{arbol.sinZona.filter((c) => c.elegible).length} con pendientes
								</span>
							</div>
						{/if}
					</div>

					<p class="mt-3 text-[12px] leading-relaxed text-muted-foreground">
						Un cliente aparece acá si tiene documentos abiertos que le rutean a este agente, que es
						el mismo criterio con el que se arma el PDF. Las sucursales entran aunque su saldo
						figure en cero, porque se consolida en la cuenta padre.
						{#if totalSinCarga}
							Los {totalSinCarga} sin carga quedan ocultos; el switch de arriba los muestra en gris con
							el motivo.
						{/if}
					</p>
				{/if}
			{/if}
		</div>

		<!-- ── Barra de acción ── -->
		{#if seleccionados.length}
			<div
				class="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-b-xl border-t border-border bg-card px-6 py-3"
			>
				<span class="text-sm text-foreground">
					<span class="font-semibold">{seleccionados.length}</span>
					{seleccionados.length === 1 ? 'cliente seleccionado' : 'clientes seleccionados'}
					{#if zonaDeSeleccion}
						· <span class="text-xs text-muted-foreground">{zonaDeSeleccion}</span>
					{:else}
						· <span class="text-xs text-muted-foreground">selección mixta</span>
					{/if}
				</span>
				<div class="ml-auto flex gap-3">
					<button
						type="button"
						onclick={limpiarSeleccion}
						class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent"
					>
						Limpiar
					</button>
					<button
						type="button"
						onclick={abrirConfirmacion}
						class="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all"
						style="background-color: var(--brand-primary);"
						onmouseenter={(e) => {
							(e.currentTarget as HTMLButtonElement).style.backgroundColor =
								'var(--brand-primary-hover)';
						}}
						onmouseleave={(e) => {
							(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--brand-primary)';
						}}
					>
						Generar gira
					</button>
				</div>
			</div>
		{/if}

		{#if resultado && !enviado && !confirmando}
			<div class="px-6 pb-6">
				<div class="qz-aviso rounded-lg px-4 py-3 text-sm font-medium">
					{resultado.texto}
				</div>
			</div>
		{/if}

		<!-- Franja de seguimiento, visible con el modal cerrado -->
		{#if !confirmando && !enviado && fase !== 'inactivo'}
			<div class="px-6 pb-6">
				{#if fase === 'esperando'}
					<div
						class="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground"
					>
						<span
							class="qz-girando inline-block h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30"
							style="border-top-color: var(--brand-primary);"
						></span>
						<span>Gira en proceso… el detalle aparece acá al terminar.</span>
					</div>
				{:else if fase === 'listo' && detalle}
					{@const completa = detalle.procesados === detalle.solicitados}
					<div class="rounded-lg px-4 py-3 text-sm {completa ? 'qz-exito' : 'qz-aviso'}">
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
							<p class="font-semibold">
								{detalle.procesados} de {detalle.solicitados}
								{detalle.solicitados === 1 ? 'cliente entró' : 'clientes entraron'} en la gira
							</p>
							<button
								type="button"
								class="ml-auto text-xs font-medium underline opacity-90 hover:opacity-100"
								onclick={descartarSeguimiento}
							>
								Descartar
							</button>
						</div>
						{#if detalle.omitidos.length}
							<p class="mt-2 text-xs font-medium opacity-95">
								Quedaron fuera {detalle.omitidos.length} y no aparecen en el PDF:
							</p>
							{#each gruposOmitidos as grupo (grupo.titulo)}
								<p class="mt-2 text-[11px] font-semibold opacity-90">
									{grupo.aviso ? '⚠ ' : ''}{grupo.titulo} ({grupo.codigos.length})
								</p>
								<ul class="mt-0.5 space-y-0.5 text-xs opacity-95">
									{#each grupo.codigos as codigo (codigo)}
										<li class="font-mono">{etiquetaCliente(codigo)}</li>
									{/each}
								</ul>
							{/each}
						{/if}
					</div>
				{:else if fase === 'fallo' || fase === 'perdido'}
					<div class="qz-aviso flex flex-wrap items-center gap-3 rounded-lg px-4 py-3 text-sm">
						<span class="font-medium">{seguimientoNota}</span>
						<button
							type="button"
							class="ml-auto text-xs font-medium underline opacity-90 hover:opacity-100"
							onclick={descartarSeguimiento}
						>
							Descartar
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</section>

	<!-- ══ MODAL DE CONFIRMACIÓN ════════════════════════════════════════════ -->
	{#if confirmando || enviado}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onclick={(e) => {
				if (e.target === e.currentTarget) cerrarTodo();
			}}
		>
			<div class="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
				<div class="flex items-center justify-between border-b border-border px-6 py-4">
					<h2 class="text-base font-semibold text-foreground">Generar gira por zona</h2>
					<button
						type="button"
						onclick={cerrarTodo}
						class="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label="Cerrar"
					>
						✕
					</button>
				</div>

				<div class="p-6">
					{#if enviado}
						<div class="qz-exito rounded-lg px-4 py-3 text-sm font-medium">
							{resultado?.texto}
						</div>

						<!-- Resultado real del trabajo -->
						{#if fase === 'esperando'}
							<div
								class="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground"
							>
								<span
									class="qz-girando inline-block h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30"
									style="border-top-color: var(--brand-primary);"
								></span>
								<span>Procesando… tarda 1-2 minutos. No hace falta esperar acá.</span>
							</div>
						{:else if fase === 'listo' && detalle}
							{@const completa = detalle.procesados === detalle.solicitados}
							<div class="mt-3 rounded-lg px-4 py-3 text-sm {completa ? 'qz-exito' : 'qz-aviso'}">
								<p class="font-semibold">
									{detalle.procesados} de {detalle.solicitados}
									{detalle.solicitados === 1 ? 'cliente entró' : 'clientes entraron'} en la gira
								</p>

								{#if detalle.omitidos.length}
									<p class="mt-2 text-xs font-medium opacity-95">
										{detalle.omitidos.length === 1
											? 'Quedó fuera 1 cliente, y no aparece en el PDF:'
											: `Quedaron fuera ${detalle.omitidos.length} clientes, y no aparecen en el PDF:`}
									</p>
									{#each gruposOmitidos as grupo (grupo.titulo)}
										<p class="mt-2 text-[11px] font-semibold opacity-90">
											{grupo.aviso ? '⚠ ' : ''}{grupo.titulo} ({grupo.codigos.length})
										</p>
										<ul class="mt-0.5 space-y-0.5 text-xs opacity-95">
											{#each grupo.codigos as codigo (codigo)}
												<li class="font-mono">{etiquetaCliente(codigo)}</li>
											{/each}
										</ul>
									{/each}
								{/if}

								{#if !detalle.procesados}
									<p class="mt-2 text-xs leading-relaxed opacity-95">
										{#if detalle.omitidos_detalle?.no_evaluables?.length}
											No se generó ningún PDF porque el sistema no respondió. Esto NO significa que
											la selección no tenga deuda: significa que no se pudo averiguar. Volvé a
											intentar en un rato.
										{:else}
											No se generó ningún PDF: no hay nada que cobrar en esta selección.
										{/if}
									</p>
								{/if}
							</div>
						{:else if fase === 'fallo' || fase === 'perdido'}
							<div class="qz-aviso mt-3 rounded-lg px-4 py-3 text-sm font-medium">
								{seguimientoNota}
							</div>
						{/if}

						<button
							type="button"
							onclick={cerrarTodo}
							class="mt-5 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent"
						>
							Cerrar
						</button>
					{:else}
						<div class="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
							<div class="flex justify-between gap-3 py-0.5">
								<span class="text-muted-foreground">Agente</span>
								<span class="text-right font-medium text-foreground">{agenteSel?.nombre}</span>
							</div>
							<div class="flex justify-between gap-3 py-0.5">
								<span class="text-muted-foreground">Zona</span>
								<span class="text-right font-medium text-foreground">
									{zonaDeSeleccion ?? 'Selección manual (varias zonas)'}
								</span>
							</div>
							<div class="flex justify-between gap-3 py-0.5">
								<span class="text-muted-foreground">Clientes</span>
								<span class="text-right font-medium text-foreground">{seleccionados.length}</span>
							</div>
						</div>

						<div class="mt-4">
							<label
								for="metodo-gira-zona"
								class="mb-1 block text-xs font-medium text-muted-foreground"
							>
								Método
							</label>
							<select
								id="metodo-gira-zona"
								bind:value={metodo}
								class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all"
							>
								<option value="agente">Enviar directo</option>
								<option value="revision">Enviar a revisión (oficina)</option>
							</select>
							<p class="mt-1.5 text-xs text-muted-foreground">{ayudaMetodo}</p>

							{#if metodo === 'revision'}
								<div class="mt-3">
									<label
										for="correoRevisionGiraZona"
										class="mb-1 block text-xs font-medium text-muted-foreground"
									>
										Correo destino
									</label>
									<input
										id="correoRevisionGiraZona"
										type="text"
										placeholder="cxc@soportexperto.com"
										bind:value={correoRevision}
										class="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-all"
										style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light); color: var(--brand-primary-text);"
									/>
								</div>
							{/if}
						</div>

						<p class="mt-4 text-sm text-foreground">
							{#if metodo === 'agente'}
								¿Confirmás el envío de la gira de
								<span class="font-semibold">{seleccionados.length}</span>
								{seleccionados.length === 1 ? 'cliente' : 'clientes'} a
								<span class="font-semibold">{agenteSel?.nombre}</span>
								(<span class="font-mono text-xs">{agenteSel?.correo}</span>)?
							{:else}
								¿Confirmás el envío de la gira de
								<span class="font-semibold">{seleccionados.length}</span>
								{seleccionados.length === 1 ? 'cliente' : 'clientes'} a revisión (<span
									class="font-mono text-xs">{correoRevision}</span
								>)? El agente no la recibirá.
							{/if}
						</p>

						<div class="mt-5 flex gap-3">
							<button
								type="button"
								onclick={cerrarConfirmacion}
								disabled={enviando}
								class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent disabled:opacity-50"
							>
								Cancelar
							</button>
							<button
								type="button"
								onclick={enviarGira}
								disabled={enviando || !puedeEnviar()}
								class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
								style="background-color: var(--brand-primary);"
							>
								{enviando ? 'Enviando…' : 'Sí, generar'}
							</button>
						</div>

						{#if resultado && !resultado.ok}
							<div class="qz-aviso mt-4 rounded-lg px-4 py-3 text-sm font-medium">
								{resultado.texto}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/*
	  Este proyecto usa `@theme inline`, que reemplaza el tema de Tailwind: las
	  utilidades de color NO se generan solas y app.css solo declara a mano las
	  familias `slate` y `blue`. Por eso `bg-amber-600`, `bg-green-600` o
	  `bg-red-50` no pintan nada acá. Los estados de color del panel se definen
	  abajo con valores explícitos, con su variante para modo oscuro.
	*/

	.qz-girando {
		animation: qz-girar 0.8s linear infinite;
	}

	@keyframes qz-girar {
		to {
			transform: rotate(360deg);
		}
	}

	.qz-badge-inactiva {
		background-color: #fde68a;
		border-color: #d97706;
		color: #713f12;
	}

	.qz-aviso {
		background-color: #b45309;
		color: #ffffff;
	}

	.qz-exito {
		background-color: #15803d;
		color: #ffffff;
	}

	.qz-error-caja {
		background-color: #fef2f2;
		border-color: #fecaca;
		color: #b91c1c;
	}

	.qz-error-btn {
		background-color: #dc2626;
		color: #ffffff;
	}

	.qz-error-btn:hover {
		background-color: #b91c1c;
	}

	:global(.dark) .qz-badge-inactiva {
		background-color: rgba(245, 158, 11, 0.2);
		border-color: rgba(245, 158, 11, 0.5);
		color: #fde68a;
	}

	:global(.dark) .qz-error-caja {
		background-color: rgba(127, 29, 29, 0.25);
		border-color: rgba(153, 27, 27, 0.6);
		color: #fca5a5;
	}
</style>
