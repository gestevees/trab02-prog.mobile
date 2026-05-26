export interface Coordenadas {
  latitude: string;
  longitude: string;
}

/**
 * Analisa a URL do QR Code e extrai Latitude e Longitude usando Regex
 */
export const extrairCoordenadas = (url: string): Coordenadas | null => {
  const regex = /[@=](-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = url.match(regex);

  if (match && match[1] && match[2]) {
    return {
      latitude: match[1],
      longitude: match[2],
    };
  }
  
  return null;
};