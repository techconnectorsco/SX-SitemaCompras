<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let enviando = $state(false);
	let mensaje  = $state('');
</script>

<div class="max-w-2xl mx-auto py-12 px-4 animate-fade-in">

	<!-- ── Breadcrumb ──────────────────────────────────────────── -->
	<div class="flex items-center gap-2 text-xs text-muted-foreground mb-8">
		<a href="/apps" class="hover:text-foreground transition-colors">Portafolio</a>
		<span>›</span>
		<span class="text-foreground font-medium">Solicitar acceso</span>
	</div>

	<!-- ══════════════════════════════════════════════════════════
	     CASO A — Éxito al enviar
	     ══════════════════════════════════════════════════════════ -->
	{#if form?.success}
		<div class="bg-card rounded-2xl border border-emerald-500/20 p-10 text-center">
			<div class="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20
			            flex items-center justify-center text-3xl mx-auto mb-6">
				🎉
			</div>
			<h1 class="text-2xl font-bold text-foreground mb-3">¡Solicitud enviada!</h1>
			<p class="text-sm text-muted-foreground leading-relaxed mb-6 max-w-md mx-auto">
				Tu solicitud de acceso a <strong class="text-foreground">{data.dominioCliente}</strong>
				fue enviada correctamente. La revisaremos y te notificaremos por correo
				a <strong class="text-foreground">{data.user?.email}</strong>.
			</p>
			<a
				href="/apps"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
				       bg-blue-600 hover:bg-blue-500 text-white
				       shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5"
			>
				← Volver al portafolio
			</a>
		</div>

	<!-- ══════════════════════════════════════════════════════════
	     CASO B — Solicitud ya existe
	     ══════════════════════════════════════════════════════════ -->
	{:else if data.solicitudExistente}
		{@const est = data.solicitudExistente.estado}
		<div class="bg-card rounded-2xl border border-amber-500/20 p-10 text-center">
			<div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20
			            flex items-center justify-center text-3xl mx-auto mb-6">
				{est === 'aprobada' ? '✅' : est === 'rechazada' ? '❌' : '⏳'}
			</div>
			<h1 class="text-2xl font-bold text-foreground mb-3">
				{est === 'aprobada'  ? 'Acceso aprobado'    :
				 est === 'rechazada' ? 'Solicitud rechazada' :
				 'Solicitud en proceso'}
			</h1>
			<p class="text-sm text-muted-foreground leading-relaxed mb-2">
				{est === 'aprobada'
					? 'Tu acceso ya fue aprobado. Si no puedes ver los procesos, cierra sesión y vuelve a iniciar.'
					: est === 'rechazada'
					? 'Tu solicitud fue rechazada. Contacta a soporte para más información.'
					: 'Tu solicitud está siendo revisada. Te notificaremos por correo cuando sea procesada.'}
			</p>
			<p class="text-xs text-muted-foreground mb-8">
				Solicitado el {new Date(data.solicitudExistente.created_at).toLocaleDateString('es-CR', {
					day: 'numeric', month: 'long', year: 'numeric'
				})}
			</p>
			<a
				href="/apps"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
				       border border-border text-foreground hover:bg-muted transition-colors"
			>
				← Volver al portafolio
			</a>
		</div>

	<!-- ══════════════════════════════════════════════════════════
	     CASO C — Dominio inválido (gmail, etc.)
	     ══════════════════════════════════════════════════════════ -->
	{:else if !data.dominioValido}
		<div class="bg-card rounded-2xl border border-border overflow-hidden">

			<!-- Header -->
			<div class="p-8 border-b border-border">
				<div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20
				            flex items-center justify-center text-2xl mb-5">
					⚠️
				</div>
				<h1 class="text-2xl font-bold text-foreground mb-2">
					Tu correo no está vinculado a ninguna empresa
				</h1>
				<p class="text-sm text-muted-foreground leading-relaxed">
					Iniciaste sesión con <strong class="text-foreground">{data.user?.email}</strong>,
					pero este dominio no corresponde a ninguna empresa registrada con SX Desarrollos.
				</p>
			</div>

			<!-- Pasos -->
			<div class="p-8 space-y-5">
				<p class="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
					¿Qué debes hacer?
				</p>

				{#each [
					{
						n: '01',
						titulo: 'Cierra la sesión actual',
						desc: 'Debes salir de esta cuenta para poder registrarte con tu correo corporativo.'
					},
					{
						n: '02',
						titulo: 'Regístrate con tu correo corporativo',
						desc: 'Usa el correo de tu empresa (ej: tunombre@tuempresa.cr) para crear tu cuenta.'
					},
					{
    n: '03',
    titulo: 'Solicita acceso a los procesos de tu empresa',
    desc: 'Tienes dos opciones: durante el registro puedes marcar "¿Perteneces a un cliente existente?" y enviar la solicitud en ese mismo momento, o si ya tienes cuenta con el correo correcto, regresa aquí y envía la solicitud desde esta página.'
},
				] as paso}
					<div class="flex items-start gap-4">
						<div class="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20
						            flex items-center justify-center text-xs font-extrabold
						            text-blue-600 dark:text-blue-400 flex-shrink-0">
							{paso.n}
						</div>
						<div>
							<p class="text-sm font-semibold text-foreground mb-0.5">{paso.titulo}</p>
							<p class="text-xs text-muted-foreground leading-relaxed">{paso.desc}</p>
						</div>
					</div>
				{/each}
			</div>

			<!-- Acciones -->
			<div class="p-8 pt-0 flex flex-wrap gap-3">
				<form method="POST" action="/auth/signout">
					<button
						type="submit"
						class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
						       bg-blue-600 hover:bg-blue-500 text-white
						       shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5"
					>
						Cerrar sesión
						<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/>
						</svg>
					</button>
				</form>
				<a
					href="/apps"
					class="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold
					       border border-border text-foreground hover:bg-muted transition-colors"
				>
					Volver al portafolio
				</a>
			</div>
		</div>

	<!-- ══════════════════════════════════════════════════════════
	     CASO D — Dominio válido, puede solicitar
	     ══════════════════════════════════════════════════════════ -->
	{:else}
		<div class="bg-card rounded-2xl border border-border overflow-hidden">

			<!-- Header -->
			<div class="p-8 border-b border-border">
				<div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20
				            flex items-center justify-center text-2xl mb-5">
					✅
				</div>
				<h1 class="text-2xl font-bold text-foreground mb-2">
					Tu empresa está registrada con nosotros
				</h1>
				<p class="text-sm text-muted-foreground leading-relaxed">
					Tu correo <strong class="text-foreground">{data.user?.email}</strong>
					pertenece a <strong class="text-foreground">{data.dominioCliente}</strong>.
					Completa el formulario para solicitar acceso a los procesos y métricas de tu empresa.
				</p>
			</div>

			<!-- Formulario -->
			<form
				method="POST"
				action="?/solicitar"
				use:enhance={() => {
					enviando = true;
					return async ({ update }) => {
						await update();
						enviando = false;
					};
				}}
				class="p-8 space-y-6"
			>
				<input type="hidden" name="cliente_id" value={data.dominioClienteId} />

				<!-- Info del usuario -->
				<div class="p-4 rounded-xl bg-muted/60 border border-border">
					<p class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
						Tu información
					</p>
					<div class="grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Correo</p>
							<p class="font-medium text-foreground">{data.user?.email}</p>
						</div>
						<div>
							<p class="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Empresa</p>
							<p class="font-medium text-foreground">{data.dominioCliente}</p>
						</div>
					</div>
				</div>

				<!-- Mensaje opcional -->
				<div>
					<label for="mensaje" class="block text-sm font-semibold text-foreground mb-2">
						Mensaje para el administrador
						<span class="text-muted-foreground font-normal">(opcional)</span>
					</label>
					<textarea
						id="mensaje"
						name="mensaje"
						bind:value={mensaje}
						rows="4"
						placeholder="Ej: Soy del departamento de contabilidad y necesito ver los reportes del robot CxC..."
						class="w-full px-4 py-3 rounded-xl text-sm
						       border border-border bg-muted
						       text-foreground placeholder:text-muted-foreground
						       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50
						       resize-none transition-colors"
					></textarea>
				</div>

				<!-- Error -->
				{#if form?.error}
					<div class="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
						{form.error}
					</div>
				{/if}

				<!-- Submit -->
				<div class="flex gap-3">
					<button
						type="submit"
						disabled={enviando}
						class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
						       bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed
						       text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5"
					>
						{#if enviando}
							<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
								<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
							</svg>
							Enviando...
						{:else}
							Enviar solicitud de acceso
							<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
							</svg>
						{/if}
					</button>
					<a
						href="/apps"
						class="px-6 py-3 rounded-xl text-sm font-semibold
						       border border-border text-foreground hover:bg-muted transition-colors"
					>
						Cancelar
					</a>
				</div>
			</form>
		</div>
	{/if}

</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
</style>