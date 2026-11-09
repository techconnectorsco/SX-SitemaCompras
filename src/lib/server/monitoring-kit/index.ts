// 1. Core Agnóstico (Interfaces, Motor, Servicios en Memoria y Vistas HTML)
export * from './core';

// 2. Adaptadores Universales sin dependencias externas (SvelteKit, Express, Fetch/Next.js/Hono)
export * from './adapters';

// 3. Adaptador NestJS (Retrocompatible 100% con proyectos NestJS)
export * from './adapters/nestjs';
