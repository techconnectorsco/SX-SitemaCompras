<script lang="ts">
    // ─── Mock data (reemplazar con queries de Supabase) ───────────────────────

    const allBots = [
        {
            id: 'bot_001',
            name: 'Bot_Contabilidad_v2',
            desc: 'Extracción y procesamiento de registros contables desde SAP Cloud',
            type: 'procesamiento',
            client: 'Empresa ABC',
            status: 'ejecutando',
            lastRun: 'Ahora mismo',
            nextRun: '12:00 PM',
            successRate: 98,
            runsToday: 3,
            totalRuns: 847,
        },
        {
            id: 'bot_002',
            name: 'Bot_Facturacion_SAP',
            desc: 'Generación y envío automatizado de facturas electrónicas en SAP',
            type: 'integracion',
            client: 'Empresa ABC',
            status: 'activo',
            lastRun: 'hace 2h',
            nextRun: '02:00 PM',
            successRate: 97,
            runsToday: 2,
            totalRuns: 1243,
        },
        {
            id: 'bot_003',
            name: 'Bot_Reportes_BI',
            desc: 'Generación de reportes analíticos y exportación automática a Power BI',
            type: 'reporte',
            client: 'XYZ Corp',
            status: 'activo',
            lastRun: 'hace 4h',
            nextRun: 'Mañana 08:00',
            successRate: 100,
            runsToday: 1,
            totalRuns: 365,
        },
        {
            id: 'bot_004',
            name: 'Bot_RRHH_Nomina',
            desc: 'Procesamiento de nómina y generación de recibos de pago por periodo',
            type: 'procesamiento',
            client: 'Tech Solutions',
            status: 'inactivo',
            lastRun: 'hace 1d',
            nextRun: 'Próximo viernes',
            successRate: 95,
            runsToday: 0,
            totalRuns: 156,
        },
        {
            id: 'bot_005',
            name: 'Bot_CRM_Sync',
            desc: 'Sincronización bidireccional de datos entre CRM y base de datos interna',
            type: 'integracion',
            client: 'XYZ Corp',
            status: 'error',
            lastRun: 'hace 3h',
            nextRun: 'Pendiente revisión',
            successRate: 72,
            runsToday: 1,
            totalRuns: 534,
        },
        {
            id: 'bot_006',
            name: 'Bot_Inventario_v1',
            desc: 'Actualización de inventario y emisión de alertas por stock mínimo',
            type: 'scraping',
            client: 'Distribuidora MX',
            status: 'activo',
            lastRun: 'hace 1h',
            nextRun: '04:00 PM',
            successRate: 99,
            runsToday: 4,
            totalRuns: 2100,
        },
    ] as const;

    type BotStatus = 'ejecutando' | 'activo' | 'inactivo' | 'error';

    // Estado reactivo
    let searchQuery = $state('');
    let statusFilter = $state<BotStatus | 'todos'>('todos');

    const filteredBots = $derived(
        allBots.filter(b => {
            const q = searchQuery.toLowerCase();
            const matchSearch = q === '' || b.name.toLowerCase().includes(q) || b.client.toLowerCase().includes(q);
            const matchStatus = statusFilter === 'todos' || b.status === statusFilter;
            return matchSearch && matchStatus;
        })
    );

    // Resumen de conteos
    const counts = $derived({
        todos:      allBots.length,
        ejecutando: allBots.filter(b => b.status === 'ejecutando').length,
        activo:     allBots.filter(b => b.status === 'activo').length,
        inactivo:   allBots.filter(b => b.status === 'inactivo').length,
        error:      allBots.filter(b => b.status === 'error').length,
    });

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const statusConfig: Record<BotStatus, { label: string; dot: string; badge: string }> = {
        ejecutando: { label: 'Ejecutando', dot: 'bg-blue-500 animate-pulse shadow-[0_0_6px_#3b82f6]',  badge: 'bg-blue-50 text-blue-700 border-blue-100' },
        activo:     { label: 'Activo',     dot: 'bg-emerald-500',                                       badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        inactivo:   { label: 'Inactivo',   dot: 'bg-slate-300',                                         badge: 'bg-slate-50 text-slate-500 border-slate-200' },
        error:      { label: 'Error',      dot: 'bg-red-500',                                            badge: 'bg-red-50 text-red-700 border-red-100' },
    };

    const typeConfig: Record<string, { label: string; color: string }> = {
        procesamiento: { label: 'Procesamiento', color: 'bg-violet-50 text-violet-700' },
        integracion:   { label: 'Integración',   color: 'bg-sky-50 text-sky-700' },
        reporte:       { label: 'Reporte',        color: 'bg-amber-50 text-amber-700' },
        scraping:      { label: 'Scraping',       color: 'bg-teal-50 text-teal-700' },
    };

    const filterTabs: { label: string; value: BotStatus | 'todos' }[] = [
        { label: 'Todos',      value: 'todos' },
        { label: 'Ejecutando', value: 'ejecutando' },
        { label: 'Activos',    value: 'activo' },
        { label: 'Inactivos',  value: 'inactivo' },
        { label: 'Error',      value: 'error' },
    ];
</script>

<div class="space-y-6 animate-fade-in">

    <!-- ─── Encabezado ─────────────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 class="text-3xl font-bold text-slate-900">Centro de Control</h1>
            <p class="text-slate-500 mt-1">Inventario de automatizaciones y estado operativo.</p>
        </div>
        <button class="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Registrar Bot
        </button>
    </div>

    <!-- ─── Barra de búsqueda + filtros ───────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row gap-3">
        <!-- Búsqueda -->
        <div class="relative flex-1">
            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
                type="text"
                placeholder="Buscar por nombre o cliente..."
                bind:value={searchQuery}
                class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
        </div>

        <!-- Chips de filtro -->
        <div class="flex items-center gap-2 flex-wrap">
            {#each filterTabs as tab}
                {@const countKey = tab.value === 'todos' ? 'todos' : tab.value === 'ejecutando' ? 'ejecutando' : tab.value === 'activo' ? 'activo' : tab.value === 'inactivo' ? 'inactivo' : 'error'}
                <button
                    onclick={() => statusFilter = tab.value}
                    class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all {
                        statusFilter === tab.value
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }"
                >
                    {tab.label}
                    <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold {statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}">
                        {counts[countKey]}
                    </span>
                </button>
            {/each}
        </div>
    </div>

    <!-- ─── Grid de Tarjetas de Bots ──────────────────────────────────────── -->
    {#if filteredBots.length === 0}
        <div class="py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center px-6">
            <div class="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
            <p class="text-slate-500 font-medium">Sin resultados para "<span class="text-slate-900">{searchQuery}</span>"</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {#each filteredBots as bot}
                {@const sc = statusConfig[bot.status]}
                {@const tc = typeConfig[bot.type]}
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">

                    <!-- Cabecera de la tarjeta -->
                    <div class="px-5 pt-5 pb-4 flex items-start gap-3 border-b border-slate-50">
                        <!-- Ícono del bot -->
                        <div class="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-sm font-bold text-slate-900 truncate">{bot.name}</h3>
                            <p class="text-xs text-slate-400 mt-0.5">{bot.client}</p>
                        </div>
                        <!-- Badge de estado -->
                        <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 {sc.badge}">
                            <span class="w-1.5 h-1.5 rounded-full {sc.dot}"></span>
                            {sc.label}
                        </span>
                    </div>

                    <!-- Cuerpo de la tarjeta -->
                    <div class="px-5 py-4 flex-1 space-y-4">
                        <!-- Descripción -->
                        <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">{bot.desc}</p>

                        <!-- Badges tipo + stats rápidos -->
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="px-2 py-0.5 rounded-lg text-[11px] font-semibold {tc.color}">{tc.label}</span>
                            <span class="text-[11px] text-slate-400">·</span>
                            <span class="text-[11px] text-slate-500">{bot.runsToday} corridas hoy</span>
                            <span class="text-[11px] text-slate-400">·</span>
                            <span class="text-[11px] text-slate-500">{bot.totalRuns.toLocaleString()} total</span>
                        </div>

                        <!-- Tasa de éxito -->
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="text-[11px] text-slate-500 font-medium">Tasa de éxito</span>
                                <span class="text-[11px] font-bold {bot.successRate >= 95 ? 'text-emerald-600' : bot.successRate >= 80 ? 'text-amber-600' : 'text-red-600'}">
                                    {bot.successRate}%
                                </span>
                            </div>
                            <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    class="h-full rounded-full transition-all {bot.successRate >= 95 ? 'bg-emerald-500' : bot.successRate >= 80 ? 'bg-amber-500' : 'bg-red-500'}"
                                    style="width: {bot.successRate}%"
                                ></div>
                            </div>
                        </div>

                        <!-- Tiempos -->
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-slate-50 rounded-xl px-3 py-2">
                                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Última ejecución</p>
                                <p class="text-xs font-semibold text-slate-700">{bot.lastRun}</p>
                            </div>
                            <div class="bg-slate-50 rounded-xl px-3 py-2">
                                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Próxima ejecución</p>
                                <p class="text-xs font-semibold text-slate-700">{bot.nextRun}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Acciones -->
                    <div class="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <button class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors {bot.status === 'ejecutando' ? 'opacity-60 cursor-not-allowed' : ''}">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                            </svg>
                            {bot.status === 'ejecutando' ? 'En curso' : 'Ejecutar'}
                        </button>
                        <a href="/logs" class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Logs
                        </a>
                        <button class="flex items-center justify-center p-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

</div>

<style>
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.45s ease-out forwards; }
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
