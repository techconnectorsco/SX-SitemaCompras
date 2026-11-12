// src/lib/server/ia/modulos/cxc/calculos.ts
import {
	MOCK_CLIENTES,
	MOCK_PADRES,
	MOCK_AGENTES,
	MOCK_EJECUCIONES_CXC,
	MOCK_EJECUCIONES_GIRAS,
	auditarClienteMock,
	obtenerArbolAgenteMock
} from '$lib/cxc/mock-data'; // ajustá la ruta según tu proyecto

export function buscarClientesCxc(query: string, limite = 15) {
	const q = query.trim().toLowerCase();
	const coincidencias = MOCK_CLIENTES.filter(
		(c) => c.cardCode.toLowerCase().includes(q) || c.cardName.toLowerCase().includes(q)
	).slice(0, limite);

	return coincidencias.map((c) => {
		const padreInfo = c.tipo === 'padre' ? MOCK_PADRES.find((p) => p.cardCode === c.cardCode) : null;
		return {
			...c,
			sucursales: padreInfo ? padreInfo.hijos.map((h) => `${h.cardCode} (${h.cardName})`) : []
		};
	});
}

export function auditarClienteCxc(cardCode: string) {
	const code = cardCode.trim().toUpperCase();
	const audit = auditarClienteMock(code);
	if (!audit) return { error: `El cliente ${code} no existe en el sistema.` };

	// Si es cuenta padre, avisar de sus sucursales para contexto consolidado
	const padre = MOCK_PADRES.find((p) => p.cardCode === code);
	return {
		...audit,
		esCuentaPadre: Boolean(padre),
		sucursales: padre?.hijos ?? []
	};
}

export function resumenCarteraCxc(topN = 5) {
	let totalCrc = 0;
	let totalUsd = 0;
	let vencidoCrc = 0;
	let vencidoUsd = 0;
	const sinEnvioAuto: Array<{ cardCode: string; cardName: string; totalCrc: number; totalUsd: number }> = [];
	const rankingMora: Array<{ cardCode: string; cardName: string; vencidoCrc: number; vencidoUsd: number }> = [];

	for (const c of MOCK_CLIENTES) {
		const a = auditarClienteMock(c.cardCode);
		if (!a) continue;

		totalCrc += a.totales.crc;
		totalUsd += a.totales.usd;
		vencidoCrc += a.rangos.crc.totalVencido;
		vencidoUsd += a.rangos.usd.totalVencido;

		if (a.cliente.envioAutomatico !== 'Y' && (a.totales.crc > 0 || a.totales.usd > 0)) {
			sinEnvioAuto.push({
				cardCode: c.cardCode,
				cardName: c.cardName,
				totalCrc: a.totales.crc,
				totalUsd: a.totales.usd
			});
		}

		if (a.rangos.crc.totalVencido > 0 || a.rangos.usd.totalVencido > 0) {
			rankingMora.push({
				cardCode: c.cardCode,
				cardName: c.cardName,
				vencidoCrc: a.rangos.crc.totalVencido,
				vencidoUsd: a.rangos.usd.totalVencido
			});
		}
	}

	// Ordenar por mora en colones + equivalente aproximado USD (510 CRC)
	rankingMora.sort((a, b) => b.vencidoCrc + b.vencidoUsd * 510 - (a.vencidoCrc + a.vencidoUsd * 510));

	return {
		totalClientes: MOCK_CLIENTES.length,
		carteraTotal: { crc: totalCrc, usd: totalUsd },
		carteraVencida: { crc: vencidoCrc, usd: vencidoUsd },
		topMorosos: rankingMora.slice(0, topN),
		clientesConSaldoPeroSinEnvioAutomatico: sinEnvioAuto
	};
}

export function consultarGiraAgente(busquedaAgente: string | number) {
	const q = String(busquedaAgente).trim().toLowerCase();
	const agente = MOCK_AGENTES.find(
		(a) => String(a.codigo) === q || a.nombre.toLowerCase().includes(q)
	);

	if (!agente) {
		return {
			error: `No se encontró el agente "${busquedaAgente}".`,
			agentesDisponibles: MOCK_AGENTES.map((a) => ({ codigo: a.codigo, nombre: a.nombre }))
		};
	}

	const arbol = obtenerArbolAgenteMock(agente.codigo);
	if (!arbol) return { error: 'No se pudo construir el árbol de zonas del agente.' };

	return {
		agente: arbol.agente,
		resumen: {
			totalElegibles: arbol.totalElegibles,
			totalNoElegibles: arbol.totalNoElegibles,
			montosAproximados: arbol.montosAproximados
		},
		zonas: arbol.zonas.map((z) => ({
			codigo: z.zona.codigo,
			nombre: z.zona.nombre,
			elegibles: z.totalElegibles,
			noElegibles: z.totalNoElegibles,
			clientes: z.clientes.map((c) => ({
				cardCode: c.cardCode,
				cardName: c.cardName,
				elegible: c.elegible,
				docs: c.docs,
				crc: c.crc,
				usd: c.usd,
				motivoExclusion: c.motivo,
				ruteadoAOtroAgente: c.vendedorNombre
			}))
		}))
	};
}

export function historialEjecucionesRpa(tipo: 'cxc' | 'giras' = 'cxc', limite = 5) {
	const fuente = tipo === 'giras' ? MOCK_EJECUCIONES_GIRAS : MOCK_EJECUCIONES_CXC;
	const ultimas = fuente.slice(0, limite);
	const exitosas = fuente.filter((e) => e.estado === 'Exitoso').length;
	const conError = fuente.filter((e) => e.estado === 'Error').length;

	return {
		tipo,
		resumenHistorico: { totalCorridas: fuente.length, exitosas, conError },
		ultimasEjecuciones: ultimas
	};
}