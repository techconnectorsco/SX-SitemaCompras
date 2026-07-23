<script lang="ts">
  /**
   * @module AlertDescription
   * @description This component renders the descriptive content within an Alert.
   * It applies base styling for relaxed leading text and allows for additional custom classes.
   */
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";

	/**
	 * Type definition for the props of the AlertDescription component, extending standard HTML div attributes.
	 * @typedef {HTMLAttributes<HTMLDivElement>} $$Props
	 */
	type $$Props = HTMLAttributes<HTMLDivElement>;

	/**
	 * Optional class name to apply custom styling to the alert description.
	 * @type {$$Props["class"]}
	 */
	let className: $$Props["class"] = undefined;
	export { className as class };
</script>

<div class={cn("text-sm [&_p]:leading-relaxed", className)} {...$$restProps}>
	<slot />
</div>
