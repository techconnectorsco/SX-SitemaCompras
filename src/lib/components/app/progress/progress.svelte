<script lang="ts">
  export let value: number = 0;
  let className: string = '';
  export { className as class };
  
  $: percentage = Math.min(100, Math.max(0, value));
</script>

<div class="relative h-4 w-full overflow-hidden rounded-full bg-secondary {className}">
  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <div
    class="h-full w-full flex-1 bg-primary transition-all"
    style="transform: translateX(-{100 - percentage}%)"
  />
</div>