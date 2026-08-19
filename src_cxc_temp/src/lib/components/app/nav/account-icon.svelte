<script lang="ts">
	import LoginModal from "$lib/components/auth/loginformmodal.svelte";
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/utils';
	import { UserCircle } from "lucide-svelte";
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	
	// Recibir session y user del parent
	let { session, user, supabase, perfil = null } = $props<{ session: any; user: any; perfil?: any }>();

	let userAvatarUrl = $state<string | null>(null);

	// Cargar la URL de imagen del perfil al montar el componente
	onMount(async () => {
		if (session?.user?.id) {
			try {
				const res = await fetch(`/api/profile/avatar-url`);
				const data = await res.json();
				if (res.ok && data.url_imagen) {
					userAvatarUrl = data.url_imagen;
				}
			} catch (err) {
				console.error('Error fetching avatar URL:', err);
			}
		}
	});

	// Escuchar cambios invalidados y refrescar la URL
	$effect(() => {
		if (perfil?.url_imagen && userAvatarUrl !== perfil.url_imagen) {
			userAvatarUrl = perfil.url_imagen;
		}
	});

	async function handleLogout() {
		try {
			const response = await fetch('/auth/logout', {
				method: 'POST'
			});
			
			if (response.ok) {
				// Invalidar toda la data para forzar recarga
				await invalidateAll();
				// Redirigir al home
				//goto('/', { invalidateAll: true });
			}
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	}
</script>

{#if session?.user}
	<!-- Usuario autenticado: Mostrar dropdown -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger class="flex items-center gap-2 hover:bg-blue-50 rounded-lg px-3 py-2 transition-colors">
			<Avatar.Root class="size-9 ring-2 ring-blue-500">
				<Avatar.Image src={userAvatarUrl || session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture} alt={session.user.email} />
				<Avatar.Fallback class="bg-blue-500 text-white font-semibold">
					{getInitials(session.user.email)}
				</Avatar.Fallback>
			</Avatar.Root>
			<span class="hidden md:block max-w-32 grow">
				<span class="block truncate text-sm font-semibold text-gray-900">
					{session.user.email}
				</span>
			</span>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="w-56">
			<DropdownMenu.Item class="hover:bg-blue-50 cursor-pointer">
				<button onclick={() => goto('/Profile')} class="w-full text-left text-blue-600 font-bold">Mi Cuenta</button>
			</DropdownMenu.Item>
			<!-- <DropdownMenu.Item class="hover:bg-blue-50 cursor-pointer">Notificaciones</DropdownMenu.Item>
			<DropdownMenu.Item class="hover:bg-blue-50 cursor-pointer">Planes y pagos</DropdownMenu.Item> -->
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={handleLogout} class="hover:bg-red-50 text-red-600 cursor-pointer font-semibold">
				Cerrar sesión
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{:else}
	<!-- Usuario NO autenticado: Mostrar modal de login -->
	<LoginModal />
{/if}