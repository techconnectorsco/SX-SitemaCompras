<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Save, Loader2, Image, FileText, BookOpen, UploadCloud, Trash2, Download, X, Sparkles, File } from 'lucide-svelte';

  let { data = $bindable(), user = $bindable() } = $props();

  interface MarcaManual {
    id: number;
    nombre: string;
    file_path: string;
    file_name: string;
    mime_type: string;
    file_size: number;
    created_at: number;
  }

  interface Marca {
    id: number;
    nombre: string;
    prompt_sistema: string | null;
    manuales?: MarcaManual[];
  }

  let marcas = $state<Marca[]>([]);
  let loading = $state(true);
  let savingId = $state<number | null>(null);
  let editValues = $state<Record<number, string>>({});

  // Estado del Modal de Manual de Marca
  let activeModalMarca = $state<Marca | null>(null);
  let uploadingManual = $state(false);
  let deletingManualId = $state<number | null>(null);
  let manualFileInput = $state<HTMLInputElement | null>(null);
  let manualNameInput = $state('');

  onMount(() => {
    loadMarcas();
  });

  async function loadMarcas() {
    loading = true;
    try {
      const res = await fetch('/api/content-creator/marcas/prompts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar');
      marcas = data.marcas;
      for (const m of marcas) {
        editValues[m.id] = m.prompt_sistema ?? '';
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      loading = false;
    }
  }

  async function savePrompt(id: number) {
    savingId = id;
    try {
      const res = await fetch('/api/content-creator/marcas/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, prompt_sistema: editValues[id] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast.success('Prompt guardado correctamente');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      savingId = null;
    }
  }

  function openManualModal(marca: Marca) {
    activeModalMarca = marca;
    manualNameInput = '';
  }

  function closeManualModal() {
    activeModalMarca = null;
    manualNameInput = '';
  }

  async function handleManualUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !activeModalMarca) return;

    uploadingManual = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (manualNameInput.trim()) {
        formData.append('nombre', manualNameInput.trim());
      }

      const res = await fetch(`/api/content-creator/marcas/${activeModalMarca.id}/manual`, {
        method: 'POST',
        body: formData
      });
      const resData = await res.json();

      if (!res.ok) throw new Error(resData.error || 'Error al subir el manual');

      toast.success('Manual de marca subido correctamente');
      manualNameInput = '';
      if (manualFileInput) manualFileInput.value = '';

      // Actualizar el estado local de la marca
      const newManual: MarcaManual = resData.manual;
      if (!activeModalMarca.manuales) activeModalMarca.manuales = [];
      activeModalMarca.manuales = [newManual, ...activeModalMarca.manuales];

      // Sincronizar en la lista general de marcas
      const mIdx = marcas.findIndex((m) => m.id === activeModalMarca?.id);
      if (mIdx !== -1) {
        marcas[mIdx].manuales = activeModalMarca.manuales;
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      uploadingManual = false;
    }
  }

  async function deleteManual(manualId: number) {
    if (!activeModalMarca) return;
    deletingManualId = manualId;
    try {
      const res = await fetch(`/api/content-creator/marcas/${activeModalMarca.id}/manual/${manualId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');

      toast.success('Manual eliminado correctamente');

      // Actualizar lista local
      activeModalMarca.manuales = activeModalMarca.manuales?.filter((m) => m.id !== manualId);
      const mIdx = marcas.findIndex((m) => m.id === activeModalMarca?.id);
      if (mIdx !== -1) {
        marcas[mIdx].manuales = activeModalMarca.manuales;
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      deletingManualId = null;
    }
  }

  function formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
</script>

<div class="p-6 max-w-4xl mx-auto">
  <div class="flex items-center gap-3 mb-6">
    <div class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
      <Image class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
    </div>
    <div>
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">Prompts y Manuales de Marcas</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
        Configura los system prompts y sube manuales de marca (PDF, TXT, MD o imágenes) que Gemini utilizará directamente como contexto.
      </p>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-16">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
    </div>
  {:else}
    <div class="space-y-5">
      {#each marcas as marca (marca.id)}
        <div class="rounded-xl border border-slate-200 bg-card p-5 shadow-sm dark:border-slate-800">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-base font-bold text-slate-900 dark:text-white">
                  {marca.nombre}
                </span>
                {#if marca.manuales && marca.manuales.length > 0}
                  <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    <FileText class="h-3 w-3" />
                    {marca.manuales.length} manual{marca.manuales.length > 1 ? 'es' : ''} activo{marca.manuales.length > 1 ? 's' : ''}
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Sin manual adjunto
                  </span>
                {/if}
              </div>

              <!-- Botón Abrir Modal Manual de Marca -->
              <button
                type="button"
                onclick={() => openManualModal(marca)}
                class="flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
              >
                <BookOpen class="h-3.5 w-3.5" />
                Manual de Marca
              </button>
            </div>

            <div class="flex items-start gap-4">
              <div class="flex-1 min-w-0">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                  System Prompt (Instrucción de Estilo)
                </span>
                <textarea
                  bind:value={editValues[marca.id]}
                  class="w-full min-h-[90px] rounded-lg border border-input bg-background px-3 py-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-y"
                  placeholder="Instrucciones de tono, reglas de diseño y comportamiento de la IA para esta marca..."
                ></textarea>
              </div>

              <button
                type="button"
                onclick={() => savePrompt(marca.id)}
                disabled={savingId === marca.id}
                class="flex items-center gap-2 rounded-lg bg-[#253166] dark:bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1c264f] dark:hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0 mt-6 cursor-pointer shadow-sm"
              >
                {#if savingId === marca.id}
                  <Loader2 class="h-3.5 w-3.5 animate-spin" />
                {:else}
                  <Save class="h-3.5 w-3.5" />
                {/if}
                Guardar
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal para subir y gestionar Manuales de Marca -->
{#if activeModalMarca}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    onclick={closeManualModal}
  >
    <div 
      class="relative w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Botón de Cerrar Modal -->
      <button 
        type="button" 
        onclick={closeManualModal}
        class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
      >
        <X class="h-5 w-5" />
      </button>

      <!-- Encabezado del Modal -->
      <div class="flex items-center gap-3 pr-6">
        <div class="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
          <BookOpen class="h-6 w-6" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">
            Manual de Marca — {activeModalMarca.nombre}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Archivos contextuales oficiales que la IA (Gemini) leerá al generar gráficos y textos.
          </p>
        </div>
      </div>

      <!-- Banner Explicativo -->
      <div class="rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 p-3 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
        <Sparkles class="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <span>
          <strong>Procesamiento Inteligente:</strong> Al subir un PDF, TXT, MD o imagen con las guías visuales de {activeModalMarca.nombre}, Gemini recibirá este archivo de forma nativa para respetar la paleta de colores, tipografías y reglas de composición.
        </span>
      </div>

      <!-- Lista de Manuales Existentes -->
      <div class="space-y-2">
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Documentos de Marca Activos
        </span>

        {#if activeModalMarca.manuales && activeModalMarca.manuales.length > 0}
          <div class="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {#each activeModalMarca.manuales as manual (manual.id)}
              <div class="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="p-1.5 rounded bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-600 shrink-0">
                    {#if manual.mime_type?.includes('pdf')}
                      <FileText class="h-4 w-4" />
                    {:else if manual.mime_type?.startsWith('image/')}
                      <Image class="h-4 w-4" />
                    {:else}
                      <File class="h-4 w-4" />
                    {/if}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-slate-800 dark:text-slate-200 truncate" title={manual.nombre || manual.file_name}>
                      {manual.nombre || manual.file_name}
                    </p>
                    <p class="text-[10px] text-slate-400">
                      {manual.file_name} · {formatFileSize(manual.file_size)}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <a 
                    href={manual.file_path} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Ver / Descargar archivo"
                  >
                    <Download class="h-4 w-4" />
                  </a>

                  <button
                    type="button"
                    onclick={() => deleteManual(manual.id)}
                    disabled={deletingManualId === manual.id}
                    class="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 transition"
                    title="Eliminar manual"
                  >
                    {#if deletingManualId === manual.id}
                      <Loader2 class="h-4 w-4 animate-spin" />
                    {:else}
                      <Trash2 class="h-4 w-4" />
                    {/if}
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
            No se ha subido ningún manual de marca aún.
          </div>
        {/if}
      </div>

      <!-- Zona de Carga de Nuevo Manual -->
      <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Subir Nuevo Manual (PDF, TXT, MD, Imagen)
        </span>

        <div class="flex flex-col gap-2">
          <input 
            type="text" 
            bind:value={manualNameInput}
            placeholder="Título del documento (opcional, ej: Guía de Estilo 2026)"
            class="h-8.5 w-full rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          />

          <div class="flex items-center gap-2">
            <label class="flex-1 flex items-center justify-center gap-2 border border-dashed border-indigo-300 dark:border-indigo-800 rounded-lg p-3 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 cursor-pointer transition text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {#if uploadingManual}
                <Loader2 class="h-4 w-4 animate-spin text-indigo-600" />
                <span>Subiendo manual...</span>
              {:else}
                <UploadCloud class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Seleccionar Archivo (PDF, TXT, MD, PNG, JPG)</span>
              {/if}
              <input 
                bind:this={manualFileInput}
                type="file" 
                accept=".pdf,.txt,.md,image/png,image/jpeg,image/webp" 
                class="hidden" 
                onchange={handleManualUpload}
                disabled={uploadingManual}
              />
            </label>
          </div>
        </div>
      </div>

      <!-- Footer del Modal -->
      <div class="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onclick={closeManualModal}
          class="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
{/if}
