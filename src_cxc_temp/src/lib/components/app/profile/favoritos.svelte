<script lang="ts">
  import { Heart } from "lucide-svelte";
  import { goto } from "$app/navigation";

  interface Favorito {
    id: string;
    anuncio: {
      id: string;
      titulo: string;
      tipo_transaccion: string;
      precio: number;
      moneda: string;
      propiedades_datos: {
        dormitorios?: number;
        banos?: number;
        area_construccion_m2?: number;
        area_total_terreno_m2?: number;
        provincia?: string;
        canton?: string;
        distrito?: string;
        propiedades_multimedia?: Array<{ url: string }>;
      };
    };
  }

  let { favoritos = [] }: { favoritos: Favorito[] } = $props();

  let localFavoritos = $state(favoritos);

  $effect(() => {
    localFavoritos = favoritos;
  });

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'CRC'
    }).format(price);
  };

  const getImageUrl = (propiedad: any) => {
    const multimedia = Array.isArray(propiedad.propiedades_datos?.propiedades_multimedia) 
      ? propiedad.propiedades_datos.propiedades_multimedia[0]
      : null;
    
    return multimedia?.url || null;
  };

  const eliminarFavorito = async (favoritoId: string, anuncioId: string) => {
    try {
      const response = await fetch('/api/favoritos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ anuncio_id: anuncioId })
      });

      if (response.ok) {
        localFavoritos = localFavoritos.filter(f => f.id !== favoritoId);
      }
    } catch (error) {
      console.error('Error al eliminar favorito:', error);
    }
  };

  const irAPropiedad = (anuncioId: string) => {
    goto(`/propiedades-venta/${anuncioId}`);
  };
</script>

<div class="w-full">
  {#if localFavoritos.length === 0}
    <div class="rounded-lg border border-border p-12 text-center bg-muted">
      <Heart class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h3 class="mb-2 text-lg font-semibold text-foreground">No tienes favoritos aún</h3>
      <p class="text-muted-foreground">Explora propiedades y agrega tus preferidas a favoritos</p>
    </div>
  {:else}
    <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {#each localFavoritos as favorito (favorito.id)}
        <div class="rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow bg-card">
          <!-- Imagen -->
          <div class="relative h-48 bg-muted overflow-hidden group cursor-pointer" onclick={() => irAPropiedad(favorito.anuncio.id)}>
            {#if getImageUrl(favorito.anuncio)}
              <img 
                src={getImageUrl(favorito.anuncio)} 
                alt={favorito.anuncio.titulo}
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center bg-muted/50">
                <span class="text-muted-foreground">Sin imagen</span>
              </div>
            {/if}
            
            <!-- Badge de tipo de transacción -->
            <div class="absolute top-3 left-3">
              <span class="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full capitalize">
                {favorito.anuncio.tipo_transaccion}
              </span>
            </div>

            <!-- Botón para eliminar de favoritos -->
            <button
              onclick={(e) => {
                e.stopPropagation();
                eliminarFavorito(favorito.id, favorito.anuncio.id);
              }}
              class="absolute top-3 right-3 p-2 rounded-full bg-card hover:bg-destructive/10 transition-colors shadow-md hover:shadow-lg"
              title="Eliminar de favoritos"
            >
              <Heart class="h-5 w-5 text-red-500 fill-current" />
            </button>
          </div>

          <!-- Contenido -->
          <div class="p-4">
            <!-- Título -->
            <h3 
              class="font-semibold text-foreground mb-2 line-clamp-2 cursor-pointer hover:text-primary"
              onclick={() => irAPropiedad(favorito.anuncio.id)}
            >
              {favorito.anuncio.titulo}
            </h3>

            <!-- Ubicación -->
            {#if favorito.anuncio.propiedades_datos?.provincia || favorito.anuncio.propiedades_datos?.canton}
              <p class="text-sm text-muted-foreground mb-3">
                📍 {favorito.anuncio.propiedades_datos?.distrito || ''}{favorito.anuncio.propiedades_datos?.distrito && favorito.anuncio.propiedades_datos?.canton ? ', ' : ''}{favorito.anuncio.propiedades_datos?.canton || ''}{favorito.anuncio.propiedades_datos?.canton && favorito.anuncio.propiedades_datos?.provincia ? ', ' : ''}{favorito.anuncio.propiedades_datos?.provincia || ''}
              </p>
            {/if}

            <!-- Características -->
            <div class="flex gap-3 text-xs text-muted-foreground mb-4 border-t border-b border-border py-3">
              {#if favorito.anuncio.propiedades_datos?.dormitorios}
                <span class="flex items-center gap-1">
                  🛏️ {favorito.anuncio.propiedades_datos.dormitorios}
                </span>
              {/if}
              {#if favorito.anuncio.propiedades_datos?.banos}
                <span class="flex items-center gap-1">
                  🚿 {favorito.anuncio.propiedades_datos.banos}
                </span>
              {/if}
              {#if favorito.anuncio.propiedades_datos?.area_construccion_m2 || favorito.anuncio.propiedades_datos?.area_total_terreno_m2}
                <span class="flex items-center gap-1">
                  📐 {favorito.anuncio.propiedades_datos?.area_construccion_m2 || favorito.anuncio.propiedades_datos?.area_total_terreno_m2}m²
                </span>
              {/if}
            </div>

            <!-- Precio -->
            <div class="text-2xl font-bold text-foreground mb-4">
              {#if favorito.anuncio.moneda === 'USD'}
                ${favorito.anuncio.precio.toLocaleString('en-US')}
              {:else}
                ₡{favorito.anuncio.precio.toLocaleString('es-CR')}
              {/if}
            </div>

            <!-- Botón Ver Propiedad -->
            <button
              onclick={() => irAPropiedad(favorito.anuncio.id)}
              class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Ver Propiedad
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
