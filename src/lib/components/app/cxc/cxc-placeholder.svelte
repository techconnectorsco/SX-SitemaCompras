<script lang="ts">
  // Componente temporal para la sección CxC
  let { data, user } = $props();
</script>

<div class="flex flex-1 items-center justify-center p-8">
  <div class="flex flex-col items-center gap-4 text-center">
    <div class="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
      <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
    </div>
    <h2 class="text-xl font-bold">Módulo CxC</h2>
    <p class="text-muted-foreground max-w-md">
      El módulo de Cuentas por Cobrar está en preparación y pronto estará disponible.
    </p>
  </div>
</div>
