<script lang="ts">
  /**
   * @module Alertas
   * @description Vista de alertas con Header detallado y Scroll Natural
   */
  
  import { onMount, onDestroy } from 'svelte'; // ✅ CAMBIO: Agregar onDestroy
  import { 
    Bell, 
    AlertTriangle, 
    XCircle, 
    Info,
    RefreshCw,
    Loader2,
    ChevronDown,
    ChevronUp,
    Clock,
    Search,
    X,
    Truck,
    Plane,
    User
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { Input } from '$lib/components/ui/input';

  // ===== TYPES =====
  interface Alerta {
    alerta_id: string;
    id: number;
    tipo: 'critico' | 'advertencia' | 'info';
    categoria: string;
    codigo_sku: string;
    descripcion: string;
    linea: string;
    marca: string;
    abc: string;
    rotacion: string;
    existencia: number;
    transito: number;
    stock_seguridad: number;
    promedio_ajustado: number;
    coeficiente_variacion: number;
    frecuencia_ventas_12m: number;
    mensaje: string;
    detalle: string;
    accion_sugerida: string;
  }

  interface Resumen {
    critico: number;
    advertencia: number;
    info: number;
    total: number;
    pedirCourier: number;
    pedirAereo: number;
  }

  // ===== PROPS =====
  let { data = $bindable(), user = $bindable() } = $props(); // ✅ SVELTE 5: $props()

  // ===== STATE =====
  let cargando = $state(true); // ✅ SVELTE 5: $state()
  let alertas = $state<Alerta[]>([]); // ✅ SVELTE 5: $state()
  let resumen = $state<Resumen>({ critico: 0, advertencia: 0, info: 0, total: 0, pedirCourier: 0, pedirAereo: 0 }); // ✅ SVELTE 5: $state()
  let metadata = $state<{ fecha: string | null; usuario: string }>({ fecha: null, usuario: '' }); // ✅ SVELTE 5: $state()
  let totalFiltrado = $state(0); // ✅ SVELTE 5: $state()

  // Filtros
  let tipoFiltro = $state(''); // ✅ SVELTE 5: $state()
  let categoriaFiltro = $state(''); // ✅ SVELTE 5: $state()
  let abcFiltro = $state(''); // ✅ SVELTE 5: $state()
  let busqueda = $state(''); // ✅ SVELTE 5: $state()

  // Expansión
  let alertaExpandida = $state<string | null>(null); // ✅ SVELTE 5: $state()

  // ===== FUNCIONES =====
  async function cargarAlertas(reset = true) {
    cargando = true;
    
    try {
      const params = new URLSearchParams();
      if (tipoFiltro) params.set('tipo', tipoFiltro);
      if (categoriaFiltro) params.set('categoria', categoriaFiltro);
      if (abcFiltro) params.set('abc', abcFiltro);
      if (busqueda) params.set('search', busqueda);
      
      params.set('_t', Date.now().toString());

      const res = await fetch(`/api/alertas?${params}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' }
      });
      
      if (!res.ok) throw new Error('Error al cargar alertas');
      
      const data = await res.json();
      
      alertas = data.alertas || [];
      resumen = data.resumen || { critico: 0, advertencia: 0, info: 0, total: 0, pedirCourier: 0, pedirAereo: 0 };
      metadata = data.metadata || { fecha: null, usuario: '' };
      totalFiltrado = data.totalFiltrado || 0;
      
      if (reset) {
        alertaExpandida = null;
      }
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar alertas');
    } finally {
      cargando = false;
    }
  }

  function filtrarPorTipo(tipo: string) {
    tipoFiltro = tipoFiltro === tipo ? '' : tipo;
    categoriaFiltro = ''; 
    cargarAlertas();
  }

  function filtrarPorCategoria(categoria: string) {
    categoriaFiltro = categoriaFiltro === categoria ? '' : categoria;
    tipoFiltro = ''; 
    cargarAlertas();
  }

  function limpiarFiltros() {
    tipoFiltro = '';
    categoriaFiltro = '';
    abcFiltro = '';
    busqueda = '';
    cargarAlertas();
  }

  function buscar() {
    cargarAlertas();
  }

  function toggleExpansion(alertaId: string) {
    alertaExpandida = alertaExpandida === alertaId ? null : alertaId;
  }

  function getTipoConfig(tipo: Alerta['tipo']) {
    const configs = {
      critico: {
        icon: XCircle,
        bgCard: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
        bgBadge: 'bg-red-500',
        textColor: 'text-red-700 dark:text-red-300',
        label: 'Crítico'
      },
      advertencia: {
        icon: AlertTriangle,
        bgCard: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        bgBadge: 'bg-amber-500',
        textColor: 'text-amber-700 dark:text-amber-300',
        label: 'Advertencia'
      },
      info: {
        icon: Info,
        bgCard: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        bgBadge: 'bg-blue-500',
        textColor: 'text-blue-700 dark:text-blue-300',
        label: 'Información'
      }
    };
    return configs[tipo];
  }

  function getABCColor(abc: string): string {
    const colors: Record<string, string> = {
      'A': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'B': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'C': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'E': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[abc] || 'bg-gray-100 text-gray-800';
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    cargarAlertas();
  });

  // ✅ CAMBIO: Limpiar recursos al desmontar
  onDestroy(() => {
    // Limpiar arrays grandes
    alertas = [];
    resumen = { critico: 0, advertencia: 0, info: 0, total: 0, pedirCourier: 0, pedirAereo: 0 };
    metadata = { fecha: null, usuario: '' };
    
    // Limpiar estado de expansión
    alertaExpandida = null;
    
    console.log('[alertas] ✅ Recursos liberados');
  });
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
  
  <div class="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sistema de Alertas
          </h1>
          <span class="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs font-bold border border-orange-200 dark:border-orange-800">
            {resumen.total} Total
          </span>
        </div>
        
        <div class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
          {#if metadata.fecha}
            <div class="flex items-center gap-1.5">
              <Clock class="h-3.5 w-3.5" />
              <span class="font-semibold text-slate-700 dark:text-slate-300">Procesado:</span>
              {new Date(metadata.fecha).toLocaleString('es-CR', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
              })}
            </div>
            <div class="h-3 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
            <div class="flex items-center gap-1.5">
              <User class="h-3.5 w-3.5" />
              <span class="font-semibold text-slate-700 dark:text-slate-300">Por:</span>
              {metadata.usuario || 'Sistema'}
            </div>
          {/if}
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
          onclick={() => cargarAlertas()} 
          disabled={cargando}
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw class="h-4 w-4 {cargando ? 'animate-spin' : ''}" />
          Actualizar
        </button>
        
        <div class="bg-orange-50 dark:bg-slate-900 p-2.5 rounded-full border border-orange-100 dark:border-slate-800">
          <Bell class="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
      </div>

    </div>
  </div>

  <div class="p-4 md:px-6 bg-slate-50 dark:bg-slate-950">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      
      <button 
        onclick={() => filtrarPorTipo('critico')} 
        class="flex flex-col items-center justify-center p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5
               {tipoFiltro === 'critico' ? 'border-red-500 ring-1 ring-red-500 bg-red-50/10' : 'border-slate-200 dark:border-slate-800'}"
      >
        <div class="flex items-center gap-2 mb-1">
          <XCircle class="h-5 w-5 text-red-600" />
          <span class="text-2xl font-bold text-slate-900 dark:text-white">{resumen.critico}</span>
        </div>
        <span class="text-xs font-semibold text-slate-500 uppercase">Críticas</span>
      </button>

      <button 
        onclick={() => filtrarPorTipo('advertencia')} 
        class="flex flex-col items-center justify-center p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5
               {tipoFiltro === 'advertencia' ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/10' : 'border-slate-200 dark:border-slate-800'}"
      >
        <div class="flex items-center gap-2 mb-1">
          <AlertTriangle class="h-5 w-5 text-amber-600" />
          <span class="text-2xl font-bold text-slate-900 dark:text-white">{resumen.advertencia}</span>
        </div>
        <span class="text-xs font-semibold text-slate-500 uppercase">Alertas</span>
      </button>

      <button 
        onclick={() => filtrarPorTipo('info')}
        class="flex flex-col items-center justify-center p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5
               {tipoFiltro === 'info' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-slate-200 dark:border-slate-800'}"
      >
        <div class="flex items-center gap-2 mb-1">
          <Info class="h-5 w-5 text-blue-600" />
          <span class="text-2xl font-bold text-slate-900 dark:text-white">{resumen.info}</span>
        </div>
        <span class="text-xs font-semibold text-slate-500 uppercase">Info</span>
      </button>

      <button 
        onclick={() => filtrarPorCategoria('pedir_courier')} 
        class="flex flex-col items-center justify-center p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5
               {categoriaFiltro === 'pedir_courier' ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50/10' : 'border-slate-200 dark:border-slate-800'}"
      >
        <div class="flex items-center gap-2 mb-1">
          <Truck class="h-5 w-5 text-orange-600" />
          <span class="text-2xl font-bold text-slate-900 dark:text-white">{resumen.pedirCourier}</span>
        </div>
        <span class="text-xs font-semibold text-slate-500 uppercase">Courier</span>
      </button>

      <button 
        onclick={() => filtrarPorCategoria('pedir_aereo')}
        class="flex flex-col items-center justify-center p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5
               {categoriaFiltro === 'pedir_aereo' ? 'border-purple-500 ring-1 ring-purple-500 bg-purple-50/10' : 'border-slate-200 dark:border-slate-800'}"
      >
        <div class="flex items-center gap-2 mb-1">
          <Plane class="h-5 w-5 text-purple-600" />
          <span class="text-2xl font-bold text-slate-900 dark:text-white">{resumen.pedirAereo}</span>
        </div>
        <span class="text-xs font-semibold text-slate-500 uppercase">Aéreo</span>
      </button>

    </div>
  </div>

  <div class="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-t border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 shadow-sm">
    <div class="flex flex-col md:flex-row gap-3 max-w-6xl mx-auto">
      
      <div class="relative flex-1">
        <Input
          type="text"
          placeholder="Buscar SKU, descripción..."
          bind:value={busqueda}
          onkeyup={(e) => e.key === 'Enter' && buscar()}
          class="h-10 pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 transition-colors"
        />
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      <div class="flex items-center gap-2">
        <select 
          bind:value={abcFiltro}
          onchange={() => cargarAlertas()} 
          class="h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm min-w-20 focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">ABC</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>

        {#if tipoFiltro || categoriaFiltro || abcFiltro || busqueda}
          <button 
            onclick={limpiarFiltros} 
            class="h-10 px-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1"
          >
            <X class="h-4 w-4" />
            <span class="hidden sm:inline">Limpiar</span>
          </button>
        {/if}
      </div>

    </div>
    
    <div class="mt-2 text-xs text-slate-500 max-w-6xl mx-auto flex justify-between items-center">
      <span>Resultados encontrados: <strong>{alertas.length}</strong></span>
      {#if tipoFiltro || categoriaFiltro}
        <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
          Filtro: {tipoFiltro || categoriaFiltro}
        </span>
      {/if}
    </div>
  </div>

  <div class="p-4 md:px-6 max-w-6xl mx-auto">
    
    {#if cargando && alertas.length === 0}
      <div class="flex flex-col items-center justify-center py-32">
        <Loader2 class="h-10 w-10 animate-spin text-slate-300" />
        <p class="text-sm text-slate-400 mt-4">Consultando datos del último procesamiento...</p>
      </div>
    {:else if alertas.length === 0}
      <div class="flex flex-col items-center justify-center py-20 text-center opacity-60">
        <div class="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Bell class="h-8 w-8 text-slate-400" />
        </div>
        <h3 class="text-lg font-medium text-slate-900 dark:text-white">Sin alertas</h3>
        <p class="text-sm text-slate-500">No se encontraron resultados con los filtros actuales.</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each alertas as alerta (alerta.alerta_id)}
          {@const tipoConfig = getTipoConfig(alerta.tipo)}
          {@const TipoIcon = tipoConfig.icon}
          
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 group">
            
            <button 
              onclick={() => toggleExpansion(alerta.alerta_id)} 
              class="w-full p-4 text-left flex flex-col sm:flex-row sm:items-center gap-4 relative"
            >
              <div class="absolute left-0 top-0 bottom-0 w-1 {tipoConfig.bgBadge}"></div>

              <div class="flex items-center gap-3 min-w-[180px] pl-2">
                <div class="h-10 w-10 rounded-full {tipoConfig.bgBadge} flex items-center justify-center text-white shadow-sm shrink-0">
                  <TipoIcon class="h-5 w-5" />
                </div>
                <div>
                   <div class="flex items-center gap-2">
                     <span class="font-mono font-bold text-base {tipoConfig.textColor}">{alerta.codigo_sku}</span>
                     <span class="text-[10px] px-1.5 py-0.5 rounded font-bold {getABCColor(alerta.abc)}">{alerta.abc}</span>
                   </div>
                   <div class="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{alerta.marca || 'Sin Marca'}</div>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {alerta.descripcion}
                </p>
                <div class="flex flex-wrap gap-2 mt-1.5">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold {tipoConfig.bgBadge} text-white">
                    {alerta.mensaje}
                  </span>
                  {#if alerta.transito > 0}
                     <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                       Tránsito: {alerta.transito}
                     </span>
                  {/if}
                  {#if alerta.rotacion}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      Rot: {alerta.rotacion}
                    </span>
                  {/if}
                </div>
              </div>

              <div class="flex-none hidden sm:block">
                 {#if alertaExpandida === alerta.alerta_id}
                    <ChevronUp class="h-5 w-5 text-slate-300" />
                 {:else}
                    <ChevronDown class="h-5 w-5 text-slate-300" />
                 {/if}
              </div>
            </button>
            
            {#if alertaExpandida === alerta.alerta_id}
              <div class="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 p-4 animate-in slide-in-from-top-2 duration-200">
                
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                   <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                      <span class="text-[10px] uppercase text-slate-400 font-semibold">Existencia</span>
                      <div class="text-lg font-bold text-slate-800 dark:text-slate-100">{alerta.existencia}</div>
                   </div>
                   <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                      <span class="text-[10px] uppercase text-slate-400 font-semibold">Stock Seguridad</span>
                      <div class="text-lg font-bold text-slate-800 dark:text-slate-100">{alerta.stock_seguridad}</div>
                   </div>
                   <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                      <span class="text-[10px] uppercase text-slate-400 font-semibold">Promedio Mes</span>
                      <div class="text-lg font-bold text-slate-800 dark:text-slate-100">{alerta.promedio_ajustado.toFixed(1)}</div>
                   </div>
                   <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                      <span class="text-[10px] uppercase text-slate-400 font-semibold">Frecuencia</span>
                      <div class="text-lg font-bold text-slate-800 dark:text-slate-100">{alerta.frecuencia_ventas_12m}<span class="text-xs text-slate-400 font-normal">/12</span></div>
                   </div>
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">Análisis del Sistema</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 leading-relaxed shadow-sm">
                      {alerta.detalle}
                    </p>
                    {#if alerta.linea}
                      <p class="mt-2 text-xs text-slate-400">Línea: {alerta.linea}</p>
                    {/if}
                  </div>
                  <div>
                    <h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">Acción Recomendada</h4>
                    <div class="flex items-start gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div class="mt-0.5">
                         {#if alerta.tipo === 'critico'}
                            <AlertTriangle class="h-4 w-4 text-red-500" />
                         {:else}
                            <Info class="h-4 w-4 text-blue-500" />
                         {/if}
                      </div>
                      <p class="text-sm font-medium {tipoConfig.textColor}">
                        {alerta.accion_sugerida}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            {/if}

          </div>
        {/each}
      </div>
    {/if}
  </div>

</div>