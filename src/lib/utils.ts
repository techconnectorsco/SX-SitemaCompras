//export { cn } from './utils/cn';

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

export const flyAndScale = (
	node: Element,
	params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig => {
	const style = getComputedStyle(node);
	const transform = style.transform === 'none' ? '' : style.transform;

	const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	const styleToString = (style: Record<string, number | string | undefined>): string => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, '');
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t
			});
		},
		easing: cubicOut
	};
};

export function timeAgo(date: Date) {
	const now = new Date();
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	let interval = Math.floor(seconds / 31536000);

	if (interval >= 1) {
		return interval === 1 ? '1 year ago' : `${interval} years ago`;
	}
	interval = Math.floor(seconds / 2592000);
	if (interval >= 1) {
		return interval === 1 ? '1 month ago' : `${interval} months ago`;
	}
	interval = Math.floor(seconds / 86400);
	if (interval >= 1) {
		return interval === 1 ? '1 day ago' : `${interval} days ago`;
	}
	interval = Math.floor(seconds / 3600);
	if (interval >= 1) {
		return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
	}
	interval = Math.floor(seconds / 60);
	if (interval >= 1) {
		return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
	}
	return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
}

export function getInitials(name: string | null | undefined): string {
	if (!name) return '';
	const nameParts = name.trim().split(' ');
	if (nameParts.length === 1) {
		return nameParts[0].charAt(0).toUpperCase();
	}
	const firstInitial = nameParts[0].charAt(0).toUpperCase();
	const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
	return firstInitial + lastInitial;
}


export function createId(): string {
	return '_' + Math.random().toString(36).substring(2, 9);
}

