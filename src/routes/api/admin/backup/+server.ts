import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';
import { db } from '$lib/config/db-config';

// Directorio físico EN EL SERVIDOR (D:\Users\...\backups)
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DB_PATH = path.join(process.cwd(), 'local.db'); // Ajusta si tu DB tiene otro nombre

// Asegurar que existe la carpeta en el servidor
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// GET: Solo Listar (Sin opción de descarga)
export const GET: RequestHandler = async ({ locals }) => {
    const user = locals.user;
    if (!user || user.role !== 'ADMIN') return json({ error: 'No autorizado' }, { status: 403 });

    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .map(f => {
                const filePath = path.join(BACKUP_DIR, f);
                const stats = fs.statSync(filePath);
                return {
                    nombre: f,
                    // Convertimos bytes a MB para mostrar
                    tamaño: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                    fecha: stats.mtime,
                    // No enviamos la ruta completa por seguridad, no es necesaria en el front
                };
            })
            .sort((a, b) => b.fecha.getTime() - a.fecha.getTime()); // Ordenar por fecha desc

        return json({ 
            backups: files,
            // Enviamos la ruta solo como info visual para el admin
            directorio: BACKUP_DIR 
        });

    } catch (error) {
        return json({ error: 'Error leyendo directorio de backups' }, { status: 500 });
    }
};

// POST: Crear o Restaurar (Operaciones internas del servidor)
export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user || user.role !== 'ADMIN') return json({ error: 'No autorizado' }, { status: 403 });

    const { action, backupNombre } = await request.json();

    try {
        // --- CREAR BACKUP (Se guarda en disco del servidor) ---
        if (action === 'create') {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `backup_${timestamp}.db`;
            const filePath = path.join(BACKUP_DIR, fileName);

            console.log(`[Backup] Generando respaldo local en: ${filePath}`);
            
            // API Nativa de SQLite: copia segura mientras la app sigue corriendo
            await db.backup(filePath);

            return json({ 
                exito: true, 
                mensaje: 'Respaldo guardado en el servidor correctamente'
            });
        }

        // --- RESTAURAR (Sobrescribe la DB del servidor) ---
        if (action === 'restore' && backupNombre) {
            // Validamos que el nombre sea solo el nombre de archivo (evitar ../../hack)
            const safeName = path.basename(backupNombre);
            const backupPath = path.join(BACKUP_DIR, safeName);

            if (!fs.existsSync(backupPath)) {
                return json({ error: 'El archivo no existe en el servidor' }, { status: 404 });
            }

            // 1. Crear backup de emergencia automático
            const emergencyName = `EMERGENCY_AUTO_${Date.now()}.db`;
            await db.backup(path.join(BACKUP_DIR, emergencyName));

            // 2. Intentar copiar el backup sobre la DB actual
            try {
                fs.copyFileSync(backupPath, DB_PATH);
            } catch (copyError) {
                console.error('Error bloqueo DB:', copyError);
                return json({ 
                    error: 'La base de datos está en uso. Reinicia PM2 para liberar el archivo y vuelve a intentar.',
                    code: 'DB_LOCKED'
                }, { status: 500 });
            }

            return json({ 
                exito: true, 
                mensaje: 'Restauración aplicada. El servicio debe reiniciarse.' 
            });
        }

        return json({ error: 'Acción no válida' }, { status: 400 });

    } catch (error) {
        console.error('Error Backup API:', error);
        return json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};