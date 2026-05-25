// ==============================================================
// TIPOS COMPARTILHADOS - types.ts
// ==============================================================
// Centraliza todas as interfaces e tipos usados por múltiplas
// telas e serviços, evitando duplicação de definições.

// ==============================================================
// TIPOS DE QR CODE
// ==============================================================
// Discriminador usado para classificar o conteúdo do QR Code
// e definir qual fluxo visual/lógico será executado.
export type TipoQRCode = 'produto' | 'patrimonio' | 'geolocalizacao' | 'generico';

// ==============================================================
// INTERFACE: ScannedRecord (Persistência Local)
// ==============================================================
// Formato de cada registro salvo no AsyncStorage (@scanned_qrcodes).
// Antes era definida separadamente em ConfirmationScreen e HistoryScreen.
export interface ScannedRecord {
  id: number;            // Date.now() — timestamp como ID único
  data: string;          // Dado do QR Code ou "Latitude: X\nLongitude: Y"
  timestamp: string;     // ISO string (new Date().toISOString())
  urlOriginal?: string;  // Presente SOMENTE em registros de geolocalização
  tipo?: TipoQRCode;     // Discriminador — ausente em registros legados (= 'generico')
}

// ==============================================================
// INTERFACE: ProdutoQRData
// ==============================================================
// Formato esperado do JSON contido em um QR Code de produto.
// Exemplo: {"tipo":"produto","id_produto":1,"nome":"Teclado Mecânico","preco":299.90}
export interface ProdutoQRData {
  tipo: 'produto';
  id_produto: number;
  nome: string;
  preco: number;
}

// ==============================================================
// INTERFACE: PatrimonioQRData
// ==============================================================
// Formato esperado do JSON contido em um QR Code de patrimônio.
// Exemplo: {"tipo":"patrimonio","id_equipamento":3}
export interface PatrimonioQRData {
  tipo: 'patrimonio';
  id_equipamento: number;
}
