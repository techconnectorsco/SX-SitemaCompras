<script lang="ts">
	import { siteConfig } from '$lib/config/site';
</script>

<footer class="border-t py-6">
	<!-- Grid principal en 3 columnas -->
	<div class="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 items-center gap-6">

		<!-- Left: About -->
        <div class="text-center md:text-left">
            <h2 class="text-2xl font-bold text-blue-600 mb-2">SX</h2>
			<p class="text-sm"><strong>SoporteXperto - Oficina de Transformación Digital. Automatización y RPA.</strong></p>
        </div>

		<!-- Center: Quick Links -->
        <nav class="flex flex-wrap justify-center gap-4 text-sm font-medium text-slate-600">
            <a href="/acerca" class="hover:text-blue-600 transition-colors">Acerca de</a>
            <a href="/contacto" class="hover:text-blue-600 transition-colors">Contacto</a>
            <a href="/privacidad" class="hover:text-blue-600 transition-colors">Políticas de Privacidad</a>
        </nav>

		<!-- Right: Contact -->
        <div class="text-center md:text-right text-xs text-gray-400 space-y-1">
            <p>
                <a href="mailto:omar.hernandez@soportexperto.com" class="hover:underline">
                    omar.hernandez@soportexperto.com
                </a>
            </p>
            <p>
                <a href="tel:+50670925562" class="hover:underline">
                    +506 7092 5562
                </a>
            </p>
        </div>
	</div>

	<!-- Social + Copyright -->
	<div class="mt-4 pt-6 flex flex-col items-center space-y-5">
		<!-- Social Icons -->
		<div class="flex justify-center space-x-6">
			<!-- Instagram -->
			<a href="https://www.instagram.com/" target="_blank" aria-label="Instagram"
				class="hover:text-pink-400 transition-all hover:scale-110">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
					<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
					<line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
				</svg>
			</a>

			<!-- Facebook -->
			<a href="https://www.facebook.com" target="_blank" aria-label="Facebook"
				class="hover:text-blue-400 transition-all hover:scale-110">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
				</svg>
			</a>

			<!-- LinkedIn -->
			<a href="https://www.linkedin.com" target="_blank" aria-label="LinkedIn"
				class="hover:text-blue-500 transition-all hover:scale-110">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
					<rect x="2" y="9" width="4" height="12" />
					<circle cx="4" cy="4" r="2" />
				</svg>
			</a>

			<!-- WhatsApp placeholder -->
			<a href="https://wa.me/50670925562" target="_blank" aria-label="WhatsApp"
				class="hover:text-green-400 transition-all hover:scale-110">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path
						d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6A8.38 8.38 0 0 1 11.5 3h.5a8.5 8.5 0 0 1 8.5 8.5z" />
				</svg>
			</a>
		</div>

		<!-- Copyright -->
		<p class="text-xs">
			© {new Date().getFullYear()} {siteConfig.title}. Todos los derechos reservados.
		</p>
	</div>
</footer>
