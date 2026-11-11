<script lang="ts">
	/**
	 * @module SxAccount
	 * @description Menú de cuenta de la navbar compartida.
	 *
	 * Reescritura en runes del antiguo `app/nav/account.svelte` (que estaba en
	 * modo legacy y no se puede mezclar con runes dentro del mismo archivo).
	 * El flujo de logout es idéntico al anterior: POST a `/logout`, que ya
	 * acepta POST y GET, así que el endpoint no se toca.
	 *
	 * El trigger mide 44px de alto para alinearse con el botón de tema.
	 */
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { getInitials } from '$lib/utils';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';

	const user = $derived(page.data.user);
	const nombre = $derived(user?.display_name || user?.email || '');

	let saliendo = $state(false);

	async function cerrarSesion() {
		if (saliendo) return;
		saliendo = true;
		try {
			const res = await fetch('/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			if (!res.ok) {
				console.error('Error al cerrar sesión');
				return;
			}
			await invalidateAll();
			await goto('/', { invalidateAll: true });
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		} finally {
			saliendo = false;
		}
	}
</script>

{#if user}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger class="acct-trigger" aria-label="Menú de cuenta">
			<Avatar.Root class="size-11 shrink-0">
				<Avatar.Image src={user.photo_url ?? ''} alt={nombre} />
				<Avatar.Fallback>{getInitials(nombre)}</Avatar.Fallback>
			</Avatar.Root>
			<span class="acct-name">{nombre}</span>
		</DropdownMenu.Trigger>

		<DropdownMenu.Content class="w-60" align="end">
			<DropdownMenu.Label>
				<span class="block truncate font-semibold">{nombre}</span>
				{#if user.display_name && user.email}
					<span class="text-muted-foreground block truncate text-xs font-normal">
						{user.email}
					</span>
				{/if}
				<span class="text-muted-foreground mt-1 block text-xs font-normal">
					{user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
				</span>
			</DropdownMenu.Label>

			<DropdownMenu.Separator />

			<DropdownMenu.Item variant="destructive" onSelect={cerrarSesion} disabled={saliendo}>
				{saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
