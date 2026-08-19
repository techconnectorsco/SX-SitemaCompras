<script lang='ts'>
    import { Label } from '$lib/components/ui/label';
    import { Input } from '$lib/components/ui/input';
    import Button from '$lib/components/ui/button/button.svelte';
    import { Pencil } from 'lucide-svelte';
    import type { User } from '@supabase/supabase-js';

    let { perfil, user, onEditingChange } = $props<{ perfil?: any; user?: User | null; onEditingChange?: (isEditing: boolean) => void }>();

    let isSaving = $state(false);
    let isModified = $state(false);
    let isEditing = $state(false);
    
    let nombre_completo = $state(perfil?.nombre_completo || '');
    let email = $state(perfil?.email || user?.email || '');
    let telefono_principal = $state(perfil?.telefono_principal || '');
    let telefono_secundario = $state(perfil?.telefono_secundario || '');

</script>

<div class="w-full space-y-6">
<form method="POST" action="?/updatePerfil" class="space-y-6" on:submit={() => { isSaving = true; }}>
    <!-- Nombre Completo -->
    <div class="space-y-2">
        <div class="flex items-center justify-between">
            <Label for="name" class="font-semibold text-foreground">Nombre Completo</Label>
            <span class="text-xs text-muted-foreground">Requerido</span>
        </div>
        <Input 
            id="nombre_completo"
            name="nombre_completo"
            bind:value={nombre_completo}
            placeholder="Tu nombre completo"
            disabled={!isEditing}
            class="border-input rounded-lg py-3 px-4 focus:border-ring focus:ring-2 focus:ring-ring transition-all disabled:bg-muted disabled:cursor-not-allowed"
            oninput={() => isModified = true}
        />
        <p class="text-xs text-muted-foreground mt-1">
            Este es el nombre que aparecerá en tu perfil público.
        </p>
    </div>

    <!-- Email -->
    <div class="space-y-2">
        <div class="flex items-center justify-between">
            <Label for="email" class="font-semibold text-foreground">Correo Electrónico</Label>
            <span class="text-xs text-muted-foreground">Requerido</span>
        </div>
        <Input 
            type="email" 
            id="email"
            name="email"
            bind:value={email}
            placeholder="tu@email.com"
            disabled={!isEditing}
            class="border-input rounded-lg py-3 px-4 focus:border-ring focus:ring-2 focus:ring-ring transition-all disabled:bg-muted disabled:cursor-not-allowed"
            oninput={() => isModified = true}
        />
        <p class="text-xs text-muted-foreground mt-1">
            Usaremos este correo para notificaciones importantes de tu cuenta.
        </p>
    </div>

    <!-- Información de Contacto -->
    <div class="border-t border-border pt-6">
        <div class="flex items-center gap-2 mb-4">
            <span class="text-lg">📞</span>
            <h3 class="font-semibold text-foreground">Información de Contacto</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <Label for="phone" class="font-semibold text-foreground">Teléfono Principal</Label>
                    <span class="text-xs text-muted-foreground">Requerido</span>
                </div>
                <Input 
                    id="phone" 
                    name="telefono_principal"
                    type="tel"
                    bind:value={telefono_principal}
                    placeholder="Ej: +506 2234-5678"
                    disabled={!isEditing}
                    class="border-input rounded-lg py-3 px-4 focus:border-ring focus:ring-2 focus:ring-ring transition-all disabled:bg-muted disabled:cursor-not-allowed"
                    oninput={() => isModified = true}
                />
                <p class="text-xs text-muted-foreground mt-1">
                    Tu número de teléfono principal de contacto.
                </p>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <Label for="phone_secondary" class="font-semibold text-foreground">Teléfono Secundario</Label>
                    <span class="text-xs text-muted-foreground">Opcional</span>
                </div>
                <Input 
                    id="phone_secondary" 
                    name="telefono_secundario"
                    type="tel"
                    bind:value={telefono_secundario}
                    placeholder="Ej: +506 8888-9999"
                    disabled={!isEditing}
                    class="border-input rounded-lg py-3 px-4 focus:border-ring focus:ring-2 focus:ring-ring transition-all disabled:bg-muted disabled:cursor-not-allowed"
                    oninput={() => isModified = true}
                />
                <p class="text-xs text-muted-foreground mt-1">
                    Opcional: un número alternativo de contacto.
                </p>
            </div>
        </div>
    </div>

    <!-- Botones de Acción -->
    <div class="flex gap-3 pt-4 border-t border-border">
        {#if !isEditing}
            <Button 
                type="button"
                class="bg-blue-500 hover:bg-blue-600 text-white transition-all flex items-center gap-2"
                onclick={() => {
                    isEditing = true;
                    onEditingChange?.(true);
                }}
            >
                <Pencil class="w-4 h-4" />
                Editar Información
            </Button>
        {:else}
            <Button 
                type="submit"
                disabled={!isModified || isSaving}
                class="bg-green-500 hover:bg-green-600 disabled:bg-muted text-white transition-all"
            >
                {#if isSaving}
                    <span class="inline-block animate-spin mr-2">⏳</span>
                    Guardando...
                {:else}
                    ✓ Guardar Cambios
                {/if}
            </Button>
            <Button 
                type="button"
                variant='outline'
                onclick={() => {
                    isModified = false;
                    isEditing = false;
                    onEditingChange?.(false);
                    nombre_completo = perfil?.nombre_completo || '';
                    email = perfil?.email || user?.email || '';
                    telefono_principal = perfil?.telefono_principal || '';
                    telefono_secundario = perfil?.telefono_secundario || '';
                }}
            >
                Cancelar
            </Button>
        {/if}
    </div>
</form>
</div>

