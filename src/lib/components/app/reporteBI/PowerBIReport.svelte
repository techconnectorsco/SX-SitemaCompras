<script>
  let { url, titulo, altura = 600 } = $props();
</script>

<div class="report-wrapper">
  <h3 class="report-title">{titulo}</h3>
  <iframe
    title={titulo}
    src={url}
    width="100%"
    height={altura}
    frameborder="0"
  ></iframe>
</div>

<style>
  .report-wrapper {
    margin-bottom: 2.5rem; /* Espacio entre reportes */
    width: 100%;
  }
  .report-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #1e3a8a;
    margin-bottom: 1rem;
    padding-left: 0.5rem;
    border-left: 4px solid #1e3a8a;
  }
  iframe {
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    background: #f9fafb;
  }
</style>