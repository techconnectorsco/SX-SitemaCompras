import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FichasTecnicasService } from '$lib/features/content-creator/services/fichas-tecnicas-service';
import type { FichaTecnica } from '$lib/features/content-creator/services/fichas-tecnicas-service';

function withManagementPermission(
	ficha: FichaTecnica,
	userId: string
): Omit<FichaTecnica, 'user_id'> & { can_manage: boolean } {
	const { user_id, ...sharedFicha } = ficha;
	return { ...sharedFicha, can_manage: user_id === userId };
}

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

		const id = parseInt(params.id, 10);
		if (isNaN(id)) return json({ error: 'ID inválido' }, { status: 400 });

		const body = await request.json();
		const updatedFicha = FichasTecnicasService.updateFicha(id, locals.user.id, {
			nombreProducto: body.nombreProducto,
			descripcion: body.descripcion,
			especificacionesTexto: body.especificacionesTexto
		});

		return json({ success: true, ficha: withManagementPermission(updatedFicha, locals.user.id) });
	} catch (err: any) {
		console.error('[API PUT fichas-tecnicas/[id]] Error:', err);
		return json({ error: err.message || 'Error al actualizar la ficha técnica' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

		const id = parseInt(params.id, 10);
		if (isNaN(id)) return json({ error: 'ID inválido' }, { status: 400 });

		const success = FichasTecnicasService.deleteFicha(id, locals.user.id);
		if (!success)
			return json({ error: 'No se pudo eliminar o no fue encontrada' }, { status: 404 });

		return json({ success: true });
	} catch (err: any) {
		console.error('[API DELETE fichas-tecnicas/[id]] Error:', err);
		return json({ error: err.message || 'Error al eliminar la ficha técnica' }, { status: 500 });
	}
};
