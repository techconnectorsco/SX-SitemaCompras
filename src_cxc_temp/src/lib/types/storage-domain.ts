// MODELOS QUE ZOD ESPERA (DOMINIO)
export interface MultimediaItem {
  url: string;
  tipo: 'imagen' | 'video';
  orden: number;
}

export interface DocumentoItem {
  url: string;
  nombre: string;
  tipo: string;
  tamano: number;
}