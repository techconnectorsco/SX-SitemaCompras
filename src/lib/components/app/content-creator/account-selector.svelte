<script lang="ts">
	/**
	 * AccountSelector
	 * Selector de cuenta Meta conectada para el módulo Content Creator.
	 * Carga las cuentas desde /api/content-creator/meta/auth/list, muestra
	 * su estado (Page FB/IG, expiración del token), y permite:
	 *   - Conectar nueva cuenta vía OAuth (botón que abre /meta/auth/login)
	 *   - Refrescar token de una cuenta
	 *   - Desconectar una cuenta
	 *
	 * El `cuentaId` seleccionado se persiste en localStorage (por sesión/navegador)
	 * y se expone como prop bindable hacia el padre.
	 */
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Facebook, Instagram, RefreshCw, Plus, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-svelte';

	interface AccountRow {
		id: number;
		nombre: string;
		meta_facebook_page_id: string | null;
		meta_instagram_id: string | null;
		token_valid: boolean;
		days_until_expiration: number | null;
		redes_activas: number[];
		deleted_at: number | null;
	}

	let {
		cuentaId = $bindable<number | null>(null)
	}: {
		cuentaId?: number | null;
	} = $props();

	let accounts = $state<AccountRow[]>([]);
	let loading = $state(true);
	let refreshing = $state<number | null>(null);
	let disconnecting = $state<number | null>(null);

	const STORAGE_KEY = 'vedoba:meta-account-id';

	onMount(() => {
		loadAccounts();
		// Leer cuentaId guardada.
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			cuentaId = Number(saved);
		}
	});

	async function loadAccounts() {
		loading = true;
		try {
			const res = await fetch('/api/content-creator/meta/auth/list');
			const data = await res.json();
			if (data.success && Array.isArray(data.accounts)) {
				accounts = data.accounts;
				// Si no hay cuentaId seleccionada, tomar la primera válida.
				if (cuentaId == null) {
					const firstValid = accounts.find((a) => a.token_valid);
					if (firstValid) {
						cuentaId = firstValid.id;
						localStorage.setItem(STORAGE_KEY, String(cuentaId));
					}
				} else if (!accounts.find((a) => a.id === cuentaId && a.token_valid)) {
					// La cuenta guardada ya no es válida → resetear.
					cuentaId = null;
					localStorage.removeItem(STORAGE_KEY);
				}
			} else {
				accounts = [];
			}
		} catch (err: any) {
			console.error('[AccountSelector] loadAccounts error:', err);
			toast.error('Error al cargar cuentas Meta', { description: err.message });
		} finally {
			loading = false;
		}
	}

	function selectAccount(id: number) {
		cuentaId = id;
		localStorage.setItem(STORAGE_KEY, String(id));
	}

	async function connectAccount() {
		// El flujo OAuth termina redirigiendo de vuelta a /contentCreator con query params.
		window.location.href = '/api/content-creator/meta/auth/login?returnTo=' + encodeURIComponent('/contentCreator');
	}

	async function refreshAccount(id: number) {
		refreshing = id;
		try {
			const res = await fetch('/api/content-creator/meta/auth/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cuentaId: id })
			});
			const data = await res.json();
			if (res.ok && data.success) {
				toast.success('Token refrescado', {
					description: `Vence en ${data.daysUntilExpiration} días.`
				});
				await loadAccounts();
			} else {
				toast.error('Error al refrescar', { description: data.error });
			}
		} catch (err: any) {
			toast.error('Error de red al refrescar', { description: err.message });
		} finally {
			refreshing = null;
		}
	}

	async function disconnectAccount(id: number, nombre: string) {
		if (!confirm(`¿Desconectar la cuenta "${nombre}"? Se revocará el acceso a Meta.`)) return;
		disconnecting = id;
		try {
			const res = await fetch('/api/content-creator/meta/auth/disconnect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cuentaId: id })
			});
			const data = await res.json();
			if (res.ok && data.success) {
				toast.success('Cuenta desconectada', { description: nombre });
				if (cuentaId === id) {
					cuentaId = null;
					localStorage.removeItem(STORAGE_KEY);
				}
				await loadAccounts();
			} else {
				toast.error('Error al desconectar', { description: data.error });
			}
		} catch (err: any) {
			toast.error('Error de red al desconectar', { description: err.message });
		} finally {
			disconnecting = null;
		}
	}

	function tokenStatus(a: AccountRow): {
		cls: string;
		icon: typeof CheckCircle2;
		label: string;
	} {
		if (!a.token_valid) {
			return { cls: 'text-red-500', icon: AlertCircle, label: 'Token inválido' };
		}
		if (a.days_until_expiration != null && a.days_until_expiration <= 7) {
			return { cls: 'text-amber-500', icon: Clock, label: `Vence en ${a.days_until_expiration}d` };
		}
		return { cls: 'text-green-500', icon: CheckCircle2, label: 'Conectado' };
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<p class="px-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/85">
			Cuentas Meta
		</p>
		<button
			type="button"
			onclick={connectAccount}
			title="Conectar cuenta Meta (OAuth)"
			class="flex items-center gap-1 rounded-md bg-[#0D1E3D] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#1c2750] transition-colors"
		>
			<Plus class="h-3 w-3" />
			<span>Conectar</span>
		</button>
	</div>

	{#if loading}
		<p class="px-2 text-[10px] text-muted-foreground">Cargando…</p>
	{:else if accounts.length === 0}
		<div class="rounded-lg border border-dashed bg-muted/40 p-3 text-center">
			<p class="text-[10px] text-muted-foreground">
				Sin cuentas conectadas. Hacé clic en <strong>Conectar</strong> para vincular tu Fan Page e Instagram vía OAuth.
			</p>
		</div>
	{:else}
		<div class="space-y-1.5">
{#each accounts as a (a.id)}
			{@const status = tokenStatus(a)}
			<div
				role="button"
				tabindex="0"
				onclick={() => selectAccount(a.id)}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAccount(a.id); } }}
				class={`flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-all ${
					cuentaId === a.id
						? 'border-[#0D1E3D] bg-[#0D1E3D]/10 ring-1 ring-[#0D1E3D]/30'
						: 'border-border bg-muted/30 hover:bg-muted/60'
				}`}
			>
					<div class="flex items-center justify-between gap-2">
						<span class="truncate text-xs font-medium text-foreground">{a.nombre}</span>
						<div class={`flex items-center gap-1 ${status.cls}`}>
							<status.icon class="h-3 w-3" />
							<span class="text-[9px] font-semibold">{status.label}</span>
						</div>
					</div>
					<div class="flex items-center gap-1.5">
						{#if a.redes_activas.includes(1)}
							<span class="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-semibold text-blue-700">
								<Facebook class="h-2.5 w-2.5" /> FB
							</span>
						{/if}
						{#if a.redes_activas.includes(2)}
							<span class="inline-flex items-center gap-0.5 rounded bg-pink-100 px-1 py-0.5 text-[9px] font-semibold text-pink-700">
								<Instagram class="h-2.5 w-2.5" /> IG
							</span>
						{/if}

						<div class="ml-auto flex items-center gap-1">
							<button
								type="button"
								onclick={(e) => { e.stopPropagation(); refreshAccount(a.id); }}
								disabled={refreshing === a.id}
								title="Refrescar token"
								class="rounded p-1 hover:bg-muted transition-colors"
							>
								<RefreshCw class={`h-3 w-3 ${refreshing === a.id ? 'animate-spin' : ''}`} />
							</button>
							<button
								type="button"
								onclick={(e) => { e.stopPropagation(); disconnectAccount(a.id, a.nombre); }}
								disabled={disconnecting === a.id}
								title="Desconectar cuenta"
								class="rounded p-1 text-red-500 hover:bg-red-50 transition-colors"
							>
								<Trash2 class="h-3 w-3" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>