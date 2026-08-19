<script lang="ts">
  /**
   * @module ProjectsSection
   * @description This component serves as the wrapper for displaying user projects.
   * It includes a search bar, an "Add project" button, and integrates `ProjectsTabContent` to display categorized project lists.
   */
	import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Plus, Search } from "lucide-svelte";
	import ProjectsTabContent from "./projects-tab-content.svelte";
</script>

<Card.Root class="border rounded-xl max-w-3xl mx-auto mt-4">
  <Card.Content class="h-full p-4 sm:p-6">
    <div class="flex flex-wrap items-center gap-x-2 mb-4">
      <h2 class="text-xl font-semibold flex-shrink-0">Projects</h2>
      <div class="flex-grow flex justify-end items-center gap-3">
          <Search size="15" />
          <Input placeholder="Search" class="flex-grow-0 flex-shrink w-48" />
          <Button class="flex-shrink-0">
              <Plus size="15" />
              Add project
          </Button>
      </div>
  </div>
    
    <div class="flex flex-wrap justify-start gap-x-4 gap-y-4">
       <ProjectsTabContent /> 
    </div>
  </Card.Content>
</Card.Root>