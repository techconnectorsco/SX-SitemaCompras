<script lang="ts">
	/**
	 * @module HeroNetwork
	 * @description Diagrama decorativo del hero: los orígenes de datos a la izquierda
	 * convergen en un punto y se abren hacia los accesos del COI a la derecha.
	 *
	 * El diseño original traía 4 accesos fijos; aquí la columna derecha se calcula a
	 * partir de `ACCESOS`, de modo que agregar o quitar un módulo re-espacia los nodos
	 * solo y el diagrama nunca contradice a las tarjetas de la sección `#accesos`.
	 *
	 * Es puramente decorativo (`aria-hidden`) y el CSS lo oculta por debajo de 1279px.
	 */
	import { ACCESOS, ORIGENES } from '$lib/config/landing';

	/** Punto donde convergen todas las curvas. */
	const CONV = { x: 720, y: 310 };
	/** Banda vertical que ocupan las tarjetas: borde superior de la 1ª, inferior de la última. */
	const BANDA = { top: 88, bottom: 512 };
	const RECT_W = 270;
	const RECT_H = 64;
	const X_IZQ = 20;
	const X_DER = 1150;
	/** Donde arrancan y terminan las curvas (el borde interior de cada columna). */
	const BORDE_IZQ = X_IZQ + RECT_W;

	/** Reparte `n` tarjetas dentro de la banda y devuelve el centro vertical de cada una. */
	function centros(n: number): number[] {
		if (n <= 1) return [(BANDA.top + BANDA.bottom) / 2];
		const paso = (BANDA.bottom - BANDA.top - RECT_H) / (n - 1);
		return Array.from({ length: n }, (_, i) => BANDA.top + i * paso + RECT_H / 2);
	}

	const yIzq = centros(ORIGENES.length);
	const yDer = centros(ACCESOS.length);

	const izquierda = ORIGENES.map((o, i) => ({ ...o, y: yIzq[i] }));
	const derecha = ACCESOS.map((a, i) => ({ ...a, y: yDer[i] }));

	/** Curva origen → convergencia. */
	const curvaIzq = (y: number) =>
		`M${BORDE_IZQ} ${y} C 450 ${y}, 540 ${CONV.y}, ${CONV.x} ${CONV.y}`;
	/** Curva convergencia → acceso. */
	const curvaDer = (y: number) => `M${CONV.x} ${CONV.y} C 900 ${CONV.y}, 990 ${y}, ${X_DER} ${y}`;

	const curvas = [...izquierda.map((n) => curvaIzq(n.y)), ...derecha.map((n) => curvaDer(n.y))];
</script>

<svg
	class="bg-net rise"
	viewBox="0 0 1440 640"
	preserveAspectRatio="xMidYMid meet"
	aria-hidden="true"
	focusable="false"
	style="animation-delay:.3s"
>
	<defs>
		<linearGradient
			id="netfade"
			gradientUnits="userSpaceOnUse"
			x1={BORDE_IZQ}
			y1="0"
			x2={X_DER}
			y2="0"
		>
			<stop offset="0" stop-color="#fff" />
			<stop offset=".06" stop-color="#fff" />
			<stop offset=".24" stop-color="#000" />
			<stop offset=".76" stop-color="#000" />
			<stop offset=".94" stop-color="#fff" />
			<stop offset="1" stop-color="#fff" />
		</linearGradient>
		<mask id="netmask" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="640">
			<rect x={BORDE_IZQ} width={X_DER - BORDE_IZQ} height="640" fill="url(#netfade)" />
		</mask>
	</defs>

	<g mask="url(#netmask)">
		<g class="net-base" fill="none" stroke-width="1.5">
			{#each curvas as d (d)}
				<path {d} />
			{/each}
		</g>
		<g class="net-flow net-acc" fill="none" stroke-width="1.5" stroke-linecap="round" opacity=".75">
			{#each curvas as d (d)}
				<path {d} />
			{/each}
		</g>
	</g>

	<g>
		{#each izquierda as n (n.sigla)}
			<circle cx={BORDE_IZQ} cy={n.y} r="3.5" class="net-dot" />
		{/each}
		{#each derecha as n (n.sigla)}
			<circle cx={X_DER} cy={n.y} r="3.5" class="net-dot" />
		{/each}
	</g>

	<text
		x={X_IZQ}
		y={BANDA.top - 10}
		font-family="Manrope,sans-serif"
		font-weight="700"
		font-size="10.5"
		letter-spacing="1.4"
		class="n-s">DATOS DE ORIGEN</text
	>
	<text
		x={X_DER}
		y={BANDA.top - 10}
		font-family="Manrope,sans-serif"
		font-weight="700"
		font-size="10.5"
		letter-spacing="1.4"
		class="n-s">ACCESOS AL COI</text
	>

	<g>
		{#each izquierda as n (n.sigla)}
			<g transform="translate({X_IZQ} {n.y - RECT_H / 2})">
				<rect class="n-rect" width={RECT_W} height={RECT_H} rx="14" />
				<rect x="14" y="15" width="34" height="34" rx="11" class="sg-n" />
				<text
					x="31"
					y="36.5"
					text-anchor="middle"
					font-family="Sora,sans-serif"
					font-weight="600"
					font-size="12.5"
					class="st-n">{n.sigla}</text
				>
				<text
					x="62"
					y="29"
					font-family="Sora,sans-serif"
					font-weight="600"
					font-size="13.5"
					class="n-t">{n.titulo}</text
				>
				<text x="62" y="46" font-family="Manrope,sans-serif" font-size="12" class="n-s"
					>{n.sub}</text
				>
			</g>
		{/each}

		{#each derecha as n (n.sigla)}
			<g transform="translate({X_DER} {n.y - RECT_H / 2})">
				<rect class="n-rect" width={RECT_W} height={RECT_H} rx="14" />
				<rect x="14" y="15" width="34" height="34" rx="11" class="sg-a" />
				<text
					x="31"
					y="36.5"
					text-anchor="middle"
					font-family="Sora,sans-serif"
					font-weight="600"
					font-size="12.5"
					class="st-a">{n.sigla}</text
				>
				<text
					x="62"
					y="29"
					font-family="Sora,sans-serif"
					font-weight="600"
					font-size="13.5"
					class="n-t">{n.titulo}</text
				>
				<text x="62" y="46" font-family="Manrope,sans-serif" font-size="12" class="n-s"
					>{n.sub}</text
				>
			</g>
		{/each}
	</g>
</svg>
