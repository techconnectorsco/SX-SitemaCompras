import type { NavItem } from '$lib/types';
import Home from "@lucide/svelte/icons/home";
import ShoppingCart from "@lucide/svelte/icons/shopping-cart";
import Package from "@lucide/svelte/icons/package";
import TrendingUp from "@lucide/svelte/icons/trending-up";
import FileSpreadsheet from "@lucide/svelte/icons/file-spreadsheet";
import Bell from "@lucide/svelte/icons/bell";
import Settings from "@lucide/svelte/icons/settings";
import BarChart3 from "@lucide/svelte/icons/bar-chart-3";
import Users from "@lucide/svelte/icons/users";
import User from "@lucide/svelte/icons/user";
import History from "@lucide/svelte/icons/history";
import Database from "@lucide/svelte/icons/database";

/**
 * Configuración del sistema SoporteXperto - Asistente de Compras y Forecast
 * @constant
 * @type {object}
 * @property {string} title - Título principal del sistema
 * @property {string} description - Descripción del sistema
 * @property {string} logo - Ruta al logo en modo claro
 * @property {string} logoDark - Ruta al logo en modo oscuro
 * @property {string} favicon - Ruta al favicon
 * @property {object} contact - Información de contacto
 * @property {string} contact.email - Email de soporte
 * @property {string} contact.phone - Teléfono de soporte
 * @property {object} company - Información de la empresa
 * @property {string} company.name - Nombre de la empresa
 * @property {object} footer - Información del pie de página
 * @property {string} footer.rights - Aviso de derechos reservados
 */
export const siteConfig = {
	title: 'SoporteXperto',
	description: 'Sistema de Gestión de Compras y Forecast Automatizado',
	name: 'SoporteXperto',
	logo: '/logo-soportexperto.png',
	logoDark: '/logo-soportexperto1.png',
	favicon: '/logo-soportexperto.png',
	contact: {
		email: 'omar.hernandez@soportexperto.com',
		phone: '+506 2222-2222'
	},
	company: {
		name: 'SoporteXperto'
	},
	footer: {
		rights: '© 2025 SoporteXperto. Todos los derechos reservados.'
	}
};

/**
 * Navegación principal del sistema
 * Estructura basada en el flujo de trabajo de compras y forecast
 * @constant
 * @type {NavItem[]}
 */
export const mainNav: NavItem[] = [
	{
		title: "Dashboard",
		href: "/AsistenteCompras",
		icon: Home,
	},
	{
		title: "SKUs",
		href: "/skus",
		icon: Package,
		items: [
			{ title: "Lista de SKUs", href: "/skus" },
			{ title: "Clasificación ABC", href: "/skus/classification" },
			{ title: "Inventarios Mínimos", href: "/skus/min-inventory" },
			{ title: "Productos Nuevos", href: "/skus/new" },
		],
	},
	{
		title: "Forecast",
		href: "/forecast",
		icon: TrendingUp,
		items: [
			{ title: "Cálculo Automático", href: "/forecast/calculate" },
			{ title: "Ajuste Manual", href: "/forecast/adjust" },
			{ title: "Historial 3 Años", href: "/forecast/history" },
			{ title: "Reglas de Negocio", href: "/forecast/rules" },
		],
	},
	{
		title: "Pedidos",
		href: "/orders",
		icon: ShoppingCart,
		items: [
			{ title: "Crear Pedido", href: "/orders/new" },
			{ title: "Pedidos Activos", href: "/orders/active" },
			{ title: "Historial", href: "/orders/history" },
			{ title: "Control Semanal", href: "/orders/weekly-control" },
		],
	},
	{
		title: "Reportes",
		href: "/reports",
		icon: FileSpreadsheet,
		items: [
			{ title: "Plantilla Exactus", href: "/reports/exactus" },
			{ title: "Plantilla Husqvarna", href: "/reports/husqvarna" },
			{ title: "Reporte Control Compras", href: "/reports/purchase-control" },
			{ title: "Exportar Excel", href: "/reports/export" },
		],
	},
	{
		title: "Indicadores",
		href: "/indicators",
		icon: BarChart3,
		items: [
			{ title: "Por Bodega", href: "/indicators/warehouse" },
			{ title: "ABC por Sucursal", href: "/indicators/abc-branch" },
			{ title: "Rotación Inventario", href: "/indicators/rotation" },
			{ title: "Costos Promedio", href: "/indicators/costs" },
		],
	},
	{
		title: "Alertas",
		href: "/alerts",
		icon: Bell,
		items: [
			{ title: "Alertas Activas", href: "/alerts" },
			{ title: "Configurar Alertas", href: "/alerts/config" },
			{ title: "Lead Time", href: "/alerts/lead-time" },
			{ title: "Stock Bajo", href: "/alerts/low-stock" },
		],
	},
	{
		title: "Datos Exactus",
		href: "/exactus",
		icon: Database,
		items: [
			{ title: "Vista Principal", href: "/exactus/view" },
			{ title: "Historial Ventas", href: "/exactus/sales-history" },
			{ title: "Inventario Actual", href: "/exactus/inventory" },
			{ title: "Tránsitos", href: "/exactus/transit" },
		],
	},
	{
		title: "Historial",
		href: "/history",
		icon: History,
		items: [
			{ title: "Últimos 3 Años", href: "/history/3years" },
			{ title: "Por Período", href: "/history/period" },
			{ title: "Comparativas", href: "/history/comparison" },
		],
	},
	{
		title: "Administración",
		href: "/admin",
		icon: Users,
		items: [
			{ title: "Usuarios Pendientes", href: "/admin/pending-users" },
			{ title: "Todos los Usuarios", href: "/admin/users" },
			{ title: "Logs de Auditoría", href: "/admin/audit-logs" },
			{ title: "Configuración Sistema", href: "/admin/settings" },
		],
	},
	{
		title: "Configuración",
		href: "/settings",
		icon: Settings,
		items: [
			{ title: "Mi Perfil", href: "/settings/profile" },
			{ title: "Seguridad", href: "/settings/security" },
			{ title: "Notificaciones", href: "/settings/notifications" },
		],
	},
	{
		title: "Perfil",
		href: "/account",
		icon: User,
		items: [
			{ title: "Mi Perfil", href: "/account/profile" },
			{ title: "Cerrar Sesión", href: "/logout" },
		],
	},
];

/**
 * Navegación específica para ADMIN
 * Items que solo pueden ver usuarios con rol ADMIN
 */
export const adminNav: NavItem[] = [
	{
		title: "Panel Admin",
		href: "/admin",
		icon: Users,
		items: [
			{ title: "Usuarios Pendientes", href: "/admin/pending-users" },
			{ title: "Gestionar Usuarios", href: "/admin/users" },
			{ title: "Logs de Auditoría", href: "/admin/audit-logs" },
			{ title: "Configuración", href: "/admin/settings" },
		],
	},
];

/**
 * Categorías ABC de productos
 */
export const abcCategories = {
	A: {
		name: 'Categoría A',
		factor: 2.5,
		description: 'Alta rotación - Mayor prioridad'
	},
	B: {
		name: 'Categoría B',
		factor: 2.3,
		description: 'Media rotación'
	},
	C: {
		name: 'Categoría C',
		factor: 1.3,
		description: 'Baja rotación'
	},
	D: {
		name: 'Categoría D',
		factor: 0,
		description: 'Sin movimiento'
	}
} as const;

/**
 * Lead Times por proveedor (en días)
 */
export const leadTimes = {
	husqvarna: 3,
	// Agregar más proveedores según se necesiten
} as const;

/**
 * Configuración de alertas
 */
export const alertConfig = {
	lowStock: {
		enabled: true,
		threshold: 0.2 // 20% del inventario mínimo
	},
	leadTime: {
		enabled: true,
		daysBeforeExpiry: 7 // Alertar 7 días antes
	},
	highCoefficient: {
		enabled: true,
		threshold: 1.4 // Coeficiente mayor a 1.4 requiere evaluación
	}
} as const;