import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'app.db'));


export function runSeedCatalogos() {
    console.log('[seed] 🌱 Iniciando seeding de catálogos de Content Creator...');

    // 1. Marcas
    const marcasStmt = db.prepare(`
        INSERT OR IGNORE INTO marcas (nombre, prompt_sistema)
        VALUES (?, ?)
    `);

    const marcas = [
        ['HP', 'Actúa como experto en la marca HP. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
        ['DELL', 'Actúa como experto en la marca DELL. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
        ['ASUS', 'Actúa como experto en la marca ASUS. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
        ['ACER', 'Actúa como experto en la marca ACER. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
        ['EPSON', 'Actúa como experto en la marca EPSON. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
        ['CANON', 'Actúa como experto en la marca CANON. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
        ['BROTHER', 'Actúa como experto en la marca BROTHER. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.'],
        ['LENOVO', 'Actúa como experto en la marca LENOVO. Tono técnico y profesional, enfocado en tecnología, rendimiento y soporte técnico confiable para empresas y profesionales.']
    ];

    let marcasInserted = 0;
    for (const m of marcas) {
        const info = marcasStmt.run(m[0], m[1]);
        marcasInserted += info.changes;
    }
    console.log(`[seed] Marcas insertadas: ${marcasInserted}`);

    // 2. Formatos
    const formatosStmt = db.prepare(`
        INSERT OR IGNORE INTO formatos (nombre, aspect_ratio, max_size_mb, max_duracion_sec)
        VALUES (?, ?, ?, ?)
    `);

    const formatos = [
        ['Vertical (4:5)', '4:5', 30, null],
        ['Cuadrado (1:1)', '1:1', 30, null],
        ['Historia / Reel (9:16)', '9:16', 250, 90],
        ['Horizontal (16:9)', '16:9', 30, null]
    ];

    let formatosInserted = 0;
    for (const f of formatos) {
        const info = formatosStmt.run(f[0], f[1], f[2], f[3]);
        formatosInserted += info.changes;
    }
    console.log(`[seed] Formatos insertados: ${formatosInserted}`);

    // 3. Audiencias
    const audienciasStmt = db.prepare(`
        INSERT OR IGNORE INTO audiencias (nombre)
        VALUES (?)
    `);

    const audiencias = [
        ['Amplio'],
        ['Empresas y Corporativo'],
        ['Hogar y Oficina'],
        ['Profesionales de TI'],
        ['Educación y Gobierno']
    ];

    let audienciasInserted = 0;
    for (const a of audiencias) {
        const info = audienciasStmt.run(a[0]);
        audienciasInserted += info.changes;
    }
    console.log(`[seed] Audiencias insertadas: ${audienciasInserted}`);

    // 4. Redes Sociales
    const redesStmt = db.prepare(`
        INSERT OR IGNORE INTO redes_sociales (nombre)
        VALUES (?)
    `);

    const redes = [
        ['Facebook'],
        ['Instagram'],
        ['Sitio Web (Blog)'],
        ['SharePoint']
    ];

    let redesInserted = 0;
    for (const r of redes) {
        const info = redesStmt.run(r[0]);
        redesInserted += info.changes;
    }
    console.log(`[seed] Redes sociales insertadas: ${redesInserted}`);

    // 5. Cuentas del cliente
    const cuentasStmt = db.prepare(`
        INSERT OR IGNORE INTO cuentas (nombre)
        VALUES (?)
    `);

    const cuentas = [
        ['SX'],
        ['Sx'],
        ['Outlet'],
        ['Retail Pro']
    ];

    let cuentasInserted = 0;
    for (const c of cuentas) {
        const info = cuentasStmt.run(c[0]);
        cuentasInserted += info.changes;
    }
    console.log(`[seed] Cuentas insertadas: ${cuentasInserted}`);

    console.log('[seed] ✅ Seeding de catálogos completado.');
}

// Ejecutar automáticamente si es llamado directamente
if (process.argv[1] && process.argv[1].includes('seed-catalogos.ts')) {
    runSeedCatalogos();
}
