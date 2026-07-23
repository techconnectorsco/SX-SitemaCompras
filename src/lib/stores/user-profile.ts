import { writable } from 'svelte/store';

export const userSelectedTabStore = writable<string>('profile');