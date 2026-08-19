/**
 * Reactive state for mobile sidebar toggles.
 * Uses Svelte 5 runes ($state) at module level via .svelte.ts
 */

// General app sidebar (NavigationSidebar)
export const sidebar = $state({ open: false });

// Admin sidebar (SidebarAdmin)
export const adminSidebar = $state({ open: false });
