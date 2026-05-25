// ==============================================================
// SERVIÇO DE VALIDAÇÃO - validationService.ts
// ==============================================================
// Centraliza a lógica de classificação dos QR Codes escaneados.
// Antes, essa lógica estava espalhada no useEffect do ConfirmationScreen,
// usando try/catch do JSON.parse como mecanismo de branching.
// Agora fica isolada, testável e reutilizável.

import {
  TipoQRCode,
  ProdutoQRData,
  PatrimonioQRData,
} from './types';

// ==============================================================
// INTERFACE: Resultado da classificação
// ==============================================================
// Retorno padronizado da função classificarQRCode.
// 'dadosParsed' só é preenchido quando o QR Code é JSON válido
// (patrimônio ou produto). Para geolocalização e genérico, é undefined.
export interface ResultadoClassificacao {
  tipo: TipoQRCode;
  dadosParsed?: ProdutoQRData | PatrimonioQRData;
}

// ==============================================================
// FUNÇÃO PRINCIPAL: classificarQRCode
// ==============================================================
// Recebe o texto bruto lido pelo scanner e determina qual tipo
// de QR Code ele representa, seguindo a ordem de prioridade:
//
//   1. Tenta JSON.parse:
//      a) tipo === "patrimonio" + id_equipamento → PATRIMÔNIO
//      b) tipo === "produto" + id_produto + nome + preco → PRODUTO
//      c) outro JSON qualquer → GENÉRICO
//   2. Se JSON.parse falha (não é JSON):
//      a) Regex /@|=/ encontra coordenadas → GEOLOCALIZAÇÃO
//      b) Sem match → GENÉRICO
export const classificarQRCode = (data: string): ResultadoClassificacao => {
  // -------------------------------------------------------
  // PASSO 1: Tentar interpretar como JSON
  // -------------------------------------------------------
  try {
    const parsed = JSON.parse(data);

    // Verifica se é um QR Code de Patrimônio/Estoque
    if (parsed.tipo === 'patrimonio' && parsed.id_equipamento) {
      return {
        tipo: 'patrimonio',
        dadosParsed: parsed as PatrimonioQRData,
      };
    }

    // Verifica se é um QR Code de Produto
    if (
      parsed.tipo === 'produto' &&
      parsed.id_produto &&
      parsed.nome &&
      typeof parsed.preco === 'number'
    ) {
      return {
        tipo: 'produto',
        dadosParsed: parsed as ProdutoQRData,
      };
    }

    // JSON válido mas não reconhecido como tipo específico → genérico
    return { tipo: 'generico' };
  } catch {
    // -------------------------------------------------------
    // PASSO 2: Não é JSON — verificar se é URL de geolocalização
    // -------------------------------------------------------
    // Regex flexível: captura coordenadas após '@' ou '='
    // Exemplos que casam:
    //   https://maps.google.com/?q=@-23.5505,-46.6333
    //   https://www.google.com/maps/@-23.5505,-46.6333,15z
    //   https://maps.app.goo.gl/...?q=-23.5505,-46.6333
    const geoRegex = /[@=](-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = data.match(geoRegex);

    if (match) {
      return { tipo: 'geolocalizacao' };
    }

    // Nem JSON, nem geolocalização → genérico
    return { tipo: 'generico' };
  }
};
