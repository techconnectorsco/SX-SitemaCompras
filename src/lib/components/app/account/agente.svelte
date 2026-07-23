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

<div class="mt-8 border-t pt-6">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-medium">Información de Agente</h2>
		<div class="flex items-center gap-2">
			<Label for="isAgent">Soy agente inmobiliario</Label>
			<Switch id="isAgent" bind:checked={isAgent} />
		</div>
	</div>

	{#if isAgent}
		<form method="POST" use:enhance class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label>Nombre de la agencia</Label>
				<Input name="agency_name" bind:value={$formData.agency_name} />
				{#if $errors.agency_name}
					<p class="text-red-500 text-sm">{$errors.agency_name}</p>
				{/if}
			</div>

			<div>
				<Label>Número de licencia</Label>
				<Input name="license_number" bind:value={$formData.license_number} />
				{#if $errors.license_number}
					<p class="text-red-500 text-sm">{$errors.license_number}</p>
				{/if}
			</div>

			<div>
				<Label>Teléfono</Label>
				<Input name="phone" bind:value={$formData.phone} />
				{#if $errors.phone}
					<p class="text-red-500 text-sm">{$errors.phone}</p>
				{/if}
			</div>

			<div>
				<Label>Provincia</Label>
				<Input name="province" bind:value={$formData.province} />
				{#if $errors.province}
					<p class="text-red-500 text-sm">{$errors.province}</p>
				{/if}
			</div>

			<div class="md:col-span-2">
				<Label>Sitio web (opcional)</Label>
				<Input name="website" bind:value={$formData.website} />
				{#if $errors.website}
					<p class="text-red-500 text-sm">{$errors.website}</p>
				{/if}
			</div>

			<div class="md:col-span-2 flex justify-end mt-4">
				<Button type="submit">Guardar</Button>
			</div>
		</form>
	{/if}
</div>