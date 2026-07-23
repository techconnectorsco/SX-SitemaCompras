<script lang="ts">
  /**
   * @module PasswordManagement
   * @description This component provides a user interface for changing the account password.
   * It includes input fields for current, new, and confirmed new passwords, with toggles to reveal/hide password text.
   */
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Eye, EyeOff } from "lucide-svelte";

  /**
   * Reactive state variable to control the visibility of the current password input.
   * @type {boolean}
   */
  let showCurrentPassword = false;
  /**
   * Reactive state variable to control the visibility of the new password input.
   * @type {boolean}
   */
  let showNewPassword = false;
  /**
   * Reactive state variable to control the visibility of the confirm new password input.
   * @type {boolean}
   */
  let showConfirmPassword = false;

  /**
   * Reactive state variable storing the value of the current password input.
   * @type {string}
   */
  let valueOfCurrentPassword = '';
  /**
   * Reactive state variable storing the value of the new password input.
   * @type {string}
   */
  let valueOfNewPassword = '';
  /**
   * Reactive state variable storing the value of the confirm new password input.
   * @type {string}
   */
  let valueOfConfirmPassword = '';

  /**
   * Event handler for the current password input field.
   * Updates `valueOfCurrentPassword` with the current input value.
   * @param {Event} event - The input event.
   */
  function onInput(event: Event) {
    valueOfCurrentPassword = (event.target as HTMLInputElement).value;
  }

  /**
   * Event handler for the new password input field.
   * Updates `valueOfNewPassword` with the current input value.
   * @param {Event} event - The input event.
   */
  function onInput2(event: Event) {
    valueOfNewPassword = (event.target as HTMLInputElement).value;
  }

  /**
   * Event handler for the confirm new password input field.
   * Updates `valueOfConfirmPassword` with the current input value.
   * @param {Event} event - The input event.
   */
  function onInput3(event: Event) {
    valueOfConfirmPassword = (event.target as HTMLInputElement).value;
  }
</script>

<div class="w-full space-y-5 border-b border-border/95 py-6 sm:py-8">
  <h2 class="text-lg">Password</h2>

  <div class="grid gap-y-1.5 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
    <div class="sm:col-span-4 xl:col-span-3 2xl:col-span-3">
      <Label for="password" class="text-foreground/60">Current Password</Label>
    </div>
    <div class="flex flex-col sm:col-span-4 xl:col-span-4 2xl:col-span-3">
      <Input 
        placeholder="Enter Current Password" 
        id="password" 
        type={showCurrentPassword ? 'text' : 'password'} 
        value={valueOfCurrentPassword} 
        oninput={onInput} 
      />
    </div>
    <div class="flex items-start">
      <Button 
        variant="outline" 
        size="icon"
        onclick={() => showCurrentPassword = !showCurrentPassword}
      >
        {#if showCurrentPassword}
          <EyeOff class="h-4 w-4" />
        {:else}
          <Eye class="h-4 w-4" />
        {/if}
      </Button>
    </div> 
  </div>

  <div class="grid gap-y-1.5 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
    <div class="sm:col-span-4 xl:col-span-3 2xl:col-span-3">
      <Label for="new_password" class="text-foreground/60">New Password</Label>
    </div>
    <div class="flex flex-col sm:col-span-4 xl:col-span-4 2xl:col-span-3">
      <Input 
        placeholder="Enter New Password" 
        id="new_password" 
        type={showNewPassword ? 'text' : 'password'} 
        value={valueOfNewPassword} 
        oninput={onInput2} 
      />
    </div>
    <div class="flex items-start">
      <Button 
        variant="outline" 
        size="icon"
        onclick={() => showNewPassword = !showNewPassword}
      >
        {#if showNewPassword}
          <EyeOff class="h-4 w-4" />
        {:else}
          <Eye class="h-4 w-4" />
        {/if}
      </Button>
    </div>   
  </div>

  <div class="grid gap-y-1.5 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
    <div class="sm:col-span-4 xl:col-span-3 2xl:col-span-3">
      <Label for="confirm_password" class="text-foreground/60">Confirm Password</Label>
    </div>
    <div class="flex flex-col sm:col-span-4 xl:col-span-4 2xl:col-span-3">
      <Input 
        placeholder="Confirm New Password" 
        id="confirm_password" 
        type={showConfirmPassword ? 'text' : 'password'} 
        value={valueOfConfirmPassword} 
        oninput={onInput3} 
      />
    </div>
    <div class="flex items-start">
      <Button 
        variant="outline" 
        size="icon"
        onclick={() => showConfirmPassword = !showConfirmPassword}
      >
        {#if showConfirmPassword}
          <EyeOff class="h-4 w-4" />
        {:else}
          <Eye class="h-4 w-4" />
        {/if}
      </Button>
    </div>            
  </div>

  <div class="grid gap-y-1.5 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
    <div class="flex items-center justify-center sm:col-span-10 sm:col-start-1 md:col-span-8 md:col-start-2 lg:col-span-6 lg:col-start-3">
      <div class="flex justify-center gap-x-4">
        <Button>
          Change
        </Button>
        <Button variant="link">
          I forgot my password
        </Button>
      </div>
    </div>            
  </div>
</div>