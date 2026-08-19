/**
 * @module Accordion
 * @description This module re-exports core components for building an accessible accordion UI using `bits-ui`.
 * It provides a convenient way to import all necessary Accordion parts from a single entry point.
 */
import { Accordion as AccordionPrimitive } from "bits-ui";
import Content from "./accordion-content.svelte";
import Item from "./accordion-item.svelte";
import Trigger from "./accordion-trigger.svelte";

/**
 * The root Accordion component from `bits-ui`, providing context and state management for the accordion.
 * @type {typeof AccordionPrimitive.Root}
 */
const Root = AccordionPrimitive.Root;

export {
	Root,
	/**
	 * The Accordion content component, which holds the collapsible content for an accordion item.
	 * @type {typeof Content}
	 */
	Content,
	/**
	 * The Accordion item component, representing an individual collapsible section within the accordion.
	 * @type {typeof Item}
	 */
	Item,
	/**
	 * The Accordion trigger component, which toggles the visibility of an accordion item's content.
	 * @type {typeof Trigger}
	 */
	Trigger,
	// Alias exports for convenience
	Root as Accordion,
	Content as AccordionContent,
	Item as AccordionItem,
	Trigger as AccordionTrigger
};
