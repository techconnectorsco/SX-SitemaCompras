<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { MarcaAsset, RedSocial } from '$lib/features/content-creator/types';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import {
		Calendar as CalendarIcon,
		Plus,
		X,
		UploadCloud,
		Check,
		Trash2,
		Instagram,
		Facebook,
		Link as LinkIcon,
		FileSpreadsheet,
		Sparkles,
		ChevronLeft,
		ChevronRight,
		ChevronDown,
		Search,
		ImageIcon,
		Package,
		RefreshCw,
		Warehouse,
		FileText
	} from 'lucide-svelte';

	interface ExcelPost {
		id: string;
		title: string;       // Tipo de contenido (ej: Toyama Ahoyadora)
		format: string;      // Formato de salida (ej: Carrusel)
		context: string;     // Contexto para post (Tópico central)
		objective: string;   // Objetivo en RRSS
		audience: string;    // Público (Amplio, etc.)
		budget: number;      // Presupuesto
		network: string;     // Red Social (display, string separado por coma)
		redes_ids?: number[]; // IDs numéricos de redes destino (resueltos desde catálogo)
		designed: boolean;
		published: boolean;
		promoted: boolean;
		copy: string;
		week: string;        // Semana a programar
		links: string;       // Hiper vínculos
		kpi: string;         // Objetivo KPI
		cta: string;         // CTA
		references: string;  // Referencias
		trend: string;       // Contexto trend
		date: string;        // Formato YYYY-MM-DD
		time?: string;       // Formato HH:MM (24h)
		imagePreview: string | null;
		imageName?: string;
		imageBase64?: string;
		
		carouselImages?: Array<{
			imagePreview: string | null;
			imageName: string;
			imageBase64: string;
			prompt?: string;
			modo?: 'editar' | 'crear';
		}>;

		// Campos de flujo de datos
		brand?: string;
		status?: 'Borrador' | 'En revisión' | 'Guardado' | 'Aprobado' | 'Publicado';
		ecommerceImage?: boolean;
		ecommerceUrl?: string;
		metaStartDate?: string;
		metaEndDate?: string;
		prompt?: string;
		promptCopy?: string;
		esCarrusel?: boolean;
		modo?: 'editar' | 'crear';
		cuentaId?: number | null;
	}

	// Props Svelte 5
	let { posts = $bindable(), catalogos } = $props<{ posts: ExcelPost[], catalogos: any }>();

	// Cuentas Meta disponibles (cargadas desde /api/content-creator/meta/auth/list)
	interface CuentaMeta {
		id: number;
		nombre: string;
		meta_instagram_id: string | null;
		token_valid: boolean;
		redes_activas: number[];
	}
	let cuentasMeta = $state<CuentaMeta[]>([]);
	let isLoadingCuentas = $state(false);

	async function loadCuentasMeta() {
		isLoadingCuentas = true;
		try {
			const res = await fetch('/api/content-creator/meta/auth/list');
			const data = await res.json();
			if (data.success && Array.isArray(data.accounts)) {
				// Solo cuentas con token válido (filtro client-side, el server ya quitó las deleted)
				cuentasMeta = data.accounts.filter((a: CuentaMeta) => a.token_valid);
			}
		} catch (err) {
			console.error('[creator-calendar] loadCuentasMeta:', err);
		} finally {
			isLoadingCuentas = false;
		}
	}

	onMount(() => {
		loadCuentasMeta();
	});

	// Estado del Calendario
	let currentDate = $state(new Date()); // Siempre inicia en el mes actual
	let dialogOpen = $state(false);
	let isEditing = $state(false);
	let selectedNetworks = $state<string[]>([]);

	// Estado del formulario
	let draftPost = $state<ExcelPost>({
		id: '',
		title: '',
		format: catalogos.formatos[0]?.nombre || 'Vertical (4:5)',
		context: '',
		objective: 'Conseguir más mensajes',
		audience: 'Amplio',
		budget: 7500,
		network: 'Facebook, Instagram',
		designed: false,
		published: false,
		promoted: false,
		copy: '',
		week: 'Semana 1',
		links: '',
		kpi: '',
		cta: '',
		references: '',
		trend: '',
		date: '',
		time: '12:00',
		imagePreview: null,
		imageName: '',
		imageBase64: '',
		carouselImages: [
				{ imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' },
				{ imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' }
			],
			brand: 'Toyama',
			status: 'Borrador',
			ecommerceImage: true,
			ecommerceUrl: '',
			metaStartDate: '',
			metaEndDate: '',
			prompt: '',
			promptCopy: '',
			esCarrusel: true,
			modo: 'editar',
			cuentaId: null
		});

	let carouselImageCount = $state(2);
	let imageInput = $state<HTMLInputElement | null>(null);

	// Confirmación de salida del modal con datos sin guardar
	let showExitConfirm = $state(false);
	let exitConfirmed = $state(false);

	// Detecta si el usuario ya cargó datos en el draft que difieren de un borrador vacío
	function hasDraftData(): boolean {
		if (draftPost.title?.trim()) return true;
		if (draftPost.context?.trim()) return true;
		if (draftPost.copy?.trim()) return true;
		if (draftPost.references?.trim()) return true;
		if (draftPost.trend?.trim()) return true;
		if (draftPost.links?.trim()) return true;
		if (draftPost.ecommerceUrl?.trim()) return true;
		if (draftPost.prompt?.trim()) return true;
		if (draftPost.imageBase64 || draftPost.imageName) return true;
		if (draftPost.metaStartDate || draftPost.metaEndDate) return true;
		if (Array.isArray(draftPost.carouselImages)) {
			for (const img of draftPost.carouselImages) {
				if (img?.imageBase64 || img?.imageName || img?.prompt?.trim()) return true;
			}
		}
		return false;
	}

	// Cierra el modal solo si no hay datos sin guardar; si los hay, pide confirmación
	function requestCloseModal() {
		if (hasDraftData() && !exitConfirmed) {
			showExitConfirm = true;
		} else {
			dialogOpen = false;
		}
	}

	function confirmExitModal() {
		showExitConfirm = false;
		exitConfirmed = true;
		dialogOpen = false;
	}

	function cancelExitModal() {
		showExitConfirm = false;
	}

	// Modo carrusel (independiente del nombre del formato)
	const isCarruselMode = $derived(!!draftPost.esCarrusel);

	function toggleCarruselMode() {
		draftPost.esCarrusel = !draftPost.esCarrusel;
		if (draftPost.esCarrusel) {
			if (!draftPost.carouselImages || draftPost.carouselImages.length === 0) {
				draftPost.carouselImages = [
					{ imagePreview: null, imageName: '', imageBase64: '' },
					{ imagePreview: null, imageName: '', imageBase64: '' }
				];
				carouselImageCount = 2;
			} else {
				carouselImageCount = draftPost.carouselImages.length;
			}
		}
	}

	// Marcas del catálogo de Vedoba
	let brands = $derived(catalogos.marcas.map((m: any) => m.nombre));

	// Estado para Assets de Marca
	let marcaAssets = $state<MarcaAsset[]>([]);
	let selectedAssetIds = $state<Set<number>>(new Set());
	let loadingAssets = $state(false);
	let assetPickerOpen = $state(false);
	let assetFilterType = $state<'todos' | 'logo' | 'isotipo' | 'sello' | 'fondo' | 'other'>('todos');

	// Estado para Fichas Técnicas
	let showFichasSelectorModal = $state(false);
	let fichasDisponibles = $state<any[]>([]);
	let loadingFichasSelector = $state(false);

	async function openFichasSelector() {
		showFichasSelectorModal = true;
		loadingFichasSelector = true;
		try {
			const marcaObj = catalogos.marcas.find((m: any) => m.nombre === draftPost.brand);
			const marcaId = marcaObj ? marcaObj.id : undefined;
			const query = marcaId ? `?marcaId=${marcaId}` : '';
			const res = await fetch(`/api/content-creator/fichas-tecnicas${query}`);
			const data = await res.json();
			if (res.ok && data.success) {
				fichasDisponibles = data.fichas;
			} else {
				fichasDisponibles = [];
			}
		} catch (err) {
			console.error('Error cargando fichas selector:', err);
			fichasDisponibles = [];
		} finally {
			loadingFichasSelector = false;
		}
	}

	function attachFichaToContext(ficha: any) {
		const textoFicha = `\n\n--- FICHA TÉCNICA: ${ficha.nombre_producto} (${ficha.marca_nombre}) ---\n${ficha.especificaciones_texto}\n--- FIN FICHA TÉCNICA ---`;
		if (draftPost.context) {
			draftPost.context = `${draftPost.context.trim()}${textoFicha}`;
		} else {
			draftPost.context = `Especificaciones del producto ${ficha.nombre_producto}${textoFicha}`;
		}
		toast.success(`Ficha técnica de "${ficha.nombre_producto}" adjuntada al contexto.`);
		showFichasSelectorModal = false;
	}

	$effect(() => {
		const marca = catalogos.marcas.find((m: any) => m.nombre === draftPost.brand);
		if (marca?.id) {
			loadingAssets = true;
			selectedAssetIds = new Set();
			fetch(`/api/content-creator/marcas/${marca.id}/assets`)
				.then(r => r.json())
				.then(d => { marcaAssets = d.assets || []; loadingAssets = false; })
				.catch(() => loadingAssets = false);
		} else {
			marcaAssets = [];
		}
	});

	function toggleAsset(id: number) {
		if (selectedAssetIds.has(id)) {
			selectedAssetIds.delete(id);
		} else {
			selectedAssetIds.add(id);
		}
		selectedAssetIds = new Set(selectedAssetIds);
	}

	function buildSystemPromptForBrand(brandName?: string): string {
		const marca = catalogos?.marcas?.find((m: any) => m.nombre === brandName);
		return marca?.prompt_sistema || 'Aplica los estilos de marca por defecto.';
	}

	function buildDefaultPrompt(post: ExcelPost): string {
		return `${buildSystemPromptForBrand(post.brand)}\nContexto del producto: ${post.title}. ${post.context || ''}.\nObjetivo: ${post.objective || 'Interacción'}.`.trim();
	}

	function fillDefaultPrompt() {
		draftPost.prompt = buildDefaultPrompt(draftPost);
		toast.info('Prompt auto-generado a partir del system prompt de la marca.', {
			description: 'Edítalo libremente antes de generar la imagen.'
		});
	}
	// Estado del selector de productos (catálogo real desde Exactus vía bodegas cc_incluida)
	interface ProductoAPI {
		codigo: string;
		descripcion: string;
		marca: string;
		categoria: string;
		stock_total: number;
		bodegas_con_stock: number;
	}

	interface DistribucionBodega {
		bodega_codigo: string;
		bodega_nombre: string;
		tipo: string;
		u_zona: string;
		cant_disponible: number;
		seleccionada: boolean;
	}

	let productSelectorOpen = $state(false);
	let productSearchQuery = $state('');
	let productBrandFilter = $state('Todas');
	let productCategoryFilter = $state('Todas');
	let productSortOrder = $state<'none' | 'highest' | 'lowest'>('none');

	let productos = $state<ProductoAPI[]>([]);
	let marcasExactus = $state<string[]>([]);
	let categoriasExactus = $state<string[]>([]);
	let cargandoProductos = $state(false);
	let errorProductos = $state<string | null>(null);
	let seleccionIncompleta = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	// Expansión de stock por bodega (lazy-load)
	let productoExpandido = $state<string | null>(null);
	let distribucionPorCodigo = $state<Record<string, DistribucionBodega[]>>({});
	let cargandoDistribucion = $state<Set<string>>(new Set());

	async function cargarProductos() {
		cargandoProductos = true;
		errorProductos = null;
		seleccionIncompleta = false;
		try {
			const params = new URLSearchParams();
			if (productSearchQuery.trim()) params.set('search', productSearchQuery.trim());
			if (productBrandFilter && productBrandFilter !== 'Todas') params.set('marca', productBrandFilter);
			if (productCategoryFilter && productCategoryFilter !== 'Todas') params.set('categoria', productCategoryFilter);
			if (productSortOrder !== 'none') params.set('sort', productSortOrder);

			const res = await fetch(`/api/content-creator/productos?${params.toString()}`);
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data?.error || `Error ${res.status}`);
			}
			productos = data.productos || [];
			marcasExactus = data.marcas || [];
			categoriasExactus = data.categorias || [];
			seleccionIncompleta = data.seleccion_incompleta === true;
			// Reset de distribución al recargar la lista
			distribucionPorCodigo = {};
			productoExpandido = null;
		} catch (e: any) {
			errorProductos = e?.message || 'Error al cargar productos';
			productos = [];
			seleccionIncompleta = true;
			console.error('[CC Calendario] cargarProductos:', e);
		} finally {
			cargandoProductos = false;
		}
	}

	function dispararBusquedaConDebounce() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => cargarProductos(), 350);
	}

	async function toggleExpandirProducto(codigo: string) {
		if (productoExpandido === codigo) {
			productoExpandido = null;
			return;
		}
		productoExpandido = codigo;
		// Lazy-load si aún no está cacheado
		if (!distribucionPorCodigo[codigo]) {
			const set = new Set(cargandoDistribucion);
			set.add(codigo);
			cargandoDistribucion = set;
			try {
				const res = await fetch(`/api/content-creator/productos/${encodeURIComponent(codigo)}/bodegas`);
				const data = await res.json();
				if (res.ok && data.encontrado) {
					distribucionPorCodigo = { ...distribucionPorCodigo, [codigo]: data.distribucion };
				} else {
					distribucionPorCodigo = { ...distribucionPorCodigo, [codigo]: [] };
				}
			} catch (e) {
				console.error('[CC Calendario] toggleExpandirProducto:', e);
				distribucionPorCodigo = { ...distribucionPorCodigo, [codigo]: [] };
			} finally {
				const s = new Set(cargandoDistribucion);
				s.delete(codigo);
				cargandoDistribucion = s;
			}
		}
	}

	function openProductSelector() {
		productSearchQuery = '';
		productSortOrder = 'none';
		productBrandFilter = 'Todas';
		productSelectorOpen = true;
		cargarProductos();
	}

	function selectProduct(producto: ProductoAPI) {
		draftPost.title = producto.descripcion || producto.codigo;

		// Intentar mapear la marca de Exactus a una marca del catálogo existente (case-insensitive)
		const marcaExactus = (producto.marca || '').trim();
		const marcaCatalogo = brands.find((b) => b.toLowerCase() === marcaExactus.toLowerCase());
		if (marcaCatalogo) draftPost.brand = marcaCatalogo;

		// Contexto: descripción + resumen de stock en bodegas seleccionadas
		const stockResumen = `Stock total (bodegas seleccionadas): ${producto.stock_total} uds · disponible en ${producto.bodegas_con_stock} bodega(s).`;
		if (draftPost.context && draftPost.context.trim() !== '') {
			draftPost.context = `${producto.descripcion}\n${stockResumen}\n---\n${draftPost.context}`;
		} else {
			draftPost.context = `${producto.descripcion}\n${stockResumen}`;
		}

		toast.success(`Producto seleccionado: ${producto.descripcion || producto.codigo}`);
		productSelectorOpen = false;
	}

	// Fecha de hoy en formato YYYY-MM-DD (ignorando timezone, en hora local)
	function getTodayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	// Devuelve true si la fecha (YYYY-MM-DD) es anterior al día de hoy
	function isPastDate(dateStr: string | undefined | null): boolean {
		if (!dateStr) return false;
		return dateStr < getTodayStr();
	}

	// Formatear mes en base a fecha
	function getMonthNameFormatted(dateStr: string): string {
		if (!dateStr) return '';
		const dateObj = new Date(dateStr + 'T00:00:00'); // Evitar problemas de timezone
		return dateObj.toLocaleDateString('es-CR', { month: 'long' }).toUpperCase();
	}

	// Obtener el día de la semana para la visualización
	function getDayNameFormatted(dateStr: string): string {
		const dateObj = new Date(dateStr + 'T00:00:00'); // Evitar problemas de timezone
		const dayName = dateObj.toLocaleDateString('es-CR', { weekday: 'long' });
		const dayNum = dateObj.getDate();
		return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${String(dayNum).padStart(2, '0')}`;
	}

	// Generar días para la vista del mes de forma inteligente, llenando semanas previas y siguientes
	const calendarDays = $derived.by(() => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();

		// Primer día del mes
		const firstDayIndex = new Date(year, month, 1).getDay();
		// Cantidad de días en el mes
		const totalDays = new Date(year, month + 1, 0).getDate();
		
		// Ajustar índice para que Lunes sea el primer día (0: Lun, 6: Dom)
		const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

		const days: Array<{ day: number; dateString: string; isCurrentMonth: boolean }> = [];

		// Días del mes anterior para llenar la primera semana
		const prevMonthLastDate = new Date(year, month, 0).getDate();
		for (let i = adjustedFirstDay - 1; i >= 0; i--) {
			const d = prevMonthLastDate - i;
			const prevMonth = month === 0 ? 11 : month - 1;
			const prevYear = month === 0 ? year - 1 : year;
			const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({ day: d, dateString: dateStr, isCurrentMonth: false });
		}

		// Días del mes actual
		for (let d = 1; d <= totalDays; d++) {
			const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({ day: d, dateString: dateStr, isCurrentMonth: true });
		}

		// Días del mes siguiente para llenar la última semana (hasta 42 celdas de 6 filas)
		const remainingCells = 42 - days.length;
		for (let d = 1; d <= remainingCells; d++) {
			const nextMonth = month === 11 ? 0 : month + 1;
			const nextYear = month === 11 ? year + 1 : year;
			const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({ day: d, dateString: dateStr, isCurrentMonth: false });
		}

		return days;
	});

	// Navegación de meses
	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
	}

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
	}

	function getMonthName(date: Date): string {
		return date.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' }).toUpperCase();
	}

	// Obtener publicaciones programadas para un día
	function getPostsForDay(dateStr: string | null): ExcelPost[] {
		if (!dateStr) return [];
		return posts.filter(p => p.date === dateStr);
	}

	// Clases de color (borde + fondo suave + texto) para las celdas del calendario
	function getStatusCellColor(status?: string): string {
		switch (status) {
			case 'Publicado':   return 'border-green-200 bg-green-50/40 text-green-800 dark:border-green-950 dark:bg-green-950/20 dark:text-green-400';
			case 'Aprobado':    return 'border-indigo-200 bg-indigo-50/40 text-indigo-800 dark:border-indigo-950/20 dark:bg-indigo-950/10 dark:text-indigo-400';
			case 'En revisión': return 'border-amber-200 bg-amber-50/40 text-amber-800 dark:border-amber-950/20 dark:bg-amber-950/10 dark:text-amber-400';
			case 'Guardado':    return 'border-sky-200 bg-sky-50/40 text-sky-800 dark:border-sky-950/20 dark:bg-sky-950/10 dark:text-sky-400';
			case 'Error API':   return 'border-rose-200 bg-rose-50/40 text-rose-800 dark:border-rose-950/20 dark:bg-rose-950/10 dark:text-rose-400';
			default:            return 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
		}
	}

	// Clases de color (relleno sólido) para las pastillas de la leyenda y la lista de revisión
	function getStatusBadgeColor(status?: string): string {
		switch (status) {
			case 'Publicado':   return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
			case 'Aprobado':    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400';
			case 'En revisión': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
			case 'Guardado':    return 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400';
			case 'Error API':   return 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400';
			default:            return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
		}
	}

	// Abrir modal de creación
	function openCreateModal(dateStr?: string) {
		isEditing = false;

		let actualDateStr = dateStr;
		if (!actualDateStr) {
			// Usar el primer día de currentDate o el día de hoy si coincide con el mes/año
			const today = new Date();
			if (today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth()) {
				actualDateStr = today.toISOString().split('T')[0];
			} else {
				const year = currentDate.getFullYear();
				const month = String(currentDate.getMonth() + 1).padStart(2, '0');
				actualDateStr = `${year}-${month}-01`;
			}
		}

		// No permitir programar publicaciones en días pasados
		if (isPastDate(actualDateStr)) {
			toast.error('No se pueden programar publicaciones en días pasados', {
				description: 'Selecciona una fecha de hoy en adelante.'
			});
			return;
		}

		// Determinar semana a programar
		const dateObj = new Date(actualDateStr + 'T00:00:00'); // Evitar timezone issues
		const dayNum = dateObj.getDate();
		const weekNum = Math.ceil(dayNum / 7);

		// Preseleccionar redes: solo las habilitadas para la cuenta default (cuentasMeta[0]).
		// Si no hay info de redes_activas, fallback a FB+IG.
		const cuentaDefault = cuentasMeta[0];
		const redesPermitidas = cuentaDefault?.redes_activas ?? null;
		selectedNetworks = (redesPermitidas == null)
			? ['Facebook', 'Instagram']
			: catalogos.redes
				.filter((r: RedSocial) => redesPermitidas.includes(r.id))
				.map((r: RedSocial) => r.nombre);

		draftPost = {
			id: `MER-${String(posts.length + 1).padStart(3, '0')}`,
			title: '',
			format: catalogos.formatos[0]?.nombre || 'Vertical (4:5)',
			context: '',
			objective: 'Conseguir más mensajes',
			audience: 'Amplio',
			budget: 7500,
			network: 'Facebook, Instagram',
			designed: false,
			published: false,
			promoted: false,
			copy: '',
			week: `Semana ${weekNum}`,
			links: '',
			kpi: 'Conversaciones iniciadas',
			cta: 'Cotizar ahora',
			references: '',
			trend: '',
			date: actualDateStr,
			imagePreview: null,
			imageName: '',
			imageBase64: '',
			carouselImages: [
				{ imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' },
				{ imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' }
			],
			brand: 'Toyama',
			status: 'Borrador',
			ecommerceImage: true,
			ecommerceUrl: '',
			metaStartDate: '',
			metaEndDate: '',
			prompt: '',
			esCarrusel: true,
			modo: 'editar',
			// Default: primera cuenta Meta disponible con token válido
			cuentaId: cuentasMeta[0]?.id ?? null
		};
		carouselImageCount = 2;
		exitConfirmed = false;
		dialogOpen = true;
	}

	// Actualizar fecha y semana dinámicamente
	function handleDateChange(newDateStr: string) {
		if (!newDateStr) return;

		// Rechazar fechas pasadas (solo se permite hoy en adelante)
		if (isPastDate(newDateStr)) {
			toast.error('La fecha no puede ser anterior a hoy', {
				description: 'Selecciona una fecha de hoy en adelante.'
			});
			// Revertir el valor del input
			setTimeout(() => { draftPost.date = getTodayStr(); }, 0);
			return;
		}

		draftPost.date = newDateStr;

		const dateObj = new Date(newDateStr + 'T00:00:00'); // Evitar timezone issues
		const dayNum = dateObj.getDate();
		const weekNum = Math.ceil(dayNum / 7);
		draftPost.week = `Semana ${weekNum}`;
	}

	// Alternar redes sociales seleccionadas
	function toggleNetwork(net: string) {
		if (selectedNetworks.includes(net)) {
			selectedNetworks = selectedNetworks.filter(n => n !== net);
		} else {
			selectedNetworks = [...selectedNetworks, net];
		}
		draftPost.network = selectedNetworks.join(', ');
	}

	// Abrir modal de edición
	function openEditModal(post: ExcelPost) {
		isEditing = true;

		const netString = post.network || '';
		selectedNetworks = [];
		for (const red of catalogos.redes) {
			if (netString.includes(red.nombre)) selectedNetworks.push(red.nombre);
		}

		draftPost = { 
			...post,
			brand: post.brand || 'Toyama',
			status: post.status || 'Borrador',
			ecommerceImage: post.ecommerceImage !== undefined ? post.ecommerceImage : true,
			ecommerceUrl: post.ecommerceUrl || '',
			metaStartDate: post.metaStartDate || '',
			metaEndDate: post.metaEndDate || '',
			prompt: post.prompt || '',
			promptCopy: post.promptCopy || '',
			modo: post.modo === 'crear' ? 'crear' : 'editar',
			carouselImages: (post.carouselImages || []).map((img: any) => ({
				imagePreview: img.imagePreview ?? null,
				imageName: img.imageName || '',
				imageBase64: img.imageBase64 || '',
				prompt: img.prompt || '',
				modo: img.modo === 'crear' ? 'crear' : 'editar'
			})),
			esCarrusel: post.esCarrusel !== undefined
				? !!post.esCarrusel
				: (Array.isArray(post.carouselImages) && post.carouselImages.length > 0)
		};

		// Filtrar selectedNetworks contra las redes habilitadas para la cuenta del post.
		// Sanea posts legados con IG en el string aunque la cuenta no lo soporte.
		const cuentaPost = draftPost.cuentaId != null
			? cuentasMeta.find((c) => c.id === draftPost.cuentaId)
			: null;
		if (cuentaPost && Array.isArray(cuentaPost.redes_activas)) {
			selectedNetworks = selectedNetworks.filter((nombre) => {
				const red = catalogos.redes.find((r: RedSocial) => r.nombre === nombre);
				return red && cuentaPost.redes_activas.includes(red.id);
			});
		}
		draftPost.network = selectedNetworks.join(', ');

		carouselImageCount = draftPost.esCarrusel && draftPost.carouselImages?.length
			? draftPost.carouselImages.length
			: 2;
		if (carouselImageCount === 0) carouselImageCount = 2;

		exitConfirmed = false;
		dialogOpen = true;
	}



	async function subirImagenAServidor(file: File, subPath: string = 'refs'): Promise<{ imageUrl: string; fileName: string } | null> {
		try {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('subPath', subPath);
			const res = await fetch('/api/content-creator/upload-imagen', { method: 'POST', body: fd });
			const data = await res.json();
			if (res.ok && data.success && data.imageUrl) {
				return { imageUrl: data.imageUrl, fileName: data.fileName || file.name };
			}
			console.error('[upload-imagen] Error:', data.error);
			toast.error(`No se pudo subir la imagen: ${data.error || 'error desconocido'}`);
			return null;
		} catch (e) {
			console.error('[upload-imagen] Exception:', e);
			toast.error('Error de red al subir la imagen.');
			return null;
		}
	}

	// Subida de imagen de referencia
	function handleImageUpload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		draftPost.imageName = file.name;
		// Preview inmediato (provisional) — se reemplaza por la URL persistente tras subir
		draftPost.imagePreview = URL.createObjectURL(file);

		const reader = new FileReader();
		reader.onloadend = () => {
			draftPost.imageBase64 = reader.result as string;
		};
		reader.readAsDataURL(file);

		// Persistir a disco en paralelo
		subirImagenAServidor(file, 'refs').then((res) => {
			if (res) {
				draftPost.imageName = res.fileName;
				draftPost.imagePreview = res.imageUrl;
			}
		});

		toast.success(`Imagen de referencia adjuntada: ${file.name}`);
	}

	function handleCarouselImageUpload(event: Event, index: number) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!draftPost.carouselImages) draftPost.carouselImages = [];
		if (!draftPost.carouselImages[index]) {
			draftPost.carouselImages[index] = { imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' };
		}

		draftPost.carouselImages[index].imageName = file.name;
		// Preview provisional — se reemplaza por la URL persistente tras subir
		draftPost.carouselImages[index].imagePreview = URL.createObjectURL(file);
		// Al subir una referencia, volvemos a modo editar automáticamente
		draftPost.carouselImages[index].modo = 'editar';

		const reader = new FileReader();
		reader.onloadend = () => {
			draftPost.carouselImages![index].imageBase64 = reader.result as string;
		};
		reader.readAsDataURL(file);

		// Persistir a disco en paralelo
		subirImagenAServidor(file, `refs/post-${draftPost.id || 'nuevo'}`).then((res) => {
			if (res && draftPost.carouselImages?.[index]) {
				draftPost.carouselImages[index].imageName = res.fileName;
				draftPost.carouselImages[index].imagePreview = res.imageUrl;
			}
		});

		toast.success(`Imagen ${index + 1} adjuntada al carrusel: ${file.name}`);
	}

	function clearCarouselImage(index: number) {
		if (draftPost.carouselImages && draftPost.carouselImages[index]) {
			draftPost.carouselImages[index].imageName = '';
			draftPost.carouselImages[index].imagePreview = null;
			draftPost.carouselImages[index].imageBase64 = '';
		}
	}

	function toggleSlideModo(index: number) {
		if (!draftPost.carouselImages) return;
		if (!draftPost.carouselImages[index]) {
			draftPost.carouselImages[index] = { imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' };
		}
		const slide = draftPost.carouselImages[index];
		if (slide.modo === 'crear') {
			slide.modo = 'editar';
		} else {
			// Al pasar a 'crear' limpiamos la referencia (no se usará)
			slide.modo = 'crear';
			slide.imageName = '';
			slide.imagePreview = null;
			slide.imageBase64 = '';
		}
		draftPost.carouselImages = [...draftPost.carouselImages];
	}

	function autoFillSlidePrompt(index: number) {
		if (!draftPost.carouselImages) return;
		if (!draftPost.carouselImages[index]) {
			draftPost.carouselImages[index] = { imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' };
		}
		const prompt = buildDefaultPrompt(draftPost);
		draftPost.carouselImages[index].prompt = prompt;
		toast.info(`Prompt auto-generado para la imagen ${index + 1}`, {
			description: 'Edítalo libremente antes de generar.'
		});
	}
	
	function updateCarouselCount(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const count = parseInt(input.value) || 2;
		carouselImageCount = Math.max(1, Math.min(10, count));
		
		if (!draftPost.carouselImages) draftPost.carouselImages = [];
		if (draftPost.carouselImages.length < carouselImageCount) {
			const diff = carouselImageCount - draftPost.carouselImages.length;
			for(let i=0; i<diff; i++) {
				draftPost.carouselImages.push({ imagePreview: null, imageName: '', imageBase64: '', prompt: '', modo: 'editar' });
			}
		} else if (draftPost.carouselImages.length > carouselImageCount) {
			draftPost.carouselImages = draftPost.carouselImages.slice(0, carouselImageCount);
		}
	}

	function clearImage() {
		draftPost.imageName = '';
		draftPost.imagePreview = null;
		draftPost.imageBase64 = '';
		if (imageInput) imageInput.value = '';
	}

	function toggleSingleModo() {
		if (draftPost.modo === 'crear') {
			draftPost.modo = 'editar';
		} else {
			draftPost.modo = 'crear';
			draftPost.imageName = '';
			draftPost.imagePreview = null;
			draftPost.imageBase64 = '';
			if (imageInput) imageInput.value = '';
		}
	}

	// Guardar formulario
	async function savePost() {
		// Snapshot the selection before saving/closing the modal because reactive effects can reset it.
		const assetIdsForGeneration = Array.from(selectedAssetIds);
		const hasSelectedAssets = assetIdsForGeneration.length > 0;
		if (!draftPost.title.trim()) {
			toast.error('El tipo de contenido (título/producto) es requerido');
			return;
		}

		if (!draftPost.date) {
			toast.error('La fecha de publicación es requerida');
			return;
		}

		if (!draftPost.time || !draftPost.time.trim()) {
			toast.error('La hora de publicación es requerida', {
				description: 'Seleccioná una hora para poder guardar la ficha.'
			});
			return;
		}

		// Validar vigencia en Meta: la fecha de finalización no puede ser anterior a la de inicio
		if (draftPost.metaStartDate && draftPost.metaEndDate && draftPost.metaEndDate < draftPost.metaStartDate) {
			toast.error('La fecha de finalización no puede ser anterior a la fecha de inicio', {
				description: 'Ajustá las fechas de vigencia en Meta.'
			});
			return;
		}

		// Al crear una publicación nueva, no permitir fechas pasadas.
		// En edición, handleDateChange ya bloquea mover la fecha al pasado.
		if (!isEditing && isPastDate(draftPost.date)) {
			toast.error('No se puede programar una publicación en una fecha pasada', {
				description: 'Ajusta la fecha a hoy o una fecha futura.'
			});
			return;
		}

		// Validar que se haya seleccionado al menos una red social de destino
		if (selectedNetworks.length === 0) {
			toast.error('Selecciona al menos una red social de destino', {
				description: 'Marca Facebook, Instagram u otra red disponible para esta cuenta.'
			});
			return;
		}

		// Validar que las redes seleccionadas estén habilitadas para la cuenta Meta elegida
		if (draftPost.cuentaId != null) {
			const cuentaSel = cuentasMeta.find((c) => c.id === draftPost.cuentaId);
			if (cuentaSel && Array.isArray(cuentaSel.redes_activas)) {
				const redesInvalidas = selectedNetworks.filter((nombre) => {
					const red = catalogos.redes.find((r: RedSocial) => r.nombre === nombre);
					return !red || !cuentaSel.redes_activas.includes(red.id);
				});
				if (redesInvalidas.length > 0) {
					toast.error(`La cuenta "${cuentaSel.nombre}" no tiene habilitada(s): ${redesInvalidas.join(', ')}`, {
						description: 'Conecta esa red en la cuenta o elige otra cuenta.'
					});
					return;
				}
			}
		}

		// Mapear nombres → IDs numéricos para enviar al backend (evita parseo frágil del string network)
		const redes_ids: number[] = selectedNetworks
			.map((nombre) => catalogos.redes.find((r: RedSocial) => r.nombre === nombre)?.id)
			.filter((id): id is number => typeof id === 'number');

		if (!draftPost.copy) {
			draftPost.copy = '';
		}

		const promptGeneral = draftPost.prompt?.trim() || '';
		const systemPrompt = buildSystemPromptForBrand(draftPost.brand).trim();
		if (draftPost.esCarrusel) {
			const missingSlides = (draftPost.carouselImages || [])
				.map((img, index) => ({ img, number: index + 1 }))
				.filter(({ img }) => {
					const hasPrimaryImage = Boolean(img.imageBase64?.trim() || img.imagePreview?.trim());
					const hasContentPrompt = Boolean(img.prompt?.trim() || promptGeneral);
					return !hasPrimaryImage && !hasContentPrompt;
				})
				.map(({ number }) => number);
			if (missingSlides.length > 0) {
				toast.error(`Slides incompletos: #${missingSlides.join(', #')}`, {
					description: 'Cada slide sin imagen principal necesita un prompt propio o el prompt general.'
				});
				return;
			}
		}
		const carouselImages = draftPost.esCarrusel
			? (draftPost.carouselImages || []).map((img) => {
				const hasPrimaryImage = Boolean(img.imageBase64?.trim() || img.imagePreview?.trim());
				const hasContentPrompt = Boolean(img.prompt?.trim() || promptGeneral);
				return !hasPrimaryImage && hasContentPrompt ? { ...img, modo: 'crear' as const } : img;
			})
			: draftPost.carouselImages;

		const postToProcess = { ...draftPost, carouselImages, redes_ids };
		exitConfirmed = true;
		dialogOpen = false;

		// ==========================================
		// 1. GUARDAR EN LA BASE DE DATOS
		// ==========================================
		let realId: string = postToProcess.id;

		if (!isEditing) {
			try {
				const saveResp = await fetch('/api/content-creator/publicaciones/guardar-desde-calendario', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(postToProcess)
				});
				const saveData = await saveResp.json();

				if (saveResp.ok && saveData.id) {
					realId = saveData.id.toString();
					toast.success('Publicación guardada en el cronograma', {
						description: `ID en sistema: #${realId}`
					});
				} else {
					toast.error('No se pudo guardar la publicación en la base de datos.', {
						description: saveData.error || ''
					});
					return;
				}
			} catch (e) {
				console.error(e);
				toast.error('Error de red al guardar la publicación.');
				return;
			}
		} else {
			// Edición — actualizar en la BD vía PUT
			try {
				const putResp = await fetch('/api/content-creator/publicaciones/guardar-desde-calendario', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ...postToProcess, id: postToProcess.id })
				});
				if (putResp.ok) {
					toast.success('Publicación actualizada en el cronograma');
				} else {
					const err = await putResp.json();
					toast.error('Error al actualizar', { description: err.error || '' });
				}
			} catch (e) {
				console.error(e);
				toast.error('Error de red al actualizar la publicación.');
			}
		}

		// Agregar/actualizar en el array local con el ID real
		const postConIdReal = { ...postToProcess, id: realId };
		if (isEditing) {
			posts = posts.map(p => p.id === postToProcess.id ? postConIdReal : p);
		} else {
			posts = [postConIdReal, ...posts];
		}

		// ==========================================
		// 2. AUTO-GENERAR IMAGEN EN SEGUNDO PLANO
		// ==========================================
		const isCarouselFormat = !!postToProcess.esCarrusel;

		if (isCarouselFormat && postToProcess.carouselImages && postToProcess.carouselImages.length > 0) {
			// Los assets son referencias visuales compartidas, no sustituyen el prompt de contenido.
			const slidesProcesables = postToProcess.carouselImages
				.map((img, idx) => ({ img, idx }))
				.filter(({ img, idx }) => {
					if (img.modo === 'crear') {
						const ok = (img.prompt && img.prompt.trim()) || promptGeneral;
						if (!ok) {
							console.warn(`[savePost] Slide ${idx} en modo crear sin prompt — se omite.`);
						}
						return ok;
					}
					return Boolean(img.imageBase64 || img.imagePreview);
				});

			if (slidesProcesables.length === 0) {
				toast.warning('No había imágenes ni prompts válidos para generar el carrusel.');
			} else {
				toast.info(`Gemini está procesando ${slidesProcesables.length} imágenes del carrusel...`, {
					description: 'Modo crear + editar combinados.'
				});

				// Procesar todas las imágenes del carrusel individualmente
				Promise.all(slidesProcesables.map(async ({ img, idx }) => {
					try {
						// Un prompt de slide reemplaza al general; el system prompt sólo es fallback
						// cuando existe una imagen principal y no hay ninguno de los dos.
						const resolvedPrompt = img.prompt?.trim() || promptGeneral || systemPrompt;
						const response = await fetch(`/api/content-creator/publicaciones/${realId}/generar-imagen`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								base64Image: img.modo === 'crear' ? null : img.imageBase64,
								imageUrl: img.modo === 'crear' ? null : (img.imagePreview || undefined),
								brand: postToProcess.brand,
								title: postToProcess.title,
								context: postToProcess.context,
								objective: postToProcess.objective,
								index: idx,
								customPrompt: resolvedPrompt,
								modo: img.modo || 'editar',
								selectedAssetIds: assetIdsForGeneration
							})
						});
						const data = await response.json();
						if (data.success && data.imageUrl) {
							return { index: idx, url: data.imageUrl };
						}
						return { index: idx, error: data.error || `No se pudo generar el slide #${idx + 1}` };
					} catch (error) {
						console.error(error);
						return { index: idx, error: `Fallo de conexión al generar el slide #${idx + 1}` };
					}
				})).then((results) => {
					// Actualizar estado local
					posts = posts.map(p => {
						if (p.id === realId && p.carouselImages) {
							const updatedImages = [...p.carouselImages];
							results.forEach(res => {
								if (res && 'url' in res && updatedImages[res.index]) {
									updatedImages[res.index].imageName = `ia_gen_pub_${realId}_${res.index}.jpg`;
									updatedImages[res.index].imagePreview = res.url;
									updatedImages[res.index].imageBase64 = '';
								}
							});
							return { ...p, carouselImages: updatedImages };
						}
						return p;
					});
					const completados = results.filter(r => 'url' in r).length;
					const primerError = results.find((r) => 'error' in r);
					if (primerError && 'error' in primerError) {
						toast.error('No se pudieron generar todos los slides.', { description: primerError.error });
					}
					if (completados > 0) {
						toast.success(`¡Edición de ${completados} imágenes de carrusel terminada!`, {
							description: 'Revisa el resultado en la pestaña de Revisión.'
						});
					}
				});
			}
} else {
			// Post individual: modo editar (con imagen de referencia) o modo crear (text-to-image)
			const hasRefImage = !!postToProcess.imageBase64 || !!postToProcess.imagePreview;
			const isSingleCrear = postToProcess.modo === 'crear' || (!hasRefImage && hasSelectedAssets);

			if (!isSingleCrear && !hasRefImage) {
				toast.error('Sube una imagen de referencia o activá «Crear sin referencia» para generar con IA', {
					description: 'Sin imagen no se puede generar el contenido visual de la ficha.'
				});
				return;
			}

			if (isSingleCrear) {
				toast.info('Gemini está generando una imagen desde cero (text-to-image)...', {
					description: 'Esto tomará unos segundos.'
				});
			} else {
				toast.info('Gemini está editando y aplicando el estilo de marca a tu imagen...', {
					description: 'Esto tomará unos segundos.'
				});
			}

			try {
				const response = await fetch(`/api/content-creator/publicaciones/${realId}/generar-imagen`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						base64Image: isSingleCrear ? null : (postToProcess.imageBase64 || null),
						imageUrl: isSingleCrear ? null : (postToProcess.imagePreview || undefined),
						brand: postToProcess.brand,
						title: postToProcess.title,
						context: postToProcess.context,
						objective: postToProcess.objective,
						customPrompt: promptGeneral || systemPrompt,
						modo: isSingleCrear ? 'crear' : 'editar',
						selectedAssetIds: assetIdsForGeneration
					})
				});
				const data = await response.json();

				if (data.success && data.imageUrl) {
					posts = posts.map(p => {
						if (p.id === realId) {
							return {
								...p,
								imageName: `ia_gen_pub_${realId}.jpg`,
								imagePreview: data.imageUrl,
								imageBase64: '' // Limpiamos para evitar subidas dobles a futuro
							};
						}
						return p;
					});
					toast.success(isSingleCrear ? '¡Imagen generada desde cero!' : '¡Edición de imagen terminada!', {
						description: 'Revisa el resultado en la pestaña de Revisión.'
					});
				} else {
					toast.error('Error al generar la imagen automáticamente.', { description: data.error || '' });
				}
			} catch (error) {
				console.error(error);
				toast.error('Fallo en la conexión al intentar generar la imagen.');
			}
		}
	}

	// Borrar publicación (Soft Delete)
	async function deletePost(id: string) {
		try {
			const numericId = id.replace('MER-', '');
			if (/^\d+$/.test(numericId)) {
				await fetch(`/api/content-creator/publicaciones/${numericId}`, {
					method: 'DELETE'
				});
			}
			posts = posts.filter(p => p.id !== id);
			toast.success('Publicación eliminada correctamente');
			exitConfirmed = true;
			dialogOpen = false;
		} catch (e) {
			console.error(e);
			toast.error('Error al eliminar la publicación');
		}
	}
</script>

<div class="space-y-4">
	
	<!-- Cabecera del Calendario -->
	<div class="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D1E3D]">
				<CalendarIcon class="h-5.5 w-5.5 text-white" />
			</div>
			<div>
				<h2 class="text-base font-bold text-slate-900 dark:text-white">Planificador Editorial (Cronograma IA)</h2>
				<p class="text-xs text-muted-foreground font-medium">Configuración semanal de pautas e imágenes de referencia para la generación automática</p>
			</div>
		</div>

		<!-- Controles de Mes y Acción -->
		<div class="flex items-center gap-3 flex-wrap">
			<div class="flex items-center gap-1.5">
				<Button variant="outline" size="sm" class="h-8.5 px-3.5" onclick={prevMonth}>
					<ChevronLeft class="h-4 w-4 mr-0.5" />
					Anterior
				</Button>
				<span class="text-xs font-bold font-mono min-w-[130px] text-center bg-slate-100 dark:bg-slate-800 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
					{getMonthName(currentDate)}
				</span>
				<Button variant="outline" size="sm" class="h-8.5 px-3.5" onclick={nextMonth}>
					Siguiente
					<ChevronRight class="h-4 w-4 ml-0.5" />
				</Button>
			</div>

			<Button 
				onclick={() => openCreateModal()}
				class="h-8.5 bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs font-semibold shadow-xs rounded-lg cursor-pointer"
			>
				<Plus class="h-4 w-4" />
				Programar Publicación
			</Button>
		</div>
	</div>

	<!-- Grilla del Calendario -->
	<div class="rounded-xl border bg-card shadow-sm overflow-hidden">
		<!-- Cabeceras de Semana -->
		<div class="grid grid-cols-7 border-b bg-muted/40 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
			<div class="py-2.5 border-r">Lun</div>
			<div class="py-2.5 border-r">Mar</div>
			<div class="py-2.5 border-r">Mié</div>
			<div class="py-2.5 border-r">Jue</div>
			<div class="py-2.5 border-r">Vie</div>
			<div class="py-2.5 border-r">Sáb</div>
			<div class="py-2.5">Dom</div>
		</div>

		<!-- Celdas de Días -->
		<div class="grid grid-cols-7 bg-muted/10 grid-rows-[repeat(6,minmax(115px,1fr))] divide-y divide-x border-t">
			{#each calendarDays as { day, dateString, isCurrentMonth }}
				{@const dayPosts = getPostsForDay(dateString)}
				<div class={`relative p-2 group flex flex-col justify-between min-h-[115px] transition-all duration-200
					${isCurrentMonth ? 'bg-background hover:bg-slate-50/50 dark:hover:bg-slate-900/10' : 'bg-slate-50/40 text-slate-400 dark:bg-slate-900/20'}`}
				>
					<!-- Número de Día -->
					<div class="flex justify-between items-center">
						<span class={`text-xs font-bold font-mono
							${isCurrentMonth 
								? 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white' 
								: 'text-slate-300 dark:text-slate-700'}`}
						>
							{day}
						</span>
						
						<!-- Botón agregar post rápido -->
						{#if !isPastDate(dateString)}
							<button
								type="button"
								onclick={() => openCreateModal(dateString)}
								class="opacity-40 group-hover:opacity-100 transition-all rounded bg-orange-500 hover:bg-orange-600 text-white p-0.5 shadow-sm"
								title="Programar post este día"
							>
								<Plus class="h-3 w-3" />
							</button>
						{/if}
					</div>

					<!-- Lista de Posts en el día -->
					<div class="mt-1.5 space-y-1.5 flex-1 overflow-y-auto max-h-[85px] scrollbar-thin">
						{#each dayPosts as post (post.id)}
							<button 
								type="button" 
								onclick={() => openEditModal(post)}
class="w-full text-left rounded p-1.5 text-[10px] leading-tight border transition flex flex-col gap-0.5 hover:shadow-sm hover:scale-[1.01] duration-150
								{getStatusCellColor(post.status)}"
							>
								<div class="flex items-center justify-between gap-1 w-full">
									<span class="font-bold truncate max-w-[80%]">{post.title}</span>
									<span class="shrink-0 text-[8px] font-mono font-bold text-slate-400">
										{post.id}
									</span>
								</div>
								
								<div class="flex items-center justify-between text-[8px] text-slate-400 mt-1">
									<span class="font-semibold">{post.brand || 'V&O'}</span>
									<div class="flex gap-1">
										{#if post.imagePreview}<span class="text-blue-500" title="Imagen de referencia adjuntada">🖼️</span>{/if}
										{#if post.designed}<span class="text-indigo-500" title="Diseño listo">🎨</span>{/if}
										{#if post.published}<span class="text-green-500" title="Publicado en Meta">📤</span>{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Leyenda de estados -->
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3 shadow-sm">
		<span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Estados:</span>
		{#each [['Borrador'], ['En revisión'], ['Guardado'], ['Aprobado'], ['Publicado'], ['Error API']] as [st]}
			<div class="flex items-center gap-1.5">
				<span class="h-3 w-3 rounded {getStatusBadgeColor(st)}"></span>
				<span class="text-[10px] font-medium text-muted-foreground">{st}</span>
			</div>
		{/each}
	</div>
</div>

<!-- Modal Dialog de Configuración Completa Formulario Directo -->
<Dialog.Root bind:open={dialogOpen} onOpenChange={(open) => {
		if (open) {
			dialogOpen = true;
		} else {
			// Intento de cierre (X, overlay, Escape, o código)
			if (exitConfirmed || !hasDraftData()) {
				exitConfirmed = false;
				// dialogOpen se pone en false vía bind
				return;
			}
			// Hay datos sin guardar: el bind ya cerró el dialog.
			// Reabrir inmediatamente + pedir confirmación.
			showExitConfirm = true;
			dialogOpen = true;
		}
	}}>
	<Dialog.Content class="max-w-4xl border bg-background p-0 shadow-lg text-foreground rounded-xl overflow-hidden">
		<!-- Confirmación de salida con datos sin guardar (dentro del Dialog para respetar el focus trap) -->
		{#if showExitConfirm}
			<div
				class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
				onclick={(e) => e.stopPropagation()}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="exit-confirm-title"
				aria-describedby="exit-confirm-desc"
			>
				<div class="w-full max-w-sm rounded-xl border bg-background p-5 shadow-2xl space-y-4">
					<div class="space-y-2">
						<h2 id="exit-confirm-title" class="text-base font-bold text-foreground">¿Salir sin guardar?</h2>
						<p id="exit-confirm-desc" class="text-xs text-muted-foreground">
							Hay cambios sin guardar en la ficha. Si cerrás ahora se perderán. ¿Seguro que querés salir?
						</p>
					</div>
					<div class="flex justify-end gap-2.5 pt-2">
						<Button variant="outline" onclick={cancelExitModal}>Cancelar</Button>
						<Button class="bg-rose-600 hover:bg-rose-700 text-white font-bold" onclick={confirmExitModal}>
							Sí, salir sin guardar
						</Button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Cabecera modal -->
		<div class="flex items-center justify-between border-b p-5 bg-muted/40">
			<div>
				<Dialog.Title class="text-base font-bold">
					{isEditing ? 'Configurar Ficha de Publicación' : 'Programar Nueva Configuración Semanal'}
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground mt-0.5">
					Sube la imagen y configura las directrices para que la IA genere el contenido según el system prompt de la marca.
				</Dialog.Description>
			</div>
			<div class="font-mono text-xs bg-[#0D1E3D]/10 text-[#0D1E3D] dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-md font-semibold">
				{draftPost.id} · {draftPost.date}
			</div>
		</div>

		<!-- Cuerpo del Modal en Dos Columnas -->
		<div class="grid gap-0 md:grid-cols-[280px_1fr] max-h-[70vh] overflow-y-auto">
			
			<!-- Columna Izquierda: Imagen de Referencia e Identificación -->
			<div class="p-5 border-b md:border-b-0 md:border-r bg-muted/10 space-y-4 flex flex-col justify-between">
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<p class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
							{isCarruselMode ? 'Imágenes de Referencia' : 'Imagen de Referencia'}
						</p>
						{#if isCarruselMode}
							<div class="flex items-center gap-2">
								<label for="carousel-count" class="text-[10px] font-bold text-muted-foreground">Cantidad:</label>
								<input 
									id="carousel-count"
									type="number" 
									min="1" 
									max="10" 
									value={carouselImageCount} 
									onchange={updateCarouselCount}
									class="w-14 px-2 py-1 text-xs rounded-md border border-slate-200 bg-background text-foreground focus:border-orange-500 outline-none"
								/>
							</div>
						{/if}
					</div>
					
{#if isCarruselMode}
					<div class="space-y-3 max-h-[520px] overflow-y-auto pr-1">
						{#each Array.from({length: carouselImageCount}) as _, i}
							{@const img = draftPost.carouselImages?.[i]}
							{@const slideModo = img?.modo === 'crear' ? 'crear' : 'editar'}
							<div class="rounded-xl border border-dashed bg-card p-3 shadow-inner">
								<div class="flex items-center justify-between mb-2">
									<p class="text-[10px] font-bold text-slate-500">Imagen {i + 1}</p>
									<label class="flex items-center gap-1.5 text-[9px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
										<input
											type="checkbox"
											checked={slideModo === 'crear'}
											onchange={() => toggleSlideModo(i)}
											class="rounded border-slate-200 text-[#0D1E3D] focus:ring-[#0D1E3D] dark:border-slate-700"
										/>
										<span>✨ Crear (sin ref)</span>
									</label>
								</div>

								{#if slideModo === 'editar'}
									<label class="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-center hover:bg-muted/60 transition">
										{#if img?.imagePreview}
											<img src={img.imagePreview} alt="Preview {i+1}" class="h-20 w-full rounded-md object-cover" />
										{:else}
											<UploadCloud class="h-5 w-5 text-muted-foreground" />
											<div class="space-y-0.5">
												<p class="text-[9px] font-semibold text-slate-700 dark:text-slate-200">Subir imagen</p>
											</div>
										{/if}
										<input type="file" accept="image/*" class="hidden" onchange={(e) => handleCarouselImageUpload(e, i)} />
									</label>
									{#if img?.imageName}
										<div class="flex items-center justify-between rounded-lg border bg-card p-2 text-[10px] mt-2">
											<span class="truncate font-semibold max-w-[150px]">{img.imageName}</span>
											<button type="button" class="text-rose-500 hover:text-rose-600 p-0.5" onclick={() => clearCarouselImage(i)}>
												<X class="h-3.5 w-3.5" />
											</button>
										</div>
									{/if}
								{:else}
									<div class="flex min-h-[100px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#0D1E3D]/40 bg-[#0D1E3D]/5 px-3 py-4 text-center">
										<Sparkles class="h-5 w-5 text-[#0D1E3D]" />
										<p class="text-[9px] font-semibold text-slate-700 dark:text-slate-200">Generar imagen desde cero con IA</p>
										<p class="text-[8px] text-muted-foreground">Se usará solo el prompt</p>
									</div>
								{/if}

								<!-- Prompt por slide -->
								<div class="mt-2 space-y-1">
									<div class="flex items-center justify-between">
										<label class="text-[9px] font-bold text-muted-foreground" for={`slide-prompt-${i}`}>Prompt de IA</label>
										<button
											type="button"
											class="text-[9px] font-semibold text-[#0D1E3D] hover:underline"
											onclick={() => autoFillSlidePrompt(i)}
										>Auto-generar</button>
									</div>
									<textarea
										id={`slide-prompt-${i}`}
										rows="2"
										placeholder={slideModo === 'crear'
											? 'Describe qué generar (obligatorio en modo crear)…'
											: 'Opcional: hereda el prompt general si lo dejas vacío…'}
										bind:value={draftPost.carouselImages[i].prompt}
										class="w-full rounded-md border border-slate-200 bg-background px-2 py-1.5 text-[10px] outline-none focus:border-[#0D1E3D] dark:border-slate-700"
									></textarea>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<!-- Uploader de imagen -->
					<div class="rounded-xl border border-dashed bg-card p-3 shadow-inner">
						<div class="flex items-center justify-end mb-2">
							<label class="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
								<input
									type="checkbox"
									checked={draftPost.modo === 'crear'}
									onchange={toggleSingleModo}
									class="rounded border-slate-200 text-[#0D1E3D] focus:ring-[#0D1E3D] dark:border-slate-700"
								/>
								<span>✨ Crear (sin ref)</span>
							</label>
						</div>

						{#if draftPost.modo === 'editar'}
							<label class="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center hover:bg-muted/60 transition">
								{#if draftPost.imagePreview}
									<img src={draftPost.imagePreview} alt="Preview" class="h-28 w-full rounded-md object-cover" />
								{:else}
									<UploadCloud class="h-6 w-6 text-muted-foreground animate-bounce" />
									<div class="space-y-0.5">
										<p class="text-[10px] font-semibold text-slate-700 dark:text-slate-200">Subir imagen desde PC</p>
										<p class="text-[8px] text-muted-foreground">Click o arrastra (JPG/PNG)</p>
									</div>
								{/if}
								<input bind:this={imageInput} type="file" accept="image/*" class="hidden" onchange={handleImageUpload} />
							</label>
						{:else}
							<div class="flex min-h-[140px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#0D1E3D]/40 bg-[#0D1E3D]/5 px-3 py-6 text-center">
								<Sparkles class="h-6 w-6 text-[#0D1E3D]" />
								<p class="text-[10px] font-semibold text-slate-700 dark:text-slate-200">Generar imagen desde cero con IA</p>
								<p class="text-[8px] text-muted-foreground">Se usará el prompt de la IA de abajo</p>
							</div>
						{/if}
					</div>

					{#if draftPost.modo === 'editar' && draftPost.imageName}
						<div class="flex items-center justify-between rounded-lg border bg-card p-2 text-[10px]">
							<span class="truncate font-semibold max-w-[150px]">{draftPost.imageName}</span>
							<button type="button" class="text-rose-500 hover:text-rose-600 p-0.5" onclick={clearImage}>
								<X class="h-3.5 w-3.5" />
							</button>
						</div>
					{/if}
				{/if}

					<!-- Detalles de Calendario -->
					<div class="border-t pt-3 space-y-3.5 text-xs">
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="text-[9px] font-bold text-slate-400 uppercase block mb-1">Fecha de Publicación</label>
								<input
									type="date"
									min={getTodayStr()}
									value={draftPost.date}
									onchange={(e) => handleDateChange(e.currentTarget.value)}
									class="w-full px-2 py-1.5 text-xs rounded-md border border-slate-200 bg-background text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:border-slate-800"
								/>
							</div>
							<div>
								<label class="text-[9px] font-bold text-slate-400 uppercase block mb-1">Hora de Publicación</label>
								<input 
									type="time" 
									bind:value={draftPost.time} 
									class="w-full px-2 py-1.5 text-xs rounded-md border border-slate-200 bg-background text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:border-slate-800" 
								/>
							</div>
						</div>
						<div>
							<span class="text-[9px] font-bold text-slate-400 uppercase">Día Programado</span>
							<p class="font-bold text-slate-800 dark:text-slate-200">
								{draftPost.date ? getDayNameFormatted(draftPost.date) : '-'}
							</p>
						</div>
						<div>
							<span class="text-[9px] font-bold text-slate-400 uppercase">Semana Programación</span>
							<p class="font-bold text-slate-800 dark:text-slate-200">{draftPost.week}</p>
						</div>
					</div>

					<!-- Configuración Manual de Estados en Meta (Checkboxes) -->
					<div class="border-t pt-3 space-y-2">
						<p class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Estados de Publicación</p>
						<label class="flex items-center gap-2 text-xs font-semibold cursor-pointer">
							<input type="checkbox" bind:checked={draftPost.designed} class="rounded border-slate-200" />
							<span>🎨 Diseñado (Manual Adobe)</span>
						</label>
						<label class="flex items-center gap-2 text-xs font-semibold cursor-pointer">
							<input type="checkbox" checked={draftPost.published} disabled class="rounded border-slate-200" />
							<span class:text-slate-400={!draftPost.published}>📤 Publicada en Meta (se actualiza al enviar)</span>
						</label>
						<label class="flex items-center gap-2 text-xs font-semibold cursor-pointer">
							<input type="checkbox" bind:checked={draftPost.promoted} class="rounded border-slate-200" />
							<span>🔥 Promocionada (Pauta)</span>
						</label>
					</div>
				</div>

				{#if isEditing}
					<Button 
						variant="outline" 
						class="w-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-950 dark:hover:bg-rose-950/20"
						onclick={() => deletePost(draftPost.id)}
					>
						<Trash2 class="h-4 w-4 mr-1.5" />
						Eliminar ficha
					</Button>
				{/if}
			</div>

			<!-- Columna Derecha: Configuración Técnica del Post y Gemini AI -->
			<div class="p-6 space-y-4">
				
<p class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1.5">Configuración e Instrucciones para la IA</p>

			<!-- Modo Carrusel (toggle independiente del formato) -->
			<label class="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
				<input
					type="checkbox"
					checked={isCarruselMode}
					onchange={toggleCarruselMode}
					class="rounded border-slate-200 text-[#0D1E3D] focus:ring-[#0D1E3D] dark:border-slate-700"
				/>
				<span>🖼️ Es carrusel (varias imágenes)</span>
			</label>

			<!-- Producto y Marca -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1">
						<label class="text-[10px] font-bold uppercase text-muted-foreground block mb-1" for="post-title">
							Tipo de contenido (Producto/Tópico)
						</label>
						<div class="flex gap-2">
							<input 
								id="post-title"
								type="text" 
								bind:value={draftPost.title} 
								class="h-9.5 flex-1 rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] font-semibold text-slate-800 dark:text-slate-100 min-w-0" 
								placeholder="ej: Toyama Ahoyadora TEA52X-200"
							/>
							<Button 
								type="button" 
								variant="outline" 
								class="h-9.5 text-xs font-semibold px-2.5 border-[#0D1E3D]/20 hover:bg-[#0D1E3D]/5 dark:border-blue-900/30 text-[#0D1E3D] dark:text-blue-400 gap-1.5 flex items-center shrink-0 cursor-pointer"
								onclick={openProductSelector}
							>
								<Package class="h-3.5 w-3.5" />
								<span class="hidden sm:inline">Catálogo</span>
							</Button>
						</div>
					</div>
					<div class="space-y-1">
						<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-cuenta-meta">
							Cuenta Meta (destino de publicación)
						</label>
						<select
							id="post-cuenta-meta"
							bind:value={draftPost.cuentaId}
							onchange={() => {
								// Al cambiar de cuenta, quitar de selectedNetworks las redes que la nueva cuenta no soporta
								const cta = cuentasMeta.find((c) => c.id === draftPost.cuentaId);
								if (cta && Array.isArray(cta.redes_activas)) {
									selectedNetworks = selectedNetworks.filter((nombre) => {
const red = catalogos.redes.find((r: RedSocial) => r.nombre === nombre);
										return red && cta.redes_activas.includes(red.id);
									});
									draftPost.network = selectedNetworks.join(', ');
								}
							}}
							class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] font-bold"
							disabled={cuentasMeta.length === 0}
						>
							{#if cuentasMeta.length === 0}
								<option value={null}>Sin cuentas conectadas — abrí Meta Hub → Conectar</option>
							{:else}
								{#each cuentasMeta as cta}
									<option value={cta.id}>{cta.nombre}{cta.redes_activas?.includes(2) ? ' (+IG)' : ''}</option>
								{/each}
							{/if}
						</select>
						{#if cuentasMeta.length === 0}
							<p class="text-[9px] text-amber-600 font-medium">
								Conectá una cuenta Meta en el sidebar para poder publicar.
							</p>
						{/if}
					</div>
					<div class="space-y-1">
						<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-brand">Marca (Dispara el System Prompt)</label>
						<select 
							id="post-brand"
							bind:value={draftPost.brand} 
							class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] font-bold"
						>
							{#each catalogos.marcas as marca}
								<option value={marca.nombre}>{marca.nombre}</option>
							{/each}
						</select>
					</div>
				</div>

<!-- Brand Assets (botón que abre selector amplio + resumen inline) -->
			<div class="space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/30">
				<div class="flex items-center justify-between">
					<label class="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
						Assets de Marca
						{#if marcaAssets.length > 0}
							<span class="text-muted-foreground font-medium normal-case">({selectedAssetIds.size}/{marcaAssets.length})</span>
						{/if}
					</label>
					<button
						type="button"
						onclick={() => { assetFilterType = 'todos'; assetPickerOpen = true; }}
						disabled={loadingAssets || marcaAssets.length === 0}
						class="inline-flex items-center gap-1.5 rounded-md border border-[#0D1E3D]/30 bg-[#0D1E3D]/5 px-2.5 py-1 text-[10px] font-bold text-[#0D1E3D] hover:bg-[#0D1E3D]/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
						title="Ver y seleccionar assets de marca"
					>
						<ImageIcon class="h-3.5 w-3.5" />
						{#if loadingAssets}
							Cargando...
						{:else if marcaAssets.length === 0}
							Sin assets
						{:else if selectedAssetIds.size === 0}
							Ver assets
						{:else}
							Editar selección
						{/if}
					</button>
				</div>

				{#if loadingAssets}
					<div class="text-[10px] text-muted-foreground animate-pulse">Cargando assets de marca...</div>
				{:else if marcaAssets.length === 0}
					<div class="text-[10px] text-muted-foreground italic">Esta marca no tiene assets cargados.</div>
				{:else if selectedAssetIds.size === 0}
					<div class="text-[10px] text-muted-foreground">Ningún asset seleccionado. La IA usará el system prompt de la marca.</div>
				{:else}
					<div class="flex flex-wrap gap-1.5">
						{#each marcaAssets as asset}
							{#if selectedAssetIds.has(asset.id)}
								<div class="flex items-center gap-1.5 px-1.5 py-1 rounded-md border border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20">
									<img src={asset.file_path} alt={asset.nombre} class="h-5 w-5 object-contain" />
									<span class="text-[9px] font-bold uppercase text-indigo-700 dark:text-indigo-300">{asset.tipo}</span>
									<button
										type="button"
										onclick={() => toggleAsset(asset.id)}
										class="text-muted-foreground hover:text-red-500 transition"
										title="Quitar de la selección"
									>
										<X class="h-3 w-3" />
									</button>
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>

				<!-- Contexto / Tópico central -->
				<div class="space-y-1">
					<div class="flex items-center justify-between">
						<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-context">Contexto para post (Tópico central)</label>
						<button
							type="button"
							onclick={openFichasSelector}
							class="inline-flex items-center gap-1.5 rounded-md border border-[#0D1E3D]/30 bg-[#0D1E3D]/5 px-2 py-1 text-[10px] font-bold text-[#0D1E3D] hover:bg-[#0D1E3D]/10 transition"
							title="Adjuntar especificaciones de una ficha técnica de esta marca"
						>
							<FileText class="h-3 w-3" />
							Adjuntar Ficha Técnica
						</button>
					</div>
					<textarea
						id="post-context"
						bind:value={draftPost.context}
						rows="3"
						class="w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] leading-relaxed font-sans resize-y"
						placeholder="ej: Especificaciones técnicas: Haga de su excavación algo fácil y rápido"
					></textarea>
				</div>

				<!-- Prompt para la IA (editable; se usa al generar la imagen) -->
				<div class="space-y-1">
					<div class="flex items-center justify-between">
						<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-prompt">Prompt para la IA (imagen)</label>
						<button
							type="button"
							onclick={fillDefaultPrompt}
							class="inline-flex items-center gap-1 rounded-md border border-[#0D1E3D]/30 bg-[#0D1E3D]/5 px-2 py-1 text-[10px] font-bold text-[#0D1E3D] hover:bg-[#0D1E3D]/10 transition"
							title="Rellenar con el system prompt de la marca + contexto + objetivo"
						>
							<Sparkles class="h-3 w-3" />
							Auto-generar
						</button>
					</div>
					<textarea
						id="post-prompt"
						bind:value={draftPost.prompt}
						rows="4"
						class="w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] leading-relaxed font-sans resize-y"
						placeholder="Pulsa «Auto-generar» para partir del system prompt de la marca, o escribe aquí tus indicaciones específicas (fondo, composición, ángulos, etc.)."
					></textarea>
					<p class="text-[9px] text-muted-foreground">Si lo dejas vacío, se usará el system prompt de la marca por defecto.</p>
				</div>

				<!-- Prompt de Copy (override opcional del manual para el texto) -->
				<div class="space-y-1">
					<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-prompt-copy">Prompt de Copy (opcional)</label>
					<textarea
						id="post-prompt-copy"
						bind:value={draftPost.promptCopy}
						rows="3"
						class="w-full rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-[#0D1E3D] leading-relaxed font-sans resize-y"
						placeholder="Indicaciones específicas para el copy (tono más humorístico, evitar hashtags, longitud, etc.). Vacío = usa el manual de marca."
					></textarea>
					<p class="text-[9px] text-muted-foreground">Sobreescribe el manual de marca solo para el texto de esta publicación.</p>
				</div>

<!-- Redes Sociales de Destino -->
			<div class="space-y-1.5">
				<label class="text-[10px] font-bold uppercase text-muted-foreground block">Redes Sociales de Destino</label>
				<div class="flex flex-wrap gap-2">
					{#each catalogos.redes as red}
						{@const redesActivasCuenta = (draftPost.cuentaId != null)
							? (cuentasMeta.find((c) => c.id === draftPost.cuentaId)?.redes_activas ?? null)
							: null}
						{@const redHabilitada = redesActivasCuenta == null ? true : redesActivasCuenta.includes(red.id)}
						<button 
							type="button"
							onclick={() => redHabilitada && toggleNetwork(red.nombre)}
							disabled={!redHabilitada}
							class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
								${redHabilitada ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}
								${selectedNetworks.includes(red.nombre) 
									? 'bg-[#0D1E3D]/10 border-[#0D1E3D] text-[#0D1E3D] dark:bg-blue-950/40 dark:text-blue-400 font-bold' 
									: 'bg-background hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 text-slate-600 dark:text-slate-400'}`}
							title={redHabilitada ? red.nombre : `${red.nombre} no está habilitada para esta cuenta`}
						>
							<span>{red.nombre}</span>
						</button>
					{/each}
				</div>
				{#if draftPost.cuentaId != null && cuentasMeta.find((c) => c.id === draftPost.cuentaId)?.redes_activas?.length === 0}
					<p class="text-[9px] text-amber-600 dark:text-amber-400">Esta cuenta no tiene redes habilitadas. Conéctalas desde el panel de cuentas Meta.</p>
				{/if}
			</div>

<!-- Relación de Aspecto, Público y Presupuesto -->
			<div class="grid gap-4 sm:grid-cols-3">
				<div class="space-y-1">
					<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-format">Relación de Aspecto</label>
					<select
						id="post-format"
						bind:value={draftPost.format}
						class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D]"
					>
						{#each catalogos.formatos as formato}
							<option value={formato.nombre}>{formato.nombre}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-1">
					<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-audience">Público Objetivo</label>
					<select
						id="post-audience"
						bind:value={draftPost.audience}
						class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D]"
					>
						{#each catalogos.audiencias as audiencia}
							<option value={audiencia.nombre}>{audiencia.nombre}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-1">
					<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-budget">Presupuesto de pauta (¢)</label>
					<input
						id="post-budget"
						type="number"
						bind:value={draftPost.budget}
						class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] text-right font-mono"
					/>
				</div>
			</div>

				<!-- CTA y KPI -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1">
						<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-cta">Llamado a la acción (CTA)</label>
						<input 
							id="post-cta"
							type="text" 
							bind:value={draftPost.cta} 
							class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D]" 
							placeholder="ej: Cotizar ahora"
						/>
					</div>
					<div class="space-y-1">
						<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-objective">Objetivo</label>
						<input 
							id="post-objective"
							type="text" 
							bind:value={draftPost.objective} 
							class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D]" 
							placeholder="ej: Conversaciones iniciadas"
						/>
					</div>
				</div>

				<!-- Vigencia en Meta -->
				<div class="space-y-2 border-t pt-4">
					<p class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Vigencia / Programación en Meta</p>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-1">
							<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-meta-start-date">Fecha de Inicio</label>
							<input 
								id="post-meta-start-date"
								type="date" 
								bind:value={draftPost.metaStartDate} 
								class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] text-slate-800 dark:text-slate-100" 
							/>
						</div>
						<div class="space-y-1">
							<label class="text-[10px] font-bold uppercase text-muted-foreground" for="post-meta-end-date">Fecha de Finalización</label>
							<input 
								id="post-meta-end-date"
								type="date" 
								bind:value={draftPost.metaEndDate} 
								class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] text-slate-800 dark:text-slate-100" 
							/>
						</div>
					</div>
				</div>

				<!-- Botones Finales de Guardado -->
				<div class="flex justify-end gap-2.5 pt-6 border-t">
					<Button variant="outline" onclick={requestCloseModal}>Cancelar</Button>
					<Button class="bg-[#0D1E3D] hover:bg-[#0D1E3D]/90 text-white font-bold cursor-pointer" onclick={savePost}>Guardar Ficha</Button>
				</div>

			</div>


			<!-- Submodal: Seleccionar Ficha Técnica (Dentro del Dialog.Content para capturar puntero) -->
			{#if showFichasSelectorModal}
				<div 
					class="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 pointer-events-auto"
					onclick={(e) => { e.stopPropagation(); }}
				>
					<div 
						class="w-full max-w-xl rounded-xl border bg-background p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col pointer-events-auto"
						onclick={(e) => e.stopPropagation()}
					>
						<div class="flex items-center justify-between border-b pb-3">
							<div class="flex items-center gap-2">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D1E3D] text-white">
									<FileText class="h-4 w-4" />
								</div>
								<div>
									<h3 class="text-sm font-bold">Seleccionar Ficha Técnica</h3>
									<p class="text-[11px] text-muted-foreground">Marca actual: <strong class="text-[#0D1E3D]">{draftPost.brand}</strong></p>
								</div>
							</div>
							<button
								type="button"
								onclick={(e) => { e.stopPropagation(); showFichasSelectorModal = false; }}
								class="rounded-md p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
							>
								<X class="h-4.5 w-4.5" />
							</button>
						</div>

						<div class="flex-1 overflow-y-auto space-y-3 pr-1">
							{#if loadingFichasSelector}
								<div class="flex flex-col items-center justify-center py-10 gap-2">
									<RefreshCw class="h-6 w-6 animate-spin text-[#0D1E3D]" />
									<p class="text-xs text-muted-foreground">Cargando fichas de la marca...</p>
								</div>
							{:else if fichasDisponibles.length === 0}
								<div class="flex flex-col items-center justify-center py-10 gap-2 text-center border rounded-lg bg-muted/20 p-4">
									<FileText class="h-8 w-8 text-muted-foreground/50" />
									<p class="text-xs font-semibold">No hay fichas técnicas registradas para {draftPost.brand}</p>
									<p class="text-[11px] text-muted-foreground">Puedes crear nuevas fichas técnicas desde la pestaña «Fichas Técnicas» en el menú principal.</p>
								</div>
							{:else}
								<div class="grid grid-cols-1 gap-2.5">
									{#each fichasDisponibles as ficha}
										<div class="flex flex-col gap-2 p-3 border rounded-lg hover:border-[#0D1E3D]/50 bg-card transition">
											<div class="flex items-center justify-between">
												<h4 class="font-bold text-xs text-foreground">{ficha.nombre_producto}</h4>
												<button
													type="button"
													onclick={(e) => { e.stopPropagation(); attachFichaToContext(ficha); }}
													class="inline-flex items-center gap-1 rounded-md bg-[#0D1E3D] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-[#0A1730] transition cursor-pointer"
												>
													<Plus class="h-3 w-3" />
													<span>Adjuntar al Contexto</span>
												</button>
											</div>
											{#if ficha.descripcion}
												<p class="text-[11px] text-muted-foreground line-clamp-1">{ficha.descripcion}</p>
											{/if}
											<div class="bg-muted/40 p-2 rounded text-[10px] font-mono line-clamp-3 text-muted-foreground border">
												{ficha.especificaciones_texto}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<div class="flex items-center justify-end border-t pt-3">
							<button
								type="button"
								onclick={(e) => { e.stopPropagation(); showFichasSelectorModal = false; }}
								class="rounded-md border px-4 py-1.5 text-xs font-medium hover:bg-muted cursor-pointer"
							>
								Cerrar
							</button>
						</div>
					</div>
				</div>
			{/if}

		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Modal Dialog del Selector de Productos -->
<Dialog.Root bind:open={productSelectorOpen}>
	<Dialog.Content class="max-w-5xl w-[95vw] max-h-[85vh] flex flex-col border bg-background p-0 shadow-lg text-foreground rounded-xl overflow-hidden">
		<!-- Cabecera -->
		<div class="flex items-center justify-between border-b p-5 bg-muted/40 shrink-0">
			<div>
				<Dialog.Title class="text-base font-bold flex items-center gap-2">
					<Package class="h-5 w-5 text-[#0D1E3D] dark:text-blue-400" />
					Catálogo de Productos e Inventario
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground mt-0.5">
					Selecciona un producto del catálogo para cargar automáticamente su marca, nombre y especificaciones.
				</Dialog.Description>
			</div>
		</div>

		<!-- Buscador y Filtros -->
		<div class="p-5 border-b bg-card flex flex-col sm:flex-row gap-3 flex-wrap shrink-0">
			<div class="relative flex-1 min-w-[220px]">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<input
					type="text"
					placeholder="Buscar por nombre, SKU, marca o categoría..."
					bind:value={productSearchQuery}
					oninput={dispararBusquedaConDebounce}
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); cargarProductos(); } }}
					class="pl-9 h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] text-slate-800 dark:text-slate-100"
				/>
				{#if productSearchQuery}
					<button
						type="button"
						class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
						onclick={() => { productSearchQuery = ''; cargarProductos(); }}
					>
						Limpiar
					</button>
				{/if}
			</div>

			<div class="w-full sm:w-44 shrink-0">
				<select
					bind:value={productBrandFilter}
					onchange={cargarProductos}
					class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
				>
					<option value="Todas">Todas las marcas</option>
					{#each marcasExactus as m}
						<option value={m}>{m}</option>
					{/each}
				</select>
			</div>

			<div class="w-full sm:w-48 shrink-0">
				<select
					bind:value={productCategoryFilter}
					onchange={cargarProductos}
					class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
				>
					<option value="Todas">Todas las categorías</option>
					{#each categoriasExactus as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>

			<div class="w-full sm:w-44 shrink-0">
				<select
					bind:value={productSortOrder}
					onchange={cargarProductos}
					class="h-9.5 w-full rounded-md border bg-background px-3 text-xs outline-none focus:border-[#0D1E3D] font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
				>
					<option value="none">Orden por defecto</option>
					<option value="highest">Mayor disponibilidad</option>
					<option value="lowest">Menor disponibilidad</option>
				</select>
			</div>

			<Button
				variant="outline"
				size="sm"
				class="gap-1.5 shrink-0 cursor-pointer"
				onclick={cargarProductos}
				disabled={cargandoProductos}
				title="Volver a cargar el catálogo"
			>
				<RefreshCw class="h-3.5 w-3.5" />
				Actualizar
			</Button>
		</div>

		<!-- Aviso: bodegas no seleccionadas / sin VPN -->
		{#if seleccionIncompleta || errorProductos}
			<div class="px-5 py-2.5 border-b bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-2 shrink-0">
				<Warehouse class="h-4 w-4 shrink-0" />
				<span>
					{#if errorProductos}
						{errorProductos}
					{:else}
						No hay bodegas seleccionadas para Creador de Contenido. Ve a la pestaña <strong>Bodegas</strong> para elegir al menos una (requiere VPN activo a Exactus).
					{/if}
				</span>
			</div>
		{/if}

		<!-- Listado de Productos -->
		<div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
			{#if cargandoProductos && productos.length === 0}
				<div class="flex justify-center py-12">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D1E3D]"></div>
				</div>
			{:else if productos.length === 0}
				<div class="text-center py-10 text-muted-foreground text-xs">
					<Package class="h-8 w-8 mx-auto mb-2 opacity-40" />
					No se encontraron productos con los filtros seleccionados.
					{#if !seleccionIncompleta}
						<div class="text-[10px] mt-1">Verifica que estés conectado al VPN y que haya stock en las bodegas seleccionadas.</div>
					{/if}
				</div>
			{:else}
				<div class="text-[10px] text-muted-foreground px-1">
					{productos.length} producto(s) con stock en las bodegas seleccionadas. Haz clic en la flecha para ver el desglose por bodega.
				</div>
				<div class="grid gap-2">
					{#each productos as product (product.codigo)}
						<div class="rounded-lg border bg-card border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-xs">
							<!-- Fila principal -->
							<div class="flex items-stretch">
								<!-- Área seleccionable (clic principal) -->
								<button
									type="button"
									class="flex-1 text-left p-3.5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer"
									onclick={() => selectProduct(product)}
								>
									<div class="space-y-1 flex-1 min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<span class="font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#0D1E3D] dark:group-hover:text-blue-400 transition-colors text-xs">
												{product.descripcion || product.codigo}
											</span>
											<span class="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 font-mono">
												{product.codigo}
											</span>
											{#if product.marca}
												<span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
													{product.marca}
												</span>
											{/if}
											{#if product.categoria}
												<span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
													{product.categoria}
												</span>
											{/if}
										</div>
									</div>

									<!-- Stock total + acción seleccionar -->
									<div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
										<div class="text-right flex flex-col items-start sm:items-end">
											<span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Disponibilidad</span>
											<div class="flex items-center gap-1.5 mt-0.5">
												<span class={`h-2 w-2 rounded-full ${product.stock_total > 20 ? 'bg-emerald-500' : product.stock_total > 5 ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
												<span class={`text-[11px] font-bold ${product.stock_total > 20 ? 'text-emerald-600 dark:text-emerald-400' : product.stock_total > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
													{product.stock_total} uds
												</span>
												<span class="text-[9px] text-muted-foreground">· {product.bodegas_con_stock} bod.</span>
											</div>
										</div>
										<div class="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-[#0D1E3D] group-hover:text-white group-hover:border-[#0D1E3D] dark:group-hover:bg-blue-600 dark:group-hover:border-blue-600 transition-all shadow-xs" title="Seleccionar producto">
											<Check class="h-4 w-4" />
										</div>
									</div>
								</button>

								<!-- Separador + botón expandir -->
								<div class="w-9 shrink-0 border-l border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-muted/50 transition cursor-pointer" title="Ver stock por bodega">
									<button
										type="button"
										class="h-full w-full flex items-center justify-center text-slate-500 hover:text-[#0D1E3D] dark:hover:text-blue-400"
										onclick={() => toggleExpandirProducto(product.codigo)}
										aria-label="Ver desglose por bodega"
									>
										<ChevronDown class={`h-4 w-4 transition-transform ${productoExpandido === product.codigo ? 'rotate-180' : ''}`} />
									</button>
								</div>
							</div>

							<!-- Desglose por bodega (expandible) -->
							{#if productoExpandido === product.codigo}
								<div class="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3">
									{#if cargandoDistribucion.has(product.codigo) && !distribucionPorCodigo[product.codigo]}
										<div class="flex items-center gap-2 text-[11px] text-muted-foreground">
											<span class="animate-spin inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full"></span>
											Cargando detalle por bodega...
										</div>
									{:else if distribucionPorCodigo[product.codigo]}
										{@const sel = distribucionPorCodigo[product.codigo].filter((d) => d.seleccionada)}
										{@const otras = distribucionPorCodigo[product.codigo].filter((d) => !d.seleccionada)}
										<div class="space-y-1.5">
											<div class="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
												<Warehouse class="h-3.5 w-3.5" />
												Bodegas seleccionadas
											</div>
											{#if sel.length === 0}
												<div class="text-[11px] text-muted-foreground italic">
													Este producto no tiene stock en ninguna bodega seleccionada.
												</div>
											{:else}
												<div class="grid sm:grid-cols-2 gap-1.5">
													{#each sel as d (d.bodega_codigo)}
														<div class="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-green-200 dark:border-green-900/40 rounded px-2.5 py-1.5">
															<div class="min-w-0">
																<div class="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">{d.bodega_nombre}</div>
																<div class="text-[9px] text-muted-foreground font-mono">{d.bodega_codigo}{#if d.u_zona} · {d.u_zona}{/if}</div>
															</div>
															<div class="text-right shrink-0">
																<div class="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">{d.cant_disponible} uds</div>
															</div>
														</div>
													{/each}
												</div>
												<div class="flex items-center justify-between border-t pt-1.5 mt-1 text-[11px]">
													<span class="text-muted-foreground">Total seleccionadas</span>
													<span class="font-bold text-slate-800 dark:text-slate-100">{sel.reduce((s, d) => s + d.cant_disponible, 0)} uds</span>
												</div>
											{/if}

											{#if otras.length > 0}
												<details class="mt-2">
													<summary class="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
														Otras bodegas con stock ({otras.length}) — no incluidas en el catálogo
													</summary>
													<div class="grid sm:grid-cols-2 gap-1.5 mt-1.5">
														{#each otras as d (d.bodega_codigo)}
															<div class="flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 opacity-70">
																<div class="min-w-0">
																	<div class="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{d.bodega_nombre}</div>
																	<div class="text-[9px] text-muted-foreground font-mono">{d.bodega_codigo}</div>
																</div>
																<div class="text-[12px] font-semibold text-slate-600 dark:text-slate-300">{d.cant_disponible} uds</div>
															</div>
														{/each}
													</div>
												</details>
											{/if}
										</div>
									{:else}
										<div class="text-[11px] text-muted-foreground italic">No hay detalle disponible.</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex justify-end p-4 border-t bg-muted/20 gap-2.5 shrink-0">
			<Button variant="outline" class="text-xs" onclick={() => productSelectorOpen = false}>
				Cerrar Catálogo
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Modal selector de Assets de Marca -->
<Dialog.Root bind:open={assetPickerOpen}>
	<Dialog.Content class="max-w-3xl border bg-background p-0 shadow-lg text-foreground rounded-xl overflow-hidden">
		<!-- Cabecera -->
		<div class="flex items-center justify-between border-b p-5 bg-muted/40">
			<div>
				<Dialog.Title class="text-base font-bold flex items-center gap-2">
					<ImageIcon class="h-5 w-5 text-[#0D1E3D] dark:text-blue-400" />
					Assets de Marca
					{#if selectedAssetIds.size > 0}
						<span class="ml-1 inline-flex items-center rounded-full bg-[#0D1E3D]/10 text-[#0D1E3D] dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
							{selectedAssetIds.size} seleccionado(s)
						</span>
					{/if}
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground mt-0.5">
					Selecciona los assets que la IA debe usar como referencia visual para esta publicación.
				</Dialog.Description>
			</div>
		</div>

		<!-- Filtro por tipo -->
		{#if marcaAssets.length > 0}
			<div class="flex flex-wrap gap-1.5 p-3 border-b bg-card">
				{#each ['todos', 'logo', 'isotipo', 'sello', 'fondo', 'other'] as tipo}
					{@const active = assetFilterType === tipo}
					{@const count = tipo === 'todos' ? marcaAssets.length : marcaAssets.filter((a) => a.tipo === tipo).length}
					{#if count > 0 || tipo === 'todos'}
						<button
							type="button"
							onclick={() => assetFilterType = tipo as typeof assetFilterType}
							class={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${active ? 'bg-[#0D1E3D] text-white dark:bg-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
						>
							{tipo === 'todos' ? 'Todos' : tipo}
							<span class={`rounded-full px-1 text-[9px] ${active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>{count}</span>
						</button>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Grid de assets -->
		<div class="max-h-[60vh] overflow-y-auto p-4">
			{#if loadingAssets}
				<div class="flex justify-center py-12">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D1E3D]"></div>
				</div>
			{:else if marcaAssets.length === 0}
				<div class="text-center py-10 text-muted-foreground text-xs">
					<ImageIcon class="h-8 w-8 mx-auto mb-2 opacity-40" />
					Esta marca no tiene assets cargados.
				</div>
			{:else}
				{@const visible = assetFilterType === 'todos' ? marcaAssets : marcaAssets.filter((a) => a.tipo === assetFilterType)}
				{#if visible.length === 0}
					<div class="text-center py-10 text-muted-foreground text-xs">
						No hay assets de tipo “{assetFilterType}”.
					</div>
				{:else}
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
						{#each visible as asset (asset.id)}
							{@const selected = selectedAssetIds.has(asset.id)}
							<button
								type="button"
								onclick={() => toggleAsset(asset.id)}
								class={`group relative flex flex-col rounded-lg border overflow-hidden transition-all text-left ${selected ? 'border-[#0D1E3D] ring-2 ring-[#0D1E3D]/30 dark:border-blue-500 dark:ring-blue-500/30 bg-indigo-50/50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-800 bg-card hover:border-[#0D1E3D]/40 dark:hover:border-blue-500/40 hover:shadow-xs'}`}
							>
								<!-- Preview -->
								<div class="aspect-square bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800">
									<img src={asset.file_path} alt={asset.nombre} class="h-full w-full object-contain p-2" loading="lazy" />
								</div>
								<!-- Badge selección -->
								{#if selected}
									<div class="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-[#0D1E3D] dark:bg-blue-600 flex items-center justify-center shadow-sm">
										<Check class="h-3.5 w-3.5 text-white" />
									</div>
								{/if}
								<!-- Badge tipo -->
								<div class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-black/60 text-white backdrop-blur-sm">
									{asset.tipo}
								</div>
								<!-- Info -->
								<div class="p-2 flex-1 min-w-0">
									<div class="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate" title={asset.nombre}>{asset.nombre}</div>
									<div class="text-[9px] text-muted-foreground truncate font-mono">
										{#if asset.file_size}
											{(asset.file_size / 1024).toFixed(0)} KB
										{/if}
										{#if asset.mime_type}
											{#if asset.file_size}· {/if}{asset.mime_type.split('/')[1]?.toUpperCase()}
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-between p-4 border-t bg-muted/20 gap-2.5">
			<div class="text-[10px] text-muted-foreground">
				{#if selectedAssetIds.size > 0}
					<span class="font-bold text-slate-700 dark:text-slate-300">{selectedAssetIds.size}</span> asset(s) seleccionado(s) para esta publicación
				{:else}
					Ningún asset seleccionado — la IA usará el system prompt de la marca
				{/if}
			</div>
			<Button class="text-xs gap-1.5" onclick={() => assetPickerOpen = false}>
				<Check class="h-3.5 w-3.5" />
				Listo
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
