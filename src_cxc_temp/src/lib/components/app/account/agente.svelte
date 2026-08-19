<script lang="ts">
  /**
   * @module AgenteInfo
   * @description This component allows users to manage their agent-specific information.
   * It includes a form for agency name, license number, phone, province, and website, with client-side validation using Zod and SvelteKit SuperForms.
   */
	import { superForm } from 'sveltekit-superforms/client';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { z } from 'zod';
	import { agentSchema } from '$lib/features/account/schemas/agente';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from 'svelte-sonner';

	/**
	 * @property {SuperValidated<z.infer<typeof agentSchema>>} agentForm - The SuperValidated form object containing agent data and validation state.
	 */
	let { agentForm } = $props<{ agentForm: SuperValidated<z.infer<typeof agentSchema>> }>();

	/**
	 * Reactive state variable indicating whether the user identifies as an real estate agent.
	 * @type {boolean}
	 */
	let isAgent = $state(false);

	// Inicializa superform
	/**
	 * Initializes a SvelteKit SuperForm instance for agent information.
	 * @constant
	 * @type {ReturnType<typeof superForm<z.infer<typeof agentSchema>>>}
	 */
	const form = superForm(agentForm, { id: 'agent-info' });
	const { enhance, form: formData, errors } = form;

	// aquí podrías enviar los datos al backend (ejemplo)
	console.log('Datos del agente:', $formData);

	//toast.success('Información de agente guardada correctamente');
</script>

<div class="w-full space-y-6">
	<!-- Toggle Agente -->
	<div class="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-lg p-4 transition-all">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
				<span class="text-white text-lg">💼</span>
			</div>
			<div>
				<p class="font-semibold text-foreground">Perfil de Agente Inmobiliario</p>
				<p class="text-sm text-muted-foreground">¿Eres agente Inmobiliario? Llena la siguiente informacion para que uno de nuestros administradores te apruebe como agente.</p>
			</div>
		</div>
		<Switch id="isAgent" bind:checked={isAgent} />
	</div>

	{#if isAgent}
		<form method="POST" use:enhance class="space-y-6 mt-6">
			<!-- Información Básica -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="space-y-2">
					<Label for="agency_name" class="font-semibold text-foreground">Nombre de la Agencia</Label>
					<Input 
						id="agency_name"
						name="agency_name" 
						placeholder="Ej: Inmobiliaria Costa Rica Pro"
						bind:value={$formData.agency_name}
						class="border-input rounded-lg py-3 px-4 focus:border-ring focus:ring-2 focus:ring-ring transition-all"
					/>
					{#if $errors.agency_name}
						<p class="text-red-500 text-sm flex items-center gap-1">⚠️ {$errors.agency_name}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="license_number" class="font-semibold text-gray-900">Número de Licencia</Label>
					<Input 
						id="license_number"
						name="license_number" 
						placeholder="Ej: LIC-2024-12345"
						bind:value={$formData.license_number}
						class="border-input rounded-lg py-3 px-4 focus:border-ring focus:ring-2 focus:ring-ring transition-all"
					/>
					{#if $errors.license_number}
						<p class="text-red-500 text-sm flex items-center gap-1">⚠️ {$errors.license_number}</p>
					{/if}
				</div>
			</div>

			<!-- Contacto -->
			<div class="space-y-4">
				<div class="flex items-center gap-2 mb-2">
					<span class="text-lg">🏢</span>
					<h3 class="font-semibold text-foreground">Información Profesional</h3>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-2">
						<Label for="province" class="font-semibold text-gray-900">Provincia</Label>
						<Input 
							id="province"
							name="province" 
							placeholder="Ej: San José"
							bind:value={$formData.province}
							class="border-input rounded-lg py-3 px-4 focus:border-ring focus:ring-2 focus:ring-ring transition-all"
						/>
						{#if $errors.province}
							<p class="text-red-500 text-sm flex items-center gap-1">⚠️ {$errors.province}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label for="website" class="font-semibold text-gray-900">Sitio Web</Label>
							<span class="text-xs text-muted-foreground">Opcional</span>
						</div>
						<Input 
							id="website"
							name="website" 
							type="url"
							placeholder="https://www.miagencia.com"
							bind:value={$formData.website}
							class="border-input rounded-lg py-3 px-4 focus:border-ring focus:ring-2 focus:ring-ring transition-all"
						/>
						{#if $errors.website}
							<p class="text-red-500 text-sm flex items-center gap-1">⚠️ {$errors.website}</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Botones de Acción -->
			<div class="flex gap-3 pt-4 border-t border-gray-200">
				<Button 
					type="submit"
					class="bg-green-500 hover:bg-green-600 text-white transition-all"
				>
					✓ Enviar Solicitud
				</Button>
				<Button 
					variant='outline'
					type="button"
					on:click={() => isAgent = false}
				>
					Cancelar
				</Button>
			</div>
		</form>
	{/if}
</div>