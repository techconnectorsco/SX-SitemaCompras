/**
 * @module NavType
 * @description This module defines the NavItem type, which represents a navigation item in the application.
 */

/**
 * Represents a navigation item.
 * @typedef {object} NavItem
 * @property {string} title - The title of the navigation item.
 * @property {string} [href] - The URL of the navigation item (optional).
 * @property {boolean} [disabled] - Indicates if the navigation item is disabled (optional).
 * @property {boolean} [external] - Indicates if the navigation item links to an external site (optional).
 * @property {any} [icon] - The icon associated with the navigation item (optional).
 * @property {string} [label] - A label for the navigation item (optional).
 * @property {NavItem[]} [items] - A list of sub-navigation items (optional).
 */
export type NavItem = {
	title: string;
	href?: string;
	disabled?: boolean;
	external?: boolean;
	icon?: any;
	label?: string;
	items?: NavItem[];
};
