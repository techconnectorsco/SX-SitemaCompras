<script lang="ts">
	import { FieldErrors } from "formsnap";
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";

	type $$Props = HTMLAttributes<HTMLDivElement> & { class?: string | null | undefined };
	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<FieldErrors
	class={cn("text-sm font-medium text-destructive", className)}
	{...$$restProps}
/>
