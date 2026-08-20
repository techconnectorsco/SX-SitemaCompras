<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { 
		CheckCircle, 
		XCircle, 
		MessageSquare, 
		Eye, 
		Calendar, 
		Clock, 
		ArrowRight, 
		FileText,
		Sparkles,
		Download,
		UploadCloud,
		Send,
		UserCheck,
		RefreshCw,
		ChevronLeft,
		ChevronRight,
		Save,
		Image as ImageIcon,
		Trash2
	} from 'lucide-svelte';
	import type { MarcaAsset } from '$lib/features/content-creator/types';
	import {
		MAX_COPY_PROMPT_LENGTH,
		type CopyQualityWarning
	} from '$lib/features/content-creator/copy-generation';

	interface ExcelPost {
		id: string;
		title: string;
		format: string;
		context: string;
		objective: string;
		audience: string;
		budget: number;
		network: string;
		designed: boolean;
		published: boolean;
		promoted: boolean;
		copy: string;
		week: string;
		links: string;
		kpi: string;
		cta: string;
		references: string;
		trend: string;
		date: string;
		imagePreview: string | null;
		imageName?: string;
		imageBase64?: string;
		
		brand?: string;
		status?: 'Borrador' | 'En revisión' | 'Guardado' | 'Aprobado' | 'Publicado' | 'Error API';
		ecommerceImage?: boolean;
		ecommerceUrl?: string;
		sellerEmail?: string;
		sellerPhone?: string;
		templateId?: string;

		carouselImages?: Array<{
			imagePreview: string | null;
			imageName: string;
			imageBase64: string;
			prompt?: string;
			modo?: 'editar' | 'crear';
		}>;
		prompt?: string;
		promptCopy?: string;
		esCarrusel?: boolean;
	}

	// Props Svelte 5
	let { posts = $bindable(), catalogos } = $props<{ posts: ExcelPost[], catalogos: any }>();

	// Filtros de la lista
	let filterStatus = $state<'Todos' | 'Borrador' | 'En revisión' | 'Guardado' | 'Aprobado' | 'Publicado' | 'Error API'>('Borrador');
	let filterBrand = $state<string>('Todas');
	let filterMonth = $state<string>('Todos');
	let filterYear = $state<string>('Todos');

	// Clases de color (borde + fondo suave + texto) para celdas y bloques de estado
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

	// Clases de color (relleno sólido) para pastillas de lista y leyenda
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

	// Color de texto del estado (para el bloque "Estado Actual" del panel de detalle)
	function getStatusTextColor(status?: string): string {
		switch (status) {
			case 'Publicado':   return 'text-green-600';
			case 'Aprobado':    return 'text-indigo-600';
			case 'En revisión': return 'text-amber-500 animate-pulse';
			case 'Guardado':    return 'text-sky-600';
			case 'Error API':   return 'text-rose-600';
			default:            return 'text-slate-500';
		}
	}

	// Texto descriptor del estado del flujo
	function getStatusLabel(status?: string): string {
		switch (status) {
			case 'Publicado':   return '✓ Publicado en Meta';
			case 'Aprobado':    return '✓ Aprobado y Programado';
			case 'En revisión': return '⏳ Pendiente de Aprobación';
			case 'Guardado':    return '💾 Guardado (Aprobación Desactivada)';
			case 'Error API':   return '⚠️ Error de publicación';
			default:            return '⚙️ Borrador Local';
		}
	}
	
	// ID de pieza seleccionada
	let selectedPostId = $state<string | null>(null);

	// Estados de Carga Simulada
	let nanoBananaGenerating = $state(false);
	let downloadingImage = $state(false);
	let finalizingPost = $state(false);
	let savingPost = $state(false);
	let deletingPost = $state(false);

	// Estado del autoguardado silencioso del copy (no cambia el estado de la publicación)
	let copySaveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let copySaveTimer: ReturnType<typeof setTimeout> | null = null;
	let viewerState = $state<{ images: Array<{ preview: string; name: string }>; index: number } | null>(null);
	let promptDialog = $state<{ open: boolean; customPrompt: string }>({ open: false, customPrompt: '' });
	let lastCustomPrompts = $state<Record<string, string>>({});

	// Slide del carrusel destino cuando se regenera un único slide (null = todo el post)
	let regeneratingSlideIndex = $state<number | null>(null);

	let assetSelectorDialog = $state<{
		open: boolean;
		marcaId: number | null;
		assets: MarcaAsset[];
		selectedIds: Set<number>;
		loading: boolean;
	} | null>(null);

	async function loadLastPrompt(post: ExcelPost, tipo: 'imagen' | 'copy' = 'imagen') {
		try {
			const numericId = post.id.replace('MER-', '');
			if (!/^\d+$/.test(numericId)) return;
			const res = await fetch(`/api/content-creator/publicaciones/${numericId}/ultimo-prompt?tipo=${tipo}`);
			if (!res.ok) return;
			const data = await res.json();
			if (data?.success && data.prompt) {
				lastCustomPrompts = { ...lastCustomPrompts, [post.id]: data.prompt };
			}
		} catch (e) {
			console.warn('[ultimo-prompt] no se pudo recuperar el último prompt usado', e);
		}
	}

	async function openRegenerationFlow(slideIndex?: number) {
		if (!selectedPost) return;
		regeneratingSlideIndex = (typeof slideIndex === 'number' && !Number.isNaN(slideIndex)) ? slideIndex : null;
		await loadLastPrompt(selectedPost);

		// Prompt por defecto: el del slide (si estamos regenerando uno), si no el último usado, si no el del post
		let basePrompt = buildPromptPreview(selectedPost);
		if (slideIndex !== undefined && selectedPost.carouselImages?.[slideIndex]?.prompt?.trim()) {
			basePrompt = selectedPost.carouselImages[slideIndex].prompt;
		}

		const marca = catalogos?.marcas?.find((m: any) => m.nombre === selectedPost?.brand);
		if (!marca?.id) {
			promptDialog = { open: true, customPrompt: basePrompt };
			return;
		}

		assetSelectorDialog = {
			open: true,
			marcaId: marca.id,
			assets: [],
			selectedIds: new Set(),
			loading: true
		};

		try {
			const res = await fetch(`/api/content-creator/marcas/${marca.id}/assets`);
			const data = await res.json();
			if (data.assets && data.assets.length > 0) {
				assetSelectorDialog = { ...assetSelectorDialog!, assets: data.assets, loading: false };
			} else {
				// No assets, skip straight to prompt dialog
				assetSelectorDialog = null;
				promptDialog = { open: true, customPrompt: basePrompt };
			}
		} catch (e) {
			assetSelectorDialog = null;
			promptDialog = { open: true, customPrompt: basePrompt };
		}
	}

	function confirmAssetSelection() {
		if (!assetSelectorDialog) return;
		promptDialog = { open: true, customPrompt: buildPromptPreview(selectedPost as ExcelPost) };
	}
	
	function skipAssetSelection() {
		if (!assetSelectorDialog) return;
		assetSelectorDialog.selectedIds = new Set();
		promptDialog = { open: true, customPrompt: buildPromptPreview(selectedPost as ExcelPost) };
	}

	function toggleAsset(id: number) {
		if (!assetSelectorDialog) return;
		if (assetSelectorDialog.selectedIds.has(id)) {
			assetSelectorDialog.selectedIds.delete(id);
		} else {
			assetSelectorDialog.selectedIds.add(id);
		}
		assetSelectorDialog.selectedIds = new Set(assetSelectorDialog.selectedIds);
	}

	let finalDesignInput = $state<HTMLInputElement | null>(null);

	let geminiGeneratingReview = $state(false);

	// --- Modal de generación de Copy (override puntual del prompt) ---
	let copyPromptDialog = $state<{ open: boolean; customPrompt: string; postId: string | null }>({ open: false, customPrompt: '', postId: null });

	function openCopyPromptDialog(post: ExcelPost) {
		if (!post.title.trim()) {
			toast.error('Falta el Tipo de contenido (nombre del producto) para generar el copy.');
			return;
		}
		const numericId = post.id.replace('MER-', '');
		if (!/^\d+$/.test(numericId) || Number(numericId) <= 0) {
			toast.error('La publicación no tiene un ID válido para generar el copy.');
			return;
		}
		// El manual y el prompt de sistema se agregan automáticamente en el servidor.
		// Este campo contiene exclusivamente instrucciones adicionales para la publicación.
		const seed = post.promptCopy?.trim() || '';
		copyPromptDialog = { open: true, customPrompt: seed, postId: post.id };
	}

	function resetCopyPrompt() {
		copyPromptDialog.customPrompt = '';
	}

	async function confirmGenerateCopy() {
		if (!copyPromptDialog.postId) return;
		const post = posts.find((p) => p.id === copyPromptDialog.postId);
		if (!post) return;
		if (!post.title.trim()) {
			toast.error('Falta el Tipo de contenido (nombre del producto) para generar el copy.');
			return;
		}
		if (copyPromptDialog.customPrompt.length > MAX_COPY_PROMPT_LENGTH) {
			toast.error(`Las instrucciones no pueden superar ${MAX_COPY_PROMPT_LENGTH.toLocaleString('es')} caracteres.`);
			return;
		}

		// null elimina el override persistido: el servidor usará sólo marca, manuales y datos del post.
		const trimmed = copyPromptDialog.customPrompt.trim();
		const overrideToSend = trimmed.length > 0 ? trimmed : null;
		const numericId = post.id.replace('MER-', '');
		if (!/^\d+$/.test(numericId) || Number(numericId) <= 0) {
			toast.error('La publicación no tiene un ID válido para generar el copy.');
			return;
		}

		geminiGeneratingReview = true;
		try {
			const response = await fetch(`/api/content-creator/publicaciones/${numericId}/generar-copy`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: overrideToSend })
			});
			const data = await response.json().catch(() => null);

			if (!response.ok || !data?.success || typeof data.copy !== 'string' || !data.copy.trim()) {
				toast.error(data?.error || 'Error al generar copy.');
				return;
			}

			posts = posts.map(p => p.id === post.id
				? { ...p, copy: data.copy.trim(), promptCopy: overrideToSend ?? '' }
				: p);
			copyPromptDialog = { open: false, customPrompt: '', postId: null };
			toast.success('Copy generado con éxito.');

			const warnings = Array.isArray(data.warnings) ? data.warnings as CopyQualityWarning[] : [];
			if (warnings.length > 0) {
				toast.warning('Revisa el copy generado', {
					description: warnings.map((warning) => warning.message).join(' ')
				});
			}
		} catch (error) {
			console.error(error);
			toast.error('Error de red al generar copy.');
		} finally {
			geminiGeneratingReview = false;
		}
	}

	// Marcas para el filtro
	const brands = $derived(['Todas', ...catalogos.marcas.map((m: any) => m.nombre)]);

	const MESES = [
		{ value: 'Todos', label: 'Todos los meses' },
		{ value: '01', label: 'Enero' },
		{ value: '02', label: 'Febrero' },
		{ value: '03', label: 'Marzo' },
		{ value: '04', label: 'Abril' },
		{ value: '05', label: 'Mayo' },
		{ value: '06', label: 'Junio' },
		{ value: '07', label: 'Julio' },
		{ value: '08', label: 'Agosto' },
		{ value: '09', label: 'Septiembre' },
		{ value: '10', label: 'Octubre' },
		{ value: '11', label: 'Noviembre' },
		{ value: '12', label: 'Diciembre' }
	];

	const availableYears = $derived.by(() => {
		const set = new Set<string>();
		for (const p of posts) {
			if (p.date && p.date.includes('-')) {
				const year = p.date.split('-')[0];
				if (year && year.length === 4) set.add(year);
			}
		}
		const currentYear = new Date().getFullYear().toString();
		set.add(currentYear);
		return ['Todos', ...Array.from(set).sort((a, b) => b.localeCompare(a))];
	});

	// Filtrar posts reactivamente
	const filteredPosts = $derived.by(() => {
		return posts.filter(p => {
			const matchesStatus = filterStatus === 'Todos' || p.status === filterStatus;
			const matchesBrand = filterBrand === 'Todas' || p.brand === filterBrand;

			let matchesDate = true;
			if (p.date && p.date.includes('-')) {
				const [year, month] = p.date.split('-');
				if (filterYear !== 'Todos' && year !== filterYear) {
					matchesDate = false;
				}
				if (filterMonth !== 'Todos' && month !== filterMonth) {
					matchesDate = false;
				}
			} else if (filterMonth !== 'Todos' || filterYear !== 'Todos') {
				matchesDate = false;
			}

			return matchesStatus && matchesBrand && matchesDate;
		}).sort((a, b) => {
			const idA = parseInt(a.id.replace(/\D/g, '')) || 0;
			const idB = parseInt(b.id.replace(/\D/g, '')) || 0;
			return idB - idA;
		});
	});

	// Obtener el post seleccionado
	const selectedPost = $derived.by(() => {
		if (selectedPostId) {
			const found = filteredPosts.find(p => p.id === selectedPostId);
			if (found) return found;
		}
		return filteredPosts[0] || null;
	});

	// Variables derivadas seguras para el carrusel (evita errores de compilador Svelte 5 en el DOM)
	const isCarousel = $derived(selectedPost
		? (selectedPost.esCarrusel !== undefined
			? !!selectedPost.esCarrusel
			: (Array.isArray(selectedPost.carouselImages) && selectedPost.carouselImages.length > 0))
		: false);
	const hasCarouselImages = $derived(isCarousel && selectedPost && Array.isArray(selectedPost.carouselImages) && selectedPost.carouselImages.length > 0);
	const activeCarouselImages = $derived(hasCarouselImages && selectedPost?.carouselImages ? selectedPost.carouselImages : []);

	// Publicación bloqueada para edición: ya está Aprobada/Publicada en Meta.
	// Para modificarla, primero hay que «Devolver a Ajustes» (status -> Borrador).
	const isPostLocked = $derived(selectedPost?.status === 'Aprobado' || selectedPost?.status === 'Publicado');

	function buildPromptPreview(post: ExcelPost): string {
		if (lastCustomPrompts[post.id]) return lastCustomPrompts[post.id];
		if (post.prompt && post.prompt.trim()) return post.prompt;
		const brandPrompt = catalogos?.marcas?.find((m: any) => m.nombre === post.brand)?.prompt_sistema || 'Aplica los estilos de marca por defecto.';
		return `${brandPrompt}\nContexto del producto: ${post.title}. ${post.context || ''}.\nObjetivo: ${post.objective || 'Interacción'}.`.trim();
	}

	// Generar o Re-generar imagen con la IA de Gemini/Imagen
	// Si slideIndex está definido, regenera solo ese slide del carrusel.
	async function regenerateImageIA(post: ExcelPost, customPrompt?: string, assetIds?: number[], slideIndex?: number) {
		const isSlide = typeof slideIndex === 'number' && !Number.isNaN(slideIndex);

		let body: any;

		if (isSlide) {
			const slide = post.carouselImages?.[slideIndex as number];
			if (!slide) {
				toast.error('Slide del carrusel no encontrado.');
				return;
			}
			const modo = slide.modo === 'crear' ? 'crear' : 'editar';
			// Prioridad: prompt override del modal > prompt del slide > prompt del post > buildPreview
			const promptToUse = (customPrompt && customPrompt.trim())
				? customPrompt.trim()
				: (slide.prompt && slide.prompt.trim())
					? slide.prompt
					: (post.prompt && post.prompt.trim())
						? post.prompt
						: null;

			if (modo === 'crear') {
				if (!promptToUse) {
					toast.error('En modo crear se requiere un prompt para regenerar la imagen.');
					return;
				}
				body = {
					base64Image: null,
					brand: post.brand,
					title: post.title,
					context: post.context,
					objective: post.objective,
					index: slideIndex,
					modo: 'crear',
					customPrompt: promptToUse,
					selectedAssetIds: assetIds || Array.from(assetSelectorDialog?.selectedIds || [])
				};
			} else {
				const refImage = slide.imageBase64 || slide.imagePreview || null;
				if (!refImage) {
					toast.error(`No hay imagen de referencia para la slide ${slideIndex + 1}.`);
					return;
				}
				body = {
					base64Image: slide.imageBase64 || null,
					imageUrl: slide.imageBase64 ? null : refImage,
					brand: post.brand,
					title: post.title,
					context: post.context,
					objective: post.objective,
					index: slideIndex,
					modo: 'editar',
					customPrompt: promptToUse || undefined,
					selectedAssetIds: assetIds || Array.from(assetSelectorDialog?.selectedIds || [])
				};
			}
		} else {
			const carouselImg = post.carouselImages?.find(img => img.imagePreview);
			const refImage = post.imageBase64 || post.imagePreview || carouselImg?.imagePreview || null;
			if (!refImage) {
				toast.error('No hay imagen de referencia. Sube una desde el calendario.');
				return;
			}
			body = {
				base64Image: post.imageBase64 || null,
				imageUrl: post.imageBase64 ? null : refImage,
				brand: post.brand,
				title: post.title,
				context: post.context,
				objective: post.objective,
				customPrompt,
				selectedAssetIds: assetIds || Array.from(assetSelectorDialog?.selectedIds || [])
			};
		}

		nanoBananaGenerating = true;

		try {
			const response = await fetch(`/api/content-creator/publicaciones/${post.id}/generar-imagen`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const data = await response.json();

			if (data.success && data.imageUrl) {
				if (isSlide) {
					posts = posts.map(p => {
						if (p.id === post.id && p.carouselImages) {
							const updatedImages = [...p.carouselImages];
							const idx = slideIndex as number;
							if (updatedImages[idx]) {
								updatedImages[idx] = {
									...updatedImages[idx],
									imageName: `ia_gen_pub_${post.id}_${idx}.jpg`,
									imagePreview: data.imageUrl,
									imageBase64: ''
								};
							}
							return { ...p, carouselImages: updatedImages };
						}
						return p;
					});
					toast.success(`¡Gemini regeneró la imagen ${slideIndex + 1} del carrusel!`);
				} else {
					posts = posts.map(p => {
						if (p.id === post.id) {
							return {
								...p,
								imageName: `ia_gen_pub_${post.id}.jpg`,
								imagePreview: data.imageUrl
							};
						}
						return p;
					});
					toast.success('¡Gemini ha generado una nueva propuesta visual!');
				}
			} else {
				toast.error(data.error || 'Error al generar la imagen.');
			}
		} catch (error) {
			console.error(error);
			toast.error('Error de red al intentar generar la imagen.');
		} finally {
			nanoBananaGenerating = false;
			regeneratingSlideIndex = null;
		}
	}

	// Descargar imagen generada por IA (guardada en /uploads/)
	function downloadBaseImage(post: ExcelPost) {
		const isCarousel = post?.esCarrusel !== undefined
			? !!post.esCarrusel
			: (Array.isArray(post?.carouselImages) && post.carouselImages.length > 0);
		const hasCarousels = isCarousel && post?.carouselImages && post.carouselImages.length > 0;

		if (hasCarousels && post.carouselImages) {
			downloadingImage = true;
			try {
				post.carouselImages.forEach((img, idx) => {
					if (img.imagePreview) {
						setTimeout(() => {
							const a = document.createElement('a');
							a.href = img.imagePreview as string;
							a.download = img.imageName || `ia_gen_pub_${post.id}_${idx}.jpg`;
							document.body.appendChild(a);
							a.click();
							document.body.removeChild(a);
						}, idx * 500); // Retraso de medio segundo entre descargas
					}
				});
				toast.success('Descargando carrusel...', {
					description: `Se descargarán ${post.carouselImages.length} imágenes.`
				});
			} catch (e) {
				toast.error('No se pudieron descargar las imágenes del carrusel.');
			} finally {
				setTimeout(() => downloadingImage = false, post.carouselImages.length * 500);
			}
			return;
		}

		if (!post?.imagePreview) {
			toast.error('No hay imagen generada para descargar.');
			return;
		}

		downloadingImage = true;

		try {
			// Crear un enlace temporal y hacer click programáticamente
			const a = document.createElement('a');
			a.href = post.imagePreview;
			a.download = post.imageName || `ia_gen_pub_${post.id}.jpg`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			toast.success('Descargando imagen...', {
				description: `${a.download} — lista para edición en Photoshop/Illustrator.`
			});
		} catch (e) {
			toast.error('No se pudo descargar la imagen.');
		} finally {
			downloadingImage = false;
		}
	}

	// Acción: Reemplazar por Diseño Final (Adobe Photoshop/Illustrator)
	async function handleFinalDesignUpload(event: Event, id: string) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Preview provisional inmediato
		posts = posts.map(p => {
			if (p.id === id) {
				return {
					...p,
					imageName: `DISEÑO_FINAL_${file.name}`,
					imagePreview: URL.createObjectURL(file),
					designed: true // Se marca como diseñado por el humano
				};
			}
			return p;
		});

		// Persistir a disco en paralelo
		try {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('subPath', `designs/${id}`);
			const res = await fetch('/api/content-creator/upload-imagen', { method: 'POST', body: fd });
			const data = await res.json();
			if (!res.ok || !data.success || !data.imageUrl) {
				toast.error(`No se pudo subir el diseño final: ${data.error || 'error desconocido'}`);
				return;
			}

			const imageUrl = data.imageUrl as string;
			const imageName = (data.fileName as string) || `DISEÑO_FINAL_${file.name}`;

			// Actualizar estado local con la URL persistente
			posts = posts.map(p => {
				if (p.id === id) {
					return { ...p, imageName, imagePreview: imageUrl, designed: true };
				}
				return p;
			});

			// Persistir el reemplazo en la BD (sólo si el id es numérico real)
			const numericId = id.replace('MER-', '');
			if (/^\d+$/.test(numericId)) {
				const putResp = await fetch(`/api/content-creator/publicaciones/${numericId}/design-final`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ imageUrl, imageName })
				});
				if (!putResp.ok) {
					const errData = await putResp.json().catch(() => ({}));
					toast.error(`El archivo se subió pero no se pudo guardar en la BD: ${errData.error || 'error'}`);
				} else {
					toast.success('¡Sustitución Exitosa!', {
						description: 'El diseño del diseñador (Adobe) se subió y reemplazó la propuesta de la IA.'
					});
				}
			} else {
				toast.success('Diseño final subido', {
					description: 'Nota: la publicación aún no está guardada en la BD; el cambio se guardará al guardar la ficha.'
				});
			}
		} catch (e) {
			console.error('[handleFinalDesignUpload]', e);
			toast.error('Error de red al subir el diseño final.');
		} finally {
			if (input) input.value = '';
		}
	}

	// Acción: Reemplazar un slide individual del carrusel por el diseño final (Adobe)
	async function handleSlideFinalDesignUpload(event: Event, id: string, slideIndex: number) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const post = posts.find(p => p.id === id);
		if (!post || !Array.isArray(post.carouselImages)) return;

		// Preview provisional inmediato en el slide
		posts = posts.map(p => {
			if (p.id === id && Array.isArray(p.carouselImages)) {
				const updated = [...p.carouselImages];
				if (updated[slideIndex]) {
					updated[slideIndex] = {
						...updated[slideIndex],
						imageName: `DISEÑO_FINAL_${slideIndex}_${file.name}`,
						imagePreview: URL.createObjectURL(file)
					};
				}
				return { ...p, carouselImages: updated, designed: true };
			}
			return p;
		});

		try {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('subPath', `designs/${id}`);
			const res = await fetch('/api/content-creator/upload-imagen', { method: 'POST', body: fd });
			const data = await res.json();
			if (!res.ok || !data.success || !data.imageUrl) {
				toast.error(`No se pudo subir el diseño final: ${data.error || 'error desconocido'}`);
				return;
			}

			const imageUrl = data.imageUrl as string;
			const imageName = (data.fileName as string) || `DISEÑO_FINAL_${slideIndex}_${file.name}`;

			// Actualizar estado local con la URL persistente
			posts = posts.map(p => {
				if (p.id === id && Array.isArray(p.carouselImages)) {
					const updated = [...p.carouselImages];
					if (updated[slideIndex]) {
						updated[slideIndex] = { ...updated[slideIndex], imageName, imagePreview: imageUrl };
					}
					return { ...p, carouselImages: updated, designed: true };
				}
				return p;
			});

			// Persistir en la BD con slideIndex
			const numericId = id.replace('MER-', '');
			if (/^\d+$/.test(numericId)) {
				const putResp = await fetch(`/api/content-creator/publicaciones/${numericId}/design-final`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ imageUrl, imageName, slideIndex })
				});
				if (!putResp.ok) {
					const errData = await putResp.json().catch(() => ({}));
					toast.error(`El archivo se subió pero no se pudo guardar en la BD: ${errData.error || 'error'}`);
				} else {
					toast.success(`¡Sustitución Exitosa! (Slide #${slideIndex + 1})`, {
						description: 'El diseño del diseñador reemplazó la imagen de la IA en este slide.'
					});
				}
			} else {
				toast.success(`Diseño final subido (Slide #${slideIndex + 1})`, {
					description: 'La publicación aún no está guardada en la BD.'
				});
			}
		} catch (e) {
			console.error('[handleSlideFinalDesignUpload]', e);
			toast.error('Error de red al subir el diseño final.');
		} finally {
			if (input) input.value = '';
		}
	}

	// Acción: Solicitar ajustes (devuelve a borrador)
	async function requestAdjusts(id: string) {
		try {
			const numericId = id.replace('MER-', '');
			const response = await fetch(`/api/content-creator/publicaciones/${numericId}/rechazar`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notas: 'Ajustes solicitados desde el dashboard' })
			});

			if (response.ok) {
				posts = posts.map(p => {
					if (p.id === id) {
						return { ...p, status: 'Borrador' };
					}
					return p;
				});
				toast.warning('Pieza devuelta a Borrador para ajustes de copy o parámetros.');
			} else {
				toast.error('Error al solicitar ajustes');
			}
		} catch (error) {
			console.error(error);
			toast.error('Error de red');
		}
	}

	// Autoguardado silencioso del copy en blur.
	// Persiste SOLO copy_final en la BD, sin cambiar el estado de la publicación,
	// de modo que el botón "Aprobar y Programar" siga disponible.
	async function autosaveCopy(post: ExcelPost | null) {
		if (!post) return;
		if (post.status === 'Aprobado' || post.status === 'Publicado') return;
		const numericId = post.id.replace('MER-', '');
		if (!/^\d+$/.test(numericId)) return; // publicación aún no persistida

		if (copySaveTimer) {
			clearTimeout(copySaveTimer);
			copySaveTimer = null;
		}

		copySaveStatus = 'saving';
		try {
			const response = await fetch(`/api/content-creator/publicaciones/${numericId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ copy_final: post.copy })
			});
			if (!response.ok) {
				copySaveStatus = 'error';
				return;
			}
			copySaveStatus = 'saved';
			copySaveTimer = setTimeout(() => {
				copySaveStatus = 'idle';
				copySaveTimer = null;
			}, 2000);
		} catch (error) {
			console.error('[autosaveCopy]', error);
			copySaveStatus = 'error';
		}
	}

	// Acción: Guardar publicación (cambia a estado Guardado y desactiva aprobación)
	async function savePost(id: string) {
		const post = posts.find(p => p.id === id);
		if (!post) return;

		savingPost = true;
		try {
			const numericId = id.replace('MER-', '');
			if (/^\d+$/.test(numericId)) {
				const response = await fetch(`/api/content-creator/publicaciones/${numericId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						estado: 'Guardado',
						copy_final: post.copy,
						titulo: post.title,
						contexto: post.context,
						objetivo: post.objective,
						cta: post.cta
					})
				});

				if (!response.ok) {
					toast.error('Error al guardar la publicación en el servidor');
					return;
				}
			}

			posts = posts.map(p => {
				if (p.id === id) {
					return { 
						...p, 
						status: 'Guardado'
					};
				}
				return p;
			});
			toast.info('Publicación guardada exitosamente', {
				description: 'El estado cambió a "Guardado". La opción de aprobar y enviar a Meta ha sido desactivada.'
			});
		} catch (error) {
			console.error(error);
			toast.error('Error de red al guardar la publicación');
		} finally {
			savingPost = false;
		}
	}

	// Determina si un post está listo para aprobación.
	// - Carrusel: TODOS los slides con imagePreview válido (IA original o diseño final reemplazado).
	// - Imagen única: diseñada por humano O con imagePreview IA válido (caso "IA perfecta tal cual").
	function isPostReadyForApproval(post: ExcelPost): { ready: boolean; reason?: string } {
		const isCarrusel = post.esCarrusel !== undefined
			? !!post.esCarrusel
			: (Array.isArray(post.carouselImages) && post.carouselImages.length > 0);

		if (isCarrusel && Array.isArray(post.carouselImages) && post.carouselImages.length > 0) {
			const missing = post.carouselImages.findIndex(img => !img.imagePreview || img.imagePreview.trim() === '');
			if (missing >= 0) {
				return { ready: false, reason: `No se puede aprobar: el slide #${missing + 1} no tiene imagen generada todavía.` };
			}
			return { ready: true };
		}

		// Imagen única: diseñada por humano, o con imagen IA válida (caso IA perfecta tal cual).
		if (!post.designed && !post.imagePreview) {
			return { ready: false, reason: 'No se puede aprobar: cargá el diseño final editado por el diseñador (Adobe) o generá la imagen de IA.' };
		}
		return { ready: true };
	}

	// Acción: Aprobar y programar en Meta
	async function approveAndSchedule(id: string) {
		const post = posts.find(p => p.id === id);
		if (!post) return;

		const approvalCheck = isPostReadyForApproval(post);
		if (!approvalCheck.ready) {
			toast.error(approvalCheck.reason || 'No se puede aprobar la publicación.');
			return;
		}

		if (!post.copy.trim()) {
			toast.error('El copy de la publicación no puede estar vacío.');
			return;
		}

		finalizingPost = true;
		try {
			const numericId = id.replace('MER-', '');
			const copyResponse = await fetch(`/api/content-creator/publicaciones/${numericId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ copy_final: post.copy.trim() })
			});
			if (!copyResponse.ok) {
				const data = await copyResponse.json().catch(() => ({}));
				toast.error(data.error || 'No se pudo guardar el copy antes de aprobar.');
				return;
			}

			const response = await fetch(`/api/content-creator/publicaciones/${numericId}/aprobar`, {
				method: 'POST'
			});

			if (response.ok) {
				posts = posts.map(p => {
					if (p.id === id) {
						return { 
							...p, 
							status: 'Aprobado',
							published: p.published || false
						};
					}
					return p;
				});
				toast.success('¡Pieza Aprobada con éxito!', {
					description: 'Configuración enviada a Meta Business Suite. Programación de publicación lista.'
				});
			} else {
				const data = await response.json().catch(() => ({}));
				toast.error(data.error || 'Error al aprobar publicación');
			}
		} catch (error) {
			console.error(error);
			toast.error('Error de red al aprobar');
		} finally {
			finalizingPost = false;
		}
	}

	// Acción: Descartar / Borrado Lógico (Soft Delete)
	async function deletePost(id: string) {
		const post = posts.find(p => p.id === id);
		if (!post) return;

		if (!confirm(`¿Estás seguro de descartar la publicación "${post.title}"?`)) {
			return;
		}

		deletingPost = true;
		try {
			const numericId = id.replace('MER-', '');
			if (/^\d+$/.test(numericId)) {
				const response = await fetch(`/api/content-creator/publicaciones/${numericId}`, {
					method: 'DELETE'
				});

				if (!response.ok) {
					toast.error('Error al descartar la publicación');
					return;
				}
			}

			posts = posts.filter(p => p.id !== id);
			if (selectedPostId === id) {
				selectedPostId = null;
			}
			toast.success('Publicación descartada correctamente');
		} catch (error) {
			console.error(error);
			toast.error('Error de red al descartar la publicación');
		} finally {
			deletingPost = false;
		}
	}
</script>

<div class="grid gap-6 lg:grid-cols-[380px_1fr]">
	
	<!-- Panel Izquierdo: Lista de Publicaciones en Revisión -->
	<div class="flex flex-col gap-4">
		<!-- Filtros de Estado y Marca -->
		<div class="rounded-xl border bg-card p-4 shadow-sm space-y-3">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold uppercase text-slate-500">Filtrar Estado</span>
				<div class="flex gap-1 flex-wrap justify-end">
					{#each ['Todos', 'Borrador', 'En revisión', 'Guardado', 'Aprobado', 'Publicado', 'Error API'] as st}
						<button 
							type="button"
							onclick={() => filterStatus = st as any}
							class={`rounded px-2.5 py-1 text-[10px] font-bold transition-all
								${filterStatus === st 
									? 'bg-[#0D1E3D] text-white' 
									: 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
						>
							{st === 'En revisión' ? 'Revisión' : st}
						</button>
					{/each}
				</div>
			</div>
			
			<div class="flex items-center justify-between border-t pt-2.5">
				<span class="text-xs font-bold uppercase text-slate-500">Filtrar Marca</span>
				<select 
					bind:value={filterBrand}
					class="h-8 rounded-md border bg-background px-2 text-[10px] font-bold outline-none"
				>
					{#each brands as b}
						<option value={b}>{b}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center justify-between border-t pt-2.5 gap-2">
				<span class="text-xs font-bold uppercase text-slate-500">Fecha</span>
				<div class="flex gap-1.5">
					<select 
						bind:value={filterMonth}
						class="h-8 rounded-md border bg-background px-2 text-[10px] font-bold outline-none"
					>
						{#each MESES as m}
							<option value={m.value}>{m.label}</option>
						{/each}
					</select>
					<select 
						bind:value={filterYear}
						class="h-8 rounded-md border bg-background px-2 text-[10px] font-bold outline-none"
					>
						{#each availableYears as y}
							<option value={y}>{y === 'Todos' ? 'Año (Todos)' : y}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- Lista Scrollable de Publicaciones -->
		<div class="max-h-[550px] space-y-3 overflow-y-auto pr-1">
			{#if filteredPosts.length === 0}
				<div class="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card">
					<div class="rounded-full bg-emerald-100 dark:bg-emerald-950/40 p-3 text-emerald-600 dark:text-emerald-400">
						<CheckCircle class="h-6 w-6" />
					</div>
					<p class="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">¡Todo al día!</p>
					<p class="mt-1 text-xs text-muted-foreground">No hay piezas que coincidan con los filtros seleccionados.</p>
				</div>
			{:else}
				{#each filteredPosts as post (post.id)}
					<button 
						type="button"
						onclick={() => selectedPostId = post.id}
						class={`group w-full rounded-xl border text-left p-3.5 transition-all duration-200 hover:shadow-sm hover:scale-[1.01] flex flex-col gap-2
							${selectedPostId === post.id 
								? 'border-[#0D1E3D] bg-[#0D1E3D]/5 dark:border-blue-500 dark:bg-blue-950/10' 
								: 'border-slate-200 bg-card dark:border-slate-800'}`}
					>
						<div class="flex items-center justify-between gap-2 w-full">
							<span class="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[8px] font-extrabold tracking-wider text-slate-600 uppercase">
								{post.brand || 'V&O'}
							</span>
							<span class={`rounded-full px-2 py-0.5 text-[8px] font-bold ${getStatusBadgeColor(post.status)}`}>
								{post.status || 'Borrador'}
							</span>
						</div>
						
						<div>
							<h4 class="text-xs font-bold text-slate-900 line-clamp-1 dark:text-slate-100 group-hover:text-[#0D1E3D] dark:group-hover:text-blue-400">
								{post.title}
							</h4>
							<p class="mt-1 text-[10px] text-muted-foreground line-clamp-2 italic">
								"{post.copy ? post.copy.substring(post.copy.indexOf('\n\n') + 2) : 'Sin copy generado'}"
							</p>
						</div>

						<div class="mt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[9px] font-semibold text-slate-400">
							<div class="flex items-center gap-1">
								<Calendar class="h-3 w-3" />
								<span>{post.date} · {post.week}</span>
							</div>
							<div class="flex gap-1.5">
								{#if post.imagePreview}<span class="text-blue-500" title="Imagen de referencia IA cargada">🤖</span>{/if}
								{#if post.designed}<span class="text-emerald-500" title="Diseño Final Adobe Cargado">🎨</span>{/if}
								{#if post.promoted}<span class="text-amber-500" title="Pauta de Pago Configurada">🔥</span>{/if}
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Panel Derecho: Detalle de Publicación y Aprobación HITL -->
	<div>
		{#if selectedPost}
			<Card.Root class="border-slate-200 bg-card shadow-sm dark:border-slate-800 overflow-hidden">
				<Card.Header class="border-b border-slate-100 bg-muted/40 p-4 dark:border-slate-800/80">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<span class="rounded bg-[#0D1E3D]/10 px-2 py-0.5 text-[9px] font-bold text-[#0D1E3D] dark:bg-blue-900/30 dark:text-blue-400 uppercase">
									{selectedPost.brand}
								</span>
								<span class="text-[10px] text-muted-foreground">· {selectedPost.network} ({selectedPost.format})</span>
							</div>
							<Card.Title class="text-base font-bold text-slate-900 dark:text-white">
								{selectedPost.title}
							</Card.Title>
						</div>
						
						<div class="flex items-center gap-1.5 text-[10px] font-bold">
							<span class="rounded-md border bg-background px-2.5 py-1">
								📅 {selectedPost.date}
							</span>
							<span class="rounded-md border bg-background px-2.5 py-1">
								📦 {selectedPost.week}
							</span>
						</div>
					</div>
				</Card.Header>
				
				<Card.Content class="p-5 space-y-5">
					{#if isPostLocked}
						<div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 px-3 py-2 text-slate-500 dark:text-slate-400">
							<span class="text-sm">🔒</span>
							<span class="text-[11px] font-medium">Publicación aprobada/publicada en Meta. Pulsá «Devolver a Ajustes» para editarla.</span>
						</div>
					{/if}
					<div class="grid gap-5 md:grid-cols-2">
						
						<!-- Columna Izquierda: Flujo Visual de la Imagen (IA vs. Adobe Humano) -->
						<div class="space-y-3.5">
							<span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Flujo de Diseño (Human in the Loop)</span>
							
							<!-- Caja del Contenedor de Imagen -->
							<div class="relative overflow-hidden rounded-xl border bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-center items-center p-2 min-h-[220px]">
{#if hasCarouselImages}
								<div class="flex overflow-x-auto w-full gap-2 pb-2 snap-x">
									{#each activeCarouselImages as img, i}
										<div class="snap-center shrink-0 w-4/5 sm:w-1/2 relative group">
											<span class="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">#{i+1}</span>
											{#if img.modo === 'crear'}
												<span class="absolute top-2 right-2 bg-[#0D1E3D]/80 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">✨ Crear</span>
											{/if}
											{#if img.imagePreview}
												<img src={img.imagePreview} alt="Mockup {i+1}" class="h-48 w-full object-contain rounded-lg border shadow-sm bg-white dark:bg-black/50" />
											{:else}
												<div class="h-48 w-full border flex items-center justify-center rounded-lg bg-card">
													<span class="text-xs text-muted-foreground">Generando...</span>
												</div>
											{/if}
<!-- Acción por slide: Regenerar este slide con IA -->
										<button
											type="button"
										title={`Regenerar slide ${i+1} con IA`}
										class="absolute bottom-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md bg-background/90 border border-slate-200 text-[#0D1E3D] hover:bg-[#0D1E3D] hover:text-white transition opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
										onclick={(e) => { e.stopPropagation(); openRegenerationFlow(i); }}
										disabled={nanoBananaGenerating || isPostLocked}
									>
											{#if nanoBananaGenerating && regeneratingSlideIndex === i}
												<span class="animate-spin">🌀</span>
											{:else}
												<Sparkles class="h-3.5 w-3.5" />
											{/if}
										</button>
<!-- Reemplazar slide con diseño final (Adobe) -->
									<label
										title={isPostLocked ? 'Devolver a Ajustes primero' : `Reemplazar slide ${i+1} con diseño final`}
										class={`absolute bottom-2 left-2 inline-flex items-center justify-center h-7 w-7 rounded-md bg-background/90 border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition ${isPostLocked ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
									>
										<UploadCloud class="h-3.5 w-3.5" />
										{#if !isPostLocked}
											<input
												type="file"
												accept="image/*"
												class="hidden"
												onchange={(e) => handleSlideFinalDesignUpload(e, selectedPost.id, i)}
											/>
										{/if}
									</label>
										</div>
									{/each}
								</div>
								{:else if selectedPost?.imagePreview}
									<img src={selectedPost.imagePreview} alt="Mockup" class="h-48 w-full object-contain rounded-lg border shadow-sm" />
								{:else}
									<div class="flex flex-col items-center justify-center p-4 text-center">
										<ImageIcon class="h-10 w-10 text-slate-400 mb-2" />
										<p class="text-xs font-semibold">No se ha cargado imagen de referencia</p>
										<p class="text-[10px] text-muted-foreground">Usa el planificador para subir la imagen inicial.</p>
									</div>
								{/if}

								<!-- Badge de Tipo de Imagen Activa -->
								<div class="absolute top-4 right-4 flex gap-1.5">
									{#if selectedPost.designed}
										<span class="bg-indigo-600 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-full shadow border border-indigo-700 animate-pulse">
											🎨 Editado en Adobe (Humano)
										</span>
									{:else}
										<span class="bg-amber-600 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-full shadow border border-amber-700">
											🤖 Borrador IA (Nano Banana)
										</span>
									{/if}
								</div>
							</div>

							<!-- Acciones del Flujo de Diseño (Download / Regenerate IA / Sustituir Adobe) -->
							<div class="flex flex-col gap-2">
								<div class="flex gap-2">
									<!-- Re-generar con IA (Nano Banana) -->
								{#if isCarousel}
									<div class="flex-1 flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
										<Sparkles class="h-3.5 w-3.5 text-[#0D1E3D] shrink-0" />
										<span>Cada slide se regenera individualmente con el botón <Sparkles class="inline-block h-3 w-3 align-text-bottom text-[#0D1E3D]" /> sobre cada imagen.</span>
									</div>
								{:else}
									<Button 
										variant="outline" 
										size="sm"
										class="flex-1 text-[11px] font-bold"
										onclick={() => openRegenerationFlow()}
										disabled={nanoBananaGenerating || isPostLocked || (!selectedPost.imageBase64 && !selectedPost.imagePreview && !hasCarouselImages)}
									>
										{#if nanoBananaGenerating}
											<span class="animate-spin mr-1">🌀</span> Generando...
										{:else}
											<RefreshCw class="h-3.5 w-3.5 mr-1" />
											Regenerar IA
										{/if}
									</Button>
								{/if}

									<!-- Descargar Base IA -->
									<Button 
										variant="outline" 
										size="sm"
										class="flex-1 text-[11px] font-bold border-[#0D1E3D]/20 text-[#0D1E3D] hover:bg-[#0D1E3D]/5 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-400/10"
										onclick={() => downloadBaseImage(selectedPost)}
										disabled={downloadingImage || (!selectedPost?.imagePreview && !hasCarouselImages)}
									>
										<Download class="h-3.5 w-3.5 mr-1" />
										Descargar Base IA
									</Button>
								</div>
								
								<div class="flex gap-2">
									<!-- Ver Imagen en Pantalla Completa -->
									<Button 
										variant="outline" 
										size="sm"
										class="flex-1 text-[11px] font-bold"
										onclick={() => {
										if (hasCarouselImages) {
											viewerState = {
												images: activeCarouselImages.map(img => ({ preview: img.imagePreview || '', name: img.imageName || '' })),
												index: 0
											};
										} else if (selectedPost?.imagePreview) {
											viewerState = {
												images: [{ preview: selectedPost.imagePreview, name: selectedPost.imageName || '' }],
												index: 0
											};
										}
									}}
										disabled={!selectedPost?.imagePreview && !hasCarouselImages}
									>
										<Eye class="h-3.5 w-3.5 mr-1" />
										Ver Imagen
									</Button>
								</div>

								<!-- Reemplazar con el diseño final de Adobe (Manual Humano) -->
								{#if hasCarouselImages}
									<div class="border border-dashed rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center">
										<span class="text-[9px] font-bold text-slate-400 uppercase mb-1">Subir Pieza Final por Slide</span>
										<span class="text-[10px] text-slate-500 dark:text-slate-400">Usá el botón <UploadCloud class="inline h-3 w-3 align-middle" /> en cada slide de arriba para reemplazar su diseño.</span>
									</div>
{:else}
								<div class="border border-dashed rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center">
									<span class="text-[9px] font-bold text-slate-400 uppercase mb-1">Subir Pieza Final (Photoshop / Illustrator)</span>
									<label class={`flex items-center gap-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md font-bold text-[10px] shadow-sm transition ${isPostLocked ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}>
										<UploadCloud class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
										<span>Reemplazar con Diseño Final (Adobe)</span>
										{#if !isPostLocked}
											<input
												bind:this={finalDesignInput}
												type="file"
												accept="image/*"
												class="hidden"
												onchange={(e) => handleFinalDesignUpload(e, selectedPost.id)}
											/>
										{/if}
									</label>
								</div>
							{/if}
							</div>
						</div>

						<!-- Columna Derecha: Revisión y Edición de Textos/Copy -->
						<div class="space-y-3.5 flex flex-col justify-between">
							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Copy y Hashtags Generados</span>
									<div class="flex items-center gap-2">
										{#if copySaveStatus === 'saving'}
											<span class="text-[9px] text-slate-400 italic">guardando…</span>
										{:else if copySaveStatus === 'saved'}
											<span class="text-[9px] text-emerald-600 italic">guardado ✓</span>
										{:else if copySaveStatus === 'error'}
											<span class="text-[9px] text-red-500 italic">error al guardar</span>
										{/if}
										<Button
											size="xs"
											class="bg-orange-500 hover:bg-orange-600 text-white font-bold h-7 gap-1 text-[10px] cursor-pointer"
onclick={() => openCopyPromptDialog(selectedPost)}
										disabled={geminiGeneratingReview || isPostLocked}
									>
											{#if geminiGeneratingReview}
												<span class="animate-spin text-[8px]">🌀</span> Generando...
											{:else}
												<Sparkles class="h-3 w-3" />
												Generar Copy con IA
											{/if}
										</Button>
									</div>
								</div>
								
								<!-- Visualización y Modificación del Copy -->
								<div class="space-y-1">
									<textarea 
										bind:value={selectedPost.copy} 
										rows="8"
										onblur={() => autosaveCopy(selectedPost)}
										disabled={isPostLocked}
										class="w-full rounded-lg border bg-background px-3 py-2.5 text-xs outline-none focus:border-[#0D1E3D] leading-relaxed font-sans disabled:opacity-60 disabled:cursor-not-allowed"
										placeholder="Ingresa o edita el copy definitivo..."
									></textarea>
								</div>

								<!-- Modificación de Parámetros Clave -->
								<div class="grid gap-3 sm:grid-cols-2">
									<div class="space-y-1">
										<span class="text-[9px] font-bold uppercase text-slate-400">Llamado a la acción (CTA)</span>
<input 
										type="text" 
										bind:value={selectedPost.cta} 
										disabled={isPostLocked}
										class="h-8.5 w-full rounded-md border bg-background px-2 text-xs outline-none focus:border-[#0D1E3D] disabled:opacity-60 disabled:cursor-not-allowed" 
									/>
									</div>
									<div class="space-y-1">
										<span class="text-[9px] font-bold uppercase text-slate-400">Objetivo</span>
<input 
										type="text" 
										bind:value={selectedPost.objective} 
										disabled={isPostLocked}
										class="h-8.5 w-full rounded-md border bg-background px-2 text-xs outline-none focus:border-[#0D1E3D] disabled:opacity-60 disabled:cursor-not-allowed" 
									/>
									</div>
								</div>
							</div>

							<!-- Pauta Presupuesto y Redes -->
							<div class="rounded-xl border p-3 bg-muted/30 text-xs space-y-2">
								<span class="text-[9px] font-bold uppercase text-slate-400 block">Presupuesto y Configuración Meta</span>
								<div class="grid grid-cols-3 gap-2">
									<div>
										<span class="text-[8px] text-slate-400 block">Público</span>
										<span class="font-bold text-slate-800 dark:text-slate-200">{selectedPost.audience || 'Amplio'}</span>
									</div>
									<div>
										<span class="text-[8px] text-slate-400 block">Presupuesto</span>
										<span class="font-bold text-emerald-600">¢{selectedPost.budget}</span>
									</div>
									<div>
										<span class="text-[8px] text-slate-400 block">Pautada</span>
										<span class="font-bold">{selectedPost.promoted ? '🔥 Pauta Activa' : 'Sin Pauta'}</span>
									</div>
								</div>
							</div>
						</div>

					</div>

					<!-- Caja de Acciones de Aprobación HITL -->
					<div class="border-t pt-4 flex flex-wrap gap-3 items-center justify-between">
						
						<!-- Status del flujo actual -->
						<div class="text-xs">
							<span class="text-[9px] text-slate-400 uppercase font-bold block">Estado Actual</span>
							<span class={`font-bold uppercase tracking-wide ${getStatusTextColor(selectedPost.status)}`}>
								{getStatusLabel(selectedPost.status)}
							</span>
						</div>

						<div class="flex flex-wrap gap-2">
							<!-- Descartar (Soft Delete) -->
							<Button 
								variant="outline" 
								class="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/50 font-bold"
onclick={() => deletePost(selectedPost.id)}
							disabled={deletingPost || isPostLocked}
						>
								{#if deletingPost}
									<span class="animate-spin mr-1">🌀</span> Descartando...
								{:else}
									<Trash2 class="h-4 w-4 mr-1.5" />
									Descartar
								{/if}
							</Button>

							<!-- Devolver a Borrador -->
							{#if selectedPost.status !== 'Borrador'}
								<Button 
									variant="outline" 
									class="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 font-bold"
									onclick={() => requestAdjusts(selectedPost.id)}
								>
									<XCircle class="h-4 w-4 mr-1.5" />
									Devolver a Ajustes
								</Button>
							{/if}

							<!-- Guardar Cambios (Desactiva opción de aprobar y enviar a Meta) -->
							<Button 
								variant="outline"
								class="border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950/50 font-bold"
onclick={() => savePost(selectedPost.id)}
							disabled={savingPost || isPostLocked}
						>
								{#if savingPost}
									<span class="animate-spin mr-1">🌀</span> Guardando...
								{:else}
									<Save class="h-4 w-4 mr-1.5" />
									{selectedPost.status === 'Guardado' ? 'Guardado' : 'Guardar'}
								{/if}
							</Button>

							<!-- Aprobar y Programar -->
							<Button 
								class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
								onclick={() => approveAndSchedule(selectedPost.id)}
								disabled={finalizingPost || selectedPost.status === 'Aprobado' || selectedPost.status === 'Guardado'}
							>
								{#if finalizingPost}
									<span class="animate-spin mr-1">🌀</span> Procesando...
								{:else if selectedPost.status === 'Aprobado'}
									<CheckCircle class="h-4 w-4 mr-1.5" />
									Ya Programado
								{:else if selectedPost.status === 'Guardado'}
									<CheckCircle class="h-4 w-4 mr-1.5" />
									Aprobación Desactivada
								{:else}
									<CheckCircle class="h-4 w-4 mr-1.5" />
									Aprobar y Programar en Meta
								{/if}
							</Button>
						</div>
					</div>

				</Card.Content>
			</Card.Root>
		{:else}
			<div class="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-card p-8 text-center dark:border-slate-800">
				<Eye class="h-10 w-10 text-slate-400" />
				<p class="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">No hay pieza seleccionada</p>
				<p class="text-xs text-slate-500 mt-1 dark:text-slate-400">Selecciona una publicación de la lista izquierda para iniciar la auditoría y reemplazo.</p>
			</div>
		{/if}
	</div>

</div>

<!-- Visor de Imagen a Pantalla Completa -->
{#if viewerState}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
		onclick={() => viewerState = null}
	>
		<div class="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center">
			<!-- Botón de Cerrar -->
			<Button 
				variant="outline" 
				size="icon" 
				class="absolute -top-12 right-0 rounded-full bg-slate-800/50 hover:bg-slate-700 text-white border-none"
				onclick={(e) => { e.stopPropagation(); viewerState = null; }}
			>
				<XCircle class="h-6 w-6" />
			</Button>

			<!-- Navegación Anterior -->
			{#if viewerState.images.length > 1}
				<button
					onclick={(e) => { e.stopPropagation(); viewerState = { ...viewerState, index: Math.max(0, viewerState.index - 1) }; }}
					disabled={viewerState.index === 0}
					class="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
				>
					<ChevronLeft class="h-8 w-8" />
				</button>
			{/if}
			
			<img 
				src={viewerState.images[viewerState.index].preview} 
				alt="Vista Previa de Pantalla Completa" 
				class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
				onclick={(e) => e.stopPropagation()} 
			/>

			<!-- Navegación Siguiente -->
			{#if viewerState.images.length > 1}
				<button
					onclick={(e) => { e.stopPropagation(); viewerState = { ...viewerState, index: Math.min(viewerState.images.length - 1, viewerState.index + 1) }; }}
					disabled={viewerState.index === viewerState.images.length - 1}
					class="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
				>
					<ChevronRight class="h-8 w-8" />
				</button>

				<!-- Dots indicadores -->
				<div class="flex gap-2 mt-3">
					{#each viewerState.images as _, i}
						<button
							onclick={(e) => { e.stopPropagation(); viewerState = { ...viewerState, index: i }; }}
							class={`h-2 rounded-full transition-all ${i === viewerState.index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'}`}
						></button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Diálogo de Personalización de Prompt -->
{#if promptDialog.open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
		onclick={() => { promptDialog = { ...promptDialog, open: false }; assetSelectorDialog = null; regeneratingSlideIndex = null; }}
	>
		<div class="relative w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center gap-3 mb-4">
				<RefreshCw class="h-5 w-5 text-[#0D1E3D]" />
				<h3 class="text-base font-bold text-[#0D1E3D]">
					{regeneratingSlideIndex !== null
						? `Regenerar imagen ${regeneratingSlideIndex + 1} del carrusel`
						: 'Regenerar imagen'}
				</h3>
			</div>

			<p class="text-xs text-muted-foreground mb-4">
				{regeneratingSlideIndex !== null
					? '¿Quieres modificar el prompt antes de regenerar solo esta imagen del carrusel?'
					: '¿Quieres modificar el prompt antes de regenerar la imagen?'}
			</p>

			<textarea
				bind:value={promptDialog.customPrompt}
				rows="12"
				class="w-full rounded-lg border bg-background px-3 py-2.5 text-xs outline-none focus:border-[#0D1E3D] leading-relaxed font-sans resize-y mb-4"
				placeholder="Edita el prompt para la generación de imagen..."
			></textarea>

			<div class="flex justify-end gap-2">
				<Button 
					variant="outline" 
					size="sm"
					class="text-xs font-bold"
					onclick={() => {
						const ids = Array.from(assetSelectorDialog?.selectedIds || []);
						assetSelectorDialog = null;
						lastCustomPrompts = { ...lastCustomPrompts, [selectedPost.id]: '' };
						promptDialog = { ...promptDialog, open: false };
						const slideIdx = regeneratingSlideIndex;
						regenerateImageIA(selectedPost, undefined, ids, slideIdx ?? undefined);
					}}
				>
					No, regenerar igual
				</Button>
				<Button 
					size="sm"
					class="bg-[#0D1E3D] hover:bg-[#0A1730] text-white text-xs font-bold"
					onclick={() => {
						const ids = Array.from(assetSelectorDialog?.selectedIds || []);
						assetSelectorDialog = null;
						const customPrompt = promptDialog.customPrompt;
						// Guardamos el último prompt usado solo si NO estamos regenerando un slide individual
						if (regeneratingSlideIndex === null) {
							lastCustomPrompts = { ...lastCustomPrompts, [selectedPost.id]: customPrompt };
						}
						promptDialog = { ...promptDialog, open: false };
						const slideIdx = regeneratingSlideIndex;
						regenerateImageIA(selectedPost, customPrompt, ids, slideIdx ?? undefined);
					}}
				>
					Sí, usar este prompt
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Diálogo de Personalización de Prompt de Copy -->
{#if copyPromptDialog.open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
		onclick={() => {
			if (!geminiGeneratingReview) copyPromptDialog = { ...copyPromptDialog, open: false };
		}}
	>
		<div class="relative w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center gap-3 mb-4">
				<Sparkles class="h-5 w-5 text-orange-500" />
				<h3 class="text-base font-bold text-[#0D1E3D]">Generar Copy con IA</h3>
			</div>

			<p class="text-xs text-muted-foreground mb-3">
				El prompt de sistema y los manuales de marca se incluyen automáticamente. Aquí sólo añades indicaciones para este copy (tono, longitud, hashtags, etc.). Si lo dejas vacío, se eliminan las indicaciones anteriores y se usa la configuración de marca.
			</p>

			<textarea
				bind:value={copyPromptDialog.customPrompt}
				rows="8"
				maxlength={MAX_COPY_PROMPT_LENGTH}
				disabled={geminiGeneratingReview}
				class="w-full rounded-lg border bg-background px-3 py-2.5 text-xs outline-none focus:border-[#0D1E3D] leading-relaxed font-sans resize-y mb-3"
				placeholder="Ej: Máximo 80 palabras, tono humorístico y sin hashtags en inglés..."
			></textarea>
			<p class="-mt-2 mb-3 text-right text-[10px] text-muted-foreground">
				{copyPromptDialog.customPrompt.length.toLocaleString('es')} / {MAX_COPY_PROMPT_LENGTH.toLocaleString('es')}
			</p>

			<div class="flex items-center justify-between gap-2">
				<Button
					variant="ghost"
					size="sm"
					class="text-[10px] font-bold text-muted-foreground hover:text-foreground"
					onclick={resetCopyPrompt}
					disabled={geminiGeneratingReview || copyPromptDialog.customPrompt.length === 0}
					title="Eliminar las instrucciones adicionales"
				>
					Restablecer instrucciones
				</Button>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						class="text-xs font-bold"
						onclick={() => { copyPromptDialog = { ...copyPromptDialog, open: false }; }}
						disabled={geminiGeneratingReview}
					>
						Cancelar
					</Button>
					<Button
						size="sm"
						class="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold gap-1.5"
						onclick={confirmGenerateCopy}
						disabled={geminiGeneratingReview || copyPromptDialog.customPrompt.length > MAX_COPY_PROMPT_LENGTH}
					>
						{#if geminiGeneratingReview}
							<span class="animate-spin text-[8px]">🌀</span> Generando...
						{:else}
							<Sparkles class="h-3 w-3" /> Generar Copy
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Dialogo de Selección de Assets (Intermedio) -->
{#if assetSelectorDialog?.open && !promptDialog.open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
		<div class="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-2xl p-6 border border-slate-200 dark:border-slate-800">
			<Button 
				variant="outline" 
				size="icon" 
				class="absolute top-4 right-4 h-8 w-8 rounded-full border-none"
				onclick={() => assetSelectorDialog = null}
			>
				<XCircle class="h-5 w-5 text-slate-500" />
			</Button>

			<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
				<Sparkles class="h-5 w-5 text-indigo-500" />
				Selecciona Assets de Marca
			</h3>
			<p class="text-xs text-slate-500 dark:text-slate-400 mb-6">
				Elige qué elementos de identidad visual deseas incluir en la nueva generación con IA.
			</p>

			{#if assetSelectorDialog.loading}
				<div class="py-8 flex justify-center text-slate-500"><span class="animate-pulse font-semibold">Cargando assets...</span></div>
			{:else}
				<div class="grid grid-cols-3 gap-3 mb-6 max-h-[300px] overflow-y-auto p-1">
					{#each assetSelectorDialog.assets as asset}
						<label class={`flex flex-col gap-2 p-2 border rounded-xl cursor-pointer transition-all text-center ${assetSelectorDialog.selectedIds.has(asset.id) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
							<input type="checkbox" class="hidden" checked={assetSelectorDialog.selectedIds.has(asset.id)} onchange={() => toggleAsset(asset.id)} />
							<div class="h-16 w-full flex items-center justify-center">
								<img src={asset.file_path} alt={asset.nombre} class="max-w-full max-h-full object-contain drop-shadow-sm" />
							</div>
							<div>
								<span class="text-[9px] font-bold uppercase block">{asset.tipo}</span>
								<span class="text-[9px] text-muted-foreground truncate w-full block" title={asset.nombre}>{asset.nombre}</span>
							</div>
						</label>
					{/each}
				</div>

				<div class="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
					<Button variant="outline" onclick={skipAssetSelection}>
						Omitir / Sin assets
					</Button>
					<Button class="bg-indigo-600 hover:bg-indigo-700 text-white" onclick={confirmAssetSelection}>
						Continuar al Prompt →
					</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
