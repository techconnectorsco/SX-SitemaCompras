<script lang="ts">
  /**
   * @module LegendIndicator
   * @description This component displays a legend with color-coded indicators (Bad, Average, Good, Excellent) and a progress bar.
   * It is typically used to visually represent performance or status levels.
   */
	import { Progress } from "$lib/components/ui/progress";
	import { FlagTriangleLeft } from "lucide-svelte";

</script>
  


<div class="mb-1 flex flex-wrap justify-between items-center">
    <div class="flex items-center w-full md:w-1/4 p-1">
        <span class="flex items-center">
            <FlagTriangleLeft size="15" class="mr-2 text-red-600"/>
            <span>Bad</span>
        </span>
    </div>
    <div class="flex items-center w-full md:w-1/4 p-1">
        <span class="flex items-center">
            <FlagTriangleLeft size="15" class="mr-2 text-yellow-500"/>
            <span>Average</span>
        </span>
    </div>
    <div class="flex items-center w-full md:w-1/4 p-1">
        <span class="flex items-center">
            <FlagTriangleLeft size="15" class="mr-2 text-green-500"/>
            <span>Good</span>
        </span>
    </div>
    <div class="flex items-center w-full md:w-1/4 p-1">
        <span class="flex items-center">
            <FlagTriangleLeft size="15" class="mr-2 text-teal-400"/>
            <span>Excellent</span>
        </span>
    </div>
    <Progress value={50} max={100} class="w-full h-2.5 rounded-full overflow-hidden" />
</div>
