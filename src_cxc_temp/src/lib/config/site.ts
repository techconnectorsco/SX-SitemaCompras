import type { NavItem } from '$lib/types';
import Home from "@lucide/svelte/icons/home";
import Server from "@lucide/svelte/icons/server";
import Globe from "@lucide/svelte/icons/globe";
import Mail from "@lucide/svelte/icons/mail";
import Database from "@lucide/svelte/icons/database";
import File from "@lucide/svelte/icons/file";
import Settings from "@lucide/svelte/icons/settings";
import CreditCard from "@lucide/svelte/icons/credit-card";
import HelpCircle from "@lucide/svelte/icons/help-circle";
import User from "@lucide/svelte/icons/user";

/**
 * Configuration object for the SITO.cr website.
 * @constant
 * @type {object}
 * @property {string} title - The main title of the site.
 * @property {string} description - A brief description of the site.
 * @property {string} logo - Path to the light mode logo image.
 * @property {string} logoDark - Path to the dark mode logo image.
 * @property {string} favicon - Path to the favicon image.
 * @property {object} contact - Contact information.
 * @property {string} contact.email - Contact email address.
 * @property {string} contact.phone - Contact phone number.
 * @property {object} links - Important navigation links.
 * @property {string} links.about - Link to the about page.
 * @property {string} links.contact - Link to the contact page.
 * @property {string} links.properties - Link to the properties page.
 * @property {string} links.foreclosures - Link to the foreclosures page.
 * @property {object} footer - Footer specific information.
 * @property {string} footer.rights - Copyright notice for the footer.
 */
export const siteConfig = {
	title: 'SX - SoporteXperto',
	description: 'Oficina de Transformación Digital - RPA y Automatización.',
	logo: '/logoSX.jpg',
	logoDark: '/logoSX.jpg',
	favicon: '/logoSX.jpg',


	contact: {
		email: 'transformacion@soportexperto.com',
		phone: '+506 0000 0000'
	},
	links: {
		about: '/acerca',
		contact: '/contacto',
		properties: '/propiedades',
		foreclosures: '/remates'
	},
	footer: {
		rights: '© 2026 SX - SoporteXperto. Todos los derechos reservados.'
	}
};


/**
 * Main navigation array for the application.
 * Each item conforms to the `NavItem` type.
 * @constant
 * @type {NavItem[]}
 */
export const mainNav: NavItem[] = [
	{
	  title: "Dashboard",
	  href: "/dashboard",
	  icon: Home,
	},
	{
	  title: "Servidores",
	  href: "/servers",
	  icon: Server,
	  items: [
		{ title: "Mis Servidores", href: "/servers" },
		{ title: "Crear Servidor", href: "/servers/new" },
	  ],
	},
	{
	  title: "Dominios",
	  href: "/domains",
	  icon: Globe,
	  items: [
		{ title: "Mis Dominios", href: "/domains" },
		{ title: "Registrar Dominio", href: "/domains/register" },
	  ],
	},
	{
	  title: "Correo",
	  href: "/email",
	  icon: Mail,
	  items: [
		{ title: "Cuentas de Correo", href: "/email/accounts" },
		{ title: "Configuración", href: "/email/settings" },
	  ],
	},
	{
	  title: "Bases de Datos",
	  href: "/databases",
	  icon: Database,
	  items: [
		{ title: "Mis Bases de Datos", href: "/databases" },
		{ title: "Crear Base de Datos", href: "/databases/new" },
	  ],
	},
	{
	  title: "Archivos",
	  href: "/files",
	  icon: File,
	  items: [
		{ title: "Administrador de Archivos", href: "/files" },
		{ title: "Subir Archivos", href: "/files/upload" },
	  ],
	},
	{
	  title: "Configuración",
	  href: "/settings",
	  icon: Settings,
	  items: [
		{ title: "Preferencias", href: "/settings/preferences" },
		{ title: "Seguridad", href: "/settings/security" },
	  ],
	},
	{
	  title: "Facturación",
	  href: "/billing",
	  icon: CreditCard,
	  items: [
		{ title: "Planes y Precios", href: "/billing/plans" },
		{ title: "Historial de Pagos", href: "/billing/history" },
	  ],
	},
	{
	  title: "Soporte",
	  href: "/support",
	  icon: HelpCircle,
	  items: [
		{ title: "Centro de Ayuda", href: "/support/help-center" },
		{ title: "Contactar Soporte", href: "/support/contact" },
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
