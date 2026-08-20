<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		FileText,
		Plus,
		Trash2,
		Edit3,
		Search,
		Sparkles,
		UploadCloud,
		ExternalLink,
		Check,
		X,
		Loader2,
		Filter,
		FileSpreadsheet,
		Eye
	} from 'lucide-svelte';

	interface Ficha {
		id: number;
		marca_id: number;
		nombre_producto: string;
		descripcion: string | null;
		especificaciones_texto: string;
		file_path: string;
		file_name: string;
		mime_type: string;
		size_bytes: number;
		created_at: number;
		marca_nombre?: string;
	}

	let { catalogos } = $props<{ catalogos: any }>();

	let fichas = $state<Ficha[]>([]);
	let loading = $state<boolean>(true);
	let selectedBrandFilter = $state<string>('Todas');
	let searchQuery = $state<string>('');

	// Modal de creación / carga
	let showUploadModal = $state<boolean>(false);
	let isUploading = $state<boolean>(false);
	let uploadMarcaId = $state<string>('');
	let uploadNombreProducto = $state<string>('');
	let uploadDescripcion = $state<string>('');
	let uploadFile = $state<File | null>(null);

	// Modal de edición de texto de especificaciones
	let showEditModal = $state<boolean>(false);
	let editingFicha = $state<Ficha | null>(null);
	let editNombreProducto = $state<string>('');
	let editDescripcion = $state<string>('');
	let editEspecificacionesTexto = $state<string>('');
	let isSavingEdit = $state<boolean>(false);

	// Modal de visualización completa
	let showViewModal = $state<boolean>(false);
	let viewingFicha = $state<Ficha | null>(null);

	// Cargar fichas técnicas desde API
	async function cargarFichas() {
		loading = true;
		try {
			const res = await fetch('/api/content-creator/fichas-tecnicas');
			const data = await res.json();
			if (res.ok && data.success) {
				fichas = data.fichas;
			} else {
				toast.error(data.error || 'Error al cargar fichas técnicas');
			}
		} catch (err) {
			console.error('Error cargando fichas:', err);
			toast.error('Error de red al obtener fichas técnicas');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		cargarFichas();
		if (catalogos?.marcas?.length > 0) {
			uploadMarcaId = catalogos.marcas[0].id.toString();
		}
	});

	// Fichas filtradas
	const filteredFichas = $derived.by(() => {
		return fichas.filter((f) => {
			const matchesBrand = selectedBrandFilter === 'Todas' || f.marca_nombre === selectedBrandFilter;
			const query = searchQuery.toLowerCase().trim();
			const matchesSearch =
				!query ||
				f.nombre_producto.toLowerCase().includes(query) ||
				(f.descripcion && f.descripcion.toLowerCase().includes(query)) ||
				(f.especificaciones_texto && f.especificaciones_texto.toLowerCase().includes(query));
			return matchesBrand && matchesSearch;
		});
	});

	// Manejar selección de archivo
	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			uploadFile = target.files[0];
		}
	}

	// Subir y procesar con Gemini
	async function handleUploadSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!uploadFile) {
			toast.error('Por favor selecciona un archivo PDF o Imagen');
			return;
		}
		if (!uploadMarcaId) {
			toast.error('Por favor selecciona una marca');
			return;
		}
		if (!uploadNombreProducto.trim()) {
			toast.error('Por favor ingresa el nombre del producto');
			return;
		}

		isUploading = true;
		const formData = new FormData();
		formData.append('file', uploadFile);
		formData.append('marcaId', uploadMarcaId);
		formData.append('nombreProducto', uploadNombreProducto.trim());
		formData.append('descripcion', uploadDescripcion.trim());

		try {
			const res = await fetch('/api/content-creator/fichas-tecnicas', {
				method: 'POST',
				body: formData
			});

			const data = await res.json();
			if (res.ok && data.success) {
				toast.success('¡Ficha técnica procesada con IA y guardada con éxito!');
				fichas = [data.ficha, ...fichas];
				showUploadModal = false;
				// Limpiar formulario
				uploadFile = null;
				uploadNombreProducto = '';
				uploadDescripcion = '';
			} else {
				toast.error(data.error || 'Error al procesar la ficha técnica');
			}
		} catch (err) {
			console.error('Error subiendo ficha:', err);
			toast.error('Error al comunicarse con el servidor');
		} finally {
			isUploading = false;
		}
	}

	// Abrir modal de edición
	function openEditModal(ficha: Ficha) {
		editingFicha = ficha;
		editNombreProducto = ficha.nombre_producto;
		editDescripcion = ficha.descripcion || '';
		editEspecificacionesTexto = ficha.especificaciones_texto;
		showEditModal = true;
	}

	// Guardar edición
	async function handleSaveEdit() {
		if (!editingFicha) return;
		isSavingEdit = true;
		try {
			const res = await fetch(`/api/content-creator/fichas-tecnicas/${editingFicha.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					nombreProducto: editNombreProducto.trim(),
					descripcion: editDescripcion.trim(),
					especificacionesTexto: editEspecificacionesTexto.trim()
				})
			});

			const data = await res.json();
			if (res.ok && data.success) {
				toast.success('Ficha técnica actualizada correctamente');
				fichas = fichas.map((f) => (f.id === editingFicha!.id ? data.ficha : f));
				showEditModal = false;
				editingFicha = null;
			} else {
				toast.error(data.error || 'Error al actualizar');
			}
		} catch (err) {
			console.error('Error actualizando:', err);
			toast.error('Error de red al actualizar');
		} finally {
			isSavingEdit = false;
		}
	}

	// Eliminar ficha
	async function handleDelete(fichaId: number) {
		if (!confirm('¿Estás seguro de que deseas eliminar esta ficha técnica?')) return;
		try {
			const res = await fetch(`/api/content-creator/fichas-tecnicas/${fichaId}`, {
				method: 'DELETE'
			});
			const data = await res.json();
			if (res.ok && data.success) {
				toast.success('Ficha técnica eliminada');
				fichas = fichas.filter((f) => f.id !== fichaId);
			} else {
				toast.error(data.error || 'Error al eliminar');
			}
		} catch (err) {
			console.error('Error eliminando:', err);
			toast.error('Error de red al eliminar');
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('es-CR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="flex flex-col gap-6">
	<!-- Header de la Tab -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0D1E3D] text-white shadow-sm">
				<FileText class="h-6 w-6 text-white" />
			</div>
			<div>
				<h1 class="text-xl font-bold tracking-tight">Biblioteca de Fichas Técnicas</h1>
				<p class="text-xs text-muted-foreground">
					Gestión de fichas técnicas de productos por marca con auto-estructuración por IA
				</p>
			</div>
		</div>

		<!-- Botón Principal: Nueva Ficha -->
		<button
			type="button"
			onclick={() => (showUploadModal = true)}
			class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0D1E3D] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0A1730] transition-all"
		>
			<Plus class="h-4 w-4" />
			<span>Subir Nueva Ficha Técnica</span>
		</button>
	</header>

	<!-- Filtros y Búsqueda -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/30 p-3 rounded-lg border">
		<!-- Filtro por marca -->
		<div class="flex items-center gap-2">
			<Filter class="h-4 w-4 text-muted-foreground" />
			<span class="text-xs font-medium text-muted-foreground">Marca:</span>
			<select
				bind:value={selectedBrandFilter}
				class="h-9 rounded-md border border-input dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs outline-none focus:border-[#0D1E3D]"
			>
				<option value="Todas">Todas las marcas ({fichas.length})</option>
				{#if catalogos?.marcas}
					{#each catalogos.marcas as marca}
						<option value={marca.nombre}>{marca.nombre}</option>
					{/each}
				{/if}
			</select>
		</div>

		<!-- Buscador -->
		<div class="relative w-full sm:w-72">
			<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Buscar producto o especificación..."
				class="w-full rounded-md border bg-white dark:bg-slate-800 pl-8 pr-3 py-2 text-xs outline-none focus:border-[#0D1E3D]"
			/>
		</div>
	</div>

	<!-- Lista o Grid de Fichas -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16 gap-3">
			<Loader2 class="h-8 w-8 animate-spin text-[#0D1E3D]" />
			<p class="text-xs text-muted-foreground">Cargando biblioteca de fichas técnicas...</p>
		</div>
	{:else if filteredFichas.length === 0}
		<div class="flex flex-col items-center justify-center py-16 gap-3 border rounded-xl bg-muted/10 text-center px-4">
			<FileSpreadsheet class="h-12 w-12 text-muted-foreground/50" />
			<h3 class="text-sm font-semibold text-foreground">No hay fichas técnicas registradas</h3>
			<p class="text-xs text-muted-foreground max-w-sm">
				{#if searchQuery || selectedBrandFilter !== 'Todas'}
					No se encontraron fichas que coincidan con los filtros aplicados.
				{:else}
					Aún no has subido fichas técnicas para tus marcas. Haz clic en «Subir Nueva Ficha Técnica» para registrar tu primer producto.
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filteredFichas as ficha (ficha.id)}
				<div class="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
					<!-- Header de la Card -->
					<div class="flex items-center justify-between p-4 border-b bg-muted/20">
						<div class="flex items-center gap-2">
							<span class="rounded-md bg-[#0D1E3D]/10 px-2 py-0.5 text-[10px] font-bold text-[#0D1E3D] dark:bg-blue-900/40 dark:text-blue-300">
								{ficha.marca_nombre || 'Marca'}
							</span>
							<span class="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground uppercase">
								{ficha.mime_type.includes('pdf') ? 'PDF' : 'IMAGEN'}
							</span>
						</div>
						<span class="text-[10px] text-muted-foreground">{formatDate(ficha.created_at)}</span>
					</div>

					<!-- Body de la Card -->
					<div class="p-4 flex-1 flex flex-col gap-3">
						<div>
							<h3 class="font-bold text-sm text-foreground line-clamp-1">{ficha.nombre_producto}</h3>
							{#if ficha.descripcion}
								<p class="text-xs text-muted-foreground line-clamp-2 mt-0.5">{ficha.descripcion}</p>
							{/if}
						</div>

						<!-- Vista previa del texto extraído -->
						<div class="bg-muted/40 rounded-lg p-3 text-xs font-mono text-muted-foreground line-clamp-4 leading-relaxed border relative group">
							<div class="flex items-center gap-1.5 text-[10px] font-sans font-bold text-[#0D1E3D] dark:text-blue-400 mb-1">
								<Sparkles class="h-3 w-3" />
								<span>Texto Estructurado (IA):</span>
							</div>
							<div class="whitespace-pre-wrap text-[11px] font-sans text-foreground/90">
								{ficha.especificaciones_texto}
							</div>
						</div>
					</div>

					<!-- Footer de Acciones -->
					<div class="flex items-center justify-between px-4 py-3 border-t bg-muted/10 gap-2">
						<div class="flex items-center gap-1">
							<a
								href={ficha.file_path}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium border bg-background hover:bg-muted transition text-foreground"
								title="Ver archivo original"
							>
								<ExternalLink class="h-3.5 w-3.5" />
								<span>Archivo</span>
							</a>

							<button
								type="button"
								onclick={() => {
									viewingFicha = ficha;
									showViewModal = true;
								}}
								class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium border bg-background hover:bg-muted transition text-foreground"
								title="Ver especificaciones completas"
							>
								<Eye class="h-3.5 w-3.5" />
								<span>Detalles</span>
							</button>
						</div>

						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => openEditModal(ficha)}
								class="p-1.5 rounded-md border bg-background hover:bg-muted transition text-muted-foreground hover:text-foreground"
								title="Editar especificaciones"
							>
								<Edit3 class="h-3.5 w-3.5" />
							</button>

							<button
								type="button"
								onclick={() => handleDelete(ficha.id)}
								class="p-1.5 rounded-md border bg-background hover:bg-red-50 hover:border-red-200 text-muted-foreground hover:text-red-600 transition"
								title="Eliminar ficha"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- MODAL 1: Subir Nueva Ficha Técnica -->
{#if showUploadModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
		<div class="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between border-b pb-3">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D1E3D] text-white">
						<UploadCloud class="h-4 w-4" />
					</div>
					<div>
						<h2 class="text-base font-bold">Subir Ficha Técnica</h2>
						<p class="text-xs text-muted-foreground">Procesamiento automático de especificaciones con Gemini IA</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (showUploadModal = false)}
					class="rounded-md p-1 hover:bg-muted text-muted-foreground"
					disabled={isUploading}
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<form onsubmit={handleUploadSubmit} class="space-y-4">
				<!-- Marca -->
				<div class="space-y-1">
					<label class="text-xs font-bold uppercase text-muted-foreground" for="marca-select">Marca del Producto *</label>
					<select
						id="marca-select"
						bind:value={uploadMarcaId}
						required
						class="w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-[#0D1E3D]"
					>
						{#if catalogos?.marcas}
							{#each catalogos.marcas as m}
								<option value={m.id.toString()}>{m.nombre}</option>
							{/each}
						{/if}
					</select>
				</div>

				<!-- Nombre del Producto -->
				<div class="space-y-1">
					<label class="text-xs font-bold uppercase text-muted-foreground" for="prod-name">Nombre del Producto / Modelo *</label>
					<input
						id="prod-name"
						type="text"
						bind:value={uploadNombreProducto}
						placeholder="ej. Excavadora Caterpillar CAT 320"
						required
						class="w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-[#0D1E3D]"
					/>
				</div>

				<!-- Descripción o Notas adicionales -->
				<div class="space-y-1">
					<label class="text-xs font-bold uppercase text-muted-foreground" for="prod-desc">Descripción corta / Notas (opcional)</label>
					<textarea
						id="prod-desc"
						bind:value={uploadDescripcion}
						rows="2"
						placeholder="ej. Equipo pesado de excavación para obras civiles"
						class="w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-[#0D1E3D]"
					></textarea>
				</div>

				<!-- Archivo -->
				<div class="space-y-1">
					<label class="text-xs font-bold uppercase text-muted-foreground" for="file-upload">Documento (PDF o Imagen) *</label>
					<div class="flex items-center gap-3 border-2 border-dashed rounded-lg p-4 bg-muted/20 hover:bg-muted/30 transition text-center justify-center flex-col">
						<UploadCloud class="h-8 w-8 text-muted-foreground" />
						<div>
							<input
								id="file-upload"
								type="file"
								accept=".pdf,image/png,image/jpeg,image/webp"
								onchange={handleFileSelect}
								required
								class="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0D1E3D] file:text-white hover:file:bg-[#0A1730]"
							/>
						</div>
						<p class="text-[10px] text-muted-foreground">Formatos soportados: PDF, PNG, JPG, WEBP (Máx. 20MB)</p>
					</div>
				</div>

				{#if isUploading}
					<div class="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900">
						<Loader2 class="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
						<div class="text-xs">
							<p class="font-bold">Analizando documento con Gemini IA...</p>
							<p class="text-[11px] opacity-80">Extrayendo y estructurando las especificaciones clave. Esto tomará un momento.</p>
						</div>
					</div>
				{/if}

				<!-- Botones Acción -->
				<div class="flex items-center justify-end gap-2 border-t pt-3">
					<button
						type="button"
						onclick={() => (showUploadModal = false)}
						class="rounded-md px-4 py-2 text-xs font-medium border hover:bg-muted"
						disabled={isUploading}
					>
						Cancelar
					</button>

					<button
						type="submit"
						disabled={isUploading}
						class="inline-flex items-center gap-2 rounded-md bg-[#0D1E3D] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#0A1730] disabled:opacity-50"
					>
						{#if isUploading}
							<Loader2 class="h-3.5 w-3.5 animate-spin" />
							<span>Procesando...</span>
						{:else}
							<Sparkles class="h-3.5 w-3.5" />
							<span>Guardar y Analizar con IA</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL 2: Editar Especificaciones -->
{#if showEditModal && editingFicha}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
		<div class="w-full max-w-xl rounded-xl border bg-background p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between border-b pb-3">
				<div class="flex items-center gap-2">
					<Edit3 class="h-5 w-5 text-[#0D1E3D]" />
					<h2 class="text-base font-bold">Editar Especificaciones Técnicas</h2>
				</div>
				<button
					type="button"
					onclick={() => (showEditModal = false)}
					class="rounded-md p-1 hover:bg-muted text-muted-foreground"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<div class="space-y-4">
				<div class="space-y-1">
					<label class="text-xs font-bold uppercase text-muted-foreground" for="edit-prod-name">Nombre del Producto</label>
					<input
						id="edit-prod-name"
						type="text"
						bind:value={editNombreProducto}
						class="w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-[#0D1E3D]"
					/>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold uppercase text-muted-foreground" for="edit-prod-desc">Descripción / Notas</label>
					<textarea
						id="edit-prod-desc"
						bind:value={editDescripcion}
						rows="2"
						class="w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-[#0D1E3D]"
					></textarea>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold uppercase text-muted-foreground" for="edit-specs-text">Texto Estructurado de Especificaciones (Markdown)</label>
					<textarea
						id="edit-specs-text"
						bind:value={editEspecificacionesTexto}
						rows="10"
						class="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-[#0D1E3D]"
					></textarea>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 border-t pt-3">
				<button
					type="button"
					onclick={() => (showEditModal = false)}
					class="rounded-md px-4 py-2 text-xs font-medium border hover:bg-muted"
					disabled={isSavingEdit}
				>
					Cancelar
				</button>

				<button
					type="button"
					onclick={handleSaveEdit}
					disabled={isSavingEdit}
					class="inline-flex items-center gap-2 rounded-md bg-[#0D1E3D] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#0A1730] disabled:opacity-50"
				>
					{#if isSavingEdit}
						<Loader2 class="h-3.5 w-3.5 animate-spin" />
						<span>Guardando...</span>
					{:else}
						<Check class="h-3.5 w-3.5" />
						<span>Guardar Cambios</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL 3: Detalles Completos -->
{#if showViewModal && viewingFicha}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
		<div class="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between border-b pb-3">
				<div>
					<span class="rounded-md bg-[#0D1E3D]/10 px-2 py-0.5 text-[10px] font-bold text-[#0D1E3D]">
						{viewingFicha.marca_nombre}
					</span>
					<h2 class="text-lg font-bold mt-1">{viewingFicha.nombre_producto}</h2>
				</div>
				<button
					type="button"
					onclick={() => (showViewModal = false)}
					class="rounded-md p-1 hover:bg-muted text-muted-foreground"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<div class="space-y-4 text-xs">
				{#if viewingFicha.descripcion}
					<div>
						<h4 class="font-bold text-muted-foreground text-[10px] uppercase">Descripción:</h4>
						<p class="text-foreground mt-0.5">{viewingFicha.descripcion}</p>
					</div>
				{/if}

				<div>
					<h4 class="font-bold text-muted-foreground text-[10px] uppercase mb-1">Especificaciones Técnicas Extraídas por IA:</h4>
					<div class="bg-muted/40 p-4 rounded-lg border font-mono whitespace-pre-wrap leading-relaxed text-foreground">
						{viewingFicha.especificaciones_texto}
					</div>
				</div>

				<div class="flex items-center justify-between border-t pt-3 text-muted-foreground text-[11px]">
					<span>Archivo: {viewingFicha.file_name} ({formatBytes(viewingFicha.size_bytes)})</span>
					<a
						href={viewingFicha.file_path}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 font-bold text-[#0D1E3D] hover:underline"
					>
						<ExternalLink class="h-3.5 w-3.5" />
						Abrir documento original
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}
