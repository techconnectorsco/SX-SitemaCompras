/**
 * @module Alert
 * @description This module defines and exports components for an accessible alert UI, along with Tailwind variants for styling.
 * It provides a `Root`, `Description`, and `Title` component for constructing alerts.
 */
import { tv, type VariantProps } from "tailwind-variants";

import Root from "./alert.svelte";
import Description from "./alert-description.svelte";
import Title from "./alert-title.svelte";

/**
 * Defines the Tailwind variants for the Alert component.
 * @constant
 * @type {import("tailwind-variants").TVVariants<"default" | "destructive">}
 * @property {string} base - Base styles applied to all alert variants.
 * @property {object} variants - Defines different visual styles for the alert.
 * @property {object} variants.variant - Specific variant styles.
 * @property {string} variants.variant.default - Default alert styling (background, foreground text).
 * @property {string} variants.variant.destructive - Destructive alert styling (red border, destructive text).
 * @property {object} defaultVariants - The default variant applied if none is specified.
 * @property {string} defaultVariants.variant - Defaults to "default".
 */
export const alertVariants = tv({
	base: "relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:text-foreground [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11",

	variants: {
		variant: {
			default: "bg-background text-foreground",
			destructive:
				"text-destructive border-destructive/50 dark:border-destructive [&>svg]:text-destructive text-destructive"
		}
	},
	defaultVariants: {
		variant: "default"
	}
});

/**
 * Type alias for the possible `variant` props of the Alert component.
 * @typedef {"default" | "destructive"} Variant
 */
export type Variant = VariantProps<typeof alertVariants>["variant"];
/**
 * Type alias for standard HTML heading levels, used for accessibility.
 * @typedef {"h1" | "h2" | "h3" | "h4" | "h5" | "h6"} HeadingLevel
 */
export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export {
	/**
	 * The root Alert component, applying base styles and variant-specific styling.
	 * @type {typeof Root}
	 */
	Root,
	/**
	 * The Alert description component, used for detailed text within the alert.
	 * @type {typeof Description}
	 */
	Description,
	/**
	 * The Alert title component, used for the main heading of the alert.
	 * @type {typeof Title}
	 */
	Title,
	// Alias exports for convenience
	Root as Alert,
	Description as AlertDescription,
	Title as AlertTitle
};
