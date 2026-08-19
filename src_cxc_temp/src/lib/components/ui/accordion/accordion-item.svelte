<script lang="ts">
  /**
   * @module AccordionItem
   * @description This component represents an individual item within an Accordion.
   * It acts as a container for an `AccordionTrigger` and `AccordionContent`, managing its open/closed state.
   */
	import { Accordion as AccordionPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	/**
	 * Type definition for the props of the AccordionItem component, extending `AccordionPrimitive.ItemProps`.
	 * @typedef {AccordionPrimitive.ItemProps} $$Props
	 */
	type $$Props = AccordionPrimitive.ItemProps;

	/**
	 * Optional class name to apply custom styling to the accordion item.
	 * @type {$$Props["class"]}
	 */
	let className: $$Props["class"] = undefined;
	/**
	 * The unique value associated with this accordion item, used to identify and control its state.
	 * @type {$$Props["value"]}
	 */
	export let value: $$Props["value"];
	export { className as class };
</script>

<AccordionPrimitive.Item
	{value}
	class={cn("border-b", className)}
	{...$$restProps}
>
	<slot />
</AccordionPrimitive.Item>
