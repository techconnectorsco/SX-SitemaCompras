<script lang='ts'>
  /**
   * @module AvatarManagement
   * @description This component provides functionality for users to upload, display, and remove their profile avatar.
   * It integrates with UI components for input, buttons, and avatar display.
   */
	import { Label } from '$lib/components/ui/label/';
	import * as Avatar from '$lib/components/ui/avatar/';
	import Button from '$lib/components/ui/button/button.svelte';
	import { ArrowUpToLine } from 'lucide-svelte';
</script>
	
<div class="w-full space-y-5 border-b border-border/95 py-6 sm:py-8">
		<h2 class="text-lg">Avatar</h2>
		<div class="grid gap-y-1.5 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
			<div class="sm:col-span-4 xl:col-span-3 2xl:col-span-3">
				<Label for="avatar" class="text-foreground/60">Avatar</Label>
			</div>
			<div class="flex gap-6 sm:col-span-4 xl:col-span-3 2xl:col-span-3">
				<Avatar.Root class="size-16">
					<Avatar.Image src='' alt="" />
					<Avatar.Fallback>IM</Avatar.Fallback>
				</Avatar.Root>
				<div class="space-y-4">
					<div class="flex space-x-2">
						<input type="file" id="avatar" accept="image/*" hidden>
						<label for="avatar" class="button gap-1 cursor-pointer">
							<ArrowUpToLine size={16} />
							Upload Photo
						</label>
						<Button
							size="sm"
							variant="outline"
							class="border border-red-400 text-red-400"
							disabled
						>
							Remove Photo
						</Button>
					</div>
					<p class="text-xs">Pick a photo up to 1MB.</p>
				</div>
			</div>
		</div>
</div>





