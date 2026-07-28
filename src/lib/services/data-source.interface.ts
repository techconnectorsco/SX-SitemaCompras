// data-source.interface.ts
export interface VentaMensual {
  articulo: string;
  año: number;
  mes: number;
  cantidad: number;
  monto?: number;
}

export interface Articulo {
  codigo: string;
  descripcion: string;
  categoria: string;
  linea: string;
  marca: string;
  proveedor: string;
  activo: boolean;
  // Nuevos campos de costos
  costo_prom_loc: number;
  costo_prom_dol: number;
  costo_ult_loc: number;
  costo_ult_dol: number;
  costo_std_loc: number;
  costo_std_dol: number;
  costo_comparativo: number;
  costo_fiscal: number;
  costo_prom_comparativo_loc: number; 
  //nuevos campos de fechas
  fecha_creacion: string | null;      // FCH_HORA_CREACION - Cuándo se creó el SKU
  ultima_salida: string | null;       // ULTIMA_SALIDA - Última salida
  ultimo_movimiento: string | null;   // ULTIMO_MOVIMIENTO - Último movimiento de cualquier tipo
}

export interface Existencia {
  articulo: string;
  existencia: number;
  transito: number;
}

export interface IDataSource {
  getArticulos(limit?: number): Promise<Articulo[]>;
  getExistencias(codigosArticulos: string[]): Promise<Map<string, Existencia>>;
  getExistenciasConExclusiones(
    codigosArticulos: string[], 
    bodegasExcluidas: string[] 
  ): Promise<Map<string, Existencia>>;
  getClasificacionesABC(codigosArticulos: string[]): Promise<Map<string, string>>;
  getVentas12Meses(codigosArticulos: string[]): Promise<Map<string, VentaMensual[]>>;
  close(): Promise<void>;
}