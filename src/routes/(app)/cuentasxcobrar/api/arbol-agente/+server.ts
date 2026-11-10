import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { obtenerArbolAgenteMock } from '$lib/cxc/mock-data';

// GET /cuentasxcobrar/api/arbol-agente?agente=N
// Devuelve el árbol de zonas y clientes para el agente indicado.
export const GET: RequestHandler = async ({ url }) => {
	const codigo = url.searchParams.get('agente');
	if (!codigo) throw error(400, "Falta el parámetro 'agente'");

	const codigoNum = Number(codigo);
	if (!Number.isFinite(codigoNum)) throw error(400, "El parámetro 'agente' debe ser numérico");

	// Simulate connection delay (SAP suele tardar un poco al armar el árbol)
	await new Promise((r) => setTimeout(r, 600));

	const arbol = obtenerArbolAgenteMock(codigoNum);
	if (!arbol) throw error(404, `El agente ${codigo} no existe`);

	return json(arbol);
};