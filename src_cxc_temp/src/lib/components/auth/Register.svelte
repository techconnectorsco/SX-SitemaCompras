<!-- ============================================================ -->
<!-- ARCHIVO: src/lib/components/auth/Register.svelte              -->

<script lang="ts">
	import { registerSchema, type RegisterSchema } from '$lib/features/auth/schemas/auth';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import AuthForm from './AuthForm.svelte';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { siteConfig } from '$lib/config/site';

	// Props: recibimos form + lista de clientes desde +page.server.ts
	let props = $props<{
		data: {
			form: SuperValidated<Infer<RegisterSchema>>;
			clientes?: Array<{ id: string; nombre: string }>;
		};
	}>();

	const clientes = props.data.clientes ?? [];

	const form = superForm(props.data.form, {
		validators: zodClient(registerSchema),
		validationMethod: 'auto',
		resetForm: false,
		invalidateAll: false,
		onSubmit: () => {
			console.log('[Register] Form is being submitted');
		},
		onResult: ({ result }) => {
			console.log('[Register] onResult:', result.type);

			if (result.type === 'redirect') {
				console.log('[Register] Redirecting to:', result.location);
				return;
			}

			if (result.type === 'failure') {
				console.log('[Register] Form failure:', result.data);
			}
		},
		onError: ({ result }) => {
			console.error('[Register] Form error:', result);
		}
	});

	const { enhance, message, submitting, form: formData } = form;

	// Estado reactivo para mostrar/ocultar la sección de solicitud
	let mostrarSolicitud = $derived($formData.solicitar_acceso);
</script>

<!-- Contenedor principal con gradiente sutil -->
<div
	class="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-background to-muted"
>
	<!-- Card contenedor -->
	<div class="w-full max-w-md space-y-8">
		<!-- Logo y Título -->
		<div class="text-center space-y-3">
			<div class="flex justify-center mb-4">
				<a href="/" class="inline-block">
					<img src={siteConfig.logo} alt={siteConfig.title} class="h-16 w-auto" />
				</a>
			</div>

			<h1 class="text-3xl font-bold text-foreground">¡Únete a {siteConfig.title}! 🚀</h1>
			<p class="text-sm text-muted-foreground">
				Crea tu cuenta para acceder a nuestra plataforma de automatización
			</p>
		</div>

		<!-- Card del formulario -->
		<div class="bg-card rounded-2xl shadow-lg border border-border p-8">
			<AuthForm
				title=""
				description=""
				{form}
				{formData}
				formAction="?/register"
				buttonText="Crear cuenta"
				submitting={$submitting}
				message={$message}
				footerText="¿Ya tienes cuenta?"
				footerLinkText="Inicia sesión"
				footerLinkHref="/auth?mode=login"
				{enhance}
				showPasswordToggle={true}
			>
				<!-- ============================================ -->
				<!-- CAMPOS EXTRA inyectados via snippet           -->
				<!-- ============================================ -->
				{#snippet extraFields()}
					<!-- Separador visual -->
					<div class="relative my-2 pt-2">
						<div class="absolute inset-0 flex items-center">
							<span class="w-full border-t border-border"></span>
						</div>
						<div class="relative flex justify-center text-xs">
							<span class="bg-card px-3 text-muted-foreground font-medium"
								>Información personal</span
							>
						</div>
					</div>

					<!-- Nombre completo (obligatorio) -->
					<div class="space-y-2">
						<Form.Field {form} name="nombre_completo">
							<Form.Control>
								{#snippet children({ props }: { props: any })}
									<Form.Label class="text-sm font-medium text-foreground">
										Nombre completo <span class="text-destructive">*</span>
									</Form.Label>
									<Input
										{...props}
										type="text"
										placeholder="Tu nombre completo"
										class="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
										disabled={$submitting}
										bind:value={$formData.nombre_completo}
									/>
								{/snippet}
							</Form.Control>
							<Form.FieldErrors class="text-xs text-destructive mt-1" />
						</Form.Field>
					</div>

					<!-- Empresa y Cargo en 2 columnas -->
					<div class="grid grid-cols-2 gap-3">
						<!-- Empresa -->
						<div class="space-y-2">
							<Form.Field {form} name="empresa">
								<Form.Control>
									{#snippet children({ props }: { props: any })}
										<Form.Label class="text-sm font-medium text-foreground">
											Empresa
										</Form.Label>
										<Input
											{...props}
											type="text"
											placeholder="Tu empresa"
											class="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
											disabled={$submitting}
											bind:value={$formData.empresa}
										/>
									{/snippet}
								</Form.Control>
							</Form.Field>
						</div>

						<!-- Cargo -->
						<div class="space-y-2">
							<Form.Field {form} name="cargo">
								<Form.Control>
									{#snippet children({ props }: { props: any })}
										<Form.Label class="text-sm font-medium text-foreground">
											Cargo
										</Form.Label>
										<Input
											{...props}
											type="text"
											placeholder="Tu cargo"
											class="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
											disabled={$submitting}
											bind:value={$formData.cargo}
										/>
									{/snippet}
								</Form.Control>
							</Form.Field>
						</div>
					</div>

					<!-- Teléfono -->
					<div class="space-y-2">
						<Form.Field {form} name="telefono">
							<Form.Control>
								{#snippet children({ props }: { props: any })}
									<Form.Label class="text-sm font-medium text-foreground">
										Teléfono
									</Form.Label>
									<Input
										{...props}
										type="tel"
										placeholder="+506 0000 0000"
										class="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
										disabled={$submitting}
										bind:value={$formData.telefono}
									/>
								{/snippet}
							</Form.Control>
						</Form.Field>
					</div>

					<!-- ============================================ -->
					<!-- SECCIÓN: Solicitar acceso a cliente           -->
					<!-- ============================================ -->
					{#if clientes.length > 0}
						<div class="relative my-2 pt-2">
							<div class="absolute inset-0 flex items-center">
								<span class="w-full border-t border-border"></span>
							</div>
							<div class="relative flex justify-center text-xs">
								<span class="bg-card px-3 text-muted-foreground font-medium"
									>Acceso a cliente</span
								>
							</div>
						</div>

						<!-- Checkbox: ¿Solicitar acceso? -->
						<div class="space-y-2">
							<Form.Field {form} name="solicitar_acceso">
								<Form.Control>
									{#snippet children({ props }: { props: any })}
										<label
											class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-input hover:bg-muted/50 transition-colors"
										>
											<input
												{...props}
												type="checkbox"
												class="mt-0.5 h-4 w-4 rounded border-input text-blue-600 focus:ring-blue-500"
												disabled={$submitting}
												bind:checked={$formData.solicitar_acceso}
											/>
											<div>
												<span class="text-sm font-medium text-foreground">
													¿Perteneces a un cliente existente?
												</span>
												<p class="text-xs text-muted-foreground mt-0.5">
													Si tu empresa ya trabaja con nosotros, solicita acceso para ver
													la información de tus automatizaciones.
												</p>
											</div>
										</label>
									{/snippet}
								</Form.Control>
							</Form.Field>
						</div>

						<!-- Campos condicionales: solo si marcó solicitar_acceso -->
						{#if mostrarSolicitud}
							<div
								class="space-y-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
							>
								<!-- Select de cliente -->
								<div class="space-y-2">
									<Form.Field {form} name="cliente_id">
										<Form.Control>
											{#snippet children({ props }: { props: any })}
												<Form.Label class="text-sm font-medium text-foreground">
													Selecciona tu empresa cliente
													<span class="text-destructive">*</span>
												</Form.Label>
												<select
													{...props}
													class="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
													disabled={$submitting}
													bind:value={$formData.cliente_id}
												>
													<option value="">-- Selecciona un cliente --</option>
													{#each clientes as cliente}
														<option value={cliente.id}>{cliente.nombre}</option>
													{/each}
												</select>
											{/snippet}
										</Form.Control>
										<Form.FieldErrors class="text-xs text-destructive mt-1" />
									</Form.Field>
								</div>

								<!-- Mensaje / Relación con el cliente -->
								<div class="space-y-2">
									<Form.Field {form} name="mensaje_solicitud">
										<Form.Control>
											{#snippet children({ props }: { props: any })}
												<Form.Label class="text-sm font-medium text-foreground">
													¿Cuál es tu relación con esta empresa?
													<span class="text-destructive">*</span>
												</Form.Label>
												<textarea
													{...props}
													rows="3"
													placeholder="Ej: Soy el gerente de operaciones de Vedova y Obando y necesito monitorear las automatizaciones de CXC..."
													class="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none text-sm"
													disabled={$submitting}
													bind:value={$formData.mensaje_solicitud}
												></textarea>
											{/snippet}
										</Form.Control>
										<Form.FieldErrors class="text-xs text-destructive mt-1" />
									</Form.Field>
								</div>

								<p class="text-xs text-blue-600 dark:text-blue-400">
									ℹ️ Tu solicitud será revisada por un administrador. Te notificaremos
									cuando se apruebe tu acceso.
								</p>
							</div>
						{/if}
					{/if}
				{/snippet}
			</AuthForm>
		</div>

		<!-- Términos y condiciones -->
		<div class="text-center">
			<div
				class="inline-flex flex-col gap-2 text-xs text-muted-foreground bg-card px-6 py-3 rounded-xl shadow-sm border border-border"
			>
				<div class="flex items-start gap-2">
					<svg
						class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span class="text-left">
						Al registrarte, aceptas nuestros
						<a href="/terminos" class="text-blue-600 hover:text-blue-700 font-medium"
							>Términos de Servicio</a
						>
						y
						<a href="/privacidad" class="text-blue-600 hover:text-blue-700 font-medium"
							>Política de Privacidad</a
						>
					</span>
				</div>
			</div>
		</div>
	</div>
</div>