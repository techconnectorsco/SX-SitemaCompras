/**
 * Endpoint de prueba para verificar cálculos vs Excel
 * GET /api/compras/test?limit=100
 * GET /api/compras/test?codigo=028-001-001&limit=100
 * 
 * 🔴 Solo para desarrollo - Eliminar en producción
 */

import { json } from '@sveltejs/kit';
import { getAllSKUsForCompras } from '$lib/services/compras-service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const codigoEspecifico = url.searchParams.get('codigo');
  const limitStr = url.searchParams.get('limit');
  const limit = limitStr ? parseInt(limitStr) : 100; // DEFAULT: 100 SKUs
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST: Verificación de Cálculos de Forecast');
  console.log(`⚠️  Limitado a ${limit} SKUs para evitar problemas de memoria`);
  console.log('='.repeat(80) + '\n');
  
  try {
    // ===== PROCESAR SOLO X SKUs =====
    const allSKUs = getAllSKUsForCompras(limit);
    
    if (codigoEspecifico) {
      // Buscar SKU específico
      const sku = allSKUs.find(s => s.codigo === codigoEspecifico);
      
      if (!sku) {
        console.log(`❌ SKU "${codigoEspecifico}" no encontrado en los primeros ${limit} SKUs\n`);
        console.log(`💡 Intenta aumentar el límite: ?codigo=${codigoEspecifico}&limit=500\n`);
        return json({
          success: false,
          error: 'SKU not found',
          sugerencia: `El SKU puede estar más adelante. Prueba con ?limit=500 o más`,
          disponibles: allSKUs.slice(0, 10).map(s => s.codigo)
        }, { status: 404 });
      }
      
      // Mostrar detalle completo
      console.log(`📋 SKU: ${sku.codigo}`);
      console.log('─'.repeat(80));
      console.log(`Descripción:     ${sku.descripcion}`);
      console.log(`Marca:           ${sku.marca}`);
      console.log(`Línea:           ${sku.linea}`);
      console.log(`ABC:             ${sku.abc}`);
      console.log(`ABC Rotación:    ${sku.abcRotacionFrecuencia}`);
      console.log(`Activo:          ${sku.activo}`);
      console.log(`Proveedor:       ${sku.codigoProveedor}`);
      console.log(`Lead Time:       ${sku.leadTime} días`);
      console.log(`Meses Pedido:    ${sku.mesesPedido}`);
      
      console.log('\n📊 INVENTARIO:');
      console.log('─'.repeat(80));
      console.log(`Existencia:      ${sku.existencia.toFixed(0)} unidades`);
      console.log(`Tránsito:        ${sku.transito.toFixed(0)} unidades`);
      
      console.log('\n📈 VENTAS (Últimos 12 Meses):');
      console.log('─'.repeat(80));
      sku.ventas12Meses.forEach((venta, i) => {
        console.log(`  Mes ${(i+1).toString().padStart(2)}: ${venta.toFixed(0).padStart(6)} unidades`);
      });
      
      console.log('\n📊 ESTADÍSTICAS:');
      console.log('─'.repeat(80));
      console.log(`Frecuencia 12M:           ${sku.frecuenciaVentas12M} meses con venta`);
      console.log(`Venta Total 12M:          ${sku.ventaUltimos12Meses.toFixed(0)} unidades`);
      console.log(`Promedio 12M:             ${sku.promedioUltimos12Meses.toFixed(2)} unidades/mes`);
      console.log(`Promedio 6M (temporada):  ${sku.promedio6MesesTemporada.toFixed(2)} unidades/mes`);
      console.log(`Promedio Ajustado:        ${sku.promedioAjustado.toFixed(2)} unidades/mes`);
      console.log(`Desviación Estándar:      ${sku.desviacionEstandar.toFixed(2)}`);
      console.log(`Coef. Variación (C.V.):   ${sku.coeficienteVariacion.toFixed(4)}`);
      
      console.log('\n🎯 FORECAST:');
      console.log('─'.repeat(80));
      console.log(`Factor Seguridad:         ${sku.factorSeguridad.toFixed(4)}`);
      console.log(`Stock Seguridad:          ${sku.stockSeguridad.toFixed(0)} unidades`);
      console.log(`Ref. Pedido COURIER:      ${sku.referenciaPedidoCourier.toFixed(0)} unidades (2 meses)`);
      console.log(`Ref. Pedido AÉREO:        ${sku.referenciaPedidoAereo.toFixed(0)} unidades (3 meses + stock seg)`);
      console.log(`Ref. Pedido MARÍTIMO:     ${sku.referenciaPedidoMaritimo.toFixed(0)} unidades (5 meses + stock seg)`);
      
      console.log('\n📦 CANTIDADES A PEDIR:');
      console.log('─'.repeat(80));
      console.log(`COURIER:  ${sku.cantidadFinalCourier.toFixed(0).padStart(6)} unidades  ${sku.mensajeCourier || '✅ OK'}`);
      console.log(`AÉREO:    ${sku.cantidadFinalAereo.toFixed(0).padStart(6)} unidades  ${sku.mensajeAereo || '✅ OK'}`);
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ DATOS LISTOS PARA COMPARAR CON EXCEL');
      console.log('='.repeat(80) + '\n');
      
      return json({
        success: true,
        sku: {
          codigo: sku.codigo,
          descripcion: sku.descripcion,
          marca: sku.marca,
          linea: sku.linea,
          abc: sku.abc,
          abcRotacion: sku.abcRotacionFrecuencia,
          activo: sku.activo,
          
          inventario: {
            existencia: Math.round(sku.existencia),
            transito: Math.round(sku.transito)
          },
          
          ventas12Meses: sku.ventas12Meses,
          
          estadisticas: {
            frecuencia12M: sku.frecuenciaVentas12M,
            ventaTotal12M: Math.round(sku.ventaUltimos12Meses),
            promedio12M: Number(sku.promedioUltimos12Meses.toFixed(2)),
            promedio6M: Number(sku.promedio6MesesTemporada.toFixed(2)),
            promedioAjustado: Number(sku.promedioAjustado.toFixed(2)),
            desviacionEstandar: Number(sku.desviacionEstandar.toFixed(2)),
            coeficienteVariacion: Number(sku.coeficienteVariacion.toFixed(4))
          },
          
          forecast: {
            factorSeguridad: Number(sku.factorSeguridad.toFixed(4)),
            stockSeguridad: Math.round(sku.stockSeguridad),
            referenciaCourier: Math.round(sku.referenciaPedidoCourier),
            referenciaAereo: Math.round(sku.referenciaPedidoAereo),
            referenciaMaritimo: Math.round(sku.referenciaPedidoMaritimo)
          },
          
          cantidades: {
            courier: Math.round(sku.cantidadFinalCourier),
            mensajeCourier: sku.mensajeCourier,
            aereo: Math.round(sku.cantidadFinalAereo),
            mensajeAereo: sku.mensajeAereo
          }
        }
      });
      
    } else {
      // Mostrar primeros 10 SKUs de los que se procesaron
      const first10 = allSKUs.slice(0, 10);
      
      console.log(`✅ Total SKUs procesados: ${allSKUs.length}\n`);
      console.log('📋 PRIMEROS 10 SKUs:\n');
      
      first10.forEach((sku, index) => {
        console.log(`[${(index + 1).toString().padStart(2)}] ${sku.codigo.padEnd(20)} - ${sku.descripcion.substring(0, 40)}`);
        console.log(`     ABC: ${sku.abc} | Rotación: ${sku.abcRotacionFrecuencia} | Exist: ${sku.existencia.toFixed(0)} | Prom: ${sku.promedioAjustado.toFixed(2)}`);
      });
      
      console.log('\n' + '='.repeat(80));
      console.log('💡 Para ver detalle de un SKU específico:');
      console.log(`   GET /api/compras/test?codigo=CODIGO_SKU&limit=${limit}`);
      console.log('='.repeat(80) + '\n');
      
      return json({
        success: true,
        total: allSKUs.length,
        limitApplied: limit,
        sample: first10.map(sku => ({
          codigo: sku.codigo,
          descripcion: sku.descripcion.substring(0, 50),
          abc: sku.abc,
          existencia: Math.round(sku.existencia),
          promedioAjustado: Number(sku.promedioAjustado.toFixed(2))
        })),
        instrucciones: `Para ver detalle completo: GET /api/compras/test?codigo=CODIGO_SKU&limit=${limit}`
      });
    }
    
  } catch (error) {
    console.error('\n❌ ERROR en TEST:', error);
    console.error('\n' + '='.repeat(80) + '\n');
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
};
