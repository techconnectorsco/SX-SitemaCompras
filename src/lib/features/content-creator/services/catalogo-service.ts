import db from '$lib/config/db-config';
import type { Marca, Formato, Audiencia, RedSocial, Cuenta, CatalogosResponse } from '../types';

export class CatalogoService {
    static getAllMarcas(): Marca[] {
        return db.prepare('SELECT * FROM marcas WHERE deleted_at IS NULL').all() as Marca[];
    }

    static getAllFormatos(): Formato[] {
        return db.prepare('SELECT * FROM formatos WHERE deleted_at IS NULL').all() as Formato[];
    }

    static getAllAudiencias(): Audiencia[] {
        return db.prepare('SELECT * FROM audiencias WHERE deleted_at IS NULL').all() as Audiencia[];
    }

    static getAllRedes(): RedSocial[] {
        return db.prepare('SELECT * FROM redes_sociales WHERE deleted_at IS NULL').all() as RedSocial[];
    }

    static getAllCuentas(): Cuenta[] {
        return db.prepare('SELECT * FROM cuentas WHERE deleted_at IS NULL').all() as Cuenta[];
    }

    static getAllCatalogos(): CatalogosResponse {
        return {
            marcas: this.getAllMarcas(),
            formatos: this.getAllFormatos(),
            audiencias: this.getAllAudiencias(),
            redes: this.getAllRedes(),
            cuentas: this.getAllCuentas()
        };
    }
}
