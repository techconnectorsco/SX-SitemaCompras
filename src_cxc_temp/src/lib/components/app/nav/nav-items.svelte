<script lang="ts">
  /**
   * @module NavItems
   * @description This component renders a dynamic navigation list based on the `mainNav` configuration.
   * It supports nested navigation items using an accordion for expandable sections and handles navigation using SvelteKit's `goto`.
   */
	import { mainNav } from '$lib/config/site';
	import * as Accordion from '$lib/components/ui/accordion';
	import { goto } from '$app/navigation';

	
</script>

<nav class="mt-4 flex w-full flex-col flex-wrap pb-3">
	<ul>
		{#each mainNav as nav}
			{#if nav.items}
				<Accordion.Root type="single">
					<Accordion.Item value={nav.title} class="mb-1.5 border-none">
						<Accordion.Trigger
							class="flex items-center  rounded-lg px-3 py-2 text-base font-normal hover:bg-muted hover:no-underline focus:bg-muted/95 "
						>
							<div class="flex items-center gap-x-2">
								{#if nav.icon}
									<svelte:component
										this={nav.icon}
										class="size-4 flex-shrink-0 text-foreground"
										strokeWidth={1}
									/>
								{/if}
								{nav.title}
							</div>
						</Accordion.Trigger>
						<ul
							class="hs-accordion-group relative mt-1.5 space-y-1.5 ps-7 before:absolute before:start-[18px] before:top-0 before:h-full before:w-0.5 before:bg-gray-100 dark:before:bg-neutral-700"
						>
							{#each nav.items as item}
								<Accordion.Content>
									<li>
										{#if nav.title === 'Account'}
											<button
												class=" flex w-full gap-x-3 rounded-lg px-3 py-2 hover:bg-muted focus:bg-muted/95"
												
											>
												{item.title}
											</button>
										{:else}
											<a
												href={item.href}
												class=" flex gap-x-3 rounded-lg px-3 py-2 hover:bg-muted focus:bg-muted/95"
											>
												{item.title}
											</a>
										{/if}
									</li>
								</Accordion.Content>
							{/each}
						</ul>
					</Accordion.Item>
				</Accordion.Root>
			{:else}
				<li class="mb-1.5">
					<a
						href={nav.href}
						class=" flex items-center gap-x-2 rounded-lg px-3 py-2 hover:bg-muted focus:bg-muted/95"
					>
						{#if nav.icon}
							<svelte:component
								this={nav.icon}
								class="size-4 flex-shrink-0 text-foreground "
								strokeWidth={1}
							/>
						{/if}
						{nav.title}
					</a>
				</li>
			{/if}
		{/each}
	</ul>
</nav>
