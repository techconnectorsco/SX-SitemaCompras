<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Search, AlertCircle, Package } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  interface Distribucion {
    bodega_codigo: string;
    bodega_nombre: string;
    cant_disponible: number;
    cant_reservada: number;
    cant_transito: number;
    cant_produccion: number;
    total: number;
    excluida: boolean;
  }

  // Estados para la consulta de bodegas
  let skuSeleccionado = $state('');
  let cargando = $state(false);
  let resultado = $state<any>(null);
  let error = $state<string | null>(null);

  // Estados para el Buscador Inteligente
  let busqueda = $state('');
  let sugerencias = $state<any[]>([]);
  let buscandoSugerencias = $state(false);
  let mostrarSugerencias = $state(false);
  let timeoutId: ReturnType<typeof setTimeout>;

  // Función para buscar sugerencias en SQLite mientras el usuario teclea
  function handleInput() {
    mostrarSugerencias = true;
    if (!busqueda.trim()) {
      sugerencias = [];
      return;
    }

    // Debounce: Esperamos 300ms después de que deje de teclear para consultar
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      buscandoSugerencias = true;
      try {
        // Llamamos a la nueva API que crearemos
        const res = await fetch(`/api/admin/productos/buscar?q=${encodeURIComponent(busqueda)}`);
        if (res.ok) {
          const data = await res.json();
          sugerencias = data.productos || [];
        }
      } catch (e) {
        console.error("Error buscando sugerencias:", e);
      } finally {
        buscandoSugerencias = false;
      }
    }, 300);
  }

  // Cuando el usuario hace clic en una sugerencia
  function seleccionarProducto(producto: any) {
    skuSeleccionado = producto.sku;
    busqueda = `${producto.sku} - ${producto.descripcion}`; // Mostramos ambos en el input
    mostrarSugerencias = false;
    buscarSKU(); // Disparamos la búsqueda de bodegas automáticamente
  }

  // La consulta a Exactus (ya la tenías)
  async function buscarSKU() {
    if (!skuSeleccionado.trim()) {
      toast.error('Por favor, selecciona un producto de la lista');
      return;
    }

    cargando = true;
    error = null;
    resultado = null;
    mostrarSugerencias = false;

    try {
      const res = await fetch(`/api/admin/bodegas?sku=${encodeURIComponent(skuSeleccionado.trim())}`);

      if (!res.ok) throw new Error('Error al consultar la distribución en bodegas');

      const data = await res.json();
      
      if (!data.encontrado) {
        toast.info('Producto no encontrado en ninguna bodega');
        resultado = null;
      } else {
        resultado = data;
        toast.success(`✅ Distribuido en ${data.distribucion.length} bodega(s)`);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(error);
    } finally {
      cargando = false;
    }
  }

  function formatearNumero(num: number): string {
    return num.toLocaleString('es-CR');
  }
</script>

<svelte:window onclick={(e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.buscador-container')) {
    mostrarSugerencias = false;
  }
}} />

<Card class="border-purple-100 dark:border-purple-900">
  <CardHeader>
    <CardTitle>Consultar Producto en Bodegas</CardTitle>
    <CardDescription>
      Busca un producto por código o descripción para ver dónde está almacenado
    </CardDescription>
  </CardHeader>

  <CardContent class="space-y-5">
    
    <div class="flex gap-2 relative buscador-container z-50">
      <div class="flex-1 relative">
        <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Escribe un SKU (ej: 123) o descripción (ej: Cortadora)..."
          bind:value={busqueda}
          oninput={handleInput}
          onfocus={() => { if(busqueda) mostrarSugerencias = true; }}
          disabled={cargando}
          class="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {#if mostrarSugerencias && busqueda.trim().length > 0}
          <div class="absolute w-full mt-1 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {#if buscandoSugerencias}
              <div class="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
            {:else if sugerencias.length === 0}
              <div class="p-4 text-center text-sm text-muted-foreground">No se encontraron productos</div>
            {:else}
              <ul class="py-1">
                {#each sugerencias as item}
                  <li>
                    <button
                      class="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                      onclick={() => seleccionarProducto(item)}
                    >
                      <Package class="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <div class="min-w-0">
                        <p class="font-bold text-sm text-slate-900 dark:text-white">{item.sku}</p>
                        <p class="text-xs text-muted-foreground truncate">{item.descripcion}</p>
                      </div>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </div>

      <Button
        onclick={buscarSKU}
        disabled={cargando || !skuSeleccionado}
        class="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
      >
        {#if cargando}
          <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
        {:else}
          <Search class="h-4 w-4" />
        {/if}
        Consultar
      </Button>
    </div>

    {#if error}
      <div class="flex gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
        <AlertCircle class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p class="text-sm text-red-700 dark:text-red-200">{error}</p>
      </div>
    {/if}

    {#if resultado && resultado.encontrado}
      <div class="space-y-4 animate-in fade-in duration-300">
        <div class="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
          <p class="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Package class="h-4 w-4" />
            <strong>SKU Analizado:</strong> {resultado.sku}
          </p>
        </div>

        <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table class="w-full text-sm border-collapse">
            <thead class="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th class="border-b p-3 text-left font-semibold">Bodega</th>
                <th class="border-b p-3 text-right font-semibold">Disponible</th>
                <th class="border-b p-3 text-right font-semibold">Reservada</th>
                <th class="border-b p-3 text-right font-semibold">Tránsito</th>
                <th class="border-b p-3 text-right font-semibold">Producción</th>
                <th class="border-b p-3 text-right font-semibold">Total</th>
                <th class="border-b p-3 text-center font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {#each resultado.distribucion as dist (dist.bodega_codigo)}
                <tr class={dist.excluida ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}>
                  <td class="border-b p-3">
                    <div>
                      <p class="font-medium text-slate-900 dark:text-slate-100">{dist.bodega_codigo}</p>
                      <p class="text-xs text-muted-foreground">{dist.bodega_nombre}</p>
                    </div>
                  </td>
                  <td class="border-b p-3 text-right font-mono">{formatearNumero(dist.cant_disponible)}</td>
                  <td class="border-b p-3 text-right font-mono">{formatearNumero(dist.cant_reservada)}</td>
                  <td class="border-b p-3 text-right font-mono">{formatearNumero(dist.cant_transito)}</td>
                  <td class="border-b p-3 text-right font-mono">{formatearNumero(dist.cant_produccion)}</td>
                  <td class="border-b p-3 text-right font-mono font-bold text-slate-900 dark:text-white">{formatearNumero(dist.total)}</td>
                  <td class="border-b p-3 text-center">
                    {#if dist.excluida}
                      <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Excluida</span>
                    {:else}
                      <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Incluida</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border">
          <div>
            <p class="text-xs text-muted-foreground mb-1">Total Actual (Bruto)</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{formatearNumero(resultado.resumen.total_actual)}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground mb-1">Total Útil (Sin Excluidas)</p>
            <p class="text-2xl font-bold text-green-600">{formatearNumero(resultado.resumen.total_sin_excluidas)}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground mb-1">Diferencia Restada</p>
            <p class="text-2xl font-bold text-red-600">{formatearNumero(resultado.resumen.diferencia)}</p>
            <p class="text-xs text-red-600 mt-1">
              {resultado.resumen.total_actual > 0 
                ? ((resultado.resumen.diferencia / resultado.resumen.total_actual) * 100).toFixed(1)
                : 0}% del stock
            </p>
          </div>
        </div>

        {#if resultado.resumen.bodegas_excluidas_en_sku.length > 0}
          <div class="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
            <AlertCircle class="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-yellow-800 dark:text-yellow-200">
              <p class="font-semibold mb-1">
                Atención: Se ignoró stock en {resultado.resumen.bodegas_excluidas_en_sku.length} bodega(s)
              </p>
              <p>{resultado.resumen.bodegas_excluidas_en_sku.join(', ')}</p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </CardContent>
</Card>