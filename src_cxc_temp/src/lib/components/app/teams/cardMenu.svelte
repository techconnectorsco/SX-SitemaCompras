<script lang="ts">
  /**
   * @module CardMenu
   * @description This component provides a dropdown menu for team management actions, such as editing, adding to favorites, archiving, and deleting a team.
   * It utilizes Lucide icons for visual representation of each action.
   */
    import { Pencil, Star, Archive, Trash2, EllipsisVertical } from "lucide-svelte/icons";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    /**
     * Placeholder function for a click event.
     * Currently logs 'hola' to the console.
     * @returns {void}
     */
    function hola() {
        // console.log('hola')
    }
  </script>
  
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button builders={[builder]} variant="secondary" size='icon'><EllipsisVertical /></Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-56 shadow-lg rounded-md py-1">
      <DropdownMenu.Item on:click={hola}>
        <Pencil size=15 class="mr-2" />
        <span>Edit team</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        <Star size=15  class="mr-2" />
        <span>Add to favorites</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        <Archive size=15  class="mr-2" />
        <span>Archive team</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        <div class='border-t w-full text-red-500 inline-flex'>
        <Trash2 size=15  class="mr-2 mt-3" />
        <span class='mt-3'>Delete team</span>
        </div>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
  