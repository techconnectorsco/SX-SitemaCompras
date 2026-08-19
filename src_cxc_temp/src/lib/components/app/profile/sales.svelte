<script lang="ts">
  /**
   * @module SalesOverview
   * @description This component provides an overview of sales performance, including various sales metrics and a monthly closed sales indicator.
   * It utilizes card components for individual sales figures and a legend indicator for overall performance visualization.
   */
    import * as Card from "$lib/components/ui/card/index.js";
    import Badge from "$lib/components/ui/badge/badge.svelte";
	import { Content } from "$lib/components/ui/dialog";
	import { TrendingDown, TrendingUp } from "lucide-svelte";
	import Calendar from "./calendar.svelte";
	import LegendIndicator from "./legend-indicator.svelte";
  


  /**
   * An array of sales data objects, each representing a different sales category.
   * @constant
   * @type {Array<object>}
   * @property {string} title - The title of the sales category (e.g., "In-store sales").
   * @property {string} amount - The total amount for the sales category.
   * @property {string} change - The percentage change in sales.
   * @property {("up"|"down")} trend - Indicates the sales trend (up or down).
   * @property {string} color - The CSS class for the color of the trend indicator.
   */
  let sales = [
    {
      title: "In-store sales",
      amount: "$287,390",
      change: "-4.9%",
      trend: "down",
      color: "text-red-600"
    },
    {
      title: "Properties Sales",
      amount: "$75,990",
      change: "+25.8%",
      trend: "up",
      color: "text-teal-600"
    },
    {
      title: "Discount",
      amount: "$68,307",
      change: "+90.3%",
      trend: "up",
      color: "text-teal-600"
    }
  ];

</script>

<Card.Root class="border rounded-xl  mx-auto">
  <Card.Content class="h-full p-4 sm:p-6">
    <div class="flex items-center gap-x-2 mb-4">
      <h2 class="text-xl font-semibold">Sales</h2>
    </div>
    
    <div class="flex flex-wrap justify-start gap-x-4 gap-y-4">
      {#each sales as sale}
        <Card.Root class="border rounded-xl w-48">
          <Card.Content class="p-2 sm:p-4">
            <div class="space-y-2">
              <h2 class="text-sm font-semibold">{sale.title}</h2>
              <div class="flex flex-col sm:flex-row items-center sm:space-x-2 space-y-2 sm:space-y-0">
                <p class="text-lg sm:text-xl font-bold">{sale.amount}</p>
                <Badge variant='outline' rounded>
                  <span class="inline-flex items-center gap-x-1 {sale.color}">
                    {#if sale.trend === 'up'}
                      <TrendingUp size=15 class={sale.color}/>
                    {:else}
                      <TrendingDown size=15 class={sale.color}/>
                    {/if}
                    {sale.change}
                  </span>
                </Badge>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
    <div class='py-4'>
      <Card.Root class="border rounded-xl w-full">
        <Card.Content class="p-2 sm:p-4">
          <div class="space-y-2">
            <h2 class="text-sm font-semibold">Monthly closed sales</h2>
            <div class="flex items-center space-x-2">
              <p class="text-lg sm:text-xl font-bold">$45,302</p>
            </div>
          </div>
          <LegendIndicator/>
        </Card.Content>
      </Card.Root>
    </div>
  </Card.Content>
</Card.Root>
