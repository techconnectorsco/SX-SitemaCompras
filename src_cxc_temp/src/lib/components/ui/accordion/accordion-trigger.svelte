<script lang="ts">
  /**
   * @module AccordionTrigger
   * @description This component renders the trigger button for an Accordion item, controlling the visibility of its content.
   * It includes a visual indicator (ChevronDown icon) that rotates based on the open/closed state.
   */
	import { Accordion as AccordionPrimitive } from "bits-ui";
	import { ChevronDown } from "lucide-svelte";
	import { cn } from "$lib/utils";

	/**
	 * Type definition for the props of the AccordionTrigger component, extending `AccordionPrimitive.TriggerProps`.
	 * @typedef {AccordionPrimitive.TriggerProps} $$Props
	 */
	type $$Props = AccordionPrimitive.TriggerProps;
	/**
	 * Type definition for the events emitted by the AccordionTrigger component, extending `AccordionPrimitive.TriggerEvents`.
	 * @typedef {AccordionPrimitive.TriggerEvents} $$Events
	 */
	type $$Events = AccordionPrimitive.TriggerEvents;

	/**
	 * Optional class name to apply custom styling to the accordion trigger.
	 * @type {$$Props["class"]}
	 */
	let className: $$Props["class"] = undefined;
	/**
	 * The heading level for the accordion trigger, used for accessibility (e.g., h1, h2, h3).
	 * Defaults to `3` (h3).
	 * @type {AccordionPrimitive.HeaderProps["level"]}
	 */
	export let level: AccordionPrimitive.HeaderProps["level"] = 3;
	export { className as class };
</script>

<AccordionPrimitive.Header {level} class="flex">
	<AccordionPrimitive.Trigger
		class={cn(
			"flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
			className
		)}
		{...$$restProps}
		on:click
	>
		<slot />
		<ChevronDown class="h-4 w-4 transition-transform duration-200" />
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
