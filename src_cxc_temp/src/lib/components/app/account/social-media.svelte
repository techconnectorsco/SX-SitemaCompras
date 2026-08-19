<script lang="ts">
  /**
   * @module SocialMediaManagement
   * @description This component allows users to manage their social media profiles.
   * It includes input fields for various social networks with optional settings.
   */
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  import { Pencil } from 'lucide-svelte';
  
  let { perfil, isEditing = false } = $props<{ perfil?: any; isEditing: boolean }>();

  let socialData = $state({
    facebook: perfil?.redes_sociales?.facebook || '',
    instagram: perfil?.redes_sociales?.instagram || '',
    linkedin: perfil?.redes_sociales?.linkedin || '',
    whatsapp: perfil?.redes_sociales?.whatsapp || '',
    tiktok: perfil?.redes_sociales?.tiktok || '',
    x: perfil?.redes_sociales?.x || '',
    threads: perfil?.redes_sociales?.threads || ''
  });

  let originalSocialData = $state({ ...socialData });
  let errors = $state<Record<string, string>>({});
  let isModified = $state(false);
  let isSaving = $state(false);

</script>

<div class="w-full space-y-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
  <form method="POST" action="?/updateRedesSociales" on:submit={() => { isSaving = true; }}>
    <div class="flex items-center gap-2 mb-4">
      <span class="text-lg">🌐</span>
      <h3 class="font-semibold text-foreground">Redes Sociales</h3>
      <span class="text-xs text-muted-foreground ml-2">(Opcional)</span>
    </div>
    <p class="text-sm text-muted-foreground mb-6">Comparte tus perfiles para conectar mejor con tus clientes</p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Facebook -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        <Label for="facebook" class="text-foreground">Facebook</Label>
      </div>
      <Input 
        id="facebook"
        name="facebook" 
        type="url"
        placeholder="https://facebook.com/tu-pagina"
        bind:value={socialData.facebook}
        disabled={!isEditing}
        class="border-input rounded-lg py-2 px-3 focus:border-ring focus:ring-2 focus:ring-ring transition-all disabled:bg-muted disabled:cursor-not-allowed"
        on:input={() => isModified = true}
      />
      {#if errors.facebook}
        <p class="text-red-500 text-sm flex items-center gap-1">⚠️ {errors.facebook}</p>
      {/if}
    </div>

    <!-- Instagram -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
        <Label for="instagram" class="text-gray-700">Instagram</Label>
      </div>
      <Input 
        id="instagram"
        name="instagram" 
        type="url"
        placeholder="https://instagram.com/tu-usuario"
        bind:value={socialData.instagram}
        disabled={!isEditing}
        class="border-gray-300 rounded-lg py-2 px-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        on:input={() => isModified = true}
      />
      {#if errors.instagram}
        <p class="text-red-500 text-sm flex items-center gap-1">⚠️ {errors.instagram}</p>
      {/if}
    </div>

    <!-- LinkedIn -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        <Label for="linkedin" class="text-gray-700">LinkedIn</Label>
      </div>
      <Input 
        id="linkedin"
        name="linkedin" 
        type="url"
        placeholder="https://linkedin.com/in/tu-perfil"
        bind:value={socialData.linkedin}
        disabled={!isEditing}
        class="border-gray-300 rounded-lg py-2 px-3 focus:border-blue-700 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        on:input={() => isModified = true}
      />
      {#if errors.linkedin}
        <p class="text-red-500 text-sm flex items-center gap-1">⚠️ {errors.linkedin}</p>
      {/if}
    </div>

    <!-- WhatsApp -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.304 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.123-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.148-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
        </svg>
        <Label for="whatsapp" class="text-gray-700">WhatsApp</Label>
      </div>
      <Input 
        id="whatsapp"
        name="whatsapp" 
        type="url"
        placeholder="https://wa.me/50688889999"
        bind:value={socialData.whatsapp}
        disabled={!isEditing}
        class="border-gray-300 rounded-lg py-2 px-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        on:input={() => isModified = true}
      />
      {#if errors.whatsapp}
        <p class="text-red-500 text-sm flex items-center gap-1">⚠️ {errors.whatsapp}</p>
      {/if}
    </div>

    <!-- TikTok -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.58 7.13a5.53 5.53 0 0 1-3.46-2.6 5.52 5.52 0 0 1-.63-2.12h-3.3v12.38a2.78 2.78 0 1 1-2-2.65V8.59a6.08 6.08 0 0 0-1-.08 5.94 5.94 0 1 0 5.94 5.94V8.5a8.78 8.78 0 0 0 5.45 1.87V7.13z"/>
        </svg>
        <Label for="tiktok" class="text-gray-700">TikTok</Label>
      </div>
      <Input 
        id="tiktok"
        name="tiktok" 
        type="url"
        placeholder="https://tiktok.com/@tu-usuario"
        bind:value={socialData.tiktok}
        disabled={!isEditing}
        class="border-gray-300 rounded-lg py-2 px-3 focus:border-gray-900 focus:ring-2 focus:ring-gray-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        on:input={() => isModified = true}
      />
      {#if errors.tiktok}
        <p class="text-red-500 text-sm flex items-center gap-1">⚠️ {errors.tiktok}</p>
      {/if}
    </div>

    <!-- X / Twitter -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 3.515h3.308l-7.227 8.26 8.502 11.08H16.17l-5.214-6.822-5.965 6.822H1.684l7.73-8.845L1.253 3.515h6.78l4.713 6.231 5.498-6.231zm-1.162 16.534h1.833L7.084 4.98H5.117z"/>
        </svg>
        <Label for="x" class="text-gray-700">X / Twitter</Label>
      </div>
      <Input 
        id="x"
        name="x" 
        type="url"
        placeholder="https://x.com/tu-usuario"
        bind:value={socialData.x}
        disabled={!isEditing}
        class="border-gray-300 rounded-lg py-2 px-3 focus:border-gray-900 focus:ring-2 focus:ring-gray-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        on:input={() => isModified = true}
      />
      {#if errors.x}
        <p class="text-red-500 text-sm flex items-center gap-1">⚠️ {errors.x}</p>
      {/if}
    </div>

    <!-- Threads -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.01c-5.52 0-9.99 4.47-9.99 9.99 0 5.52 4.47 9.99 9.99 9.99 5.52 0 9.99-4.47 9.99-9.99 0-5.52-4.47-9.99-9.99-9.99Zm3.17 10.89c-.25-.41-.55-.76-.91-1.08.5.22.96.52 1.36.89l.92-.91c-.44-.48-.95-.86-1.53-1.16a5.53 5.53 0 0 0-1.99-.66c-.17-.03-.34-.05-.5-.06a4.6 4.6 0 0 0-.87-1.04 3.63 3.63 0 0 0-2.41-1.06 3.63 3.63 0 0 0-2.63.66 3 3 0 0 0-1.46 2.45c-.05 1 .41 1.99 1.25 2.59.8.57 1.73.69 2.65.35.96-.35 1.6-1.12 1.71-2.04.03-.28.01-.57-.07-.85a2 2 0 0 0-.29-.62c.27.13.51.29.73.5.26.24.47.53.63.84-.42.18-.82.42-1.18.71a3.6 3.6 0 0 0-1.38 2.34c-.15.95.09 1.93.67 2.7.65.86 1.63 1.4 2.69 1.51 1.17.12 2.27-.23 3.11-.98.8-.71 1.29-1.72 1.32-2.78.02-.47-.06-.95-.23-1.38a3 3 0 0 0-.44-.8c.17.03.33.07.49.13.49.18.92.48 1.26.86l.93-.9a4.1 4.1 0 0 0-.8-.71 4 4 0 0 0-1.31-.65Zm-4.61 1.98c-.47-.06-.88-.3-1.16-.66a1.54 1.54 0 0 1-.32-1.33c.07-.47.33-.9.73-1.2.29-.23.64-.38 1.01-.42.35-.04.7.03 1.02.2.35.18.64.46.84.81.22.38.31.83.26 1.27-.06.45-.29.87-.63 1.17-.38.34-.89.5-1.38.46Z"/>
        </svg>
        <Label for="threads" class="text-gray-700">Threads</Label>
      </div>
      <Input 
        id="threads"
        name="threads" 
        type="url"
        placeholder="https://www.threads.net/@tu-usuario"
        bind:value={socialData.threads}
        disabled={!isEditing}
        class="border-gray-300 rounded-lg py-2 px-3 focus:border-gray-900 focus:ring-2 focus:ring-gray-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        on:input={() => isModified = true}
      />
      {#if errors.threads}
        <p class="text-red-500 text-sm flex items-center gap-1">⚠️ {errors.threads}</p>
      {/if}
    </div>
  </div>

    <!-- Action Buttons -->
    <div class="flex gap-3 pt-6 border-t border-border mt-6">
      {#if !isEditing}
        <Button 
          type="button"
          onclick={() => isEditing = true}
          class="bg-purple-500 hover:bg-purple-600 text-white transition-all flex items-center gap-2"
        >
          <Pencil class="w-4 h-4" />
          Editar Redes Sociales
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
            ✓ Guardar Redes Sociales
          {/if}
        </Button>
        <Button 
          type="button"
          variant='outline'
          onclick={() => {
            isModified = false;
            isEditing = false;
            socialData = { ...originalSocialData };
            errors = {};
          }}
          class="text-foreground border-border"
        >
          Cancelar
        </Button>
      {/if}
    </div>
  </form>
</div>
