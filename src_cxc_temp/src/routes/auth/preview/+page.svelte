<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="min-h-screen flex items-center justify-center px-4 bg-gray-50">
	<div class="w-full max-w-2xl space-y-6">
		<div class="text-center space-y-2">
			<h1 class="text-3xl font-bold text-gray-900">
				Preview de Páginas de Auth
			</h1>
			<p class="text-gray-600">
				Prueba visual de todas las páginas de autenticación
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<!-- Login -->
			<button
				onclick={() => goto('/auth?mode=login')}
				class="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left"
			>
				<h3 class="text-lg font-bold text-gray-900 mb-2">
					🔐 Login
				</h3>
				<p class="text-sm text-gray-600">
					Página de inicio de sesión
				</p>
			</button>

			<!-- Register -->
			<button
				onclick={() => goto('/auth?mode=register')}
				class="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left"
			>
				<h3 class="text-lg font-bold text-gray-900 mb-2">
					📝 Register
				</h3>
				<p class="text-sm text-gray-600">
					Página de registro
				</p>
			</button>

			<!-- Reset Password -->
			<button
				onclick={() => goto('/auth/reset')}
				class="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left"
			>
				<h3 class="text-lg font-bold text-gray-900 mb-2">
					🔑 Reset Password
				</h3>
				<p class="text-sm text-gray-600">
					Recuperación de contraseña
				</p>
			</button>

			<!-- Success -->
			<button
				onclick={() => goto('/auth/success?email=usuario@ejemplo.com')}
				class="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:shadow-lg transition-all text-left"
			>
				<h3 class="text-lg font-bold text-gray-900 mb-2">
					✅ Success
				</h3>
				<p class="text-sm text-gray-600">
					Verificación exitosa
				</p>
			</button>

			<!-- Error -->
			<button
				onclick={() => goto('/auth/error?message=Este es un error de prueba para ver el diseño')}
				class="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-red-500 hover:shadow-lg transition-all text-left"
			>
				<h3 class="text-lg font-bold text-gray-900 mb-2">
					❌ Error
				</h3>
				<p class="text-sm text-gray-600">
					Página de error
				</p>
			</button>

            <!-- Verify Email -->
			<button
				onclick={() => goto('/auth/verify?email=usuario@ejemplo.com')}
				class="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left"
			>
				<h3 class="text-lg font-bold text-gray-900 mb-2">
					📧 Verify Email
				</h3>
				<p class="text-sm text-gray-600">
					Verificación de correo electrónico
				</p>
			</button>

            <!-- Update Password -->
<button
	onclick={() => goto('/auth/update-password')}
	class="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all text-left"
>
	<h3 class="text-lg font-bold text-gray-900 mb-2">
		🔐 Update Password
	</h3>
	<p class="text-sm text-gray-600">
		Actualizar contraseña con validador
	</p>
</button>

			
		</div>

		<!-- Notas -->
		<div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
			<h3 class="text-sm font-bold text-blue-900 mb-2">
				📝 Notas de Testing
			</h3>
			<ul class="text-sm text-blue-700 space-y-1">
				<li>• Todas las páginas son navegables sin autenticación</li>
				<li>• Los formularios no enviarán datos reales</li>
				<li>• Usa esta página para revisar diseños rápidamente</li>
			</ul>
		</div>
	</div>
</div>
