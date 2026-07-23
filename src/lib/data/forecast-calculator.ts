//D:\Users\Usuario\Desktop\VedovaWEB\VYOWEB\src\lib\data\forecast-calculator.ts
/**
 * @module ForecastCalculator
 * @description Cálculos estadísticos para forecast de compras
 * 
 * 🔴 IMPORTANTE: Estos cálculos replican las fórmulas del Excel original
 * Cada función incluye la fórmula Excel equivalente en los comentarios
 * 
 * ⚠️  Los cálculos usan MOCK DATA de ventas-mensuales.csv
 * ✅ PRODUCCIÓN: Conectar a datos reales de Exactus BI
 */

/**
 * Calcular suma de ventas de últimos N meses
 * 
 * Excel: =SUMA(EW5:FH5) donde EW5:FH5 son los últimos 12 meses
 */
export function calcularVentaUltimos12Meses(ventasMensuales: number[]): number {
  return ventasMensuales.reduce((sum, venta) => sum + venta, 0);
}

/**
 * Calcular promedio de ventas de últimos N meses
 * 
 * Excel: =PROMEDIO(EW5:FH5)
 */
export function calcularPromedioMeses(ventas: number[]): number {
  if (ventas.length === 0) return 0;
  const suma = ventas.reduce((sum, v) => sum + v, 0);
  return suma / ventas.length;
}

/**
 * Calcular promedio ajustado
 * 
 * Excel: =MAX(prom6meses, prom12meses)
 * Toma el mayor entre promedio de 6 meses y promedio de 12 meses
 */
export function calcularPromedioAjustado(prom6meses: number, prom12meses: number): number {
  return Math.max(prom6meses, prom12meses);
}

/**
 * Calcular desviación estándar
 * 
 * Excel: =DESVEST(EW5:FH5)
 * Usa desviación estándar muestral (n-1)
 */
export function calcularDesviacionEstandar(ventas: number[]): number {
  if (ventas.length <= 1) return 0;
  
  const promedio = calcularPromedioMeses(ventas);
  const sumaCuadrados = ventas.reduce((sum, v) => {
    const diff = v - promedio;
    return sum + (diff * diff);
  }, 0);
  
  const varianza = sumaCuadrados / (ventas.length - 1);
  return Math.sqrt(varianza);
}

/**
 * Calcular Coeficiente de Variación (C.V.)
 * 
 * Excel: =SI.ERROR(desviacion/(promedio/1.2);0)
 * C.V. = Desviación Estándar / (Promedio / 1.2)
 */
export function calcularCoeficienteVariacion(desviacion: number, promedio12: number): number {
  if (promedio12 === 0) return 0;
  const denominador = promedio12 / 1.2;
  if (denominador === 0) return 0;
  return desviacion / denominador;
}

/**
 * Obtener factor de seguridad según clasificación ABC
 * 
 * Excel: =BUSCARV(clasificacionABC, FactorSeguridad!A:H, 8, FALSO)
 */
export function obtenerFactorSeguridad(
  clasificacionABC: string,
  tablaFactores: Map<string, number>
): number {
  return tablaFactores.get(clasificacionABC) || 0;
}

/**
 * Calcular stock de seguridad
 * 
 * Excel: =factorSeguridad * promedioAjustado
 */
export function calcularStockSeguridad(factorSeguridad: number, promedioAjustado: number): number {
  return factorSeguridad * promedioAjustado;
}

/**
 * Calcular referencia para pedido COURIER (2 meses)
 * 
 * Excel: =promedioAjustado * 2
 */
export function calcularReferenciaCourier(promedioAjustado: number): number {
  return promedioAjustado * 2;
}

/**
 * Calcular referencia para pedido AÉREO (3 meses + stock seguridad)
 * 
 * Excel: =(promedioAjustado * 3) + stockSeguridad
 */
export function calcularReferenciaAereo(promedioAjustado: number, stockSeguridad: number): number {
  return (promedioAjustado * 3) + stockSeguridad;
}

/**
 * Calcular referencia para pedido MARÍTIMO (5 meses + stock seguridad)
 * 
 * Excel: =(promedioAjustado * 5) + stockSeguridad
 */
export function calcularReferenciaMaritimo(promedioAjustado: number, stockSeguridad: number): number {
  return (promedioAjustado * 5) + stockSeguridad;
}

/**
 * Calcular cantidad a pedir COURIER
 * 
 * Excel celda 1: =existencia + transito - referenciaCourier
 * Excel celda 2: =SI(celda1 < 0, "PEDIR COURIER", "")
 * Excel celda 3: =SI(celda1 > 0, 0, celda1)
 * 
 * Retorna: { cantidad, mensaje, cantidadFinal }
 */
export function calcularCantidadCourier(
  existencia: number,
  transito: number,
  referenciaCourier: number
): { cantidad: number; mensaje: string; cantidadFinal: number } {
  const cantidad = existencia + transito - referenciaCourier;
  const mensaje = cantidad < 0 ? 'PEDIR COURIER' : '';
  const cantidadFinal = cantidad > 0 ? 0 : cantidad;
  
  return { cantidad, mensaje, cantidadFinal };
}

/**
 * Calcular cantidad a pedir AÉREO
 * 
 * Excel celda 1: =existencia + transito - referenciaAereo - cantidadCourier
 * Excel celda 2: =SI(celda1 < 0, "PEDIR AEREO", "")
 * Excel celda 3: =SI(celda1 > 0, 0, celda1)
 */
export function calcularCantidadAereo(
  existencia: number,
  transito: number,
  referenciaAereo: number,
  cantidadCourier: number
): { cantidad: number; mensaje: string; cantidadFinal: number } {
  const cantidad = existencia + transito - referenciaAereo - cantidadCourier;
  const mensaje = cantidad < 0 ? 'PEDIR AEREO' : '';
  const cantidadFinal = cantidad > 0 ? 0 : cantidad;
  
  return { cantidad, mensaje, cantidadFinal };
}

/**
 * Obtener ventas de últimos N meses para un artículo
 * 
 * 🔴 USANDO MOCK DATA de ventas-mensuales.csv
 * ✅ PRODUCCIÓN: Query a tabla de ventas reales
 * 
 * Query recomendado:
 * SELECT Cantidad 
 * FROM EXACTUS.VEDOVA.Produsoft_SoftlandBI_FA_FacturaLineaMasCompras
 * WHERE ArticuloCodigo = @codigo
 *   AND YEAR(Fecha) >= YEAR(DATEADD(month, -N, GETDATE()))
 * ORDER BY AnoFactura DESC, MesFactura DESC
 */
export function obtenerVentasUltimosMeses(
  ventasMensuales: any[],
  articulo: string,
  ultimosMeses: number
): number[] {
  const hoy = new Date();
  const añoActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const ventas: number[] = [];

  for (let i = 0; i < ultimosMeses; i++) {
    let mes = mesActual - i;
    let año = añoActual;

    while (mes <= 0) {
      mes += 12;
      año -= 1;
    }

    const venta = ventasMensuales.find(v =>
      v.ArticuloCodigo === articulo &&
      parseInt(v.Año) === año &&
      parseInt(v.Mes) === mes
    );

    const cantidad = parseFloat(venta?.Cantidad || '0');
    ventas.unshift(cantidad); // Agregar al inicio para orden cronológico
  }

  return ventas;
}

/**
 * Obtener ventas mensuales de un rango específico (para los 60 meses en tabla)
 * 
 * 🔴 USANDO MOCK DATA
 * ✅ PRODUCCIÓN: Query con rango de fechas específico
 */
export function obtenerVentasPorMes(
  ventasMensuales: any[],
  articulo: string,
  añoInicio: number,
  mesInicio: number,
  cantidadMeses: number
): number[] {
  const ventas: number[] = [];
  
  let año = añoInicio;
  let mes = mesInicio;
  
  for (let i = 0; i < cantidadMeses; i++) {
    const venta = ventasMensuales.find(v =>
      v.ArticuloCodigo === articulo &&
      parseInt(v.Año) === año &&
      parseInt(v.Mes) === mes
    );
    
    const cantidad = parseFloat(venta?.Cantidad || '0');
    ventas.push(cantidad);
    
    // Avanzar al siguiente mes
    mes++;
    if (mes > 12) {
      mes = 1;
      año++;
    }
  }
  
  return ventas;
}