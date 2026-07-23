<script lang="ts">
  /**
   * @module TeamsOverview
   * @description This component serves as the main overview for displaying team-related information.
   * It primarily renders the `CardTeams` component, which showcases individual team cards.
   */

import CardTeams from "./cardTeams.svelte";



    </script>
    
    <div class="p-3 md:p-4 border shadow-sm rounded-xl">
        <div class="flex mt-2 justify-between">
            <CardTeams />

        </div>
    </div>