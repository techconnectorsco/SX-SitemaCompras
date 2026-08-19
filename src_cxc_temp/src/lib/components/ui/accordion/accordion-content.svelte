<script lang="ts">
  /**
   * @module AccordionContent
   * @description This component renders the collapsible content area for an Accordion item. It uses a slide transition for smooth opening and closing animations.
   */
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	import { slide } from 'svelte/transition';

	/**
	 * Type definition for the props of the AccordionContent component, extending `AccordionPrimitive.ContentProps`.
	 * @typedef {AccordionPrimitive.ContentProps} $$Props
	 */
	type $$Props = AccordionPrimitive.ContentProps;

	/**
	 * Optional class name to apply custom styling to the content wrapper.
	 * @type {$$Props['class']}
	 */
	let className: $$Props['class'] = undefined;
	/**
	 * The Svelte transition function to use for opening and closing the content.
	 * Defaults to `slide`.
	 * @type {$$Props['transition']}
	 */
	export let transition: $$Props['transition'] = slide;
	/**
	 * Configuration options for the Svelte transition, such as duration.
	 * Defaults to `{ duration: 200 }`.
	 * @type {$$Props['transitionConfig']}
	 */
	export let transitionConfig: $$Props['transitionConfig'] = {
		duration: 200
	};
	export { className as class };
</script>

<AccordionPrimitive.Content
	class={cn('overflow-hidden text-sm transition-all', className)}
	{transition}
	{transitionConfig}
	{...$$restProps}
>
	<div class="pb-4 pt-0">
		<slot />
	</div>
</AccordionPrimitive.Content>
