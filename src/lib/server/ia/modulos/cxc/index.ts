import type { ModuloIA } from '../../tipos';
import {
	buscarClientesCxc,
	auditarClienteCxc,
	resumenCarteraCxc,
	consultarGiraAgente,
	historialEjecucionesRpa
} from './calculos';

export const moduloCxc: ModuloIA = {
	id: 'cxc',
	nombre: 'Cuentas por Cobrar y Giras',
	permisosRequeridos: ['cxc'],
	contextoSistema: `
REGLAS DEL MÓDULO CUENTAS POR COBRAR (CxC):
- Para consultas de Cuentas por Cobrar y Giras, usá únicamente las herramientas de este módulo (no usés consultar_datos ni acciones de inventario como "Comprar" o "No comprar").
- Proponé acciones concretas de cobranza o gestión según los datos (ej. "Enviar estado de cuenta a revisión", "Gestionar cobro por mora > 90 días", "Habilitar envío automático").
- Manejamos dos monedas independientes: Colones (CRC, símbolo ₡) y Dólares (USD, símbolo $). Nunca sumes colones y dólares directamente sin aclarar cada moneda por separado.
- Existen cuentas "padre" que consolidan sucursales ("hijo") en un solo estado de cuenta, y cuentas "individual".
- Si un cliente tiene "envioAutomatico" en "N", el RPA lo omite en envíos masivos de cartera completa, aunque sí se puede enviar de forma individual o a revisión.
- Los documentos vencidos se agrupan en rangos de antigüedad: 0-30, 31-60, 61-90, 91-120 y más de 120 días.
- En Giras de Agentes, un cliente puede aparecer como no elegible por no tener documentos abiertos ("sin_documentos") o por estar asignado a otro vendedor ("otro_vendedor").
`,
	herramientas: [
		{
			nombre: 'buscar_clientes_cxc',
			descripcion:
				'Busca clientes de Cuentas por Cobrar por código (ej. C0001, P0001) o nombre comercial para obtener su cardCode y tipo de cuenta (padre, hijo o individual).',
			parametros: {
				type: 'object',
				properties: {
					query: { type: 'string', description: 'Código o parte del nombre del cliente.' }
				},
				required: ['query']
			},
			ejecutar: async (args) => buscarClientesCxc(String(args.query ?? ''))
		},
		{
			nombre: 'auditar_cliente_cxc',
			descripcion:
				'Obtiene el estado de cuenta completo de un cliente por su cardCode: saldo global ERP, correos, envío automático (Y/N), facturas abiertas en USD y CRC, y vencimientos por rangos. Si solo tenés el nombre del cliente, usá primero buscar_clientes_cxc.',
			parametros: {
				type: 'object',
				properties: {
					cardCode: { type: 'string', description: 'Código exacto del cliente (ej. C0001, P0001).' }
				},
				required: ['cardCode']
			},
			ejecutar: async (args) => auditarClienteCxc(String(args.cardCode ?? ''))
		},
		{
			nombre: 'resumen_cartera_cxc',
			descripcion:
				'Calcula el resumen global de toda la cartera CxC: totales pendientes y vencidos en CRC y USD, ranking de clientes más morosos y clientes con saldo que tienen deshabilitado el envío automático.',
			parametros: {
				type: 'object',
				properties: {
					topN: { type: 'integer', description: 'Cantidad de clientes en el ranking de mora (por defecto 5).' }
				}
			},
			ejecutar: async (args) => resumenCarteraCxc(Number(args.topN) || 5)
		},
		{
			nombre: 'consultar_gira_agente',
			descripcion:
				'Consulta la cartera y zonas asignadas a un agente comercial (por código numérico o nombre), mostrando clientes elegibles para gira, montos a cobrar y clientes excluidos.',
			parametros: {
				type: 'object',
				properties: {
					agente: {
						type: 'string',
						description: 'Código numérico (ej. "6") o nombre del agente (ej. "Siviany").'
					}
				},
				required: ['agente']
			},
			ejecutar: async (args) => consultarGiraAgente(String(args.agente ?? ''))
		},
		{
			nombre: 'historial_ejecuciones_rpa',
			descripcion:
				'Consulta las ejecuciones históricas de los bots RPA de envío de estados de cuenta (cxc) o giras de agentes (giras), incluyendo tasa de éxito, correos fallidos y montos procesados.',
			parametros: {
				type: 'object',
				properties: {
					tipo: {
						type: 'string',
						enum: ['cxc', 'giras'],
						description: 'Tipo de automatización a consultar: "cxc" o "giras".'
					},
					limite: { type: 'integer', description: 'Número de ejecuciones recientes a mostrar (default 5).' }
				}
			},
			ejecutar: async (args) =>
				historialEjecucionesRpa(args.tipo === 'giras' ? 'giras' : 'cxc', Number(args.limite) || 5)
		}
	]
};