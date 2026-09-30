<script>
  // Puedes pasarle el título y la altura como propiedades al componente
  let { titulo = 'Gestión de Pedidos — Vedova & Obando', altura = 600 } = $props();

  // La URL segura que acabas de generar
  const embedUrl = 'https://app.powerbi.com/reportEmbed?reportId=ac073396-36e4-42d0-bfde-a0cc76b0a33b&autoAuth=true&ctid=22985f7d-d7a0-418b-b75d-2c99c9e1ad8c&actionBarEnabled=true';
</script>

<div class="powerbi-container">
  <h2 class="titulo-reporte">{titulo}</h2>
  <iframe
    title={titulo}
    src={embedUrl}
    width="100%"
    height={altura}
    frameborder="0"
  ></iframe>
</div>

<style>
  .powerbi-container {
    width: 100%;
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
  }

  .titulo-reporte {
    font-size: 1.25rem;
    font-weight: bold;
    color: #1e3a8a; /* Azul corporativo, cámbialo según tu diseño */
    margin-bottom: 1rem;
  }

  iframe {
    border-radius: 8px;
    border: 1px solid #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
</style>