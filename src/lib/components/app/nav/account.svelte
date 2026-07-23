<script lang="ts">
  /**
   * @module AccountDropdown
   * @description This component displays a dropdown menu for user account management, visible when a user is logged in.
   * It shows the user's avatar from profile photo and email, and provides options for logging out.
   */
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Avatar from '$lib/components/ui/avatar';
  import { getInitials } from '$lib/utils';
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';

  /**
   * Reactive declaration for the user, obtained from the SvelteKit page store.
   * @type {any}
   */
  $: user = $page.data.user;

  /**
   * Handles the user logout process.
   * Sends a POST request to the logout endpoint and redirects to homepage.
   * @returns {Promise<void>}
   */
  async function handleLogout() {
    try {
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await invalidateAll();
        goto('/', { invalidateAll: true });
      } else {
        console.error('Error al cerrar sesión');
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
</script>

{#if user}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger class="flex items-center gap-2">
      <Avatar.Root class="size-9">
        <Avatar.Image
          src={(user as any).photo_url || ''}
          alt={user.display_name || user.email}
        />
        <Avatar.Fallback>
          {getInitials(user.display_name || user.email)}
        </Avatar.Fallback>
      </Avatar.Root>
      <span class="block max-w-32 grow">
        <span class="block truncate text-sm font-medium">
          {user.display_name || user.email}
        </span>
      </span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-56">
      <DropdownMenu.Label>Mi cuenta</DropdownMenu.Label>
      
      <DropdownMenu.Item>
        <button on:click={handleLogout} class="w-full text-left hover:bg-red-100 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-red-600">
          Cerrar sesión
        </button>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}