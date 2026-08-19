<script lang="ts">
  /**
   * @module ProfileCalendar
   * @description This component displays a single-selection calendar for date input within a user's profile.
   * It utilizes the `Calendar` UI component and manages the selected date using a reactive state variable.
   */
  import Calendar from "$lib/components/ui/calendar/calendar.svelte";
  import { CalendarDate } from "@internationalized/date";
  /**
   * Reactive state variable holding the selected date in the calendar.
   * It is initialized to June 12, 2025, and can be `undefined` if no date is selected.
   * @type {CalendarDate | undefined}
   */
  let value = $state<CalendarDate | undefined>(new CalendarDate(2025, 6, 12));
</script>
<Calendar type="single" bind:value class="rounded-lg border shadow-sm" />
