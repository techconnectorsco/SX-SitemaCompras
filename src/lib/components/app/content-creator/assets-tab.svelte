<script lang="ts">
    import { toast } from 'svelte-sonner';
    import { Button } from '$lib/components/ui/button';
    import * as Card from '$lib/components/ui/card';
    import { Tag, Trash2, Upload, Loader2, Image as ImageIcon, Sparkles } from 'lucide-svelte';
    import type { MarcaAsset } from '$lib/features/content-creator/types';

    let { catalogos } = $props<{ catalogos: any }>();

    let selectedMarcaId = $state<number | null>(null);
    let filterType = $state<string>('todos');
    let assets = $state<MarcaAsset[]>([]);
    let loading = $state(false);
    let uploading = $state(false);
    
    let uploadFileInput = $state<HTMLInputElement | null>(null);
    let uploadName = $state('');
    let uploadType = $state<'logo' | 'isotipo' | 'sello' | 'fondo' | 'other'>('logo');

    // Cargar assets al cambiar la marca
    $effect(() => {
        if (selectedMarcaId) {
            fetchAssets(selectedMarcaId);
        } else {
            assets = [];
        }
    });

    const filteredAssets = $derived.by(() => {
        if (filterType === 'todos') return assets;
        return assets.filter(a => a.tipo === filterType);
    });

    async function fetchAssets(marcaId: number) {
        loading = true;
        try {
            const res = await fetch(`/api/content-creator/marcas/${marcaId}/assets`);
            const data = await res.json();
            if (data.success) {
                assets = data.assets;
            } else {
                toast.error(data.error || 'Error al cargar assets');
            }
        } catch (e) {
            toast.error('Error de red al cargar assets');
        } finally {
            loading = false;
        }
    }

    async function handleUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        if (!selectedMarcaId) {
            toast.error('Selecciona una marca primero');
            return;
        }

        const file = input.files[0];
        // Límite 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error('El archivo no puede exceder los 5MB');
            return;
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Formato no soportado (usa PNG, JPG, WEBP o SVG)');
            return;
        }

        // Sugerir nombre sin extensión
        if (!uploadName) {
            uploadName = file.name.replace(/\.[^/.]+$/, "");
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('nombre', uploadName || 'Sin título');
        formData.append('tipo', uploadType);

        uploading = true;
        try {
            const res = await fetch(`/api/content-creator/marcas/${selectedMarcaId}/assets`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success && data.asset) {
                assets = [data.asset, ...assets];
                toast.success('Asset subido correctamente');
                uploadName = '';
                if (uploadFileInput) uploadFileInput.value = '';
            } else {
                toast.error(data.error || 'Error al subir asset');
            }
        } catch (e) {
            toast.error('Error de red al subir asset');
        } finally {
            uploading = false;
        }
    }

    async function deleteAsset(assetId: number) {
        if (!confirm('¿Estás seguro de eliminar este asset?')) return;
        if (!selectedMarcaId) return;

        try {
            const res = await fetch(`/api/content-creator/marcas/${selectedMarcaId}/assets/${assetId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                assets = assets.filter(a => a.id !== assetId);
                toast.success('Asset eliminado');
            } else {
                toast.error(data.error || 'Error al eliminar');
            }
        } catch (e) {
            toast.error('Error de red al eliminar');
        }
    }

    function triggerUpload() {
        if (!selectedMarcaId) {
            toast.error('Selecciona una marca en el dropdown superior para subir assets.');
            return;
        }
        if (!uploadName) {
            toast.warning('Escribe un nombre para el asset antes de seleccionar el archivo.');
            return;
        }
        uploadFileInput?.click();
    }
</script>

<div class="space-y-6">
    <Card.Root class="border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
            <div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Tag class="h-5 w-5 text-indigo-500" />
                    Brand Assets Manager
                </h3>
                <p class="text-sm text-slate-500 mt-1 dark:text-slate-400">
                    Gestiona logotipos, sellos de garantía y fondos estandarizados por marca.
                </p>
            </div>
            <div class="w-full sm:w-64">
                <select 
                    bind:value={selectedMarcaId} 
                    class="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                    <option value={null} class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">-- Selecciona una marca --</option>
                    {#each catalogos.marcas as marca}
                        <option value={marca.id} class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{marca.nombre}</option>
                    {/each}
                </select>
            </div>
        </div>

        {#if selectedMarcaId}
            <!-- Controles de subida y filtrado -->
            <div class="grid lg:grid-cols-[1fr_300px] gap-6 mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <!-- Filtros -->
                <div class="flex flex-col justify-center">
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filtrar por tipo:</span>
                    <div class="flex flex-wrap gap-2">
                        {#each ['todos', 'logo', 'isotipo', 'sello', 'fondo', 'other'] as tipo}
                            <button
                                type="button"
                                onclick={() => filterType = tipo}
                                class={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filterType === tipo ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-950 border text-slate-600 hover:bg-slate-100 dark:text-slate-400'}`}
                            >
                                {tipo}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Formulario de Subida Rápida -->
                <div class="space-y-3 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0">
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Subir nuevo asset</span>
                    <div class="space-y-2">
                        <input 
                            type="text" 
                            bind:value={uploadName} 
                            placeholder="Nombre del asset (ej. Logo Blanco)"
                            class="w-full h-8 text-xs px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                        />
                        <select 
                            bind:value={uploadType}
                            class="w-full h-8 text-xs px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
                        >
                            <option value="logo" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Logo Completo</option>
                            <option value="isotipo" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Isotipo (Símbolo)</option>
                            <option value="sello" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sello / Insignia</option>
                            <option value="fondo" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Fondo / Textura</option>
                            <option value="other" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Otro elemento</option>
                        </select>
                        <Button 
                            class="w-full h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white" 
                            onclick={triggerUpload}
                            disabled={uploading}
                        >
                            {#if uploading}
                                <Loader2 class="h-3.5 w-3.5 mr-2 animate-spin" />
                                Subiendo...
                            {:else}
                                <Upload class="h-3.5 w-3.5 mr-2" />
                                Subir Asset
                            {/if}
                        </Button>
                        <input type="file" bind:this={uploadFileInput} accept="image/png, image/jpeg, image/webp, image/svg+xml" class="hidden" onchange={handleUpload} />
                        <p class="text-[9px] text-slate-400 text-center">PNG, JPG, WEBP, SVG - Max 5MB</p>
                    </div>
                </div>
            </div>

            <!-- Grilla de Assets -->
            {#if loading}
                <div class="py-12 flex justify-center items-center text-slate-500">
                    <Loader2 class="h-6 w-6 animate-spin mr-2" />
                    <span class="text-sm font-semibold">Cargando assets...</span>
                </div>
            {:else if filteredAssets.length === 0}
                <div class="py-12 flex flex-col justify-center items-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <ImageIcon class="h-10 w-10 mb-3 opacity-50" />
                    <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay assets disponibles</p>
                    <p class="text-xs mt-1">Sube el primero usando el formulario de arriba.</p>
                </div>
            {:else}
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {#each filteredAssets as asset (asset.id)}
                        <div class="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 overflow-hidden flex flex-col hover:shadow-md transition-all">
                            
                            <!-- Botón Eliminar (Aparece en hover) -->
                            <button 
                                type="button"
                                class="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                                onclick={() => deleteAsset(asset.id)}
                                title="Eliminar asset"
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                            </button>

                            <!-- Badge de tipo -->
                            <div class="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase z-10">
                                {asset.tipo}
                            </div>

                            <!-- Preview (Checkboard background para transparencias) -->
                            <div class="aspect-square w-full relative flex items-center justify-center p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjBmMGYwIi8+CjxyZWN0IHg9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz4KPHJlY3QgeT0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2ZmZiIvPgo8cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjBmMGYwIi8+Cjwvc3ZnPg==')]">
                                <img src={asset.file_path} alt={asset.nombre} class="max-w-full max-h-full object-contain filter drop-shadow-sm" />
                            </div>

                            <!-- Info Footer -->
                            <div class="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-center">
                                <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={asset.nombre}>{asset.nombre}</p>
                                <p class="text-[9px] text-slate-500 uppercase mt-0.5 font-mono truncate">{asset.file_name}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else}
            <!-- Empty state sin marca seleccionada -->
            <div class="py-16 text-center text-slate-500">
                <p class="text-sm font-semibold">Selecciona una marca en la parte superior para ver y gestionar sus assets.</p>
            </div>
        {/if}
    </Card.Root>
</div>
