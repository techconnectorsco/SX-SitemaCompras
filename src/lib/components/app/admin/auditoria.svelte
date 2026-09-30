<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { FileSearch, Activity, ShoppingCart, UserCog, Loader2, AlertCircle, User, FileSpreadsheet, Search, X, Filter } from 'lucide-svelte';
  import { fade } from 'svelte/transition';

  let { data = $bindable(), user = $bindable() } = $props();

  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let activeTab = $state('auth');

  // ===== FILTROS =====
  let searchTerm = $state('');
  let filtroUsuario = $state('');
  let filtroAccion = $state('');

  let logs = $state({
    auth: [] as any[],
    compras: [] as any[],
    process: [] as any[],
    profile: [] as any[],
    reportes: [] as any[]  // ✅ NUEVO
  });

  // ===== DATOS FILTRADOS =====
  let logsFiltrados = $derived.by(() => {
    const currentLogs = logs[activeTab as keyof typeof logs] || [];
    
    return currentLogs.filter((log: any) => {
      // Filtro de búsqueda general
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchFields = [
          log.user_email,
          log.user_name,
          log.details,
          log.action,
          log.product_info?.codigo_sku,
          log.product_info?.descripcion
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!matchFields.includes(search)) return false;
      }

      // Filtro por usuario
      if (filtroUsuario) {
        const userMatch = [log.user_email, log.user_name].filter(Boolean).join(' ').toLowerCase();
        if (!userMatch.includes(filtroUsuario.toLowerCase())) return false;
      }

      // Filtro por acción
      if (filtroAccion && log.action !== filtroAccion) return false;

      return true;
    });
  });

  // ===== ACCIONES DISPONIBLES POR PESTAÑA =====
  const accionesPorTab: Record<string, { value: string; label: string }[]> = {
    auth: [
      { value: 'LOGIN', label: 'Login' },
      { value: 'LOGOUT', label: 'Logout' },
      { value: 'LOGIN_FAILED', label: 'Login Fallido' },
      { value: 'REGISTER', label: 'Registro' },
      { value: 'PASSWORD_RESET', label: 'Reset Contraseña' }
    ],
    compras: [
      { value: 'COMPRAS_UPDATE', label: 'Actualización' },
      { value: 'COMPRAS_SAVE_CHANGES', label: 'Guardado' },
      { value: 'COMPRAS_UPDATE_ERROR', label: 'Error' },
      { value: 'COMPRAS_EXPORT_HUSQVARNA', label: 'Export Husqvarna' },
      { value: 'COMPRAS_EXPORT_OTROS', label: 'Export Otros' }
    ],
    process: [
      { value: 'FORECAST_PROCESS_START', label: 'Iniciado' },
      { value: 'FORECAST_PROCESS_COMPLETE', label: 'Completado' },
      { value: 'FORECAST_PROCESS_ERROR', label: 'Error' }
    ],
    profile: [
      { value: 'PROFILE_UPDATE', label: 'Actualización Perfil' },
      { value: 'PASSWORD_CHANGE', label: 'Cambio Contraseña' },
      { value: 'USER_BANNED', label: 'Usuario Baneado' },
      { value: 'USER_PROMOTED', label: 'Usuario Promovido' }
    ],
    reportes: [
      { value: 'REPORT_DOWNLOAD', label: 'Descarga Exitosa' },
      { value: 'REPORT_DOWNLOAD_ERROR', label: 'Error Descarga' }
    ]
  };

  // ===== LIMPIAR FILTROS AL CAMBIAR DE TAB =====
  $effect(() => {
    // Reset filtros cuando cambia la pestaña
    activeTab;
    filtroAccion = '';
  });

  const hayFiltrosActivos = $derived(
    searchTerm !== '' || 
    filtroUsuario !== '' || 
    filtroAccion !== ''
  );

  function limpiarFiltros() {
    searchTerm = '';
    filtroUsuario = '';
    filtroAccion = '';
  }

  onMount(async () => {
    try {
      const response = await fetch('/api/admin/audit');
      
      if (!response.ok) {
        if (response.status === 403) throw new Error('No tienes permisos de administrador.');
        throw new Error('Error al cargar datos del servidor.');
      }

      const result = await response.json();
      logs = result;
    } catch (err: any) {
      error = err.message || 'Error desconocido';
    } finally {
      isLoading = false;
    }
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-CR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getBadgeColor = (action: string) => {
    if (action.includes('ERROR') || action.includes('FAILED') || action.includes('BANNED')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('LOGIN') || action.includes('COMPLETE') || action.includes('DOWNLOAD')) return 'bg-green-100 text-green-800 border-green-200';
    if (action.includes('UPDATE') || action.includes('RESET') || action.includes('CHANGE')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProcessLabel = (action: string) => {
    if (action === 'FORECAST_PROCESS_START') return 'Procesamiento Iniciado';
    if (action === 'FORECAST_PROCESS_COMPLETE') return 'Procesamiento Completado';
    if (action === 'FORECAST_PROCESS_ERROR') return 'Error en Procesamiento';
    return action.replace('FORECAST_PROCESS_', '');
  };

  const getProfileLabel = (action: string) => {
    if (action === 'PROFILE_UPDATE') return 'Actualización de Perfil';
    if (action === 'PASSWORD_CHANGE') return 'Cambio de Contraseña';
    return action;
  };

  const extractProcCode = (details: string) => {
    const match = details?.match(/(PROC-[^\s|]+)/);
    return match ? match[1] : 'N/D';
  };

  // ✅ NUEVO: Extraer info del reporte
  const extractReportInfo = (details: string) => {
    const reporteMatch = details?.match(/Reporte: ([^|]+)/);
    const procesamientoMatch = details?.match(/Procesamiento: ([^|]+)/);
    const archivoMatch = details?.match(/Archivo: (.+)$/);
    
    return {
      reporte: reporteMatch ? reporteMatch[1].trim() : 'Desconocido',
      procesamiento: procesamientoMatch ? procesamientoMatch[1].trim() : 'N/D',
      archivo: archivoMatch ? archivoMatch[1].trim() : ''
    };
  };

  onDestroy(() => {
    logs = { auth: [], compras: [], process: [], profile: [], reportes: [] };
    error = null;
    activeTab = 'auth';
    limpiarFiltros();
    
    console.log('[auditoria] Recursos liberados');
  });
</script>

<div class="flex flex-col h-full w-full space-y-4 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border">
  
  <!-- HEADER -->
  <div class="flex items-center justify-between border-b pb-4">
    <div class="flex items-center gap-3">
        <div class="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <FileSearch class="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Auditoría del Sistema</h2>
            <p class="text-sm text-gray-500">Registro histórico de eventos y seguridad</p>
        </div>
    </div>
    
    <!-- TABS -->
    <div class="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button 
            onclick={() => activeTab = 'auth'}
            class="px-3 py-2 text-sm font-medium rounded-md transition-all {activeTab === 'auth' ? 'bg-white text-orange-600 shadow dark:bg-gray-700 dark:text-orange-400' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-1.5">
            <UserCog size={15} /> Accesos
        </button>
        <button 
            onclick={() => activeTab = 'compras'}
            class="px-3 py-2 text-sm font-medium rounded-md transition-all {activeTab === 'compras' ? 'bg-white text-orange-600 shadow dark:bg-gray-700 dark:text-orange-400' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-1.5">
            <ShoppingCart size={15} /> Compras
        </button>
        <button 
            onclick={() => activeTab = 'process'}
            class="px-3 py-2 text-sm font-medium rounded-md transition-all {activeTab === 'process' ? 'bg-white text-orange-600 shadow dark:bg-gray-700 dark:text-orange-400' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-1.5">
            <Activity size={15} /> Procesos
        </button>
        <button 
            onclick={() => activeTab = 'profile'}
            class="px-3 py-2 text-sm font-medium rounded-md transition-all {activeTab === 'profile' ? 'bg-white text-orange-600 shadow dark:bg-gray-700 dark:text-orange-400' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-1.5">
            <User size={15} /> Perfil
        </button>
        <button 
            onclick={() => activeTab = 'reportes'}
            class="px-3 py-2 text-sm font-medium rounded-md transition-all {activeTab === 'reportes' ? 'bg-white text-orange-600 shadow dark:bg-gray-700 dark:text-orange-400' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-1.5">
            <FileSpreadsheet size={15} /> Reportes
        </button>
    </div>
  </div>

  <!-- BARRA DE FILTROS -->
  <div class="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <Filter size={16} />
      <span class="font-medium">Filtros:</span>
    </div>

    <!-- Búsqueda general -->
    <div class="relative flex-1 min-w-[200px] max-w-[300px]">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Buscar en todo..."
        class="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </div>

    <!-- Filtro por usuario -->
    <div class="relative min-w-[150px]">
      <input
        type="text"
        bind:value={filtroUsuario}
        placeholder="Usuario..."
        class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </div>

    <!-- Filtro por acción (adaptativo) -->
    <select
      bind:value={filtroAccion}
      class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
    >
      <option value="">Todas las acciones</option>
      {#each accionesPorTab[activeTab] || [] as accion}
        <option value={accion.value}>{accion.label}</option>
      {/each}
    </select>

    <!-- Botón limpiar -->
    {#if hayFiltrosActivos}
      <button
        onclick={limpiarFiltros}
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
      >
        <X size={14} />
        Limpiar
      </button>
    {/if}

    <!-- Contador de resultados -->
    <div class="ml-auto text-sm text-gray-500 dark:text-gray-400">
      {logsFiltrados.length} registro{logsFiltrados.length !== 1 ? 's' : ''}
      {#if hayFiltrosActivos}
        <span class="text-orange-500">(filtrado)</span>
      {/if}
    </div>
  </div>

  <!-- CONTENIDO -->
  <div class="flex-1 overflow-auto relative min-h-[400px]">
    
    {#if isLoading}
        <div class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10">
            <Loader2 class="h-10 w-10 text-orange-500 animate-spin mb-4" />
            <p class="text-sm text-gray-500">Cargando registros de auditoría...</p>
        </div>
    {:else if error}
        <div class="flex flex-col items-center justify-center h-full text-red-500">
            <AlertCircle class="h-10 w-10 mb-2" />
            <p>{error}</p>
        </div>
    {:else}
        
        <!-- TAB: ACCESOS -->
        {#if activeTab === 'auth'}
            <div in:fade={{ duration: 200 }}>
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0 z-0">
                        <tr>
                            <th class="px-6 py-3">Fecha</th>
                            <th class="px-6 py-3">Usuario</th>
                            <th class="px-6 py-3">Acción</th>
                            <th class="px-6 py-3">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if logsFiltrados.length === 0}
                             <tr><td colspan="4" class="p-4 text-center text-gray-500">No hay registros que coincidan.</td></tr>
                        {/if}
                        {#each logsFiltrados as log}
                            <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td class="px-6 py-4 font-mono text-xs whitespace-nowrap text-gray-500">{formatDate(log.created_at)}</td>
                                <td class="px-6 py-4">
                                    {#if log.user_email}
                                        <div class="flex flex-col">
                                            <span class="font-medium text-gray-900 dark:text-white">{log.user_name || 'Sin nombre'}</span>
                                            <span class="text-xs text-gray-500">{log.user_email}</span>
                                        </div>
                                    {:else}
                                        <span class="text-gray-400 italic">Anónimo / Sistema</span>
                                    {/if}
                                </td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full border {getBadgeColor(log.action)}">
                                        {log.action}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">
                                    {log.details || '-'}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}

        <!-- TAB: COMPRAS -->
        {#if activeTab === 'compras'}
            <div in:fade={{ duration: 200 }}>
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0 z-0">
                        <tr>
                            <th class="px-6 py-3">Fecha</th>
                            <th class="px-6 py-3">Proceso</th>
                            <th class="px-6 py-3">Analista</th>
                            <th class="px-6 py-3">Producto (SKU)</th>
                            <th class="px-6 py-3">Cambio Realizado</th>
                            <th class="px-6 py-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if logsFiltrados.length === 0}
                            <tr><td colspan="6" class="p-8 text-center text-gray-500">No hay registros que coincidan.</td></tr>
                        {/if}
                        {#each logsFiltrados as log}
                            <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td class="px-6 py-4 font-mono text-xs text-gray-500">{formatDate(log.created_at)}</td>
                                <td class="px-6 py-4 font-mono text-xs text-orange-700 dark:text-orange-300">
                                    {extractProcCode(log.details)}
                                </td>
                                <td class="px-6 py-4">
                                    <span class="font-medium text-gray-900 dark:text-white">{log.user_email || 'Desconocido'}</span>
                                </td>
                               <td class="px-6 py-4 bg-orange-50/50 dark:bg-orange-900/10">
                                  {#if log.action.includes('EXPORT')}
                                      <div class="flex flex-col">
                                          <span class="font-bold text-blue-700 dark:text-blue-400">
                                              {#if log.action.includes('HUSQVARNA')}
                                                  📦 Exportación Husqvarna
                                              {:else if log.action.includes('OTROS')}
                                                  📦 Exportación Otras Líneas
                                              {:else}
                                                  📦 Exportación
                                              {/if}
                                          </span>
                                          <span class="text-xs text-gray-500">
                                              {log.details?.match(/SKUs: ([^.]+)/)?.[1] || 'Ver detalles'}
                                          </span>
                                      </div>
                                  {:else if log.product_info}
                                      <div class="flex flex-col">
                                          <span class="font-bold text-orange-700 dark:text-orange-400">{log.product_info.codigo_sku}</span>
                                          <span class="text-xs text-gray-500 truncate max-w-[200px]" title={log.product_info.descripcion}>
                                              {log.product_info.descripcion}
                                          </span>
                                      </div>
                                  {:else}
                                      <div class="flex flex-col text-gray-400 italic text-xs">
                                          <span>ID: {log.forecast_id || 'N/A'}</span>
                                          <span>(Producto no encontrado)</span>
                                      </div>
                                  {/if}
                              </td>
                                <td class="px-6 py-4 text-xs">
                                    <div class="bg-gray-100 dark:bg-gray-800 p-2 rounded border font-mono">
                                        {log.details.replace(/Actualizado por .*?:/, '').trim()}
                                    </div>
                                </td>
                               <td class="px-6 py-4">
                                  <span class="px-2 py-1 text-xs font-semibold rounded-full border {getBadgeColor(log.action)}">
                                      {#if log.action.includes('ERROR')}
                                          ERROR
                                      {:else}
                                          EXITOSO
                                      {/if}
                                  </span>
                              </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}

        <!-- TAB: PROCESOS -->
        {#if activeTab === 'process'}
            <div in:fade={{ duration: 200 }}>
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0 z-0">
                        <tr>
                            <th class="px-6 py-3">Inicio</th>
                            <th class="px-6 py-3">Acción de Proceso</th>
                            <th class="px-6 py-3">Estado</th>
                            <th class="px-6 py-3 w-1/2">Resultado / Error</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if logsFiltrados.length === 0}
                             <tr><td colspan="4" class="p-4 text-center text-gray-500">No hay registros que coincidan.</td></tr>
                        {/if}
                        {#each logsFiltrados as log}
                            <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-700">
                                <td class="px-6 py-4 font-mono text-xs">{formatDate(log.created_at)}</td>
                                <td class="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                                     {getProcessLabel(log.action)}
                                </td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full border {getBadgeColor(log.action)}">
                                        {log.action.split('_').pop()}
                                    </span>
                                </td>
                                <td class="px-6 py-4 font-mono text-xs text-gray-600">
                                    {log.details}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}

        <!-- TAB: PERFIL -->
        {#if activeTab === 'profile'}
            <div in:fade={{ duration: 200 }}>
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0 z-0">
                        <tr>
                            <th class="px-6 py-3">Fecha</th>
                            <th class="px-6 py-3">Usuario</th>
                            <th class="px-6 py-3">Acción</th>
                            <th class="px-6 py-3">Detalles</th>
                            <th class="px-6 py-3">IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if logsFiltrados.length === 0}
                            <tr><td colspan="5" class="p-4 text-center text-gray-500">No hay registros que coincidan.</td></tr>
                        {/if}
                        {#each logsFiltrados as log}
                            <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td class="px-6 py-4 font-mono text-xs whitespace-nowrap text-gray-500">{formatDate(log.created_at)}</td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-col">
                                        <span class="font-medium text-gray-900 dark:text-white">{log.user_name || 'Sin nombre'}</span>
                                        <span class="text-xs text-gray-500">{log.user_email}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full border {getBadgeColor(log.action)}">
                                        {getProfileLabel(log.action)}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-gray-600 dark:text-gray-300 text-xs">
                                    {log.details || '-'}
                                </td>
                                <td class="px-6 py-4 font-mono text-xs text-gray-400">
                                    {log.ip_address || '-'}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}

        <!-- TAB: REPORTES (NUEVO) -->
        {#if activeTab === 'reportes'}
            <div in:fade={{ duration: 200 }}>
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 sticky top-0 z-0">
                        <tr>
                            <th class="px-6 py-3">Fecha</th>
                            <th class="px-6 py-3">Usuario</th>
                            <th class="px-6 py-3">Reporte</th>
                            <th class="px-6 py-3">Procesamiento</th>
                            <th class="px-6 py-3">Archivo</th>
                            <th class="px-6 py-3">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if logsFiltrados.length === 0}
                            <tr><td colspan="6" class="p-4 text-center text-gray-500">No hay registros de descargas de reportes.</td></tr>
                        {/if}
                        {#each logsFiltrados as log}
                            {@const reportInfo = extractReportInfo(log.details)}
                            <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td class="px-6 py-4 font-mono text-xs whitespace-nowrap text-gray-500">{formatDate(log.created_at)}</td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-col">
                                        <span class="font-medium text-gray-900 dark:text-white">{log.user_name || 'Sin nombre'}</span>
                                        <span class="text-xs text-gray-500">{log.user_email}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2">
                                        <FileSpreadsheet class="h-4 w-4 text-green-600" />
                                        <span class="font-medium text-gray-900 dark:text-white">{reportInfo.reporte}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4 font-mono text-xs text-orange-700 dark:text-orange-300">
                                    {reportInfo.procesamiento}
                                </td>
                                <td class="px-6 py-4 text-xs text-gray-500 font-mono">
                                    {reportInfo.archivo || '-'}
                                </td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full border {getBadgeColor(log.action)}">
                                        {#if log.action.includes('ERROR')}
                                            ERROR
                                        {:else}
                                            DESCARGADO
                                        {/if}
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    {/if}
  </div>
</div>