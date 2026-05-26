// ==============================================================
// SERVIÇO DE VALIDAÇÃO - validationService.ts
// ==============================================================
// Centraliza a lógica de classificação dos QR Codes escaneados.
// NOVA VERSÃO: Atua como um validador inteligente e flexível.
// Lê na ordem correta para não quebrar regras específicas (Mapas e IDs numéricos)
// e inclui adaptadores para conciliar os formatos exigidos pelo projeto.

import {
  TipoQRCode,
  ProdutoQRData,
  PatrimonioQRData,
} from './types';

// ==============================================================
// INTERFACE: Resultado da classificação
// ==============================================================
export interface ResultadoClassificacao {
  tipo: TipoQRCode;
  dadosParsed?: ProdutoQRData | PatrimonioQRData;
}

// ==============================================================
// FUNÇÃO PRINCIPAL: classificarQRCode
// ==============================================================
// Recebe o texto bruto lido pelo scanner e determina qual tipo
// de QR Code ele representa, seguindo a NOVA ordem de prioridade:
//
//   1. Regex /@|=/ encontra coordenadas → GEOLOCALIZAÇÃO
//   2. Texto contendo APENAS números → PATRIMÔNIO
//   3. Tenta JSON.parse:
//      a) Traduz o JSON do PDF para o formato da tela → PRODUTO
//      b) Formato exato da tela → PRODUTO / PATRIMÔNIO
//      c) Falha na validação de objeto → ERRO DE SEGURANÇA
//   4. Se tudo falhar ou der erro → GENÉRICO (Aviso na tela)
// ==============================================================
export const classificarQRCode = (data: string): ResultadoClassificacao => {

  // -------------------------------------------------------
  // PASSO 1: TENTA MAPA (ATIVIDADE 1 - GEOLOCALIZAÇÃO)
  // Lemos o mapa antes do JSON para evitar que a URL cause erros de conversão
  // -------------------------------------------------------
  const geoRegex = /[@=](-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = data.match(geoRegex);
  
  if (match) {
    return { tipo: 'geolocalizacao' };
  }

  // -------------------------------------------------------
  // PASSO 2: TENTA ESTOQUE/PATRIMÔNIO (ATIVIDADE 2 - APIS DE TERCEIROS)
  // O requisito é: "Lê o QR Code contendo apenas um ID (ex: 1002)"
  // -------------------------------------------------------
  const textoLimpo = data.trim();
  
  // Regex testa se a string contém EXATAMENTE E APENAS NÚMEROS:
  if (/^\d+$/.test(textoLimpo)) {
     return {
       tipo: 'patrimonio',
       // Cria um JSON artificial ("Adapter") para a tela aceitar o ID
       dadosParsed: {
         tipo: 'patrimonio',
         id_equipamento: textoLimpo 
       } as any 
     };
  }

  // -------------------------------------------------------
  // PASSO 3: TENTA JSON E VALIDAÇÃO DE SEGURANÇA (ATIVIDADES 3 E 4)
  // -------------------------------------------------------
  try {
    const parsed = JSON.parse(data);

    // SEGURANÇA EXTRA: Se não for um objeto real (ex: texto solto, array),
    // força o erro para cair no 'catch' e exibir a mensagem amigável.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error("Formato JSON inválido (não é um objeto de dados).");
    }

    // TRADUTOR DO CARRINHO (ATIVIDADE 4):
    // O PDF do projeto usa "nome", "descricao" e "valor".
    // A tela de confirmação exige "tipo", "id_produto", "nome" e "preco".
    if (parsed.nome && parsed.descricao && typeof parsed.valor === 'number') {
      return {
        tipo: 'produto',
        dadosParsed: {
          tipo: 'produto',
          id_produto: Date.now(), // Gera um ID provisório
          nome: parsed.nome,
          descricao: parsed.descricao,
          preco: parsed.valor // Traduz "valor" para "preco"
        } as any,
      };
    }

    // Mantém a compatibilidade caso gerem o JSON exato da tela de confirmação (Produto)
    if (
      parsed.tipo === 'produto' &&
      parsed.id_produto &&
      parsed.nome &&
      typeof parsed.preco === 'number'
    ) {
      return { tipo: 'produto', dadosParsed: parsed as ProdutoQRData };
    }

    // Mantém a compatibilidade caso gerem o JSON exato da tela de confirmação (Patrimônio)
    if (parsed.tipo === 'patrimonio' && parsed.id_equipamento) {
      return { tipo: 'patrimonio', dadosParsed: parsed as PatrimonioQRData };
    }

    // É JSON, mas não tem chaves reconhecidas (ex: bula de remédio) → erro genérico
    return { tipo: 'generico' };
    
  } catch (erro) {
    // -------------------------------------------------------
    // PASSO 4: CENÁRIO GENÉRICO (FALLBACK / ERRO)
    // Se não era mapa, não era ID numérico, e falhou ao converter/validar o JSON,
    // o app retorna 'generico' para exibir sua mensagem de erro amigável.
    // -------------------------------------------------------
    return { tipo: 'generico' };
  }
};