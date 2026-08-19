<script lang="ts">
	import Avatar from './avatar.svelte';
	import PersonalInfo from './personal-info.svelte';
	import Password from './password.svelte';
	import Agenteinfo from './agente.svelte';
	import SocialMedia from './social-media.svelte';
	import { User, Lock, Briefcase, Share2 } from 'lucide-svelte';
	import type { User as SupabaseUser } from '@supabase/supabase-js';

	let { agentForm, perfil, user } = $props<{ agentForm: any; perfil?: any; user?: SupabaseUser | null }>();
	
	let isEditing = $state(false);
</script>

<div class="w-full">
	<!-- Hero Section -->
	<div class="bg-gradient-to-r from-primary/10 to-primary/20 border-b-4 border-primary rounded-2xl shadow-lg mb-12 p-8 md:p-12">
		<div class="max-w-4xl">
			<div class="flex items-center gap-3 mb-3">
				<div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
					<User class="w-6 h-6 text-white" />
				</div>
				<h1 class="text-3xl md:text-4xl font-bold text-foreground">Mi Perfil</h1>
			</div>
			<p class="text-muted-foreground text-lg md:text-xl mt-2">
				Gestiona tu información personal, contraseña y configuración de cuenta
			</p>
		</div>
	</div>

	<!-- Content Grid -->
	<div class="space-y-8">
		<!-- Agent Info First -->
	<div class="bg-card border-2 border-border rounded-2xl shadow-md p-8 hover:shadow-lg transition-all duration-300">
			<div class="flex items-center gap-2 mb-6 pb-4 border-b-2 border-green-500">
				<Briefcase class="w-5 h-5 text-green-500" />
				<h2 class="text-xl font-bold text-foreground">Información de Agente</h2>
			</div>
			<Agenteinfo {agentForm} />
		</div>

		<!-- Avatar & Personal Info Section -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Avatar Card -->
			<div class="lg:col-span-1">
				<div class="bg-card border-2 border-border rounded-2xl shadow-md p-8 hover:shadow-lg transition-all duration-300 h-full">
					<div class="flex items-center gap-2 mb-6 pb-4 border-b-2 border-blue-500">
						<User class="w-5 h-5 text-blue-500" />
						<h2 class="text-xl font-bold text-foreground">Foto de Perfil</h2>
					</div>
				<Avatar {perfil} />
			</div>
		</div>

		<!-- Personal Info Card -->
		<div class="lg:col-span-2">
		<div class="bg-card border-2 border-border rounded-2xl shadow-md p-8 hover:shadow-lg transition-all duration-300">
				<div class="flex items-center gap-2 mb-6 pb-4 border-b-2 border-blue-500">
					<User class="w-5 h-5 text-blue-500" />
					<h2 class="text-xl font-bold text-foreground">Información Personal</h2>
				</div>
				<PersonalInfo {perfil} {user} onEditingChange={(val) => isEditing = val} />
				</div>
			</div>
		</div>

		<!-- Social Media Section -->
	<div class="bg-card border-2 border-border rounded-2xl shadow-md p-8 hover:shadow-lg transition-all duration-300">
			<div class="flex items-center gap-2 mb-6 pb-4 border-b-2 border-purple-500">
				<Share2 class="w-5 h-5 text-purple-500" />
				<h2 class="text-xl font-bold text-foreground">Redes Sociales</h2>
			</div>
			<SocialMedia {perfil} {isEditing} />
		</div>

		<!-- Password Section -->
	<div class="bg-card border-2 border-border rounded-2xl shadow-md p-8 hover:shadow-lg transition-all duration-300">
			<div class="flex items-center gap-2 mb-6 pb-4 border-b-2 border-red-500">
				<Lock class="w-5 h-5 text-red-500" />
				<h2 class="text-xl font-bold text-foreground">Seguridad</h2>
			</div>
			<Password />
		</div>
	</div>
</div>
