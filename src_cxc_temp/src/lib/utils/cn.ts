// Utility for merging Tailwind CSS classes while handling conflicts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes, handling conflicts and ensuring the correct order.
 * @param {ClassValue[]} inputs - An array of class values to merge.
 * @returns {string} The merged and optimized Tailwind CSS class string.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
