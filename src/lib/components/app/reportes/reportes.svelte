<script lang="ts">
  /**
   * Reportes y Exportaciones - Componente Principal
   * ✅ Incluye selector de procesamiento
   * ✅ Genera reportes en Excel con formato profesional
   * ✅ Dark mode corregido
   */
  import { onMount } from 'svelte';
  import { 
    FileSpreadsheet, 
    Download, 
    Calendar, 
    LoaderCircle, 
    ChevronDown,
    Clock,
    RefreshCw,
    TrendingUp,
    Package,
    AlertTriangle,
    BarChart3,
    FileText,
    DollarSign,
    Activity,
    Sparkles,
    Info,
    ShoppingCart
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  let { data = $bindable(), user = $bindable() } = $props();

  // ===== TYPES =====
  interface ProcesamientoDisponible {
    codigo: string;
    fecha: string;
    usuario: string;
    totalSKUs: number;
  }

  interface Reporte {
    id: string;
    nombre: string;
    descripcion: string;
    icono: any;
    color: string;
    darkColor: string;
    bgColor: string;
    darkBgColor: string;
    disponible: boolean;
    tooltip?: string;
  }

  // ===== STATE =====
  let cargando = $state(true);
  let generandoReporte = $state<string | null>(null);
  let procesamientosDisponibles = $state<ProcesamientoDisponible[]>([]);
  let procesamientoSeleccionado = $state('');
  let mostrarSelectorProcesamiento = $state(false);
  let metadataProcesamiento = $state<{ codigo: string | null; fecha: string | null; usuario: string; totalSKUs: number }>({ 
    codigo: null, 
    fecha: null, 
    usuario: '',
    totalSKUs: 0
  });

  // ===== REPORTES DISPONIBLES =====
  const reportes: Reporte[] = [
    {
      id: 'skus-con-pedido',
      nombre: 'SKUs con Pedido Sugerido',
      descripcion: 'Todos los SKUs que requieren reposición según el sistema (Courier, Aéreo o Marítimo). Incluye cantidades calculadas y costos.',
      icono: ShoppingCart,
      color: 'text-blue-600',
      darkColor: 'dark:text-blue-400',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      darkBgColor: 'dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800',
      disponible: true
    },
    {
      id: 'analisis-8020',
      nombre: 'Análisis 80/20 (Pareto)',
      descripcion: 'SKUs ordenados por importancia según promedio 6 meses. Incluye acumulado de ventas y clasificación ABC.',
      icono: TrendingUp,
      color: 'text-emerald-600',
      darkColor: 'dark:text-emerald-400',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
      darkBgColor: 'dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:border-emerald-800',
      disponible: true
    },
    {
      id: 'abc-rotacion',
      nombre: 'Análisis ABC y Rotación',
      descripcion: 'Clasificación ABC por valor y rotación por frecuencia de ventas. Incluye estadísticas por categoría.',
      icono: BarChart3,
      color: 'text-purple-600',
      darkColor: 'dark:text-purple-400',
      bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      darkBgColor: 'dark:bg-purple-950/30 dark:hover:bg-purple-950/50 dark:border-purple-800',
      disponible: true
    },
    {
      id: 'sugerencias-analista',
      nombre: 'Pedido del Analista con Precios',
      descripcion: 'SKUs editados y pedidos por el analista (Courier y Aéreo) con costos unitarios y valor total del pedido.',
      icono: DollarSign,
      color: 'text-amber-600',
      darkColor: 'dark:text-amber-400',
      bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
      darkBgColor: 'dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:border-amber-800',
      disponible: true
    },
    {
      id: 'antiguedad-skus',
      nombre: 'Antigüedad SKUs (Sin Movimiento)',
      descripcion: 'Artículos sin ventas en los últimos 12 meses, con existencia disponible.',
      icono: AlertTriangle,
      color: 'text-red-600',
      darkColor: 'dark:text-red-400',
      bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
      darkBgColor: 'dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:border-red-800',
      disponible: true
    },
    {
      id: 'productos-nuevos',
      nombre: 'Productos Nuevos con Ventas',
      descripcion: 'SKUs agregados recientemente (últimos 6 meses) que ya están generando ventas. Útil para evaluar nuevos productos.',
      icono: Sparkles,
      color: 'text-cyan-600',
      darkColor: 'dark:text-cyan-400',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
      darkBgColor: 'dark:bg-cyan-950/30 dark:hover:bg-cyan-950/50 dark:border-cyan-800',
      disponible: true
    },
    {
      id: 'productos-reactivados',
      nombre: 'Productos Reactivados',
      descripcion: 'Inventario antiguo (1+ año) que volvió a vender recientemente. Identifica oportunidades en productos dormidos.',
      icono: Activity,
      color: 'text-indigo-600',
      darkColor: 'dark:text-indigo-400',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
      darkBgColor: 'dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:border-indigo-800',
      disponible: true
    }
  ];

  // ===== FUNCIONES =====
  async function cargarProcesamientos() {
    try {
      const res = await fetch('/api/compras/procesados?limit=1');
      if (!res.ok) throw new Error('Error al cargar procesamientos');
      
      const data = await res.json();
      
      procesamientosDisponibles = data.procesamientosDisponibles || [];
      
      if (procesamientosDisponibles.length > 0) {
        const ultimo = procesamientosDisponibles[0];
        procesamientoSeleccionado = ultimo.codigo;
        metadataProcesamiento = {
          codigo: ultimo.codigo,
          fecha: ultimo.fecha,
          usuario: ultimo.usuario,
          totalSKUs: ultimo.totalSKUs
        };
      }
    } catch (error) {
      console.error('Error cargando procesamientos:', error);
      toast.error('Error al cargar procesamientos');
    } finally {
      cargando = false;
    }
  }

  function seleccionarProcesamiento(proc: ProcesamientoDisponible) {
    procesamientoSeleccionado = proc.codigo;
    metadataProcesamiento = {
      codigo: proc.codigo,
      fecha: proc.fecha,
      usuario: proc.usuario,
      totalSKUs: proc.totalSKUs
    };
    mostrarSelectorProcesamiento = false;
    toast.success(`Procesamiento ${proc.codigo} seleccionado`);
  }

  function formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function generarReporte(reporteId: string) {
    if (!procesamientoSeleccionado) {
      toast.error('Seleccione un procesamiento primero');
      return;
    }

    generandoReporte = reporteId;
    
    try {
      const res = await fetch(`/api/compras/reportes?tipo=${reporteId}&procesamiento=${procesamientoSeleccionado}`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al generar reporte');
      }

      // Obtener el blob del archivo
      const blob = await res.blob();
      
      // Crear link de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Obtener nombre del archivo desde header o generar uno
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `reporte-${reporteId}-${procesamientoSeleccionado}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Reporte descargado exitosamente');
      
    } catch (error) {
      console.error('Error generando reporte:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar reporte');
    } finally {
      generandoReporte = null;
    }
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    cargarProcesamientos();
  });
</script>

<div class="flex flex-col h-full p-6 space-y-6 overflow-auto bg-white dark:bg-slate-950">
  <!-- HEADER -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="p-2.5 rounded-xl bg-[#0D1E3D]/10 dark:bg-blue-900/30">
        <FileSpreadsheet class="h-6 w-6 text-[#0D1E3D] dark:text-blue-400" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Reportes y Exportaciones</h1>
        <p class="text-sm text-muted-foreground dark:text-slate-400">Genera reportes en Excel del procesamiento seleccionado</p>
      </div>
    </div>

    <!-- SELECTOR DE PROCESAMIENTO -->
    <div class="relative">
      <button
        onclick={() => mostrarSelectorProcesamiento = !mostrarSelectorProcesamiento}
        class="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:border-[#0D1E3D]/50 dark:hover:border-blue-500/50 transition-colors min-w-[280px]"
      >
        <Calendar class="h-4 w-4 text-slate-400 dark:text-slate-500" />
        <div class="flex-1 text-left">
          {#if cargando}
            <span class="text-sm text-slate-400 dark:text-slate-500">Cargando...</span>
          {:else if procesamientoSeleccionado}
            <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{procesamientoSeleccionado}</span>
            <span class="block text-xs text-slate-400 dark:text-slate-500">{formatearFecha(metadataProcesamiento.fecha)}</span>
          {:else}
            <span class="text-sm text-slate-400 dark:text-slate-500">Seleccionar procesamiento</span>
          {/if}
        </div>
        <ChevronDown class="h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform {mostrarSelectorProcesamiento ? 'rotate-180' : ''}" />
      </button>

      {#if mostrarSelectorProcesamiento}
        <div class="absolute right-0 mt-2 w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-[400px] overflow-hidden">
          <div class="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div class="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Clock class="h-4 w-4" />
              Procesamientos Disponibles
            </div>
          </div>
          <div class="max-h-80 overflow-y-auto">
            {#each procesamientosDisponibles as proc}
              <button
                onclick={() => seleccionarProcesamiento(proc)}
                class="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 {procesamientoSeleccionado === proc.codigo ? 'bg-blue-50 dark:bg-blue-950/30' : ''}"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{proc.codigo}</span>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-slate-400 dark:text-slate-500">{formatearFecha(proc.fecha)}</span>
                      <span class="text-xs text-slate-300 dark:text-slate-600">•</span>
                      <span class="text-xs text-slate-400 dark:text-slate-500">{proc.usuario}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {proc.totalSKUs.toLocaleString('es-CR')} SKUs
                    </span>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- INFO DEL PROCESAMIENTO -->
  {#if metadataProcesamiento.codigo}
    <div class="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
      <div class="p-2 rounded-lg bg-[#0D1E3D]/10 dark:bg-blue-900/30">
        <Info class="h-5 w-5 text-[#0D1E3D] dark:text-blue-400" />
      </div>
      <div class="flex-1">
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Generando reportes del procesamiento <strong class="text-[#0D1E3D] dark:text-blue-400">{metadataProcesamiento.codigo}</strong>
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {metadataProcesamiento.totalSKUs.toLocaleString('es-CR')} SKUs procesados • {formatearFecha(metadataProcesamiento.fecha)}
        </p>
      </div>
      <button
        onclick={() => cargarProcesamientos()}
        class="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
        title="Actualizar lista"
      >
        <RefreshCw class="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </button>
    </div>
  {/if}

  <!-- GRID DE REPORTES -->
  {#if cargando}
    <div class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <LoaderCircle class="h-8 w-8 animate-spin text-[#0D1E3D] dark:text-blue-400" />
        <p class="text-sm text-muted-foreground dark:text-slate-400">Cargando reportes disponibles...</p>
      </div>
    </div>
  {:else if procesamientosDisponibles.length === 0}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4 max-w-md">
        <div class="p-4 rounded-full bg-slate-100 dark:bg-slate-800 w-fit mx-auto">
          <FileText class="h-12 w-12 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200">No hay procesamientos disponibles</h3>
        <p class="text-sm text-muted-foreground dark:text-slate-400">
          Ejecute un procesamiento desde el panel de administración para generar reportes.
        </p>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {#each reportes as reporte}
        <div
          class="group relative flex flex-col p-5 rounded-xl border-2 transition-all duration-200 {reporte.bgColor} {reporte.darkBgColor} {reporte.disponible ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}"
        >
          <!-- ICONO Y TITULO -->
          <div class="flex items-start gap-4 mb-4">
            <div class="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm group-hover:shadow-md transition-shadow">
              <!-- svelte-ignore svelte_component_deprecated -->
              <svelte:component this={reporte.icono} class="h-6 w-6 {reporte.color} {reporte.darkColor}" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 leading-tight">{reporte.nombre}</h3>
            </div>
          </div>

          <!-- DESCRIPCION -->
          <p class="text-sm text-slate-600 dark:text-slate-300 mb-5 flex-1 leading-relaxed">
            {reporte.descripcion}
          </p>

          <!-- BOTON DE DESCARGA -->
          <button
            onclick={() => reporte.disponible && generarReporte(reporte.id)}
            disabled={!reporte.disponible || generandoReporte !== null}
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
              {reporte.disponible 
                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-800 hover:text-white dark:hover:bg-slate-700 shadow-sm border border-transparent dark:border-slate-700' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if generandoReporte === reporte.id}
              <LoaderCircle class="h-4 w-4 animate-spin" />
              <span>Generando...</span>
            {:else}
              <Download class="h-4 w-4" />
              <span>Descargar Excel</span>
            {/if}
          </button>

          <!-- BADGE DE ESTADO -->
          {#if !reporte.disponible}
            <div class="absolute top-3 right-3">
              <span class="px-2 py-1 text-[10px] font-semibold uppercase rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                Próximamente
              </span>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- NOTA INFORMATIVA -->
    <div class="mt-auto pt-6">
      <div class="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900">
        <Info class="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
        <div class="text-sm text-blue-700 dark:text-blue-300">
          <p class="font-medium mb-1">Sobre los reportes</p>
          <p class="text-blue-600/80 dark:text-blue-400/80">
            Los reportes se generan a partir de los datos del procesamiento seleccionado. 
            Para obtener datos actualizados, solicite un nuevo procesamiento al administrador.
            Los archivos Excel incluyen formato profesional con encabezados, filtros y estilos.
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>

{#if mostrarSelectorProcesamiento}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-40" onclick={() => mostrarSelectorProcesamiento = false}></div>
{/if}