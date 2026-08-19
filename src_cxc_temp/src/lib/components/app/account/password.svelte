<script lang="ts">
  /**
   * @module PasswordManagement
   * @description This component provides a user interface for changing the account password.
   * It includes input fields for current, new, and confirmed new passwords, with toggles to reveal/hide password text.
   */
  import { Button } from "$lib/components/ui/button/index.js";
  import { Lock } from "lucide-svelte";
  import { goto } from '$app/navigation';
</script>

<div class="w-full">
  <div class="flex flex-col sm:flex-row sm:items-center gap-4">
    <p class="text-sm text-gray-700 flex-1">Gestiona tu contraseña desde la página de recuperación.</p>
    <Button
  asChild
  class="bg-red-500 hover:bg-red-600 text-white"
>
  <a href="/auth/reset">
    Ir a "Olvidé mi contraseña"
  </a>
</Button>
  </div>
</div>