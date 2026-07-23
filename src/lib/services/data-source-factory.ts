// Importa la variable desde el módulo dinámico de SvelteKit
import { env } from '$env/dynamic/private'; 
import type { IDataSource } from './data-source.interface';
import { CSVDataSource } from './data-source-csv';
import { SQLServerDataSource } from './data-source-sqlserver.server';

export function createDataSource(): IDataSource {
  
  const mode = env.DATA_SOURCE_MODE || 'sqlserver';
  
  console.log(`[DataSource Factory] 📊 MODO DETECTADO: ${mode}`);

  if (mode === 'sqlserver') {
    return new SQLServerDataSource();
  } else {
    return new CSVDataSource();
  }
}
