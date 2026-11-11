<script lang="ts">
	/**
	 * @module LandingFooter
	 * @description Pie de la landing pública (COI).
	 *
	 * Componente propio: `app/nav/footer.svelte` lo comparten Login, Register y
	 * `auth/pending`, así que no se toca.
	 *
	 * El bloque de contacto solo expone el sitio web.
	 */
	import { siteConfig } from '$lib/config/site';
	import { ACCESOS } from '$lib/config/landing';

	const anio = new Date().getFullYear();
	const sitio = 'soportexperto.com';
</script>

<footer id="contacto" class="site-foot">
	<div class="wrap">
		<div class="ft-grid">
			<div class="ft-brand">
				<img
					src={siteConfig.logoDark}
					alt={siteConfig.title}
					style="height:46px;width:auto;display:block"
				/>
				<p class="ft-note" style="margin-top:20px">
					Plataformas propias y procesos digitales dentro de operaciones reales de cliente.
				</p>
			</div>

			<div>
				<p class="ft-t">Accesos</p>
				{#each ACCESOS as acceso (acceso.sigla)}
					<a
						class="ft-a"
						href={acceso.href}
						target={acceso.externo ? '_blank' : null}
						rel={acceso.externo ? 'noopener noreferrer' : null}
						data-sveltekit-reload={acceso.reload ? '' : null}
					>
						{acceso.titulo}
					</a>
				{/each}
			</div>

			<div>
				<p class="ft-t">Plataforma</p>
				<a class="ft-a" href="#proceso">Cómo funciona</a>
				<a class="ft-a" href="#solicitar">Solicitar acceso</a>
				<a class="ft-a" href="/privacy.html">Privacidad</a>
			</div>

			<div>
				<p class="ft-t">Contacto</p>
				<a class="ft-a" href="https://{sitio}" target="_blank" rel="noopener noreferrer">{sitio}</a>
			</div>
		</div>

		<div class="ft-base">© {anio} SoporteXperto. Todos los derechos reservados.</div>
	</div>
</footer>
