<script lang="ts">
  /**
   * @module BreadcrumbNavigation
   * @description This component generates and displays a dynamic breadcrumb navigation based on the current URL pathname.
   * It capitalizes segments and creates navigable links, with the last segment displayed as the current page.
   */
	import { page } from '$app/state';
	// import { derived } from 'svelte/store'; // Ya no es necesario
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

	// Transforma las rutas dinámicas si lo deseas (por ahora solo capitaliza)
	/**
	 * Reactive declaration that splits the current URL pathname into an array of segments.
	 * Empty segments are filtered out.
	 * @type {string[]}
	 */
	$: segments = page.url.pathname.split('/').filter(Boolean);

	/**
	 * Reactive declaration that transforms `segments` into an array of objects suitable for breadcrumb display.
	 * Each object contains a `name` (friendly, capitalized version of the segment) and a `href` (the cumulative path).
	 * @type {Array<{ name: string; href: string }>}
	 */
	$: pathSegments = segments.map((segment: string, index: number) => {
		// Opcional: Mapear alias legibles (puedes mejorar esto luego)
		const friendlyName = segment.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

			return {
				name: friendlyName,
				href: '/' + segments.slice(0, index + 1).join('/')
			};
		});
</script>

<Breadcrumb.Root class="lg:hidden">
	<Breadcrumb.List>
		<Breadcrumb.Item>
			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
		</Breadcrumb.Item>
		{#each pathSegments as segment, index}
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				{#if index < pathSegments.length - 1}
					<Breadcrumb.Link href={segment.href}>{segment.name}</Breadcrumb.Link>
				{:else}
					<Breadcrumb.Page>{segment.name}</Breadcrumb.Page>
				{/if}
			</Breadcrumb.Item>
		{/each}
	</Breadcrumb.List>
</Breadcrumb.Root>