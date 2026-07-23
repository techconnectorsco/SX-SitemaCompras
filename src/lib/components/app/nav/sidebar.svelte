<script lang="ts">
  /**
   * @module Sidebar
   * @description This component renders the application's sidebar navigation.
   * It includes the site logo, a dynamic list of navigation items (`NavItems`), and a call-to-action card for upgrading to a Pro plan.
   * The sidebar is responsive, appearing fixed on larger screens and initially hidden on smaller screens.
   */
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { siteConfig } from '$lib/config/site';
	import NavItems from './nav-items.svelte';
</script>


<aside
	class="fixed inset-y-0 start-0 z-[60] hidden w-[260px] -translate-x-full transform border-e border-border/80 bg-background/95 transition-all duration-300 [--auto-close:lg] lg:bottom-0 lg:end-auto lg:block lg:translate-x-0"
>
	<div class="flex h-full flex-col justify-between p-4">
		<div>
			<a href="/">
				<img src={siteConfig.logo} alt={siteConfig.title} class="h-8 dark:hidden" />
				<img src={siteConfig.logo} alt={siteConfig.title} class="hidden h-8 dark:block" />
			</a>
			<NavItems />
		</div>

		<Card.Root>
			<Card.Header class="p-2 pt-0 md:p-4">
				<Card.Title>Upgrade to Pro</Card.Title>
				<Card.Description>
					Unlock all features and get unlimited access to our support team.
				</Card.Description>
			</Card.Header>
			<Card.Content class="p-2 pt-0 md:p-4 md:pt-0">
				<Button size="sm" class="w-full">Upgrade</Button>
			</Card.Content>
		</Card.Root>
	</div>
</aside>
