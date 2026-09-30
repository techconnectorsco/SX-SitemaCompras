<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Activity,
		AlertTriangle,
		ArrowDownRight,
		BarChart3,
		Clapperboard,
		Clock3,
		Coins,
		FileClock,
		RefreshCw
	} from 'lucide-svelte';

	type Usage = {
		tokens: number;
		calls: number;
		billedCost: number;
		providerCost: number;
		legacyCost: number;
	};
	type AuditRow = {
		id: number;
		publication_id: number;
		actorName: string;
		ownerName: string;
		action: string;
		title: string;
		brandName: string;
		accountName: string | null;
		detail: string | null;
		created_at: number;
		historical: number;
	};
	type Report = {
		usage: Usage;
		trend: Array<{ day: string; tokens: number; calls: number; cost: number }>;
		breakdown: Array<{
			userId: string;
			userName: string;
			brandId: number | null;
			brandName: string;
			task: string;
			model: string;
			calls: number;
			tokens: number;
			cost: number;
			legacyCost: number;
		}>;
		states: Array<{ status: string; count: number }>;
		published: number;
		publicationAlerts: Array<{
			id: number;
			title: string;
			userName: string;
			brandName: string;
			accountName: string | null;
			error: string | null;
			occurredAt: number | null;
		}>;
		publicationAlertCount: number;
		accountAlerts: Array<{ id: number; name: string; expiresAt: number | null; status: string }>;
		accountAlertCount: number;
		users: Array<{ id: string; name: string }>;
		brands: Array<{ id: number; name: string }>;
	};
	type Payload = {
		report: Report;
		audit: { total: number; rows: AuditRow[]; page: number; pageSize: number };
	};

	const now = new Date();
	let fromDate = $state(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
	let toDate = $state(
		`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
	);
	let userId = $state('');
	let brandId = $state('');
	let action = $state('');
	let activeTab = $state<'overview' | 'audit'>('overview');
	let page = $state(1);
	let payload = $state<Payload | null>(null);
	let loading = $state(false);
	let error = $state('');
	let requestId = 0;

	const actionLabels: Record<string, string> = {
		CREATED: 'Creó',
		EDITED: 'Editó',
		APPROVED: 'Aprobó',
		REJECTED: 'Rechazó',
		PUBLISHED: 'Publicó',
		PUBLISH_ERROR: 'Error al publicar',
		DELETED: 'Eliminó'
	};
	const stateOrder = ['Borrador', 'En revisión', 'Guardado', 'Aprobado', 'Publicado', 'Error API'];
	const stateCounts = $derived(
		Object.fromEntries(
			(payload?.report.states ?? []).map((row) => [row.status, row.count])
		) as Record<string, number>
	);
	const maxTrend = $derived(Math.max(1, ...(payload?.report.trend.map((row) => row.tokens) ?? [])));
	const number = (value: number) => new Intl.NumberFormat('es-SV').format(value || 0);
	const money = (value: number) =>
		new Intl.NumberFormat('es-SV', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 4
		}).format(value || 0);
	const dateTime = (value: number | null) =>
		value
			? new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' }).format(
					value * 1000
				)
			: 'Sin fecha';

	async function load() {
		const current = ++requestId;
		loading = true;
		error = '';
		try {
			const from = Math.floor(new Date(`${fromDate}T00:00:00`).getTime() / 1000);
			const to = Math.floor(new Date(`${toDate}T23:59:59`).getTime() / 1000);
			if (!Number.isFinite(from) || !Number.isFinite(to) || to < from)
				throw new Error('Revisa el rango de fechas.');
			const params = new URLSearchParams({
				from: String(from),
				to: String(to),
				page: String(page)
			});
			if (userId) params.set('userId', userId);
			if (brandId) params.set('brandId', brandId);
			if (action) params.set('action', action);
			const response = await fetch(`/api/admin/content-creator?${params}`);
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || 'No se pudo cargar el panel.');
			if (current === requestId) payload = result;
		} catch (cause) {
			if (current === requestId)
				error = cause instanceof Error ? cause.message : 'No se pudo cargar el panel.';
		} finally {
			if (current === requestId) loading = false;
		}
	}

	function applyFilters(event: SubmitEvent) {
		event.preventDefault();
		page = 1;
		void load();
	}

	function changePage(next: number) {
		page = next;
		void load();
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head><title>Admin · Creador de contenido</title></svelte:head>

<div
	class="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fb] p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-7"
>
	<div class="mx-auto max-w-7xl space-y-6 pb-12">
		<header class="rounded-2xl bg-[#253166] px-6 py-7 text-white shadow-sm sm:px-8">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="space-y-2">
					<p
						class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200"
					>
						<Clapperboard class="size-4" /> Centro de operación
					</p>
					<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Creador de contenido</h1>
					<p class="max-w-2xl text-sm text-indigo-100">
						Consumo de IA, producción editorial y actividad de publicaciones en un solo lugar.
					</p>
				</div>
				<button
					type="button"
					onclick={() => void load()}
					disabled={loading}
					class="inline-flex items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
					><RefreshCw class={loading ? 'size-4 animate-spin' : 'size-4'} /> Actualizar</button
				>
			</div>
		</header>

		<form
			onsubmit={applyFilters}
			class="grid gap-3 rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr_1.3fr_auto] xl:items-end"
		>
			<label class="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
				>Desde<input
					aria-label="Desde"
					type="date"
					bind:value={fromDate}
					class="block h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
				/></label
			>
			<label class="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
				>Hasta<input
					aria-label="Hasta"
					type="date"
					bind:value={toDate}
					class="block h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
				/></label
			>
			<label class="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
				>Usuario<select
					bind:value={userId}
					class="block h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
					><option value="">Todos</option
					>{#each payload?.report.users ?? [] as user (user.id)}<option value={user.id}
							>{user.name}</option
						>{/each}</select
				></label
			>
			<label class="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
				>Marca<select
					bind:value={brandId}
					class="block h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
					><option value="">Todas</option
					>{#each payload?.report.brands ?? [] as brand (brand.id)}<option value={String(brand.id)}
							>{brand.name}</option
						>{/each}</select
				></label
			>
			<button
				type="submit"
				disabled={loading}
				class="h-10 rounded-md bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
				>Aplicar</button
			>
		</form>

		{#if error}<div
				role="alert"
				class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
			>
				{error}
			</div>{/if}
		<nav
			aria-label="Secciones del creador"
			class="flex gap-1 border-b border-slate-200 dark:border-slate-800"
		>
			<button
				type="button"
				aria-current={activeTab === 'overview' ? 'page' : undefined}
				onclick={() => (activeTab = 'overview')}
				class={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'overview' ? 'border-orange-600 text-orange-700 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
				>Resumen operativo</button
			>
			<button
				type="button"
				aria-current={activeTab === 'audit' ? 'page' : undefined}
				onclick={() => (activeTab = 'audit')}
				class={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === 'audit' ? 'border-orange-600 text-orange-700 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
				>Auditoría</button
			>
		</nav>

		{#if loading && !payload}<p class="py-16 text-center text-sm text-slate-500">
				Cargando datos del creador…
			</p>{/if}
		{#if payload}
			{#if activeTab === 'overview'}
				<section
					aria-label="Indicadores principales"
					class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
				>
					{#each [{ icon: Coins, label: 'Tokens usados', value: number(payload.report.usage.tokens), note: 'Durante el período' }, { icon: Activity, label: 'Llamadas a IA', value: number(payload.report.usage.calls), note: 'Durante el período' }, { icon: ArrowDownRight, label: 'Costo estimado', value: money(payload.report.usage.billedCost), note: 'Histórico aproximado: ' + money(payload.report.usage.legacyCost) }, { icon: Clapperboard, label: 'Publicadas', value: number(payload.report.published), note: 'Durante el período' }] as card (card.label)}
						<div
							class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
						>
							<div
								class="mb-5 flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-[#253166] dark:bg-indigo-950 dark:text-indigo-200"
							>
								<card.icon class="size-5" />
							</div>
							<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
								{card.label}
							</p>
							<p class="mt-1 text-2xl font-bold tabular-nums">{card.value}</p>
							<p class="mt-2 text-xs text-slate-500">{card.note}</p>
						</div>
					{/each}
				</section>

				<div class="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
					<section
						class="rounded-xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
					>
						<h2 class="flex items-center gap-2 text-base font-semibold">
							<BarChart3 class="size-4 text-orange-600" /> Uso diario de IA
						</h2>
						{#if payload.report.trend.length}
							<div
								class="mt-6 flex h-44 items-end gap-1 overflow-x-auto border-b border-slate-200 pb-1 dark:border-slate-700"
								aria-label="Gráfico diario de tokens"
							>
								{#each payload.report.trend as day (day.day)}
									<div
										class="group flex h-full min-w-5 flex-1 items-end"
										title={`${day.day}: ${number(day.tokens)} tokens, ${number(day.calls)} llamadas`}
									>
										<div
											class="w-full rounded-t-sm bg-[#253166] transition-colors group-hover:bg-orange-500"
											style={`height: ${Math.max(3, (day.tokens / maxTrend) * 100)}%`}
										></div>
									</div>
								{/each}
							</div>
							<p class="mt-2 flex justify-between text-xs text-slate-500">
								<span>{payload.report.trend[0].day}</span><span
									>{payload.report.trend[payload.report.trend.length - 1].day}</span
								>
							</p>
						{:else}<p class="py-14 text-center text-sm text-slate-500">
								No hubo llamadas a IA en este período.
							</p>{/if}
					</section>
					<section
						class="rounded-xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
					>
						<h2 class="text-base font-semibold">Estado actual de publicaciones</h2>
						<p class="mt-1 text-xs text-slate-500">
							Conteos actuales; no dependen del rango de fechas.
						</p>
						<div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
							{#each stateOrder as state (state)}
								<div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
									<p class="text-xs text-slate-500 dark:text-slate-300">{state}</p>
									<p class="mt-1 text-xl font-bold tabular-nums">
										{number(stateCounts[state] || 0)}
									</p>
								</div>
							{/each}
						</div>
					</section>
				</div>

				<section class="grid gap-5 xl:grid-cols-2" aria-label="Alertas">
					<div
						class="rounded-xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
					>
						<h2 class="flex items-center gap-2 text-base font-semibold">
							<AlertTriangle class="size-4 text-orange-600" /> Errores de publicación
							<span class="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
								>{payload.report.publicationAlertCount}</span
							>
						</h2>
						{#if payload.report.publicationAlerts.length}<ul
								class="mt-4 max-h-80 divide-y overflow-y-auto dark:divide-slate-800"
							>
								{#each payload.report.publicationAlerts as item (item.id)}<li class="py-3">
										<p class="text-sm font-semibold">{item.title}</p>
										<p class="mt-0.5 text-xs text-slate-500">
											{item.userName} · {item.brandName} · {item.accountName || 'Sin cuenta'} · {dateTime(
												item.occurredAt
											)}
										</p>
										<p class="mt-1 text-xs text-red-700 dark:text-red-400">
											{item.error || 'Error de API sin detalle'}
										</p>
									</li>{/each}
							</ul>{:else}<p class="py-10 text-center text-sm text-slate-500">
								No hay publicaciones con errores activos.
							</p>{/if}
					</div>
					<div
						class="rounded-xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
					>
						<h2 class="flex items-center gap-2 text-base font-semibold">
							<Clock3 class="size-4 text-orange-600" /> Conexiones Meta
							<span class="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
								>{payload.report.accountAlertCount}</span
							>
						</h2>
						{#if payload.report.accountAlerts.length}<ul
								class="mt-4 max-h-80 divide-y overflow-y-auto dark:divide-slate-800"
							>
								{#each payload.report.accountAlerts as item (item.id)}<li
										class="flex items-center justify-between gap-3 py-3"
									>
										<span class="text-sm font-medium">{item.name}</span><span
											class={`text-xs font-semibold ${item.status === 'invalid' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}
											>{item.status === 'invalid'
												? 'Inválida o vencida'
												: `Vence ${dateTime(item.expiresAt)}`}</span
										>
									</li>{/each}
							</ul>{:else}<p class="py-10 text-center text-sm text-slate-500">
								Todas las conexiones están vigentes.
							</p>{/if}
					</div>
				</section>

				<section
					class="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
				>
					<div class="border-b p-5 dark:border-slate-800">
						<h2 class="text-base font-semibold">Detalle de consumo</h2>
						<p class="mt-1 text-xs text-slate-500">
							Hasta 100 combinaciones de usuario, marca, tarea y modelo, ordenadas por tokens.
						</p>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full min-w-[760px] text-left text-sm">
							<thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"
								><tr
									><th class="p-3">Usuario</th><th class="p-3">Marca</th><th class="p-3"
										>Tarea / modelo</th
									><th class="p-3 text-right">Llamadas</th><th class="p-3 text-right">Tokens</th><th
										class="p-3 text-right">Costo</th
									></tr
								></thead
							><tbody class="divide-y dark:divide-slate-800"
								>{#each payload.report.breakdown as item (`${item.userId}:${item.brandId}:${item.task}:${item.model}`)}<tr
										><td class="p-3 font-medium">{item.userName}</td><td class="p-3"
											>{item.brandName}</td
										><td class="p-3"
											>{item.task}<span class="block text-xs text-slate-500">{item.model}</span></td
										><td class="p-3 text-right tabular-nums">{number(item.calls)}</td><td
											class="p-3 text-right tabular-nums">{number(item.tokens)}</td
										><td class="p-3 text-right tabular-nums"
											>{money(item.cost)}{#if item.legacyCost}<span
													class="block text-xs text-slate-500"
													>+ {money(item.legacyCost)} aprox.</span
												>{/if}</td
										></tr
									>{:else}<tr
										><td colspan="6" class="p-10 text-center text-slate-500"
											>No hay consumo para estos filtros.</td
										></tr
									>{/each}</tbody
							>
						</table>
					</div>
				</section>
			{:else}
				<section
					class="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
				>
					<div
						class="flex flex-wrap items-end justify-between gap-3 border-b p-5 dark:border-slate-800"
					>
						<div>
							<h2 class="flex items-center gap-2 text-base font-semibold">
								<FileClock class="size-4 text-orange-600" /> Auditoría de publicaciones
							</h2>
							<p class="mt-1 text-xs text-slate-500">
								{number(payload.audit.total)} eventos. Las creaciones anteriores al registro se marcan
								como históricas.
							</p>
						</div>
						<label class="text-xs font-semibold text-slate-600 dark:text-slate-300"
							>Acción<select
								bind:value={action}
								onchange={() => {
									page = 1;
									void load();
								}}
								class="ml-2 rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
								><option value="">Todas</option
								>{#each Object.entries(actionLabels) as [key, label] (key)}<option value={key}
										>{label}</option
									>{/each}</select
							></label
						>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full min-w-[780px] text-left text-sm">
							<thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"
								><tr
									><th class="p-3">Fecha y hora</th><th class="p-3">Actor</th><th class="p-3"
										>Acción</th
									><th class="p-3">Publicación</th><th class="p-3">Marca / cuenta</th></tr
								></thead
							><tbody class="divide-y dark:divide-slate-800"
								>{#each payload.audit.rows as row (row.id)}<tr
										><td class="whitespace-nowrap p-3 tabular-nums">{dateTime(row.created_at)}</td
										><td class="p-3">{row.actorName}</td><td class="p-3"
											><span class="font-semibold">{actionLabels[row.action] || row.action}</span
											>{#if row.historical}<span class="block text-xs text-slate-500"
													>Registro histórico</span
												>{/if}{#if row.detail}<span
													class="block max-w-xs truncate text-xs text-red-700 dark:text-red-400"
													title={row.detail}>{row.detail}</span
												>{/if}</td
										><td class="p-3"
											><span class="font-medium">{row.title}</span><span
												class="block text-xs text-slate-500"
												>#{row.publication_id} · {row.ownerName}</span
											></td
										><td class="p-3"
											>{row.brandName}<span class="block text-xs text-slate-500"
												>{row.accountName || 'Sin cuenta'}</span
											></td
										></tr
									>{:else}<tr
										><td colspan="5" class="p-10 text-center text-slate-500"
											>No hay eventos para estos filtros.</td
										></tr
									>{/each}</tbody
							>
						</table>
					</div>
					<div class="flex items-center justify-between border-t p-4 text-sm dark:border-slate-800">
						<span class="text-slate-500"
							>Página {payload.audit.page} de {Math.max(
								1,
								Math.ceil(payload.audit.total / payload.audit.pageSize)
							)}</span
						>
						<div class="flex gap-2">
							<button
								type="button"
								disabled={page <= 1 || loading}
								onclick={() => changePage(page - 1)}
								class="rounded-md border px-3 py-1.5 disabled:opacity-40">Anterior</button
							><button
								type="button"
								disabled={page * payload.audit.pageSize >= payload.audit.total || loading}
								onclick={() => changePage(page + 1)}
								class="rounded-md border px-3 py-1.5 disabled:opacity-40">Siguiente</button
							>
						</div>
					</div>
				</section>
			{/if}
		{/if}
	</div>
</div>
