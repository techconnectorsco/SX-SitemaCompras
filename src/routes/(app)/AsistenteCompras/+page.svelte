<script lang="ts">
  import {
    Home,
    ShoppingCart,
    FileText,
    Bell,
    User,
    FileSearch,
    Settings,
    Loader2,
    BarChart2,
    CreditCard
  } from 'lucide-svelte';
  
  // ✅ CAMBIO: Lazy loading - imports dinámicos en lugar de estáticos
  import { onMount } from 'svelte';

  interface NavItem {
    name: string;
    label: string;
    icon: any;
    componentLoader: () => Promise<any>;
    adminOnly?: boolean;
  }

  let { data = $bindable() } = $props(); // ✅ SVELTE 5: $props() instead of export let

  // ✅ SVELTE 5: Usar $derived en lugar de $:
  const user = $derived({
    id: data.session?.user?.id || '',
    name: data.session?.user?.display_name || data.session?.user?.email || 'Usuario',
    email: data.session?.user?.email || '',
    role: data.session?.user?.role?.toLowerCase() || 'user',
    account_status: data.session?.user?.account_status || 'PENDING'
  });

  let activeTab = $state('dashboard'); // ✅ SVELTE 5: Cambiar a $state()
  let activeComponent = $state<any>(null); // ✅ SVELTE 5: Cambiar a $state()
  let componentLoading = $state(false); // ✅ CAMBIO: Tracking de carga

  // ✅ CAMBIO: Lazy loaders en lugar de imports directos
  const navItems: NavItem[] = [
    {
      name: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      componentLoader: () => import('$lib/components/app/dashboard/dashboard.svelte')
    },
    {
      name: 'powerbi',
      label: 'PowerBI',
      icon: BarChart2,
      componentLoader: () => import('$lib/components/app/reporteBI/PowerBIEmbed.svelte')
    },
    {
      name: 'compras', 
      label: 'Gestión de Compras', 
      icon: ShoppingCart, 
      componentLoader: () => import('$lib/components/app/compras/gestion-compras.svelte')
    },
    { 
      name: 'reportes', 
      label: 'Reportes', 
      icon: FileText, 
      componentLoader: () => import('$lib/components/app/reportes/reportes.svelte')
    },
    { 
      name: 'alertas', 
      label: 'Alertas', 
      icon: Bell, 
      componentLoader: () => import('$lib/components/app/alertas/alertas.svelte')
    },
    { 
      name: 'perfil', 
      label: 'Mi Perfil', 
      icon: User, 
      componentLoader: () => import('$lib/components/app/profile/profile-user.svelte')
    },
    { 
      name: 'auditoria', 
      label: 'Auditoría', 
      icon: FileSearch, 
      componentLoader: () => import('$lib/components/app/admin/auditoria.svelte'),
      adminOnly: true 
    },
    { 
      name: 'administracion', 
      label: 'Administración', 
      icon: Settings, 
      componentLoader: () => import('$lib/components/app/admin/administracion.svelte'),
      adminOnly: true 
    }
  ];

  // ✅ SVELTE 5: Usar $derived en lugar de $:
  const visibleNavItems = $derived(navItems.filter(item => 
    !item.adminOnly || (item.adminOnly && user.role === 'admin')
  ));

  // ✅ CAMBIO: Función para cargar componente dinámicamente
  async function loadComponent(tabName: string) {
    const item = visibleNavItems.find(item => item.name === tabName);
    if (!item) {
      activeComponent = null;
      return;
    }

    componentLoading = true;
    try {
      const module = await item.componentLoader();
      activeComponent = module.default;
    } catch (error) {
      console.error(`Error loading component ${tabName}:`, error);
      activeComponent = null;
    } finally {
      componentLoading = false;
    }
  }

  // ✅ CAMBIO: Cargar componente inicial en onMount
  onMount(() => {
    loadComponent(activeTab);
  });

  // ✅ SVELTE 5: Usar $effect en lugar de $: if
  $effect(() => {
    if (activeTab) {
      loadComponent(activeTab);
    }
  });
</script>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: hsl(var(--muted));
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }
</style>

<div class="flex w-full flex-col min-h-screen">
  
  <!-- Sistema de Pestañas -->
  <div class="sticky top-0 z-10 flex justify-center border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
    <div class="flex gap-1 p-2 overflow-x-auto custom-scrollbar max-w-full">
      {#each visibleNavItems as item}
        {@const Icon = item.icon}
        <button
          onclick={() => (activeTab = item.name)}
          class={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap
            ${activeTab === item.name
              ? 'bg-[#0D1E3D] text-white font-medium shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }
          `}
        >
          <Icon class="h-4 w-4" />
          <span class="text-sm">{item.label}</span>
          {#if item.adminOnly}
            <span class="ml-1 rounded-full bg-[#1A73C2] px-2 py-0.5 text-xs font-bold text-white">
              ADMIN
            </span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- ✅ CAMBIO: Renderizado dinámico del componente (Svelte 5 sin svelte:component) -->
  <div class="flex-1">
    {#if componentLoading}
      <div class="flex flex-1 items-center justify-center p-8">
        <div class="flex flex-col items-center gap-4">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Cargando módulo...</p>
        </div>
      </div>
    {:else if activeComponent}
      {@const Component = activeComponent}
      <Component {data} {user} />
    {:else}
      <div class="flex flex-1 items-center justify-center p-8">
        <p class="text-muted-foreground">Componente no encontrado</p>
      </div>
    {/if}
  </div>

</div>