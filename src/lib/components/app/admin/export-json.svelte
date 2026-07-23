<script lang="ts">
  /**
   * Componente para exportar procesamientos a JSON (PowerBI) para el admin.
   */
  import { onMount } from 'svelte';
  import { Card } from '$lib/components/ui/card';
  import { toast } from 'svelte-sonner';
  import { FileJson, Download, Copy, Check, Loader2, RefreshCw, ExternalLink } from 'lucide-svelte';

  interface Procesamiento {
    codigo: string;
    fecha: string;
    usuario: string;
    total_skus: number;
  }

  let procesamientos = $state<Procesamiento[]>([]);
  let cargando = $state(true);
  let descargando = $state(false);
  let copiado = $state(false);
  let procesamientoSeleccionado = $state('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  async function cargarProcesamientos() {
    cargando = true;
    try {
      const res = await fetch('/api/admin/export-procesamiento?listar=true');
      if (!res.ok) throw new Error('Error al cargar procesamientos');
      
      const data = await res.json();
      procesamientos = data.procesamientos || [];
      
      // Seleccionar el primero por defecto
      if (procesamientos.length > 0 && !procesamientoSeleccionado) {
        procesamientoSeleccionado = procesamientos[0].codigo;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar procesamientos');
    } finally {
      cargando = false;
    }
  }

  async function descargarJSON() {
    if (!procesamientoSeleccionado) {
      toast.warning('Seleccione un procesamiento');
      return;
    }

    descargando = true;
    try {
      const url = `/api/admin/export-procesamiento?codigo=${procesamientoSeleccionado}&formato=download`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Error al descargar');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') 
        || `procesamiento_${procesamientoSeleccionado}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast.success('JSON descargado correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al descargar JSON');
    } finally {
      descargando = false;
    }
  }

  function copiarURL() {
    const url = `${baseUrl}/api/admin/export-procesamiento`;
    navigator.clipboard.writeText(url);
    copiado = true;
    toast.success('URL copiada al portapapeles');
    
    setTimeout(() => {
      copiado = false;
    }, 2000);
  }

  function formatFecha(fechaISO: string): string {
    return new Date(fechaISO).toLocaleString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onMount(() => {
    cargarProcesamientos();
  });
</script>

<Card class="overflow-hidden border-purple-100 dark:border-purple-900 shadow-sm">
  <div class="bg-purple-50/50 dark:bg-purple-950/20 p-6 border-b border-purple-100 dark:border-purple-900/50">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      
      <div class="flex items-start gap-4">
        <div class="rounded-lg bg-white dark:bg-purple-950 p-3 shadow-sm ring-1 ring-purple-100 dark:ring-purple-900">
          <FileJson class="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 class="font-semibold text-lg">Exportar para PowerBI</h3>
          <p class="text-sm text-muted-foreground max-w-lg">
            Descargue procesamientos completos en formato JSON para análisis en PowerBI u otras herramientas.
          </p>
        </div>
      </div>

      <button 
        onclick={cargarProcesamientos}
        disabled={cargando}
        class="p-2 rounded-lg border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        title="Actualizar lista"
      >
        <RefreshCw class="h-4 w-4 {cargando ? 'animate-spin' : ''}" />
      </button>
    </div>
  </div>

  <div class="p-6 space-y-6">
    
    {#if cargando}
      <div class="flex items-center justify-center py-8">
        <Loader2 class="h-6 w-6 animate-spin text-purple-600" />
        <span class="ml-2 text-sm text-muted-foreground">Cargando procesamientos...</span>
      </div>
    {:else if procesamientos.length === 0}
      <div class="text-center py-8 text-muted-foreground">
        <FileJson class="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No hay procesamientos disponibles</p>
        <p class="text-xs">Ejecute un procesamiento de forecast primero</p>
      </div>
    {:else}
      <!-- Selector de procesamiento -->
      <div class="space-y-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Seleccionar Procesamiento
        </label>
        <select 
          bind:value={procesamientoSeleccionado}
          class="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          {#each procesamientos as proc}
            <option value={proc.codigo}>
              {proc.codigo} — {formatFecha(proc.fecha)} — {proc.total_skus.toLocaleString()} SKUs
            </option>
          {/each}
        </select>
      </div>

      <!-- Info del procesamiento seleccionado -->
      {#if procesamientoSeleccionado}
        {@const procInfo = procesamientos.find(p => p.codigo === procesamientoSeleccionado)}
        {#if procInfo}
          <div class="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Código</p>
              <p class="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">{procInfo.codigo}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Fecha</p>
              <p class="text-sm font-medium">{formatFecha(procInfo.fecha)}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total SKUs</p>
              <p class="text-sm font-bold">{procInfo.total_skus.toLocaleString()}</p>
            </div>
          </div>
        {/if}
      {/if}

      <!-- Acciones -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          onclick={descargarJSON}
          disabled={descargando || !procesamientoSeleccionado}
          class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold
                 bg-purple-600 hover:bg-purple-700 text-white
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors shadow-sm"
        >
          {#if descargando}
            <Loader2 class="h-4 w-4 animate-spin" />
            Descargando...
          {:else}
            <Download class="h-4 w-4" />
            Descargar JSON
          {/if}
        </button>

        <button
          onclick={() => window.open(`/api/admin/export-procesamiento?codigo=${procesamientoSeleccionado}`, '_blank')}
          disabled={!procesamientoSeleccionado}
          class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold
                 bg-slate-100 hover:bg-slate-200 text-slate-700
                 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors"
        >
          <ExternalLink class="h-4 w-4" />
          Ver en navegador
        </button>
      </div>

      <!-- URL para PowerBI -->
     <!-- <div class="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div class="flex items-start gap-3">
          <div class="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded">
            <FileJson class="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
           <div class="flex-1 space-y-2">
            <p class="text-sm font-medium text-amber-800 dark:text-amber-300">URL para PowerBI (último procesamiento)</p>
            <p class="text-xs text-amber-700 dark:text-amber-400">
              Use esta URL para conectar PowerBI. Siempre devolverá el procesamiento más reciente.
            </p>
            <div class="flex items-center gap-2 mt-2">
              <code class="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                {baseUrl}/api/admin/export-procesamiento
              </code>
              <button
                onclick={copiarURL}
                class="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900 transition-colors"
                title="Copiar URL"
              >
                {#if copiado}
                  <Check class="h-4 w-4 text-green-600" />
                {:else}
                  <Copy class="h-4 w-4 text-amber-700 dark:text-amber-400" />
                {/if}
              </button>
            </div>
            <p class="text-[10px] text-amber-600 dark:text-amber-500 italic mt-1">
              Nota: PowerBI necesitará autenticación. Consulte con el equipo de TI para configurar el acceso.
            </p>
          </div> 
        </div>
      </div>-->
    {/if}
  </div>
</Card>