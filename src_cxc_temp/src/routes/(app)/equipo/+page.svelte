<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();
	let equipo = $derived(data.equipo ?? []);

	// ── Física de burbujas ────────────────────────────────────────
	type Bubble = {
		id:     string;
		x:      number;
		y:      number;
		vx:     number;
		vy:     number;
		r:      number;   // radio
		member: any;
	};

	let bubbles     = $state<Bubble[]>([]);
	let selected    = $state<any>(null);
	let containerEl = $state<HTMLElement | null>(null);
	let W = $state(0);
	let H = $state(0);
	let rafId: number;
	let showCard = $state(false);

	// Inicializar burbujas con posición y velocidad random
	function initBubbles() {
		if (!containerEl) return;
		W = containerEl.clientWidth;
		H = containerEl.clientHeight;
		const R = Math.min(W, H) * 0.1;  // radio proporcional al contenedor

		bubbles = equipo.map((m: any, i: number) => {
			const angle = Math.random() * Math.PI * 2;
			const speed = 0.4 + Math.random() * 0.5;
			return {
				id:     m.id,
				x:      R + Math.random() * (W - R * 2),
				y:      R + Math.random() * (H - R * 2),
				vx:     Math.cos(angle) * speed,
				vy:     Math.sin(angle) * speed,
				r:      R,
				member: m
			};
		});
	}

	// Physics step
	function tick() {
		if (!bubbles.length) { rafId = requestAnimationFrame(tick); return; }

		bubbles = bubbles.map(b => {
			let { x, y, vx, vy, r } = b;
			x += vx;
			y += vy;

			// Rebotar en paredes
			if (x - r < 0)  { x = r;      vx = Math.abs(vx); }
			if (x + r > W)  { x = W - r;  vx = -Math.abs(vx); }
			if (y - r < 0)  { y = r;      vy = Math.abs(vy); }
			if (y + r > H)  { y = H - r;  vy = -Math.abs(vy); }

			return { ...b, x, y, vx, vy };
		});

		// Colisiones entre burbujas
		for (let i = 0; i < bubbles.length; i++) {
			for (let j = i + 1; j < bubbles.length; j++) {
				const a = bubbles[i], b = bubbles[j];
				const dx = b.x - a.x, dy = b.y - a.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const minDist = a.r + b.r;
				if (dist < minDist && dist > 0) {
					const nx = dx / dist, ny = dy / dist;
					const overlap = (minDist - dist) / 2;
					bubbles[i] = { ...a, x: a.x - nx * overlap, y: a.y - ny * overlap };
					bubbles[j] = { ...b, x: b.x + nx * overlap, y: b.y + ny * overlap };
					// Intercambiar velocidades en el eje de colisión
					const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
					const dot  = dvx * nx + dvy * ny;
					bubbles[i] = { ...bubbles[i], vx: a.vx - dot * nx, vy: a.vy - dot * ny };
					bubbles[j] = { ...bubbles[j], vx: b.vx + dot * nx, vy: b.vy + dot * ny };
				}
			}
		}

		rafId = requestAnimationFrame(tick);
	}

	function selectMember(member: any) {
		selected  = member;
		showCard  = true;
	}

	function closeCard() {
		showCard = false;
		setTimeout(() => selected = null, 300);
	}

	// Iniciales para avatar sin foto
	function getInitials(nombre: string): string {
		return nombre.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
	}

	onMount(() => {
		initBubbles();
		rafId = requestAnimationFrame(tick);

		const ro = new ResizeObserver(() => {
			if (containerEl) {
				W = containerEl.clientWidth;
				H = containerEl.clientHeight;
				// Reclamp posiciones al nuevo tamaño
				bubbles = bubbles.map(b => ({
					...b,
					x: Math.max(b.r, Math.min(W - b.r, b.x)),
					y: Math.max(b.r, Math.min(H - b.r, b.y))
				}));
			}
		});
		if (containerEl) ro.observe(containerEl);

		return () => {
			cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	});
</script>

<div class="space-y-12 animate-fade-in">

	<!-- ── Encabezado ──────────────────────────────────────────── -->
	<div class="max-w-2xl">
		<p class="text-xs font-bold uppercase tracking-[0.18em] mb-3 text-blue-600 dark:text-blue-400">
			Equipo
		</p>
		<h1 class="text-4xl font-bold text-foreground leading-tight mb-4">
			Las personas detrás<br />de la automatización
		</h1>
		<p class="text-muted-foreground leading-relaxed">
			SX Desarrollos es la Oficina de Transformación Digital de SoporteXperto —
			un equipo especializado en convertir procesos manuales en sistemas
			inteligentes que trabajan por ti.
		</p>
	</div>

	<!-- ── Área de burbujas + card ─────────────────────────────── -->
	<div class="flex flex-col lg:flex-row gap-6 items-start">

		<!-- Contenedor de física -->
		<div
			bind:this={containerEl}
			class="relative w-full lg:w-2/3 rounded-3xl overflow-hidden border border-border"
			style="height: 420px; background: radial-gradient(ellipse at 30% 40%, hsl(var(--primary) / 0.06) 0%, transparent 60%), hsl(var(--card))"
		>
			<!-- Glow central decorativo -->
			<div class="absolute inset-0 pointer-events-none">
				<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
				            w-64 h-64 rounded-full blur-[80px] opacity-20"
				     style="background: #3b82f6"></div>
			</div>

			<!-- Grid sutil de fondo -->
			<div class="absolute inset-0 pointer-events-none opacity-30" style="
				background-image: linear-gradient(hsl(var(--border)) 1px, transparent 1px),
				                  linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px);
				background-size: 40px 40px;
			"></div>

			<!-- Burbujas SVG -->
			<svg class="absolute inset-0 w-full h-full" style="overflow: visible">
				{#each bubbles as b (b.id)}
					{@const isSelected = selected?.id === b.member.id}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<g
						transform="translate({b.x},{b.y})"
						onclick={() => selectMember(b.member)}
						style="cursor: pointer"
					>
						<!-- Glow exterior -->
						<circle
							r={b.r + 4}
							fill="none"
							stroke={b.member.color ?? '#3b82f6'}
							stroke-width="1.5"
							opacity={isSelected ? 0.8 : 0.2}
							style="transition: opacity 0.3s"
						/>
						<!-- Círculo de fondo -->
						<circle
							r={b.r}
							fill={b.member.color ?? '#3b82f6'}
							opacity={isSelected ? 0.25 : 0.12}
							style="transition: opacity 0.3s"
						/>
						<!-- Borde del avatar -->
						<circle
							r={b.r - 2}
							fill="none"
							stroke={b.member.color ?? '#3b82f6'}
							stroke-width="2"
							opacity={isSelected ? 1 : 0.5}
							style="transition: opacity 0.3s"
						/>

						{#if b.member.foto_url}
							<!-- Clip para foto circular -->
							<defs>
								<clipPath id="clip-{b.id}">
									<circle r={b.r - 4} cx="0" cy="0"/>
								</clipPath>
							</defs>
							<image
								href={b.member.foto_url}
								x={-(b.r - 4)} y={-(b.r - 4)}
								width={(b.r - 4) * 2} height={(b.r - 4) * 2}
								clip-path="url(#clip-{b.id})"
								preserveAspectRatio="xMidYMid slice"
							/>
						{:else}
							<!-- Iniciales -->
							<text
								text-anchor="middle"
								dominant-baseline="central"
								fill={b.member.color ?? '#3b82f6'}
								font-size={b.r * 0.42}
								font-weight="700"
								font-family="ui-sans-serif, system-ui, sans-serif"
								opacity="0.9"
							>
								{getInitials(b.member.nombre)}
							</text>
						{/if}

						<!-- Nombre debajo -->
						<text
							y={b.r + 16}
							text-anchor="middle"
							fill="hsl(var(--foreground))"
							font-size="11"
							font-weight="600"
							font-family="ui-sans-serif, system-ui, sans-serif"
							opacity="0.7"
						>
							{b.member.nombre.split(' ')[0]}
						</text>
					</g>
				{/each}
			</svg>

			<!-- Hint si nadie seleccionado -->
			{#if !selected}
				<div class="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
					<span class="px-3 py-1.5 rounded-full text-[11px] font-medium
					             border border-border bg-card/80 backdrop-blur-sm text-muted-foreground">
						Toca un avatar para ver el perfil
					</span>
				</div>
			{/if}
		</div>

		<!-- Panel de perfil -->
		<div class="w-full lg:w-1/3">
			{#if selected && showCard}
				<div class="rounded-3xl border border-border bg-card overflow-hidden
				            animate-card-in">

					<!-- Header con color -->
					<div class="h-2 w-full" style="background: {selected.color ?? '#3b82f6'}"></div>

					<div class="p-7">
						<!-- Avatar grande -->
						<div class="flex items-center gap-4 mb-6">
							<div class="w-16 h-16 rounded-2xl flex items-center justify-center
							            text-xl font-extrabold flex-shrink-0 overflow-hidden"
							     style="background: {selected.color ?? '#3b82f6'}22;
							            border: 2px solid {selected.color ?? '#3b82f6'}55">
								{#if selected.foto_url}
									<img src={selected.foto_url} alt={selected.nombre}
									     class="w-full h-full object-cover"/>
								{:else}
									<span style="color: {selected.color ?? '#3b82f6'}">
										{getInitials(selected.nombre)}
									</span>
								{/if}
							</div>
							<div>
								<h3 class="font-bold text-foreground text-base leading-tight">
									{selected.nombre}
								</h3>
								<p class="text-xs font-semibold mt-1"
								   style="color: {selected.color ?? '#3b82f6'}">
									{selected.cargo}
								</p>
							</div>
						</div>

						<!-- Descripción -->
						{#if selected.descripcion}
							<p class="text-sm text-muted-foreground leading-relaxed mb-6">
								{selected.descripcion}
							</p>
						{/if}

						<!-- Links de contacto -->
<div class="flex flex-col gap-2">
    {#if selected.email}
        <a href="mailto:{selected.email}"
           class="flex items-center gap-2.5 text-xs text-muted-foreground
                  hover:text-foreground transition-colors group">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center
                        border border-border bg-muted
                        group-hover:border-blue-500/30 group-hover:bg-blue-500/10
                        transition-colors flex-shrink-0">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                </svg>
            </div>
            {selected.email}
        </a>
    {/if}

    {#each (selected.redes_sociales ?? []) as red}
        <a href={red.url} target="_blank" rel="noopener noreferrer"
           class="flex items-center gap-2.5 text-xs text-muted-foreground
                  hover:text-foreground transition-colors group">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center
                        border border-border bg-muted
                        group-hover:border-blue-500/30 group-hover:bg-blue-500/10
                        transition-colors flex-shrink-0">
                {#if red.red === 'linkedin'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                        <circle cx="4" cy="4" r="2"/>
                    </svg>
                {:else if red.red === 'github'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                {:else if red.red === 'x'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                {:else if red.red === 'facebook'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                {:else if red.red === 'instagram'}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                {:else}
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                {/if}
            </div>
            <span class="capitalize">{red.red}</span>
        </a>
    {/each}
</div>
					</div>

					<!-- Botón cerrar -->
					<div class="px-7 pb-6">
						<button
							onclick={closeCard}
							class="w-full py-2 rounded-xl text-xs font-semibold
							       border border-border text-muted-foreground
							       hover:bg-muted transition-colors"
						>
							Cerrar
						</button>
					</div>
				</div>

			{:else}
				<!-- Estado vacío del panel -->
				<div class="rounded-3xl border border-dashed border-border bg-card/50
				            h-64 flex flex-col items-center justify-center gap-3 p-8 text-center">
					<div class="w-12 h-12 rounded-2xl border border-border bg-muted
					            flex items-center justify-center text-2xl">
						👥
					</div>
					<p class="text-sm font-semibold text-foreground">Selecciona un miembro</p>
					<p class="text-xs text-muted-foreground leading-relaxed">
						Haz clic en cualquier burbuja para ver el perfil completo del miembro del equipo.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- ── Valores del equipo ───────────────────────────────────── -->
	<div>
		<div class="text-center mb-8">
			<p class="text-xs font-bold uppercase tracking-[0.14em] mb-2 text-blue-600 dark:text-blue-400">
				Nuestra forma de trabajar
			</p>
			<h2 class="text-2xl font-bold text-foreground">Lo que nos mueve</h2>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each [
				{ icon: '⚡', titulo: 'Velocidad',      desc: 'Entregamos soluciones funcionales en semanas, no meses.' },
				{ icon: '🎯', titulo: 'Precisión',      desc: 'Cada automatización diseñada para eliminar el error humano.' },
				{ icon: '🔍', titulo: 'Transparencia',  desc: 'Métricas reales, logs visibles, sin cajas negras.' },
				{ icon: '🤝', titulo: 'Compromiso',     desc: 'Tu proceso es nuestro proceso. Monitoreamos 24/7.' },
			] as v}
				<div class="bg-card border border-border rounded-2xl p-6
				            hover:bg-muted/50 transition-colors group">
					<div class="text-2xl mb-3">{v.icon}</div>
					<h3 class="text-sm font-bold text-foreground mb-2">{v.titulo}</h3>
					<p class="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- ── CTA unirte ───────────────────────────────────────────── -->
	<div class="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-10 text-center">
		<p class="text-base font-bold text-foreground mb-2">¿Quieres ser parte del equipo?</p>
		<p class="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
			Estamos siempre abiertos a personas apasionadas por la automatización y el desarrollo.
		</p>
		<a
			href="mailto:omar.hernandez@soportexperto.com"
			class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
			       bg-blue-600 hover:bg-blue-500 text-white
			       shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5"
		>
			Escríbenos
			<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
				<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
				<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
			</svg>
		</a>
	</div>

</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(14px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in { animation: fade-in 0.5s ease-out forwards; }

	@keyframes card-in {
		from { opacity: 0; transform: translateX(16px); }
		to   { opacity: 1; transform: translateX(0); }
	}
	.animate-card-in { animation: card-in 0.3s ease-out forwards; }
</style>