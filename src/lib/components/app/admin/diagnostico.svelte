<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte';
  
  let ejecutando = $state(false);
  let resultado = $state<any>(null);
  
  async function ejecutarDiagnostico() {
    if (ejecutando) return;
    
    ejecutando = true;
    resultado = null;
    
    try {
      const res = await fetch('/api/admin/diagnostico-exactus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error en diagnóstico');
      }
      
      resultado = data;
      console.log('📊 Resultados del diagnóstico:', data.resultados);
      alert('✅ Diagnóstico completado. Revisa la CONSOLA DEL SERVIDOR (terminal donde corre npm run dev)');
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      ejecutando = false;
    }
  }
</script>

<div class="flex flex-col gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-lg">
  <div class="flex items-center gap-2">
    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50">
      <span class="text-2xl">🔍</span>
    </div>
    <div>
      <h3 class="text-sm font-bold text-amber-900 dark:text-amber-100">
        Diagnóstico de Exactus (Temporal)
      </h3>
      <p class="text-xs text-amber-700 dark:text-amber-300">
        Verifica qué datos existen en Exactus para 2020 y 2026
      </p>
    </div>
  </div>
  
  <button
    onclick={ejecutarDiagnostico}
    disabled={ejecutando}
    class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
           bg-amber-600 hover:bg-amber-700 text-white
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors shadow-sm"
  >
    {#if ejecutando}
      <LoaderCircle class="h-4 w-4 animate-spin" />
      Ejecutando diagnóstico...
    {:else}
      🔍 Ejecutar Diagnóstico
    {/if}
  </button>
  
  {#if resultado}
    <div class="mt-2 p-3 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800">
      <p class="text-xs font-mono text-green-600 dark:text-green-400">
        ✅ {resultado.mensaje}
      </p>
      <p class="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
        📋 Los resultados detallados están en la consola del SERVIDOR (terminal)
      </p>
    </div>
  {/if}
  
  <div class="text-[10px] text-amber-600 dark:text-amber-400 italic">
    ⚠️ Este componente es temporal y debe eliminarse después del diagnóstico
  </div>
</div>