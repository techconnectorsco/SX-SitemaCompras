<script lang="ts">
    import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { 
        Search, Shield, CheckCircle2, XCircle, Key, Copy, 
        Loader2, UserCog, AlertTriangle, RefreshCw 
    } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';

    // Props para recibir callbacks si es necesario
    let { onStatsUpdate } = $props();

    interface Usuario {
        id: string;
        email: string;
        nombre: string;
        rol: string;
        estado: string;
        fechaRegistro: string;
        emailVerificado: boolean;
    }

    let usuarios = $state<Usuario[]>([]);
    let cargando = $state(true);
    let refrescando = $state(false);
    let busqueda = $state('');

    // --- ESTADOS DE MODALES ---
    let modalActivo = $state<'none' | 'activar' | 'rol' | 'password'>('none');
    let usuarioSel = $state<Usuario | null>(null);
    let procesandoAccion = $state(false);
    
    // Datos temporales para modales
    let nuevoRolSel = $state('');
    let tempPassword = $state('');

    async function cargarUsuarios() {
        try {
            const res = await fetch(`/api/admin/usuarios?search=${busqueda}`);
            if (res.ok) {
                const data = await res.json();
                usuarios = data.usuarios || [];
                // Si el padre nos pasó una función para actualizar stats, la llamamos
                if (data.estadisticas && onStatsUpdate) {
                    onStatsUpdate(data.estadisticas);
                }
            }
        } catch (e) {
            console.error(e);
            toast.error('Error cargando lista de usuarios');
        } finally {
            cargando = false;
            refrescando = false;
        }
    }

    function abrirModal(tipo: 'activar' | 'rol' | 'password', usuario: Usuario) {
        usuarioSel = usuario;
        modalActivo = tipo;
        nuevoRolSel = usuario.rol; // Pre-llenar rol
        tempPassword = ''; // Limpiar password anterior
    }

    function cerrarModal() {
        modalActivo = 'none';
        usuarioSel = null;
        procesandoAccion = false;
    }

    // --- ACCIONES ---

    async function confirmarActivacion() {
        if (!usuarioSel) return;
        procesandoAccion = true;
        try {
            const res = await fetch('/api/admin/usuarios', {
                method: 'PUT',
                body: JSON.stringify({ userId: usuarioSel.id, action: 'activate', nuevoEstado: 'ACTIVE' })
            });
            if (!res.ok) throw new Error();
            toast.success(`Usuario ${usuarioSel.email} activado.`);
            await cargarUsuarios();
            cerrarModal();
        } catch (e) {
            toast.error('Error al activar usuario');
        } finally {
            procesandoAccion = false;
        }
    }

    async function confirmarRol() {
        if (!usuarioSel) return;
        procesandoAccion = true;
        try {
            const res = await fetch('/api/admin/usuarios', {
                method: 'PUT',
                body: JSON.stringify({ userId: usuarioSel.id, action: 'role', nuevoRol: nuevoRolSel })
            });
            if (!res.ok) throw new Error();
            toast.success('Rol actualizado correctamente');
            await cargarUsuarios();
            cerrarModal();
        } catch (e) {
            toast.error('Error al cambiar rol');
        } finally {
            procesandoAccion = false;
        }
    }

    async function generarPassword() {
        if (!usuarioSel) return;
        procesandoAccion = true;
        try {
            const res = await fetch('/api/admin/usuarios', {
                method: 'POST',
                body: JSON.stringify({ userId: usuarioSel.id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            tempPassword = data.passwordTemporal;
            toast.success('Contraseña generada. Cópiala ahora.');
            // NO cerramos el modal, mostramos la contraseña
        } catch (e) {
            toast.error('Error generando contraseña');
            cerrarModal();
        } finally {
            procesandoAccion = false;
        }
    }

    function copiarPortapapeles() {
        navigator.clipboard.writeText(tempPassword);
        toast.success('Copiado al portapapeles');
    }

    onMount(() => cargarUsuarios());
</script>

<Card class="flex flex-col h-full shadow-sm border-slate-200 dark:border-slate-800">
    <CardHeader class="pb-3 border-b bg-white dark:bg-card z-20 rounded-t-lg space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <CardTitle class="text-lg flex items-center gap-2">
                    <UserCog class="h-5 w-5 text-indigo-600" />
                    Directorio de Usuarios
                </CardTitle>
                <CardDescription>Gestión de accesos y roles del sistema</CardDescription>
            </div>
            
            <div class="flex items-center gap-2 w-full md:w-auto">
                <div class="relative flex-1 md:w-64">
                    <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Buscar por email..." 
                        class="w-full pl-9 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        bind:value={busqueda}
                        oninput={() => cargarUsuarios()}
                    />
                </div>
                <Button variant="outline" size="icon" onclick={() => { refrescando=true; cargarUsuarios(); }}>
                    <RefreshCw class="h-4 w-4 {refrescando ? 'animate-spin' : ''}" />
                </Button>
            </div>
        </div>
    </CardHeader>

    <div class="overflow-y-auto max-h-[500px] relative">
        <table class="w-full text-sm text-left">
            <thead class="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-muted-foreground font-medium border-b shadow-sm">
                <tr>
                    <th class="px-6 py-3 whitespace-nowrap w-[300px]">Usuario</th>
                    <th class="px-6 py-3 whitespace-nowrap">Rol</th>
                    <th class="px-6 py-3 whitespace-nowrap">Estado</th>
                    <th class="px-6 py-3 whitespace-nowrap">Registro</th>
                    <th class="px-6 py-3 text-right whitespace-nowrap">Acciones</th>
                </tr>
            </thead>
            <tbody class="divide-y">
                {#if cargando}
                    {#each Array(5) as _}
                        <tr class="animate-pulse">
                            <td class="px-6 py-4"><div class="h-10 w-48 bg-muted rounded"></div></td>
                            <td class="px-6 py-4"><div class="h-6 w-20 bg-muted rounded"></div></td>
                            <td class="px-6 py-4"><div class="h-6 w-24 bg-muted rounded"></div></td>
                            <td class="px-6 py-4"><div class="h-4 w-24 bg-muted rounded"></div></td>
                            <td class="px-6 py-4"><div class="h-8 w-24 bg-muted rounded ml-auto"></div></td>
                        </tr>
                    {/each}
                {:else if usuarios.length > 0}
                    {#each usuarios as u}
                        <tr class="hover:bg-muted/30 transition-colors group {u.estado === 'PENDING' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}">
                            <td class="px-6 py-3">
                                <div class="flex items-center gap-3">
                                    <div class="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase shrink-0">
                                        {u.email.substring(0,2)}
                                    </div>
                                    <div class="min-w-0">
                                        <p class="font-medium text-gray-900 dark:text-gray-100 truncate">{u.nombre}</p>
                                        <p class="text-xs text-muted-foreground font-mono truncate">{u.email}</p>
                                    </div>
                                </div>
                            </td>

                            <td class="px-6 py-3">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    {u.rol === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 
                                    u.rol === 'ANALYST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 
                                    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}">
                                    {u.rol}
                                </span>
                            </td>

                            <td class="px-6 py-3">
                                {#if u.estado === 'PENDING'}
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse">
                                        <AlertTriangle class="h-3 w-3" /> Pendiente
                                    </span>
                                {:else if u.estado === 'ACTIVE'}
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        <CheckCircle2 class="h-3 w-3" /> Activo
                                    </span>
                                {:else}
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        Susp.
                                    </span>
                                {/if}
                            </td>

                            <td class="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {u.fechaRegistro.split(' ')[0]}
                            </td>

                            <td class="px-6 py-3 text-right">
                                <div class="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {#if u.estado === 'PENDING'}
                                        <Button size="sm" class="h-8 bg-green-600 hover:bg-green-700 text-white gap-1" onclick={() => abrirModal('activar', u)}>
                                            <CheckCircle2 class="h-3.5 w-3.5" /> Aprobar
                                        </Button>
                                    {/if}
                                    
                                    <Button variant="outline" size="sm" class="h-8 w-8 p-0" title="Cambiar Rol" onclick={() => abrirModal('rol', u)}>
                                        <Shield class="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>

                                    <Button variant="outline" size="sm" class="h-8 w-8 p-0" title="Reset Password" onclick={() => abrirModal('password', u)}>
                                        <Key class="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                {:else}
                    <tr>
                        <td colspan="5" class="px-6 py-12 text-center text-muted-foreground">
                            No se encontraron usuarios.
                        </td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>
</Card>

{#if modalActivo !== 'none' && usuarioSel}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <Card class="w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <CardHeader>
                <CardTitle>
                    {#if modalActivo === 'activar'} Aprobar Acceso
                    {:else if modalActivo === 'rol'} Cambiar Rol
                    {:else} Resetear Contraseña {/if}
                </CardTitle>
                <CardDescription>Para: {usuarioSel.email}</CardDescription>
            </CardHeader>
            
            <CardContent class="space-y-4">
                {#if modalActivo === 'activar'}
                    <div class="bg-amber-50 dark:bg-amber-900/20 p-3 rounded text-sm text-amber-800 dark:text-amber-200">
                        ¿Estás seguro de activar a este usuario? Podrá iniciar sesión inmediatamente.
                    </div>
                    <div class="flex gap-2 pt-2">
                        <Button variant="outline" class="flex-1" onclick={cerrarModal}>Cancelar</Button>
                        <Button class="flex-1 bg-green-600 hover:bg-green-700 text-white" onclick={confirmarActivacion} disabled={procesandoAccion}>
                            {#if procesandoAccion} <Loader2 class="h-4 w-4 animate-spin" /> {:else} Confirmar {/if}
                        </Button>
                    </div>

                {:else if modalActivo === 'rol'}
                    <div class="space-y-3">
                        <label class="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                            <input type="radio" value="USER" bind:group={nuevoRolSel}> <span class="font-medium">Usuario</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                            <input type="radio" value="ANALYST" bind:group={nuevoRolSel}> <span class="font-medium">Analista</span>
                        </label>
                        <label class="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                            <input type="radio" value="ADMIN" bind:group={nuevoRolSel}> <span class="font-medium text-purple-600">Administrador</span>
                        </label>
                    </div>
                    <div class="flex gap-2 pt-2">
                        <Button variant="outline" class="flex-1" onclick={cerrarModal}>Cancelar</Button>
                        <Button class="flex-1" onclick={confirmarRol} disabled={procesandoAccion}>Guardar Cambios</Button>
                    </div>

                {:else if modalActivo === 'password'}
                    {#if !tempPassword}
                        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded text-sm text-blue-800 dark:text-blue-200">
                            <p class="font-bold mb-1">⚠️ Importante:</p>
                            <p>Se generará una contraseña aleatoria. Deberás copiarla y enviársela al usuario manualmente (WhatsApp/Email) ya que no tenemos servidor de correo configurado.</p>
                        </div>
                        <div class="flex gap-2 pt-2">
                            <Button variant="outline" class="flex-1" onclick={cerrarModal}>Cancelar</Button>
                            <Button variant="destructive" class="flex-1" onclick={generarPassword} disabled={procesandoAccion}>
                                {#if procesandoAccion} <Loader2 class="h-4 w-4 animate-spin" /> {:else} Generar Ahora {/if}
                            </Button>
                        </div>
                    {:else}
                        <div class="space-y-4">
                            <div class="text-center">
                                <p class="text-sm text-muted-foreground mb-2">Contraseña generada:</p>
                                <div class="bg-slate-100 dark:bg-slate-900 p-4 rounded border-2 border-dashed border-slate-300 font-mono text-xl font-bold tracking-wider select-all">
                                    {tempPassword}
                                </div>
                            </div>
                            <Button class="w-full gap-2" onclick={copiarPortapapeles}>
                                <Copy class="h-4 w-4" /> Copiar al portapapeles
                            </Button>
                            <Button variant="ghost" class="w-full" onclick={cerrarModal}>Cerrar</Button>
                        </div>
                    {/if}
                {/if}
            </CardContent>
        </Card>
    </div>
{/if}