<script lang='ts'>
  /**
   * @module PersonalInfoManagement
   * @description This component allows users to view and update their personal information, such as name and email address.
   * It provides input fields and action buttons for managing personal details.
   */
    import { Label } from '$lib/components/ui/label';
    import { Input } from '$lib/components/ui/input';
    import Button from '$lib/components/ui/button/button.svelte';


</script>

    <div class="w-full space-y-5 border-b border-border/95 py-6 sm:py-8">
        <h2 class="text-lg">Personal info</h2>

        <div class="grid gap-y-1.5 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
            <div class="sm:col-span-4 xl:col-span-3 2xl:col-span-3">
                <Label for="name" class="text-foreground/60">Name</Label>
            </div>
            <div class="flex flex-col sm:col-span-4 xl:col-span-4 2xl:col-span-3">
                <Input id="name" />
                <p class="text-sm text-muted-foreground">
                    Enter your full name, or a display name you are comfortable with.
                </p>
            </div>
        </div>

        <div class="grid gap-y-1.5 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
            <div class="sm:col-span-4 xl:col-span-3 2xl:col-span-3">
                <Label for="email" class="text-foreground/60">Email</Label>
            </div>
            <div class="flex flex-col sm:col-span-4 xl:col-span-4 2xl:col-span-3">
                <Input type="email" id="email" />
                <p class="text-sm text-muted-foreground">
                    Enter your email address.
                </p>
            </div>
        </div>

        <div class="grid gap-y-1.5 sm:grid-cols-12 sm:gap-x-5 sm:gap-y-0">
            <div class="flex justify-center items-center sm:col-start-1 sm:col-span-10 md:col-start-2 md:col-span-8 lg:col-start-3 lg:col-span-6">
                <div class="flex gap-x-4 justify-center">
                    <Button>
                        Save Changes
                    </Button>
                    <Button variant='outline'>
                       Cancel
                    </Button>
                </div>
            </div>            
        </div>
    </div>

