<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Download, Copy, Loader2, AlertCircle } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  let meses = $state(6);
  let cargando = $state(false);
  let datosExportados = $state<any>(null);
  let error = $state<string | null>(null);

  async function obtenerDatos() {
    console.log('🔍 Iniciando consulta...'); 
    cargando = true;
    error = null;

    try {
      const url = `/api/powerbi/pedidos?meses=${meses}`;
      console.log('📡 URL:', url); 
      const res = await fetch(url);
      console.log('✅ Respuesta:', res); 

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al consultar datos');
      }

      datosExportados = await res.json();
      console.log('📊 Datos recibidos:', datosExportados); 
      toast.success('Datos cargados exitosamente');
    } catch (e) {
      console.error('❌ ERROR:', e); 
      error = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(error);
    } finally {
      cargando = false;
    }
  }

  function descargarJSON() {
    if (!datosExportados) return;

    const jsonString = JSON.stringify(datosExportados, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${meses}m_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Archivo descargado');
  }

  function copiarAlPortapapeles() {
    if (!datosExportados) return;

    const jsonString = JSON.stringify(datosExportados, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      toast.success('JSON copiado al portapapeles');
    });
  }

  function formatearNumero(num: number): string {
    return num.toLocaleString('es-CR');
  }
</script>

<Card class="border-purple-100 dark:border-purple-900 shadow-sm">
  <CardHeader>
    <CardTitle>Exportar Pedidos para PowerBI</CardTitle>
    <CardDescription>
      Descarga los datos en formato JSON para importar en Power BI
    </CardDescription>
  </CardHeader>
  <CardContent class="space-y-5">
    
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="flex-1">
        <label class="block text-sm font-medium mb-2">Rango (meses):</label>
        <select
          bind:value={meses}
          disabled={cargando}
          class="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
        >
          <option value={1}>1 mes</option>
          <option value={3}>3 meses</option>
          <option value={6}>6 meses</option>
          <option value={12}>12 meses</option>
          <option value={24}>24 meses</option>
        </select>
      </div>

      <div class="flex items-end">
        <Button
          onclick={obtenerDatos}
          disabled={cargando}
          class="w-full gap-2 bg-purple-600 hover:bg-purple-700"
        >
          {#if cargando}
            <Loader2 class="h-4 w-4 animate-spin" />
            Consultando...
          {:else}
            <Download class="h-4 w-4" />
            Obtener Datos
          {/if}
        </Button>
      </div>
    </div>

    {#if error}
      <div class="flex gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
        <AlertCircle class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p class="font-semibold text-red-900 dark:text-red-100">Error</p>
          <p class="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      </div>
    {/if}

    {#if datosExportados}
      <div class="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900">
        
        <div>
          <h4 class="font-semibold text-sm mb-3">Resumen de datos:</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p class="text-xs text-muted-foreground">Pedidos únicos</p>
              <p class="font-bold text-purple-600">
                {formatearNumero(datosExportados.resumen.totales.pedidos_unicos)}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Líneas</p>
              <p class="font-bold text-purple-600">
                {formatearNumero(datosExportados.resumen.totales.lineas_totales)}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Fill Rate</p>
              <p class="font-bold text-purple-600">
                {datosExportados.resumen.fill_rate.global.toFixed(2)}%
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Lead time promedio</p>
              <p class="font-bold text-purple-600">
                {datosExportados.resumen.lead_time.promedio_dias.toFixed(1)} días
              </p>
            </div>
          </div>
        </div>

        <div class="text-xs text-muted-foreground">
          <p>
            Tamaño: ~{(JSON.stringify(datosExportados).length / 1024).toFixed(1)} KB
          </p>
          <p>
            Exportado: {new Date(datosExportados.exportado_en).toLocaleString('es-CR')}
          </p>
        </div>
      </div>

      <div class="flex gap-3">
        <Button
          onclick={descargarJSON}
          class="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Download class="h-4 w-4" />
          Descargar JSON
        </Button>
        <Button
          onclick={copiarAlPortapapeles}
          variant="outline"
          class="flex-1 gap-2"
        >
          <Copy class="h-4 w-4" />
          Copiar
        </Button>
      </div>

      <div class="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded border border-blue-200 dark:border-blue-900">
        💡 Importa este JSON en Power BI Desktop usando "Obtener datos" → "JSON"
      </div>
    {/if}

  </CardContent>
</Card>