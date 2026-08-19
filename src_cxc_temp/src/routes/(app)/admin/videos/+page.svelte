<script lang="ts">
	import { onMount } from 'svelte';
	// import SidebarAdmin from '$lib/components/app/admin/SidebarAdmin.svelte'; // componente pendiente
	// import VideoModal from '$lib/components/app/admin/VideoModal.svelte'; // componente pendiente
	// import VideoTable from '$lib/components/app/admin/VideoTable.svelte'; // componente pendiente

	let showModal = $state(false);
	let selectedVideo = $state<any>(null);
	let videos = $state<any[]>([]);
	let loading = $state(true);

	onMount(async () => {
		await loadVideos();
	});

	async function loadVideos() {
		loading = true;
		try {
			const response = await fetch('/api/admin/videos');
			if (response.ok) {
				videos = await response.json();
			} else {
				console.error('Error cargando videos');
			}
		} catch (error) {
			console.error('Error cargando videos:', error);
		} finally {
			loading = false;
		}
	}

	function handleAddClick() {
		selectedVideo = null;
		showModal = true;
	}

	function handleEdit(video: any) {
		selectedVideo = video;
		showModal = true;
	}

	async function handleSave(formData: any) {
		// console.log('handleSave ejecutado con:', formData);
		try {
			if (selectedVideo) {
				// Actualizar existente
				// console.log('Actualizando video:', selectedVideo.id);
				const response = await fetch(`/api/admin/videos/${selectedVideo.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				});
				
				// console.log('Response status:', response.status);
				if (response.ok) {
					const updated = await response.json();
					const index = videos.findIndex((v) => v.id === selectedVideo.id);
					if (index !== -1) {
						videos[index] = updated;
						videos = videos;
					}
				}
			} else {
				// Crear nuevo
				// console.log('Creando nuevo video');
				const response = await fetch('/api/admin/videos', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				});
				
				// console.log('Response status:', response.status);
				if (response.ok) {
					const newVideo = await response.json();
					// console.log('Video creado:', newVideo);
					videos = [newVideo, ...videos];
				} else {
					const error = await response.json();
					console.error('Error response:', error);
				}
			}
			
			showModal = false;
			selectedVideo = null;
		} catch (error) {
			// console.error('Error guardando:', error);
			alert('Error al guardar. Intenta de nuevo.');
		}
	}

	async function handleToggleVisible(id: number, es_visible: boolean) {
		try {
			const video = videos.find((v) => v.id === id);
			if (!video) return;
			
			const response = await fetch(`/api/admin/videos/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...video, es_visible })
			});
			
			if (response.ok) {
				const updated = await response.json();
				const index = videos.findIndex((v) => v.id === id);
				if (index !== -1) {
					videos[index] = updated;
					videos = videos;
				}
			}
		} catch (error) {
			console.error('Error cambiando visibilidad:', error);
			alert('Error al cambiar visibilidad. Intenta de nuevo.');
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('¿Estás seguro de eliminar este video?')) return;

		try {
			const response = await fetch(`/api/admin/videos/${id}`, {
				method: 'DELETE'
			});
			
			if (response.ok) {
				videos = videos.filter((v) => v.id !== id);
			} else {
				alert('Error al eliminar el video');
			}
		} catch (error) {
			console.error('Error eliminando video:', error);
			alert('Error al eliminar. Intenta de nuevo.');
		}
	}
</script>

<div class="min-h-screen bg-background">
	<!-- <SidebarAdmin /> -->

	<!-- Main Content - Con margen para el sidebar flotante -->
	<main class="pl-80 pr-8 py-8">
		<!-- Encabezado -->
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Gestión de Videos</h1>
				<p class="text-muted-foreground mt-1">Administra videos publicitarios de empresas</p>
			</div>
			<button
				onclick={handleAddClick}
				class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center gap-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Agregar Video
			</button>
		</div>

		<!-- Tabla -->
		<div class="bg-card rounded-lg shadow">
			{#if loading}
				<div class="flex justify-center items-center py-12">
					<div class="animate-spin">
						<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</div>
				</div>
			{:else}
				<!-- <VideoTable ... /> -->
			<div class="p-8 text-center text-muted-foreground">Tabla de videos (componente pendiente)</div>
			{/if}
		</div>
	</main>
</div>

<!-- VideoModal: componente pendiente -->
