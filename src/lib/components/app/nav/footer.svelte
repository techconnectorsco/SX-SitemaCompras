<script lang="ts">
  /**
   * @module Footer
   * @description This component renders the application's footer, displaying copyright information dynamically from `siteConfig`.
   */
import { siteConfig } from '$lib/config/site';
</script>

<footer class=" py-6 text-center text-sm border-t">
    © {new Date().getFullYear()} {siteConfig.title}. Todos los derechos reservados.
</footer>