/**
 * Data Source usando CSVs locales
 * ✅ CORREGIDO: Usa separador ';' consistente con tus archivos
 * ✅ CORREGIDO: Limpieza de comillas y espacios
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { IDataSource, Articulo, Existencia, VentaMensual } from './data-source.interface';
import { db } from '$lib/config/db-config';

const CSV_DIR = join(process.cwd(), 'src/lib/data/csv');

export class CSVDataSource implements IDataSource {
  private ventasCargaronEnBD = false;
  
  constructor() {
    console.log('[CSV DataSource] 📂 Usando datos desde CSVs locales');
  }

  // Helper para limpiar valores CSV (quita comillas y espacios)
  private limpiarValor(valor: string | undefined): string {
    if (!valor) return '';
    return valor.trim().replace(/^"|"$/g, '');
  }

  async getArticulos(limit?: number): Promise<Articulo[]> {
    const content = readFileSync(join(CSV_DIR, 'articulos.csv'), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    const articulos: Articulo[] = [];
    const maxRows = limit || lines.length;
    
    for (let i = 1; i < Math.min(maxRows + 1, lines.length); i++) {
      const values = lines[i].split(';');
      
      articulos.push({
        codigo: this.limpiarValor(values[0]),
        descripcion: this.limpiarValor(values[1]),
        linea: this.limpiarValor(values[5]),
        marca: this.limpiarValor(values[6]),
        proveedor: this.limpiarValor(values[8]),
        activo: this.limpiarValor(values[9]) === 'S' || this.limpiarValor(values[9]) === '1'
      });
    }
    return articulos;
  }

  async getExistencias(codigosArticulos: string[]): Promise<Map<string, Existencia>> {
    const content = readFileSync(join(CSV_DIR, 'existencia.csv'), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const existenciasMap = new Map<string, Existencia>();
    const codigosSet = new Set(codigosArticulos);
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      const codigo = this.limpiarValor(values[0]);
      
      if (!codigo || !codigosSet.has(codigo)) continue;
      
      const existenciaActual = parseFloat(values[2]?.replace(',', '.') || '0');
      const transito = parseFloat(values[3]?.replace(',', '.') || '0');
      
      if (!existenciasMap.has(codigo)) {
        existenciasMap.set(codigo, { articulo: codigo, existencia: 0, transito: 0 });
      }
      
      const existing = existenciasMap.get(codigo)!;
      existing.existencia += existenciaActual;
      existing.transito += transito;
    }
    return existenciasMap;
  }

  async getClasificacionesABC(codigosArticulos: string[]): Promise<Map<string, string>> {
    const content = readFileSync(join(CSV_DIR, 'consultas-mg.csv'), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const abcMap = new Map<string, string>();
    const codigosSet = new Set(codigosArticulos);
    
    for (const line of lines) {
      // Intenta tab primero, si no, punto y coma
      let parts = line.split('\t');
      if (parts.length < 2) parts = line.split(';');

      if (parts.length >= 2) {
        const codigo = this.limpiarValor(parts[0]);
        const abc = this.limpiarValor(parts[1]);
        if (codigo && abc && codigosSet.has(codigo)) {
          abcMap.set(codigo, abc);
        }
      }
    }
    return abcMap;
  }

  async getVentas12Meses(codigosArticulos: string[]): Promise<Map<string, VentaMensual[]>> {
    const content = readFileSync(join(CSV_DIR, 'ventas-mensuales.csv'), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const ventasMap = new Map<string, VentaMensual[]>();
    const codigosSet = new Set(codigosArticulos);
    const hoy = new Date();
    const limite = new Date(hoy.getFullYear(), hoy.getMonth() - 12, 1);
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      const codigo = this.limpiarValor(values[0]);
      
      if (!codigo || !codigosSet.has(codigo)) continue;
      
      const año = parseInt(values[1]) || 0;
      const mes = parseInt(values[2]) || 0;
      const cantidad = parseFloat(values[3]?.replace(',', '.') || '0');
      const monto = parseFloat(values[4]?.replace(',', '.') || '0');
      
      const fechaVenta = new Date(año, mes - 1, 1);
      if (fechaVenta < limite) continue;
      
      if (!ventasMap.has(codigo)) ventasMap.set(codigo, []);
      ventasMap.get(codigo)!.push({ articulo: codigo, año, mes, cantidad, monto });
    }
    return ventasMap;
  }

  async cargarVentasHistoricasEnBD(): Promise<number> {
    if (this.ventasCargaronEnBD) return 0;

    try {
      console.log('[CSV] 📊 INICIANDO CARGA HISTÓRICA...');
      
      // 1. CARGAR SKUS (Necesario para Foreign Keys)
      const articulosContent = readFileSync(join(CSV_DIR, 'articulos.csv'), 'utf-8');
      const artLines = articulosContent.split('\n').filter(l => l.trim());
      
      db.prepare('DELETE FROM skus').run();
      const insertSkuStmt = db.prepare('INSERT OR IGNORE INTO skus (codigo) VALUES (?)');

      const skusTransaction = db.transaction((lines: string[]) => {
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';'); // Separador ;
            const codigo = this.limpiarValor(cols[0]);
            if (codigo) {
                insertSkuStmt.run(codigo);
                count++;
            }
        }
        return count;
      });
      const totalSkus = skusTransaction(artLines);
      console.log(`[CSV] ✅ SKUs base insertados: ${totalSkus}`);

      // 2. CARGAR VENTAS
      const content = readFileSync(join(CSV_DIR, 'ventas-mensuales.csv'), 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      db.prepare('DELETE FROM ventas_mensuales').run();
      
      // Mapeo automático de columnas
      const headers = lines[0].split(';').map(h => this.limpiarValor(h).toLowerCase());
      console.log(`[CSV] Encabezados detectados: ${headers.join(' | ')}`);
      
      // Buscar índices (flexible)
      const idxCodigo = headers.findIndex(h => h.includes('codigo') || h.includes('art'));
      const idxAno = headers.findIndex(h => h.includes('año') || h.includes('ano') || h === 'year');
      const idxMes = headers.findIndex(h => h.includes('mes') || h === 'month');
      const idxCant = headers.findIndex(h => h.includes('cant') || h === 'qty');
      const idxMonto = headers.findIndex(h => h.includes('monto') || h.includes('venta'));

      // Verificar si encontró las columnas
      if (idxCodigo === -1 || idxAno === -1 || idxMes === -1) {
        console.error('[CSV] ❌ NO SE ENCONTRARON LAS COLUMNAS NECESARIAS EN ventas-mensuales.csv');
        console.error(`Indices detectados: Cod:${idxCodigo} Año:${idxAno} Mes:${idxMes}`);
        return 0;
      }

      const insertVentas = db.prepare(`
        INSERT INTO ventas_mensuales (sku_codigo, fecha, cantidad, monto, stock_promedio)
        VALUES (?, ?, ?, ?, 0)
      `);

      const ventasTransaction = db.transaction((rows: string[]) => {
        let insertados = 0;
        // Empezar en 1 para saltar header
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(';'); // SEPARADOR ;
          
          const codigo = this.limpiarValor(cols[idxCodigo]);
          const año = parseInt(cols[idxAno] || '0');
          const mes = parseInt(cols[idxMes] || '0');
          const cantidad = parseFloat((cols[idxCant] || '0').replace(',', '.'));
          const monto = parseFloat((cols[idxMonto] || '0').replace(',', '.'));

          if (codigo && año > 2000 && mes >= 1 && mes <= 12) {
             const fecha = `${año}-${mes.toString().padStart(2, '0')}-01`;
             try {
               insertVentas.run(codigo, fecha, cantidad, monto);
               insertados++;
             } catch (e) { /* Ignorar errores de FK puntuales */ }
          }
        }
        return insertados;
      });

      const totalVentas = ventasTransaction(lines);
      console.log(`[CSV] ✅ Ventas insertadas: ${totalVentas}`);
      
      this.ventasCargaronEnBD = true;
      return totalVentas;

    } catch (error) {
      console.error('[CSV] ❌ Error fatal:', error);
      throw error;
    }
  }

  async close(): Promise<void> { }
}