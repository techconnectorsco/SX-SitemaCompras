// Client-side layout load for SQLite auth version
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
	return {
		...data
	};
};