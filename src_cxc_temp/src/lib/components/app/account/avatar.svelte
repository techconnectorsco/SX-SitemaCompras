<script lang='ts'>
	import { Label } from '$lib/components/ui/label/';
	import * as Avatar from '$lib/components/ui/avatar/';
	import Button from '$lib/components/ui/button/button.svelte';
	import { ArrowUpToLine, X } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	// Ahora el upload se delega a /api/profile/avatar para usar la sesión del servidor

	let { perfil } = $props<{ perfil?: any }>();

	let avatarSrc = $state(perfil?.url_imagen || '');
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);

	async function handleAvatarChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		uploadError = null;
		uploading = true;

		// Validar tamaño: 1MB max
		if (file.size > 1_000_000) {
			uploadError = 'La imagen debe pesar menos de 1MB';
			uploading = false;
			return;
		}

		try {
			const formData = new FormData();
			formData.append('file', file);

			const res = await fetch('/api/profile/avatar', {
				method: 'POST',
				body: formData
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error subiendo la imagen');
			}

			avatarSrc = data.url;
			// Invalidar data del layout para que se recargue perfilNav en el navbar
			await invalidateAll();
		} catch (err: any) {
			uploadError = err?.message || 'Error subiendo la imagen';
		} finally {
			uploading = false;
			if (input) input.value = '';
		}
	}

	async function removeAvatar() {
		uploadError = null;
		uploading = true;
		try {
			const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'No se pudo eliminar la imagen');
			}
			avatarSrc = '';
			// Invalidar data del layout para que se recargue perfilNav en el navbar
			await invalidateAll();
		} catch (err: any) {
			uploadError = err?.message || 'No se pudo eliminar la imagen';
		} finally {
			uploading = false;
		}
	}

	function getInitials(): string {
		if (perfil?.nombre_completo) {
			const names = perfil.nombre_completo.split(' ');
			return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
		}
		return 'U';
	}
</script>
	
<div class="w-full space-y-6">
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
		<div class="flex items-center gap-6">
			<Avatar.Root class="w-24 h-24 border-4 border-blue-200">
				<Avatar.Image src={avatarSrc} alt="Profile" />
				<Avatar.Fallback class="text-xl font-bold">{getInitials()}</Avatar.Fallback>
			</Avatar.Root>
			<div class="flex flex-col gap-2">
				<p class="text-sm text-gray-600 font-medium">Foto de Perfil</p>
				<p class="text-xs text-gray-500">JPG, PNG o GIF máximo 1MB</p>
			</div>
		</div>
		<div class="flex gap-2 flex-wrap">
			<input type="file" id="avatar" accept="image/*" class="hidden" onchange={handleAvatarChange}>
			<label for="avatar" class="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors {uploading ? 'opacity-70 cursor-not-allowed' : ''}">
				<ArrowUpToLine size={18} />
				{uploading ? 'Subiendo...' : 'Subir Foto'}
			</label>
			{#if avatarSrc}
				<Button
					size="sm"
					variant="outline"
					class="border border-red-300 text-red-600 hover:bg-red-50"
					onclick={removeAvatar}
					disabled={uploading}
				>
					<X size={18} />
					Eliminar
				</Button>
			{/if}
		</div>

		{#if uploadError}
			<p class="text-sm text-red-600">{uploadError}</p>
		{/if}
	</div>
</div>





