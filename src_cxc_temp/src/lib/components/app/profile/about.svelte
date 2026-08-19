<script lang="ts">
  /**
   * @module AboutSection
   * @description This component displays an "About" section within a user's profile.
   * It presents various pieces of information such as guidelines, location, timezone, email, and a website link, using Lucide icons for visual context.
   */
  import { Clock8, Link, Mail, MapPin, ScrollText } from 'lucide-svelte';
  </script>
  
  <div class="bg-card border rounded-xl p-6 shadow-sm">
    <h2 class="font-semibold text-xl mb-5">About</h2>
    <ul class="space-y-4">
      <li class="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
        <ScrollText size={18} class="text-primary" />
        <span>Guideline</span>
      </li>
      <li class="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
        <MapPin size={18} class="text-primary" />
        <span>United Kingdom</span>
      </li>
      <li class="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
        <Clock8 size={18} class="text-primary" />
        <span>Europe/London (GMT)</span>
      </li>
      <li class="flex items-center gap-3">
        <Mail size={18} class="text-primary" />
        <a href="mailto:james@site.so" class="hover:underline text-primary hover:text-primary/80 transition-colors">
          james@site.so
        </a>
      </li>
      <li class="flex items-center gap-3">
        <Link size={18} class="text-primary" />
        <a href="https://example.so" target="_blank" rel="noopener noreferrer" class="hover:underline text-primary hover:text-primary/80 transition-colors">
          example.so
        </a>
      </li>
    </ul>
  </div>