<script lang="ts">
	import { page } from '$app/state';
	import Login from '$lib/components/auth/Login.svelte';
	import Register from '$lib/components/auth/Register.svelte';
	import { toast } from 'svelte-sonner'; // 👈 toast

	let { data } = $props();

	let isLogin = $state(true);

	const mode = $derived(page.url.searchParams.get('mode'));
	const message = $derived(page.url.searchParams.get('message'));

	$effect(() => {
		isLogin = mode !== 'register';

		// 🔔 Mostrar toast en lugar de SuccessMessage
		if (message) toast.success(message, { duration: 4000 });
	});
</script>

<div class="min-h-[50vh] flex flex-col items-center justify-center p-6">
	{#if isLogin}
		<Login {data} redirectOnSuccess={true} />
	{:else}
		<Register {data} />
	{/if}
</div>