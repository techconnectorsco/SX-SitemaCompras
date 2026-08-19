<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import * as Avatar from '$lib/components/ui/avatar';
    import { Button } from '$lib/components/ui/button';
    import { getInitials } from '$lib/utils';
    import { AUTH_PATHS } from '$lib/features/auth/config/auth';

    
    let session = $derived($page.data.session);
    let supabase = $derived($page.data.supabase);

    async function handleLogout() {
        if (!supabase) return;
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
        } else {
            // invalidateAll fuerza a SvelteKit a volver a ejecutar todos los load functions
            // asegurando que la sesión se limpie visualmente de inmediato.
            goto('/', { invalidateAll: true });
        }
    }
</script>

{#if session?.user}
    <DropdownMenu.Root>
        <DropdownMenu.Trigger class="flex items-center gap-2 hover:bg-blue-50 rounded-lg px-3 py-2 transition-colors outline-none focus:ring-2 focus:ring-blue-200">
            <Avatar.Root class="size-9 ring-2 ring-blue-500">
                <Avatar.Image src={session.user.user_metadata?.avatar_url} alt={session.user.email} />
                <Avatar.Fallback class="bg-blue-500 text-white font-semibold">
                    {getInitials(session.user.email ?? '')}
                </Avatar.Fallback>
            </Avatar.Root>
            
            <span class="block max-w-[150px] grow text-left">
                <span class="block truncate text-sm font-semibold text-gray-900">
                    {session.user.user_metadata?.full_name || session.user.email}
                </span>
                <span class="block truncate text-xs text-gray-500">
                    Mi Cuenta
                </span>
            </span>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content class="w-56" align="end">
            <DropdownMenu.Label class="text-blue-600 font-bold">
                {session.user.email}
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            
            <DropdownMenu.Item 
                onclick={() => goto('/Profile')} 
                class="cursor-pointer hover:bg-blue-50 focus:bg-blue-50"
            >
                Mi Perfil
            </DropdownMenu.Item>

            <DropdownMenu.Item class="cursor-pointer hover:bg-blue-50 focus:bg-blue-50">
                Notificaciones
            </DropdownMenu.Item>

            <DropdownMenu.Item class="cursor-pointer hover:bg-blue-50 focus:bg-blue-50">
                Planes y pagos
            </DropdownMenu.Item>
            
            <DropdownMenu.Separator />
            
            <DropdownMenu.Item 
                onclick={handleLogout} 
                class="text-red-600 cursor-pointer font-semibold hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
            >
                Cerrar sesión
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>

{:else}
    <div class="flex items-center gap-2">
        <Button 
            href={AUTH_PATHS.LOGIN} 
            variant="ghost" 
            size="sm" 
            class="hover:bg-blue-50 hover:text-blue-600 font-semibold"
        >
            Iniciar Sesión
        </Button>
        <Button 
            href={AUTH_PATHS.REGISTER} 
            size="sm" 
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-sm hover:shadow-md transition-all"
        >
            Registrarse
        </Button>
    </div>
{/if}