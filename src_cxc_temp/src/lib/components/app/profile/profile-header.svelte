<script lang="ts">
  /**
   * @module ProfileHeader
   * @description Displays the logged-in user's avatar, name and email.
   */
  import * as Avatar from '$lib/components/ui/avatar/';
  import { Smile } from 'lucide-svelte';
  import { Root as TooltipRoot, Trigger as TooltipTrigger, Content as TooltipContent, Provider as TooltipProvider } from '$lib/components/ui/tooltip';
  import type { User } from '@supabase/supabase-js';

  let { perfil, user }: { perfil?: any; user?: User | null } = $props();

  const isOnline = true; // puedes conectar esto a tu estado real

  const displayName = perfil?.nombre_completo || user?.email || 'Invitado';
  const displayEmail = perfil?.email || user?.email || '';
  const imageUrl = perfil?.url_imagen || '';

  function getInitials(): string {
    if (perfil?.nombre_completo) {
      const parts = perfil.nombre_completo.trim().split(' ');
      return parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) || 'U';
    }
    if (user?.email) return user.email[0]?.toUpperCase() || 'U';
    return 'U';
  }
</script>
<TooltipProvider>
<div class="p-2 sm:p-5 sm:py-0 space-y-2 border shadow-sm rounded-xl">
  <div class="relative overflow-hidden">
    <figure>
      <svg class="w-full" preserveAspectRatio="none" width="1113" height="200" viewBox="0 0 1113 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0_666_220723)">
        <rect x="0.5" width="1112" height="200" rx="12" fill="white"></rect>
        <rect x="1" width="1112" height="348" fill="#D9DEEA"></rect>
        <path d="M512.694 359.31C547.444 172.086 469.835 34.2204 426.688 -11.3096H1144.27V359.31H512.694Z" fill="#C0CBDD"></path>
        <path d="M818.885 185.745C703.515 143.985 709.036 24.7949 726.218 -29.5801H1118.31V331.905C1024.49 260.565 963.098 237.945 818.885 185.745Z" fill="#8192B0"></path>
        </g>
        <defs>
        <clipPath id="clip0_666_220723">
          <rect x="0.5" width="1112" height="200" rx="12" fill="white"></rect>
        </clipPath>
        </defs>
      </svg>
      </figure>
      <div class="relative z-10 p-5 pb-0">
        <div class="flex justify-center -mt-32">
          
          <Avatar.Root class='relative inline-block w-32 h-32 overflow-visible'>
            <Avatar.Image
              class='rounded-full'
              src={imageUrl}
              alt={displayName}
            />
            <TooltipRoot>
              <TooltipTrigger class="flex flex-auto">
                <span class="absolute bottom-0 end-0 block p-2 rounded-full transform translate-y-1/2 translate-x-1/2 ">
                  <Smile class='{isOnline ? "text-green-600" : "text-red-600"}' size=28/>
                </span>
              </TooltipTrigger>
              <TooltipContent class="z-20 max-w-56 text-center py-1.5 px-2.5 rounded-lg">
                {#if isOnline}
                  <p>Online</p>
                {:else}
                  <p>Offline</p>
                {/if}
                <p> </p>
              </TooltipContent>
            </TooltipRoot>
            
            <Avatar.Fallback>{getInitials()}</Avatar.Fallback>   
          </Avatar.Root>
        </div>
        <div class="mt-3 text-center pb-3">
          <h1 class="text-xl font-semibold">{displayName}</h1>
          <p class='font-medium'>{displayEmail}</p>
        </div>
      </div>
  </div>
</div>
</TooltipProvider>