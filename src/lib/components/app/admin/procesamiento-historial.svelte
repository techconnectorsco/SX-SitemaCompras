<script lang="ts">
    import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { RefreshCw, History, FileCheck, AlertCircle } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';

    interface Procesamiento {
        codigo: string;
        fechaRaw: string | number;
        usuario: string;
        totalSKUs: number;
        estado: string;
    }

    let historial = $state<Procesamiento[]>([]);
    let cargando = $state(true);
    let refrescando = $state(false);

    function parseFecha(fechaRaw: string | number) {
        if (!fechaRaw) return new Date();
        if (typeof fechaRaw === 'string' && fechaRaw.includes(' ')) {
            return new Date(fechaRaw.replace(' ', 'T'));
        }
        return new Date(fechaRaw);
    }

    function formatearFecha(fechaObj: Date) {
        return new Intl.DateTimeFormat('es-CR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(fechaObj);
    }

    async function cargarDatos() {
        try {
            // ✨ CAMBIO 1: Traemos 50 registros para justificar el scroll
            const res = await fetch('/api/admin/procesamiento/historial?limit=50');
            if (!res.ok) throw new Error('Error cargando historial');
            const data = await res.json();
            historial = data.historial || [];
        } catch (error) {
            console.error('Error:', error);
        } finally {
            cargando = false;
        }
    }

    async function refrescar() {
        refrescando = true;
        await cargarDatos();
        refrescando = false;
        toast.success('Historial actualizado');
    }

    onMount(() => {
        cargarDatos();
    });
</script>

<Card class="flex flex-col overflow-hidden">
    <CardHeader class="pb-3 border-b flex-none bg-white dark:bg-card z-20 rounded-t-lg">
        <div class="flex items-center justify-between">
            <div>
                <CardTitle class="text-lg flex items-center gap-2">
                    <History class="h-5 w-5 text-muted-foreground" />
                    Historial de Ejecuciones
                </CardTitle>
                <CardDescription>Últimos 50 registros del sistema</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onclick={refrescar} disabled={refrescando}>
                <RefreshCw class="h-4 w-4 {refrescando ? 'animate-spin' : ''}" />
            </Button>
        </div>
    </CardHeader>
    
    <div class="overflow-y-auto max-h-[400px] relative">
        <table class="w-full text-sm text-left">
            <thead class="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-muted-foreground font-medium border-b shadow-sm">
                <tr>
                    <th class="px-6 py-3 whitespace-nowrap">Estado</th>
                    <th class="px-6 py-3 whitespace-nowrap">Código Ref</th>
                    <th class="px-6 py-3 whitespace-nowrap">Fecha</th>
                    <th class="px-6 py-3 whitespace-nowrap">Usuario</th>
                    <th class="px-6 py-3 text-right whitespace-nowrap">Total SKUs</th>
                </tr>
            </thead>
            <tbody class="divide-y">
                {#if cargando}
                    {#each Array(5) as _}
                        <tr class="animate-pulse">
                            <td class="px-6 py-4"><div class="h-4 w-16 bg-muted rounded"></div></td>
                            <td class="px-6 py-4"><div class="h-4 w-24 bg-muted rounded"></div></td>
                            <td class="px-6 py-4"><div class="h-4 w-32 bg-muted rounded"></div></td>
                            <td class="px-6 py-4"><div class="h-4 w-20 bg-muted rounded"></div></td>
                            <td class="px-6 py-4"><div class="h-4 w-12 bg-muted rounded ml-auto"></div></td>
                        </tr>
                    {/each}
                {:else if historial.length > 0}
                    {#each historial as item}
                        <tr class="hover:bg-muted/30 transition-colors group">
                            <td class="px-6 py-3">
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    <FileCheck class="h-3 w-3" />
                                    OK
                                </span>
                            </td>
                            <td class="px-6 py-3 font-mono text-xs text-muted-foreground">
                                {item.codigo || '---'}
                            </td>
                            <td class="px-6 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {formatearFecha(parseFecha(item.fechaRaw))}
                            </td>
                            <td class="px-6 py-3">
                                <div class="flex items-center gap-2">
                                    <div class="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                                        {item.usuario ? item.usuario.substring(0, 2) : '??'}
                                    </div>
                                    <span class="font-medium text-xs md:text-sm">{item.usuario}</span>
                                </div>
                            </td>
                            <td class="px-6 py-3 text-right font-mono font-medium">
                                {item.totalSKUs.toLocaleString()}
                            </td>
                        </tr>
                    {/each}
                {:else}
                    <tr>
                        <td colspan="5" class="px-6 py-12 text-center flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <AlertCircle class="h-8 w-8 opacity-20" />
                            <p>No hay registros de procesamiento aún.</p>
                        </td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>
</Card>