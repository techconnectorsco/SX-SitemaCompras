<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import LoginPage from "$lib/components/auth/Login.svelte";
</script>

<Dialog.Root>
  <Dialog.Trigger>
    <button class="cursor-pointer">Iniciar sesión</button>
  </Dialog.Trigger>

  <Dialog.Overlay class="fixed inset-0 bg-black/50 z-40" />

  <Dialog.Content
    class="fixed z-50 top-1/2 left-1/2
           -translate-x-1/2 -translate-y-1/2
           w-full max-w-md bg-card rounded-xl p-6 shadow-xl"
  >
    <LoginPage />
  </Dialog.Content>
</Dialog.Root>
