<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { AlertCircle, FileSpreadsheet, Download, LoaderCircle } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  let bodegasExcluidas = $state<any[]>([]);
  let descargando = $state(false);
  let error = $state<string | null>(null);

  async function cargarBodegasExcluidas() {
    try {
      const res = await fetch('/api/admin/bodegas');
      if (res.ok) {
        const data = await res.json();
        bodegasExcluidas = data.bodegas.filter((b: any) => b.excluida);
      }
    } catch (e) {
      console.error('Error cargando bodegas excluidas:', e);
    }
  }

  async function descargarSimulacion() {
    if (bodegasExcluidas.length === 0) {
      toast.info('No hay bodegas excluidas. Configura exclusiones primero.');
      return;
    }

    descargando = true;
    error = null;
    toast.info('Generando Excel comparativo... Esto puede tardar uno o dos minutos.');

    try {
      const response = await fetch('/api/admin/simular-forecast/exportar', {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar la simulación');
      }

      // Descargar el archivo Excel (Blob)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Simulacion_Forecast_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('✅ Simulación descargada con éxito');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Error desconocido al descargar';
      toast.error(error);
    } finally {
      descargando = false;
    }
  }

  $effect(() => {
    cargarBodegasExcluidas();
  });
</script>

<Card class="border-green-100 dark:border-green-900">
  <CardHeader>
    <CardTitle>Simulador de Exclusiones (Excel)</CardTitle>
    <CardDescription>
      Descarga un comparativo detallado de cómo cambian los sugeridos de compra al aplicar las exclusiones actuales.
    </CardDescription>
  </CardHeader>

  <CardContent class="space-y-5">
    <div class="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
      <p class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
        Escenario a simular:
      </p>
      
      {#if bodegasExcluidas.length === 0}
        <p class="text-sm text-blue-700 dark:text-blue-300">
          ⚠️ No hay bodegas excluidas configuradas. Ve a la tabla de arriba para excluir alguna bodega primero.
        </p>
      {:else}
        <div class="space-y-2">
          <p class="text-sm text-blue-700 dark:text-blue-300 font-semibold">
            Compararemos el inventario TOTAL vs el inventario SIN estas {bodegasExcluidas.length} bodega(s):
          </p>
          <div class="space-y-1 max-h-32 overflow-y-auto">
            {#each bodegasExcluidas as bodega}
              <div class="text-sm text-blue-700 dark:text-blue-300 flex gap-2 items-center">
                <span class="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                <span><strong>{bodega.bodega_codigo}</strong> - {bodega.bodega_nombre}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    {#if error}
      <div class="flex gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
        <AlertCircle class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p class="text-sm text-red-700 dark:text-red-200">{error}</p>
      </div>
    {/if}

    <div class="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border">
      <p class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
        ¿Qué contiene el Excel?
      </p>
      <ul class="space-y-2 text-sm text-slate-700 dark:text-slate-300">
        <li class="flex gap-2">
          <FileSpreadsheet class="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <span>Columnas con el <strong>Cálculo Normal</strong> (Todas las bodegas)</span>
        </li>
        <li class="flex gap-2">
          <FileSpreadsheet class="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
          <span>Columnas con el <strong>Cálculo Simulado</strong> (Sin contar las bodegas excluidas)</span>
        </li>
        <li class="flex gap-2">
          <AlertCircle class="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>Las diferencias exactas de inventario y compras se <strong>pintarán de rojo</strong> automáticamente para fácil revisión.</span>
        </li>
      </ul>
    </div>

    <Button
      onclick={descargarSimulacion}
      disabled={descargando || bodegasExcluidas.length === 0}
      class="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
    >
      {#if descargando}
        <LoaderCircle class="h-5 w-5 animate-spin" />
        Calculando y Generando Excel...
      {:else}
        <Download class="h-5 w-5" />
        Descargar Excel Comparativo
      {/if}
    </Button>
  </CardContent>
</Card>