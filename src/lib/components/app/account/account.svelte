<script>
	import Avatar from './avatar.svelte';
	import PersonalInfo from './personal-info.svelte';
	import Password from './password.svelte';
	//import Agenteinfo from './agente.svelte';

	let { agentForm } = $props();
</script>

<div class="p-5 md:p-8  border shadow-sm rounded-xl">
	<h1 class="text-xl font-semibold">Profile</h1>
	<p class="text-foreground/50">Manage your name, password and account settings.</p>
	<div>
		<Avatar />
		<PersonalInfo />
		<Password />


	</div>
</div>
