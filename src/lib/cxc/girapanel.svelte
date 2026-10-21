<script lang="ts">
	import type { AgenteSAP, MetodoEnvioGira, OrdenEjecucionGira } from '$lib/cxc/types';
	import type { BrandConfig } from '$lib/brand/types';

	let {
		apiBase = '/cuentasxcobrar/api',
		brand
	}: {
		apiBase?: string;
		brand: BrandConfig;
	} = $props();

	let abierto = $state(false);
	let cargando = $state(false);
	let cargados = $state(false);
	let errorCarga = $state<string | null>(null);
	let agentes = $state<AgenteSAP[]>([]);

	let seleccionado = $state<AgenteSAP | null>(null);
	let alcance = $state<'agente' | 'completo'>('agente');
	let metodo = $state<MetodoEnvioGira>('agente');
	let correoRevision = $state(brand.correoRevisionDefault);

	let confirmando = $state(false);
	let enviando = $state(false);
	let enviado = $state(false);
	let resultado = $state<{ ok: boolean; texto: string } | null>(null);

	const ayudaMetodo = $derived(
		metodo === 'agente'
			? alcance === 'completo'
				? 'Cada agente recibe su gira directo a su correo registrado — igual que la corrida automática.'
				: 'La gira se envía directo al correo del agente registrado.'
			: alcance === 'completo'
				? 'Llega un PDF por cada agente al correo indicado abajo, para revisar antes del envío real. Ningún agente las recibe.'
				: 'La gira llega al correo indicado abajo (por ejemplo, para reimprimirla en oficina). El agente no la recibe.'
	);

	async function abrir() {
		abierto = true;
		resultado = null;
		confirmando = false;
		enviado = false;
		seleccionado = null;
		alcance = 'agente';
		if (!cargados) await cargarAgentes();
	}

	function cerrar() {
		abierto = false;
		confirmando = false;
	}

	async function cargarAgentes() {
		cargando = true;
		errorCarga = null;
		try {
			const res = await fetch(`${apiBase}/agentes`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			agentes = data.agentes;
			cargados = true;
		} catch (e) {
			errorCarga = 'No se pudo cargar la lista de agentes. Verificá la conexión al sistema.';
			console.error(e);
		} finally {
			cargando = false;
		}
	}

	function elegirAgente(e: Event) {
		const cod = Number((e.currentTarget as HTMLSelectElement).value);
		seleccionado = agentes.find((a) => a.codigo === cod) ?? null;
	}

	function puedeContinuar() {
		if (alcance === 'agente' && !seleccionado) return false;
		if (metodo === 'revision' && !correoRevision.trim()) return false;
		return true;
	}

	function pedirConfirmacion() {
		if (!puedeContinuar()) return;
		confirmando = true;
	}

	async function enviarGira() {
		if (alcance === 'agente' && !seleccionado) return;
		enviando = true;
		resultado = null;
		try {
			const body: OrdenEjecucionGira = {
				agenteCodigo: alcance === 'completo' ? null : String(seleccionado!.codigo),
				metodo,
				correoRevision: metodo === 'revision' ? correoRevision.trim() : undefined
			};
			const res = await fetch(`${apiBase}/ejecutar-gira`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await res.json();
			resultado = {
				ok: res.ok,
				texto: res.ok
					? `${data.mensaje ?? 'Gira enviada.'} El procesamiento puede tardar unos 10 minutos — llega por correo cuando esté listo.`
					: (data.mensaje ?? 'No se pudo enviar la gira.')
			};
			if (res.ok) enviado = true;
		} catch (e) {
			resultado = { ok: false, texto: 'Error de red al enviar la gira.' };
			console.error(e);
		} finally {
			enviando = false;
			confirmando = false;
		}
	}
</script>

<div
	style="
		--brand-primary:        {brand.css.primary};
		--brand-primary-hover:  {brand.css.primaryHover};
		--brand-primary-light:  {brand.css.primaryLight};
		--brand-primary-border: {brand.css.primaryBorder};
		--brand-primary-text:   {brand.css.primaryText};
		--brand-primary-ring:   {brand.css.primaryRing};
	"
>
	<!-- ══ SECCIÓN GIRA DE AGENTES ═════════════════════════════════════════ -->
	<section class="rounded-xl border border-border bg-card shadow-sm">
		<div class="flex items-center gap-3 border-b border-border px-6 py-4">
			<div class="h-5 w-1 rounded-full" style="background-color: var(--brand-primary)"></div>
			<div>
				<h2 class="text-base font-semibold text-foreground">Gira de Agentes</h2>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Generá y enviá manualmente la gira de un agente puntual, sin esperar al envío automático
					de los martes.
				</p>
			</div>
		</div>

		<div class="p-6">
			<button
				type="button"
				onclick={abrir}
				class="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all"
				style="background-color: var(--brand-primary);"
				onmouseenter={(e) => {
					(e.currentTarget as HTMLButtonElement).style.backgroundColor =
						'var(--brand-primary-hover)';
				}}
				onmouseleave={(e) => {
					(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--brand-primary)';
				}}
			>
				Enviar gira manual
			</button>
		</div>
	</section>

	<!-- ══ MODAL ════════════════════════════════════════════════════════════ -->
	{#if abierto}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onclick={(e) => {
				if (e.target === e.currentTarget) cerrar();
			}}
		>
			<div class="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
				<div class="flex items-center justify-between border-b border-border px-6 py-4">
					<h2 class="text-base font-semibold text-foreground">Enviar Gira Manual</h2>
					<button
						type="button"
						onclick={cerrar}
						class="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label="Cerrar"
					>
						✕
					</button>
				</div>

				<div class="p-6">
					{#if errorCarga}
						<div
							class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
						>
							<p class="font-medium">{errorCarga}</p>
							<button
								class="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
								onclick={cargarAgentes}
							>
								Reintentar
							</button>
						</div>
					{:else if cargando}
						<p class="text-sm text-muted-foreground">Cargando agentes…</p>
					{:else if enviado}
						<div class="rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white">
							{resultado?.texto}
						</div>
						<button
							type="button"
							onclick={cerrar}
							class="mt-5 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent"
						>
							Cerrar
						</button>
					{:else if !confirmando}
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<button
								type="button"
								onclick={() => (alcance = 'agente')}
								class="rounded-lg border px-4 py-3 text-left transition"
								style={alcance === 'agente'
									? `border-color: var(--brand-primary); background-color: var(--brand-primary-light); box-shadow: 0 0 0 1px var(--brand-primary);`
									: 'border-color: var(--color-border);'}
							>
								<span class="block text-sm font-medium text-foreground">Agente específico</span>
								<span class="mt-0.5 block text-xs text-muted-foreground">Elegí uno de la lista</span
								>
							</button>
							<button
								type="button"
								onclick={() => (alcance = 'completo')}
								class="rounded-lg border px-4 py-3 text-left transition"
								style={alcance === 'completo'
									? `border-color: var(--brand-primary); background-color: var(--brand-primary-light); box-shadow: 0 0 0 1px var(--brand-primary);`
									: 'border-color: var(--color-border);'}
							>
								<span class="block text-sm font-medium text-foreground">Todos los agentes</span>
								<span class="mt-0.5 block text-xs text-muted-foreground"
									>Igual que la corrida automática</span
								>
							</button>
						</div>

						{#if alcance === 'agente'}
							<div class="mt-4">
								<label for="agente" class="mb-1 block text-xs font-medium text-muted-foreground">
									Agente ({agentes.length} con correo asignado)
								</label>
								<select
									id="agente"
									class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all"
									onchange={elegirAgente}
								>
									<option value="">Seleccioná un agente…</option>
									{#each agentes as a (a.codigo)}
										<option value={a.codigo}>{a.nombre} — {a.correo}</option>
									{/each}
								</select>
							</div>
						{:else}
							<p class="mt-4 text-xs text-muted-foreground">
								Se van a procesar los {agentes.length} agentes con correo asignado.
							</p>
						{/if}

						<div class="mt-4">
							<label for="metodo-gira" class="mb-1 block text-xs font-medium text-muted-foreground">
								Método
							</label>
							<select
								id="metodo-gira"
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
										for="correoRevisionGira"
										class="mb-1 block text-xs font-medium text-muted-foreground"
									>
										Correo destino
									</label>
									<input
										id="correoRevisionGira"
										type="text"
										placeholder="cxc@soportexperto.com"
										bind:value={correoRevision}
										class="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-all"
										style="border-color: var(--brand-primary-border); background-color: var(--brand-primary-light); color: var(--brand-primary-text);"
									/>
								</div>
							{/if}
						</div>

						<button
							type="button"
							onclick={pedirConfirmacion}
							disabled={!puedeContinuar()}
							class="mt-5 w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
							style="background-color: var(--brand-primary);"
						>
							Continuar
						</button>
					{:else}
						{#if alcance === 'completo'}
							{#if metodo === 'agente'}
								<p class="text-sm text-foreground">
									¿Confirmás el envío de la gira a
									<span class="font-semibold">TODOS los agentes</span>
									con correo asignado ({agentes.length})? Es la misma corrida que el proceso
									automático de los martes, directo al correo de cada agente.
								</p>
							{:else}
								<p class="text-sm text-foreground">
									¿Confirmás el envío de <span class="font-semibold">todas las giras</span>
									({agentes.length} agentes) a revisión (<span class="font-mono text-xs"
										>{correoRevision}</span
									>)? Vas a recibir un PDF por cada agente — ninguno de ellos las recibe.
								</p>
							{/if}
						{:else if metodo === 'agente'}
							<p class="text-sm text-foreground">
								¿Confirmás el envío de la gira a
								<span class="font-semibold">{seleccionado?.nombre}</span>
								(<span class="font-mono text-xs">{seleccionado?.correo}</span>)?
							</p>
						{:else}
							<p class="text-sm text-foreground">
								¿Confirmás el envío de la gira de
								<span class="font-semibold">{seleccionado?.nombre}</span>
								a revisión (<span class="font-mono text-xs">{correoRevision}</span>)? El agente no
								la recibirá.
							</p>
						{/if}

						<div class="mt-5 flex gap-3">
							<button
								type="button"
								onclick={() => (confirmando = false)}
								disabled={enviando}
								class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent disabled:opacity-50"
							>
								Cancelar
							</button>
							<button
								type="button"
								onclick={enviarGira}
								disabled={enviando}
								class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
								style="background-color: var(--brand-primary);"
							>
								{enviando ? 'Enviando…' : 'Sí, enviar'}
							</button>
						</div>
					{/if}

					{#if resultado && !enviado}
						<div class="mt-4 rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white">
							{resultado.texto}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
