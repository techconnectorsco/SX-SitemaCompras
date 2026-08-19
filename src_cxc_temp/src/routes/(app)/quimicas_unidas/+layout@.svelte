<script lang="ts">
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data, children } = $props();
</script>

<div class="relative flex min-h-screen flex-col bg-background">
	<!-- Barra superior mínima: solo logo, nombre de usuario, modo y cerrar sesión -->
	<header class="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
			<div class="flex items-center gap-3">
				<img src="/QU.png" alt="Químicas Unidas" class="h-8 w-auto" />
				<span class="text-sm font-semibold text-foreground">Portal de Cuentas por Cobrar</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="hidden text-xs text-muted-foreground sm:block">{data.nombreUsuario}</span>

				<!-- Toggle light/dark -->
				<Button onclick={toggleMode} variant="outline" size="icon" class="relative overflow-hidden">
					<SunIcon
						class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0 dark:-rotate-90"
					/>
					<MoonIcon
						class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:scale-100 dark:rotate-0"
					/>
					<span class="sr-only">Toggle theme</span>
				</Button>

				<!-- Logout: usa POST igual que el resto de la app -->
				<form method="POST" action="/auth/logout">
					<button
						type="submit"
						class="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
					>
						Cerrar sesión
					</button>
				</form>
			</div>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>
</div>
