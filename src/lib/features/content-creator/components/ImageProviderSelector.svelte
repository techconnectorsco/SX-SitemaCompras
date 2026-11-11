<script lang="ts">
	import { onMount } from 'svelte';
	let provider = $state('gemini');
	let loading = $state(true);
	let saving = $state(false);
	let available = $state(false);
	let message = $state('');
	let ready = $state(false);
	onMount(() => {
		void (async () => {
			try {
				const response = await fetch('/api/admin/content-creator/image-provider');
				if (!response.ok) throw new Error('No se pudo cargar el proveedor de imágenes');
				const data = await response.json();
				provider = data.provider;
				available = data.openaiAvailable;
				ready = true;
			} catch (error) {
				message = (error as Error).message;
			} finally {
				loading = false;
			}
		})();
	});
	async function save(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		const next = select.value;
		saving = true;
		message = '';
		try {
			const response = await fetch('/api/admin/content-creator/image-provider', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: next })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'No se pudo guardar el proveedor');
			provider = data.provider;
			message = 'Proveedor guardado';
		} catch (error) {
			select.value = provider;
			message = (error as Error).message;
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-wrap items-center gap-2 text-sm">
	<label for="image-provider">IA para imágenes</label>
	<select
		id="image-provider"
		class="rounded-md border border-input bg-background px-3 py-2 text-foreground"
		value={provider}
		onchange={save}
		disabled={loading || saving || !ready}
		aria-describedby="image-provider-status"
	>
		<option value="gemini">Gemini (Nano Banana)</option>
		<option value="openai" disabled={!available}>ChatGPT (OpenAI)</option>
	</select>
	<span id="image-provider-status" role="status" class="text-muted-foreground"
		>{loading
			? 'Cargando…'
			: saving
				? 'Guardando…'
				: message ||
					(available
						? 'Aplica a todos los usuarios y marcas.'
						: 'OpenAI requiere configurar la clave en el servidor.')}</span
	>
</div>
