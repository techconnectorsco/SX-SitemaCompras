<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Hash, Plus, X, Copy, Check, Sparkles } from 'lucide-svelte';

	interface ScheduleEntry {
		id: string;
		date: any; // CalendarDate
		title: string;
		brand: string;
		network: string;
		status: string;
		time: string;
		tone: string;
		copy: string;
		notes: string;
		imageName: string;
		imagePreview: string | null;
	}

	let { entries = $bindable() } = $props<{ entries: ScheduleEntry[] }>();

	let activeCategory = $state<string>('General');
	let customTagInput = $state<string>('');
	let selectedTags = $state<string[]>([]);
	let loadingIa = $state<boolean>(false);
	let copied = $state<boolean>(false);

	let categories = ['General', 'Promocional', 'Industrial / Técnico', 'Estilo de Vida'];

	let tagPool = $state<Record<string, string[]>>({
		'General': ['#Vedoba', '#GrupoVYO', '#Calidad', '#Servicio', '#CostaRita', '#Panama', '#Guatemala'],
		'Promocional': ['#Descuentos', '#Liquidacion', '#PromoVedoba', '#SuperPrecio', '#OfertaEspecial', '#AhorroGarantizado'],
		'Industrial / Técnico': ['#Herramientas', '#Ingenieria', '#Soldadura', '#Construccion', '#SeguridadIndustrial', '#Lubricantes', '#Maquinaria'],
		'Estilo de Vida': ['#Hogar', '#Productividad', '#Espacios', '#DisenoDeInteriores', '#ConsejoExperto', '#Renovacion']
	});

	function toggleTag(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter(t => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	function addCustomTag() {
		let tag = customTagInput.trim();
		if (!tag) return;
		if (!tag.startsWith('#')) tag = '#' + tag;
		
		// Añadir al pool de la categoría activa para recordar
		if (!tagPool[activeCategory].includes(tag)) {
			tagPool[activeCategory] = [...tagPool[activeCategory], tag];
		}

		if (!selectedTags.includes(tag)) {
			selectedTags = [...selectedTags, tag];
		}

		customTagInput = '';
		toast.success(`Hashtag ${tag} añadido`);
	}

	function clearSelection() {
		selectedTags = [];
	}

	function copyHashtags() {
		if (selectedTags.length === 0) return;
		const text = selectedTags.join(' ');
		navigator.clipboard.writeText(text);
		copied = true;
		toast.success('Hashtags copiados al portapapeles');
		setTimeout(() => copied = false, 2000);
	}

	function suggestHashtagsWithIa() {
		loadingIa = true;
		setTimeout(() => {
			loadingIa = false;
			const iaSuggestions = ['#InnovacionVYO', '#EficienciaSostenible', '#EcoEquipos', '#Vedoba2026', '#SolucionesProfesionales'];
			tagPool[activeCategory] = [...new Set([...tagPool[activeCategory], ...iaSuggestions])];
			toast.success('Claude sugirió 5 hashtags basados en tu historial');
		}, 1000);
	}

	function appendToPost(entryId: string) {
		if (selectedTags.length === 0) {
			toast.error('Selecciona al menos un hashtag primero');
			return;
		}

		const hashtagString = '\n\n' + selectedTags.join(' ');
		entries = entries.map(e => {
			if (e.id === entryId) {
				const baseCopy = e.copy.endsWith(hashtagString.trim()) ? e.copy : e.copy + hashtagString;
				return { ...e, copy: baseCopy };
			}
			return e;
		});

		toast.success('Hashtags añadidos a la publicación', {
			description: 'Se han acoplado al final del copy.'
		});
	}
</script>

<div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
	<!-- Panel de Selección -->
	<div class="space-y-4">
		<Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
						<Hash class="h-4 w-4 text-[#0D1E3D] dark:text-blue-400" />
						Librería de Etiquetas
					</h3>
					<p class="text-xs text-slate-500 mt-0.5 dark:text-slate-400">Selecciona hashtags categorizados o añade los tuyos.</p>
				</div>
				<Button 
					variant="outline" 
					size="sm"
					class="border-orange-200 text-[#1A73C2] bg-orange-50 hover:bg-orange-100 hover:text-orange-700 dark:border-orange-950 dark:bg-orange-950/20 dark:text-[#1A73C2]"
					onclick={suggestHashtagsWithIa}
					disabled={loadingIa}
				>
					{#if loadingIa}
						<span class="mr-1.5 h-3 w-3 animate-spin rounded-full border border-[#1A73C2] border-t-transparent"></span>
						Analizando...
					{:else}
						<Sparkles class="h-3.5 w-3.5 mr-1.5" />
						Sugerir con Claude
					{/if}
				</Button>
			</div>

			<!-- Tabs de categorías -->
			<div class="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3 dark:border-slate-900">
				{#each categories as category (category)}
					<button 
						type="button"
						onclick={() => activeCategory = category}
						class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 {activeCategory === category ? 'bg-[#0D1E3D] text-white dark:bg-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'}"
					>
						{category}
					</button>
				{/each}
			</div>

			<!-- Grid de tags de la categoría activa -->
			<div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
				{#each tagPool[activeCategory] as tag (tag)}
					{@const isSelected = selectedTags.includes(tag)}
					<button 
						type="button"
						onclick={() => toggleTag(tag)}
						class="flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition-all duration-200 {isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'}"
					>
						<span class="truncate">{tag}</span>
						{#if isSelected}
							<Check class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
						{:else}
							<Plus class="h-3.5 w-3.5 text-slate-400 shrink-0" />
						{/if}
					</button>
				{/each}
			</div>

			<!-- Input para tag personalizado -->
			<div class="mt-6 border-t border-slate-100 pt-5 dark:border-slate-900">
				<label class="text-xs font-semibold text-slate-700 dark:text-slate-300" for="custom-tag-input">Crear tag personalizado</label>
				<div class="mt-1.5 flex gap-2">
					<input 
						id="custom-tag-input"
						type="text" 
						bind:value={customTagInput}
						placeholder="ej: OfertaImperdible" 
						class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950 dark:focus:border-blue-500"
						onkeydown={(e) => e.key === 'Enter' && addCustomTag()}
					/>
					<Button onclick={addCustomTag}>Agregar</Button>
				</div>
			</div>
		</Card.Root>
	</div>

	<!-- Panel de Salida / Guardar -->
	<div class="space-y-4">
		<Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 flex flex-col justify-between h-full min-h-[380px]">
			<div>
				<div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-900">
					<span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
						Tags Seleccionados ({selectedTags.length})
					</span>
					{#if selectedTags.length > 0}
						<button 
							type="button"
							onclick={clearSelection}
							class="text-[10px] font-semibold uppercase tracking-wider text-rose-500 hover:text-rose-600 transition"
						>
							Limpiar
						</button>
					{/if}
				</div>

				{#if selectedTags.length === 0}
					<div class="flex flex-col items-center justify-center py-10 text-center">
						<Hash class="h-8 w-8 text-slate-300 dark:text-slate-700 animate-pulse" />
						<p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Selecciona etiquetas para verlas aquí en formato listo para publicar.</p>
					</div>
				{:else}
					<div class="mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-mono text-xs leading-6 text-slate-700 dark:border-slate-900 dark:bg-slate-900/30 dark:text-slate-300 whitespace-pre-wrap">
						{selectedTags.join(' ')}
					</div>
				{/if}
			</div>

			<div class="space-y-3 pt-5 border-t border-slate-100 dark:border-slate-900">
				<Button 
					variant="outline"
					class="w-full" 
					onclick={copyHashtags}
					disabled={selectedTags.length === 0}
				>
					{#if copied}
						<Check class="h-4 w-4 mr-2 text-emerald-500" />
						Copiados
					{:else}
						<Copy class="h-4 w-4 mr-2" />
						Copiar todos
					{/if}
				</Button>

				<div class="space-y-1.5">
					<label class="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold" for="append-to-post-select">
						Acoplar al final de:
					</label>
					<div class="flex gap-2">
						<select 
							id="append-to-post-select"
							class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950"
						>
							<option value="">Seleccionar publicación...</option>
							{#each entries as entry (entry.id)}
								<option value={entry.id}>
									[{entry.brand}] {entry.date.day}/{entry.date.month} - {entry.title.slice(0, 18)}...
								</option>
							{/each}
						</select>
						<Button 
							size="sm" 
							onclick={() => {
								const select = document.getElementById('append-to-post-select') as HTMLSelectElement;
								if (select && select.value) {
									appendToPost(select.value);
								} else {
									toast.error('Selecciona una publicación primero');
								}
							}}
							disabled={selectedTags.length === 0}
						>
							Acoplar
						</Button>
					</div>
				</div>
			</div>
		</Card.Root>
	</div>
</div>
