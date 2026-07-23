<script lang="ts">
    import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { 
        Database, Archive, RefreshCw, 
        AlertTriangle, FileClock, 
        Loader2, Server, Lock
    } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';

    interface Backup {
        nombre: string;
        tamaño: string;
        fecha: string;
    }

    let backups = $state<Backup[]>([]);
    let directorio = $state('');
    let cargando = $state(true);
    let procesando = $state(false);
    let refrescando = $state(false);

    // Modal Restauración
    let modalRestaurar = $state(false);
    let backupSel = $state<Backup | null>(null);
    let confirmacionTexto = $state('');
    
    async function cargarBackups() {
        try {
            const res = await fetch('/api/admin/backup');
            if (res.ok) {
                const data = await res.json();
                backups = data.backups || [];
                directorio = data.directorio;
            }
        } catch (e) {
            toast.error('Error al listar backups del servidor');
        } finally {
            cargando = false;
            refrescando = false;
        }
    }

    async function crearBackup() {
        procesando = true;
        try {
            const res = await fetch('/api/admin/backup', {
                method: 'POST',
                body: JSON.stringify({ action: 'create' })
            });
            const data = await res.json();
            
            if (res.ok) {
                toast.success('Respaldo guardado en disco del servidor');
                await cargarBackups();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            toast.error('Error creando respaldo');
        } finally {
            procesando = false;
        }
    }

    async function restaurarBackup() {
        if (!backupSel || confirmacionTexto !== 'RESTAURAR AHORA') return;
        
        procesando = true;
        try {
            const res = await fetch('/api/admin/backup', {
                method: 'POST',
                body: JSON.stringify({ action: 'restore', backupNombre: backupSel.nombre })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Restauración aplicada. Reiniciando...');
                modalRestaurar = false;
                setTimeout(() => window.location.reload(), 3000);
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            // @ts-ignore
            toast.error(e.message || 'Error en restauración');
        } finally {
            procesando = false;
        }
    }

    function abrirModal(b: Backup) {
        backupSel = b;
        confirmacionTexto = '';
        modalRestaurar = true;
    }

    onMount(() => cargarBackups());
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
    
    <div class="lg:col-span-1 space-y-6">
        <Card class="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <CardHeader class="pb-3">
                <CardTitle class="text-lg flex items-center gap-2">
                    <Server class="h-5 w-5 text-indigo-600" />
                    Almacenamiento Local
                </CardTitle>
                <CardDescription>Gestión de copias en el servidor</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-4">
                    <div class="p-3 bg-white dark:bg-black border rounded-md">
                        <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Lock class="h-3 w-3" /> Ruta Segura (Solo Servidor):
                        </div>
                        <code class="text-xs font-mono break-all block text-slate-700 dark:text-slate-300">
                            {directorio || 'Cargando ubicación...'}
                        </code>
                    </div>

                    <div class="flex justify-between text-sm pt-2">
                        <span class="text-muted-foreground">Copias disponibles:</span>
                        <span class="font-bold">{backups.length}</span>
                    </div>
                    
                    <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button 
                            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" 
                            size="lg"
                            onclick={crearBackup}
                            disabled={procesando}
                        >
                            {#if procesando} 
                                <Loader2 class="h-4 w-4 animate-spin mr-2" /> Procesando...
                            {:else}
                                <Archive class="h-4 w-4 mr-2" /> CREAR RESPALDO LOCAL
                            {/if}
                        </Button>
                        <p class="text-[10px] text-center text-muted-foreground mt-2 px-4">
                            Genera un archivo .db instantáneo en el disco duro del servidor.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardContent class="pt-6">
                <div class="flex gap-3">
                    <Lock class="h-8 w-8 text-green-600 mt-1 shrink-0" />
                    <div class="space-y-1">
                        <p class="font-medium text-sm">Seguridad Activada</p>
                        <p class="text-xs text-muted-foreground">
                            La descarga de backups está deshabilitada. Los archivos permanecen físicamente en el servidor para evitar fugas de información.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>

    <div class="lg:col-span-2">
        <Card class="flex flex-col h-full overflow-hidden">
            <CardHeader class="pb-3 border-b bg-white dark:bg-card z-20">
                <div class="flex items-center justify-between">
                    <div>
                        <CardTitle class="text-lg flex items-center gap-2">
                            <FileClock class="h-5 w-5 text-muted-foreground" />
                            Historial
                        </CardTitle>
                        <CardDescription>Puntos de restauración guardados</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onclick={() => { refrescando=true; cargarBackups(); }}>
                        <RefreshCw class="h-4 w-4 {refrescando ? 'animate-spin' : ''}" />
                    </Button>
                </div>
            </CardHeader>

            <div class="overflow-y-auto max-h-[500px] relative flex-1">
                <table class="w-full text-sm text-left">
                    <thead class="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-muted-foreground font-medium border-b shadow-sm">
                        <tr>
                            <th class="px-6 py-3">Archivo</th>
                            <th class="px-6 py-3">Fecha</th>
                            <th class="px-6 py-3">Tamaño</th>
                            <th class="px-6 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        {#if cargando}
                            <tr><td colspan="4" class="p-6 text-center text-muted-foreground">Cargando...</td></tr>
                        {:else if backups.length > 0}
                            {#each backups as b, i}
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td class="px-6 py-3 font-mono text-xs font-medium">
                                        {b.nombre}
                                        {#if i === 0}
                                            <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">NUEVO</span>
                                        {/if}
                                    </td>
                                    <td class="px-6 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                        {new Date(b.fecha).toLocaleString()}
                                    </td>
                                    <td class="px-6 py-3 font-mono text-xs text-muted-foreground">
                                        {b.tamaño}
                                    </td>
                                    <td class="px-6 py-3 text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            class="h-8 gap-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
                                            onclick={() => abrirModal(b)}
                                        >
                                            <RefreshCw class="h-3.5 w-3.5" /> 
                                            <span class="text-xs">Restaurar</span>
                                        </Button>
                                    </td>
                                </tr>
                            {/each}
                        {:else}
                            <tr>
                                <td colspan="4" class="px-6 py-12 text-center text-muted-foreground">
                                    <Database class="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    No hay copias de seguridad en el servidor.
                                </td>
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>
        </Card>
    </div>
</div>

{#if modalRestaurar && backupSel}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <Card class="w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border-2 border-red-500">
            <CardHeader class="bg-red-50 dark:bg-red-950/30">
                <CardTitle class="text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle class="h-6 w-6" />
                    ¡ZONA DE PELIGRO!
                </CardTitle>
                <CardDescription class="text-red-800 dark:text-red-200 font-medium">
                    Vas a reemplazar la base de datos productiva.
                </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6 pt-6">
                <div class="space-y-2 text-sm">
                    <p>Archivo seleccionado: <span class="font-mono font-bold">{backupSel.nombre}</span></p>
                    <div class="p-3 bg-red-100/50 dark:bg-red-900/20 rounded border border-red-200 text-red-800 dark:text-red-300 text-xs">
                        Esta acción se ejecuta localmente en el servidor. Asegúrate de que nadie esté realizando cambios importantes en este momento.
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase text-muted-foreground">Escribe "RESTAURAR AHORA" para confirmar:</label>
                    <input 
                        type="text" 
                        class="w-full p-2 border-2 border-red-200 rounded-md focus:border-red-500 focus:outline-none font-mono text-center uppercase"
                        bind:value={confirmacionTexto}
                        placeholder="RESTAURAR AHORA"
                    />
                </div>

                <div class="flex gap-3">
                    <Button variant="outline" class="flex-1" onclick={() => modalRestaurar = false}>Cancelar</Button>
                    <Button 
                        class="flex-1 bg-red-600 hover:bg-red-700 text-white" 
                        disabled={confirmacionTexto !== 'RESTAURAR AHORA' || procesando}
                        onclick={restaurarBackup}
                    >
                        {#if procesando} <Loader2 class="h-4 w-4 animate-spin" /> Procesando... {:else} ⚠️ Ejecutar Restauración {/if}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
{/if}