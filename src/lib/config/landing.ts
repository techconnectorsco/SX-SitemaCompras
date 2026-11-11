/**
 * @module LandingConfig
 * @description Fuente única de verdad para los accesos y los orígenes de datos que
 * se muestran en la landing pública (`src/routes/+page.svelte`).
 *
 * Los accesos aparecen en cuatro lugares distintos — las tarjetas de la sección
 * `#accesos`, los nodos del SVG del hero, la cascada del bloque de cierre y la
 * columna del pie — así que viven aquí para que no se desincronicen.
 */

export type Acceso = {
	/** Sigla de dos letras que se muestra en el cuadro `.sig`. */
	sigla: string;
	titulo: string;
	/** Línea de apoyo: se usa en el SVG del hero. */
	sub: string;
	href: string;
	/** Abre en pestaña nueva con `rel="noopener noreferrer"`. */
	externo?: boolean;
	/**
	 * Fuerza una navegación completa del navegador en vez de usar el router.
	 * Hace falta para destinos que no son rutas de SvelteKit y que resuelve un
	 * hook del servidor. Hoy ningún acceso lo necesita.
	 */
	reload?: boolean;
};

export type Origen = {
	sigla: string;
	titulo: string;
	sub: string;
};

export const ACCESOS: Acceso[] = [
	{
		sigla: 'AC',
		titulo: 'Asistente de Compras',
		sub: 'Forecast · SKUs · Alertas',
		href: '/AsistenteCompras'
	},
	{
		sigla: 'FA',
		titulo: 'Facturación',
		sub: 'Emisión y seguimiento',
		href: 'http://facturacion.soportexperto.com:3003/',
		externo: true
	},
	{
		sigla: 'CC',
		titulo: 'CXC',
		sub: 'Cuentas por cobrar',
		href: '/cuentasxcobrar'
	},
	{
		sigla: 'CM',
		titulo: 'Community Manager',
		sub: 'IA · Redes · Meta Ads',
		href: '/contentCreator'
	},
	{
		sigla: 'KM',
		titulo: 'Kit de Monitoreo',
		sub: 'Salud de APIs y sistema',
		href: '/monitoreo'
	}
];

export const ORIGENES: Origen[] = [
	{ sigla: 'ER', titulo: 'ERP', sub: 'Inventarios y ventas' },
	{ sigla: 'BO', titulo: 'Bodegas', sub: 'Existencias por sucursal' },
	{ sigla: 'MA', titulo: 'Marcas', sub: 'Prompts y brand assets' },
	{ sigla: 'ME', titulo: 'Meta', sub: 'Facebook e Instagram' }
];
