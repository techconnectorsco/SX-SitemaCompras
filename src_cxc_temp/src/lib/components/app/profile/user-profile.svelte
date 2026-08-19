<script lang="ts">
  /**
   * @module UserProfileLayout
   * @description This component serves as a layout for displaying various sections of a user's profile.
   * It aggregates and renders sub-components like About, Projects, Sales, and Connections.
   */
// @ts-nocheck

	import About from "./about.svelte";
	import Projects from "./projects.svelte";
	import Sales from "./sales.svelte";
	import Conections from "./propiedades.svelte";

</script>

<div class="p-3 md:p-4 border shadow-sm rounded-xl">
    <div class="flex mt-2 justify-between">
        <div class="flex-1">
            <About/>
        
        </div>
        <div>
            
        </div>
    </div>
</div>