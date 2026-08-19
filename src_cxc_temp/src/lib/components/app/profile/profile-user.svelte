<script lang="ts">
  /**
   * @module ProfileUser
   * @description This component serves as the main entry point for a user's public profile page.
   * It integrates various sub-components to display profile information, projects, sales, and properties within a tabbed interface.
   */
  import ProfileHeader from "./profile-header.svelte";
  import About from "./about.svelte";
  import Projects from "./projects.svelte";
  import Sales from "./sales.svelte";
  import PropiedadesDestacadas from "$lib/components/app/dashboard/PropiedadesDestacadas.svelte";
  import Propiedades from "./propiedades.svelte";
  import Favoritos from "./favoritos.svelte";
  import ProfileAccount from "$lib/components/app/account/account.svelte"
  import Agente from "$lib/components/app/account/agente.svelte";
  import ListaConsultas from "$lib/components/app/consultas/ListaConsultas.svelte";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { UserCog, Users, Files, TrendingUp, MapPinHouse, Star, FileUser  } from "lucide-svelte";
	import type { PageData } from "../../../../routes/(app)/Profile/$types";

	/**
	 * The `PageData` object provided by SvelteKit, containing data loaded for the profile page.
	 * @property {object} data - The data object, expected to contain `agentForm`.
	 */
	let { data } = $props<{ data: PageData }>();

	/**
	 * The agent form data, extracted from the `data` prop.
	 * @type {import("sveltekit-superforms").SuperValidated<import("zod").ZodObject<any>>}
	 */
	const { agentForm, perfil, user, propiedades, favoritos } = data;

	/**
	 * An array of objects representing featured properties, used for display within the "Propiedades" tab.
	 * @constant
	 * @type {Array<object>}
	 * @property {string} name - The name or title of the property.
	 * @property {string} location - The geographical location of the property.
	 * @property {string} price - The price of the property.
	 * @property {string} image - The URL of the property's main image.
	 */
	const featuredProperties = [
		{ name: 'Residencial Valle Azul', location: 'Heredia, Santo Domingo', price: '₡98,000,000', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Casa moderna en Rohrmoser', location: 'San José, Pavas', price: '₡135,000,000', image: 'https://images.unsplash.com/photo-1600585154363-4b46a6c2d5a2?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Casa de playa en Nosara', location: 'Guanacaste, Nosara', price: '₡375,000,000', image: 'https://images.unsplash.com/photo-1600585154206-3e7bf94a9b8d?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Apartamento en Escalante', location: 'San José, Barrio Escalante', price: '₡89,500,000', image: 'https://images.unsplash.com/photo-1600607687126-3a5f4c6b9f98?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Casa campestre en San Ramón', location: 'Alajuela, San Ramón', price: '₡120,000,000', image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Condominio Vista Verde', location: 'Cartago, Tres Ríos', price: '₡110,000,000', image: 'https://images.unsplash.com/photo-1600585154035-8c9b8de4e4c8?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Casa colonial en Grecia', location: 'Alajuela, Grecia', price: '₡140,000,000', image: 'https://images.unsplash.com/photo-1600047502237-30e04f1a5c5e?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Residencial Bosques del Este', location: 'San José, Curridabat', price: '₡175,000,000', image: 'https://images.unsplash.com/photo-1600047502057-64879ad50a70?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Casa con vista al mar', location: 'Puntarenas, Jacó', price: '₡295,000,000', image: 'https://images.unsplash.com/photo-1600566753190-17f9a28a6e87?q=80&w=2000&auto=format&fit=crop' },
		{ name: 'Villa en Santa Ana', location: 'San José, Santa Ana', price: '₡225,000,000', image: 'https://images.unsplash.com/photo-1600047502032-96d3f1683a7a?q=80&w=2000&auto=format&fit=crop' }
	];
	
</script>

<div class="mx-auto max-w-7xl space-y-6 p-4">
  <ProfileHeader {perfil} {user} />
  
  <Tabs.Root value="about" class="w-full">
    <!-- Distribución uniforme de los 4 botones -->
    <Tabs.List class="mb-6 grid w-full grid-cols-4 gap-2">
      <Tabs.Trigger value="about" class="flex items-center justify-center gap-2">
        <UserCog size={18} />
        <span>Perfil</span>
      </Tabs.Trigger>
      
      
      <!-- Cambiado value de "connections" a "properties" -->
      <Tabs.Trigger value="properties" class="flex items-center justify-center gap-2">
        <MapPinHouse size={18} />
        <span>Mis Propiedades</span>
      </Tabs.Trigger>
      
      <!-- Cambiado value de "projects" a "favorites" -->
      <Tabs.Trigger value="favorites" class="flex items-center justify-center gap-2">
        <Star size={18} />
        <span>Favoritos</span>
      </Tabs.Trigger>
      
      
      <!-- Cambiado value de "sales" a "requests" -->
      <Tabs.Trigger value="requests" class="flex items-center justify-center gap-2">
        <FileUser size={18} />
        <span>Solicitudes</span>
      </Tabs.Trigger>
    </Tabs.List>
    
    <Tabs.Content value="about" class="mt-0">
		<ProfileAccount {agentForm} {perfil} {user} />
    </Tabs.Content>
    
    <!-- Actualizado el value a "properties" -->
    <Tabs.Content value="properties" class="mt-0">
      <Propiedades {propiedades} />
    </Tabs.Content>
    
    <!-- Actualizado el value a "favorites" -->
    <Tabs.Content value="favorites" class="mt-0">
      <Favoritos {favoritos} />
    </Tabs.Content>
    
    
    <!-- Nuevo contenido para Solicitudes -->
    <Tabs.Content value="requests" class="mt-0">
      <ListaConsultas />
    </Tabs.Content>
  </Tabs.Root>
</div>