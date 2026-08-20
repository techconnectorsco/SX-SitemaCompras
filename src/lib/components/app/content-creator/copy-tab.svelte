<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Sparkles, Copy, Check, Save, Layers, ArrowRight } from 'lucide-svelte';

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

	let selectedBrand = $state<string>('Vedoba');
	let selectedTone = $state<string>('Inspiracional');
	let ideaInput = $state<string>('');
	let generating = $state<boolean>(false);
	let generatedOptions = $state<Array<{ id: number; type: string; text: string }>>([]);
	let copiedId = $state<number | null>(null);

	const personalities: Record<string, string> = {
		'Vedoba': 'Asesor experto, confiable y cercano. Enfocado en calidad, rendimiento e historias de éxito.',
		'Grupo VYO': 'Corporativo, sólido e institucional. Comunica liderazgo, innovación y desarrollo regional.',
		'Outlet': 'Enérgico, directo y persuasivo. Enfocado en ofertas por tiempo limitado y precios de oportunidad.',
		'Retail Pro': 'Estilo de vida, práctico e innovador. Soluciona problemas cotidianos con dinamismo.'
	};

	function generateCopies() {
		if (!ideaInput.trim()) {
			toast.error('Por favor escribe una idea central');
			return;
		}

		generating = true;
		generatedOptions = [];

		setTimeout(() => {
			generating = false;
			
			if (selectedBrand === 'Vedoba') {
				generatedOptions = [
					{
						id: 1,
						type: 'Storytelling (Recomendado)',
						text: `Detrás de cada gran proyecto hay decisiones inteligentes. 🛠️ En Vedoba, te equipamos con tecnología de punta para que tu negocio nunca se detenga. \n\n¿Listo para elevar la productividad esta semana? Escríbenos y un asesor especialista te guiará. #Vedoba #Productividad #Ingenieria`
					},
					{
						id: 2,
						type: 'Directo y Promocional',
						text: `¡Lleva el rendimiento de tus equipos al máximo nivel! 🚀 Obtén asesoría especializada sin costo adicional en todas tus compras de este mes. \n\n👉 Visita el enlace en nuestra biografía y cotiza directo por WhatsApp. #EquiposIndustriales #AsesoriaVedoba`
					},
					{
						id: 3,
						type: 'Educativo / Informativo',
						text: `¿Sabías que un mantenimiento preventivo puede ahorrarte hasta un 40% en costos operativos? 💡 \n\nEn nuestro último blog te explicamos 3 claves esenciales para prolongar la vida útil de tus maquinarias. Léelo completo en vedoba.com/blog. #ConsejoExperto #Vedoba #Mantenimiento`
					}
				];
			} else if (selectedBrand === 'Outlet') {
				generatedOptions = [
					{
						id: 1,
						type: 'Urgencia Máxima',
						text: `⚠️ ¡ÚLTIMAS UNIDADES! ⚠️ La liquidación de temporada está por terminar y las existencias vuelan. \n\nConsigue hasta un 60% de descuento en artículos seleccionados. ¡Solo en tienda física hasta agotar stock! 🏃💨 #Outlet #Descuentos #Liquidacion`
					},
					{
						id: 2,
						type: 'Promocional Directo',
						text: `¡Precios de locura a tu alcance! 💸 Renovamos catálogo y todo el stock anterior debe salir ya. \n\n¡Descuentos acumulados del 20%, 40% y hasta 60%! Te esperamos hoy. #PromoOutlet #Ahorro`
					},
					{
						id: 3,
						type: 'Social Proof / Testimonio',
						text: `🔥 El favorito de nuestros clientes regresó... ¡y con 50% de descuento! \n\nNo dejes que te lo cuenten. Compra en línea hoy y recíbelo en la puerta de tu casa. 📦 #Ofertas #OutletVedoba`
					}
				];
			} else {
				generatedOptions = [
					{
						id: 1,
						type: 'Inspiracional / Conexión',
						text: `Cada espacio cuenta una historia. Construye el tuyo con la solidez de los expertos. 🏡✨ \n\nDescubre el catálogo de soluciones que tenemos para tu hogar en esta temporada. #GrupoVYO #EstiloDeVida #Hogar`
					},
					{
						id: 2,
						type: 'Enfoque Técnico',
						text: `Innovación que transforma tu día a día. Desarrollado con los más altos estándares para garantizar durabilidad y confort. \n\nConsúltanos por el catálogo corporativo. 📞 #Innovacion #RetailPro`
					},
					{
						id: 3,
						type: 'Llamado a la Acción Directo',
						text: `¡Es momento de renovarte! 🌟 Escríbenos ahora mismo y recibe un código promocional exclusivo para tu primera compra en nuestra plataforma. \n\n¡Haz click abajo! 👇`
					}
				];
			}
			
			toast.success('¡Copies generados con Gemini con éxito!');
		}, 1200);
	}

	function copyToClipboard(text: string, id: number) {
		navigator.clipboard.writeText(text);
		copiedId = id;
		toast.success('Copy copiado al portapapeles');
		setTimeout(() => {
			if (copiedId === id) copiedId = null;
		}, 2000);
	}

	function applyToPost(text: string, entryId: string) {
		entries = entries.map(e => {
			if (e.id === entryId) {
				return { ...e, copy: text, status: 'En revisión' };
			}
			return e;
		});
		toast.success('Copy aplicado a la publicación', {
			description: 'La publicación ha cambiado su estado a "En revisión" con el nuevo copy.'
		});
	}
</script>

<div class="grid gap-6 lg:grid-cols-[340px_1fr]">
	<!-- Configuración de Generación -->
	<div class="space-y-4">
		<Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
			<h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
				<Sparkles class="h-4 w-4 text-[#1A73C2]" />
				Brand Agent Config
			</h3>
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				Gemini se adaptará al tono y personalidad configurados para cada marca en Vedoba.
			</p>

			<div class="mt-4 space-y-3.5">
				<div>
					<label class="text-xs font-semibold text-slate-700 dark:text-slate-300" for="brand-select">Marca</label>
					<select 
						id="brand-select"
						bind:value={selectedBrand}
						class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950 dark:focus:border-blue-500"
					>
						<option value="Vedoba">Vedoba</option>
						<option value="Grupo VYO">Grupo VYO</option>
						<option value="Outlet">Outlet</option>
						<option value="Retail Pro">Retail Pro</option>
					</select>
				</div>

				<div class="rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
					<p class="font-semibold text-slate-700 dark:text-slate-300">Personalidad del Agente:</p>
					<p class="mt-1 italic">"{personalities[selectedBrand]}"</p>
				</div>

				<div>
					<label class="text-xs font-semibold text-slate-700 dark:text-slate-300" for="tone-select">Tono del Mensaje</label>
					<select 
						id="tone-select"
						bind:value={selectedTone}
						class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950 dark:focus:border-blue-500"
					>
						<option value="Corporativo">Corporativo</option>
						<option value="Inspiracional">Inspiracional</option>
						<option value="Promocional">Promocional</option>
						<option value="Educativo">Educativo</option>
						<option value="Urgencia suave">Urgencia suave</option>
					</select>
				</div>

				<div>
					<label class="text-xs font-semibold text-slate-700 dark:text-slate-300" for="idea-textarea">Idea Central / Producto</label>
					<textarea 
						id="idea-textarea"
						bind:value={ideaInput}
						rows="4" 
						placeholder="Escribe la idea central (ej: Invitación a feria industrial el viernes, descuento de 15% en soldadoras ecológicas...)"
						class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950 dark:focus:border-blue-500"
					></textarea>
				</div>

				<Button 
					class="w-full bg-[#0D1E3D] hover:bg-[#0D1E3D]/90 text-white mt-2"
					onclick={generateCopies}
					disabled={generating}
				>
					{#if generating}
						<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						Procesando IA...
					{:else}
						<Sparkles class="mr-2 h-4 w-4" />
						Generar con Gemini
					{/if}
				</Button>
			</div>
		</Card.Root>
	</div>

	<!-- Resultados -->
	<div class="space-y-4">
		{#if generating}
			<div class="space-y-4">
				{#each Array(3) as _}
					<div class="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 space-y-3 dark:border-slate-800 dark:bg-slate-950">
						<div class="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-800"></div>
						<div class="space-y-2">
							<div class="h-3.5 rounded bg-slate-200 dark:bg-slate-800"></div>
							<div class="h-3.5 rounded bg-slate-200 dark:bg-slate-800 w-5/6"></div>
							<div class="h-3.5 rounded bg-slate-200 dark:bg-slate-800 w-3/4"></div>
						</div>
						<div class="flex justify-between pt-2">
							<div class="h-8 w-20 rounded bg-slate-200 dark:bg-slate-800"></div>
							<div class="h-8 w-32 rounded bg-slate-200 dark:bg-slate-800"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if generatedOptions.length === 0}
			<div class="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
				<div class="rounded-2xl bg-[#1A73C2]/10 p-3.5 text-[#1A73C2] dark:bg-[#1A73C2]/15">
					<Sparkles class="h-6 w-6 animate-pulse" />
				</div>
				<p class="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Asistente Creativo de Copywriting</p>
				<p class="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
					Escribe la idea principal o campaña en el panel de la izquierda y deja que los Brand Agents generen opciones optimizadas de copy.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each generatedOptions as option (option.id)}
					<Card.Root class="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 hover:shadow-md transition-shadow duration-200">
						<Card.Header class="flex flex-row items-center justify-between border-b border-slate-100 p-4 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-900/20">
							<span class="text-xs font-semibold text-[#0D1E3D] dark:text-blue-400">
								{option.type}
							</span>
							<div class="flex gap-2">
								<button 
									type="button"
									onclick={() => copyToClipboard(option.text, option.id)}
									class="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900"
									title="Copiar copy"
								>
									{#if copiedId === option.id}
										<Check class="h-3.5 w-3.5 text-emerald-500" />
									{:else}
										<Copy class="h-3.5 w-3.5" />
									{/if}
								</button>
							</div>
						</Card.Header>
						<Card.Content class="p-5">
							<textarea 
								bind:value={option.text}
								rows="4"
								class="w-full bg-transparent text-sm leading-6 outline-none resize-none text-slate-800 dark:text-slate-200"
							></textarea>
							
							<div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-900">
								<span class="text-[10px] text-slate-400">Edita directamente en el recuadro si deseas ajustar algo</span>
								
								<div class="flex items-center gap-2">
									<span class="text-xs text-slate-500 dark:text-slate-400">Aplicar a:</span>
									<select 
										onchange={(e) => applyToPost(option.text, (e.target as HTMLSelectElement).value)}
										class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-[#0D1E3D] dark:border-slate-800 dark:bg-slate-950 dark:focus:border-blue-500"
									>
										<option value="">Selecciona fecha...</option>
										{#each entries.filter(e => e.brand === selectedBrand) as entry (entry.id)}
											<option value={entry.id}>
												{entry.date.day}/{entry.date.month} - {entry.title.slice(0, 20)}...
											</option>
										{/each}
									</select>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>
</div>
