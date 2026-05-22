// ==============================================================
// SERVIÇO DE API EXTERNA - apiService.ts
// ==============================================================
// Este arquivo centraliza toda a comunicação com APIs externas.
// A separação em arquivo próprio é uma boa prática: mantém o código
// organizado e permite reutilizar a função em qualquer tela do app.

// ==============================================================
// INTERFACE: Define o "molde" (formato) de um Equipamento
// ==============================================================
// Uma interface no TypeScript funciona como um contrato:
// todo objeto do tipo "Equipamento" DEVE ter exatamente esses campos.
// Isso evita erros de digitação e facilita o autocomplete no editor.
export interface Equipamento {
  id: number; // ID numérico original vindo da API (ex: 1, 2, 3...)
  title: string; // Nome legível do equipamento, montado por nós na função abaixo
  body: string; // Descrição técnica: reaproveitamos o campo 'title' da API externa
  patrimonio: string; // Código interno gerado por nós (ex: "BRM-2026-14"), não vem da API
}

// ==============================================================
// FUNÇÃO PRINCIPAL: buscarDadosEstoque
// ==============================================================
// Recebe o ID extraído do QR Code e retorna um Equipamento formatado,
// ou null se algo der errado (sem internet, ID inválido, etc.).
//
// "async" = a função é assíncrona, ou seja, ela "pausa" enquanto espera
// a internet responder, sem travar o restante do aplicativo.
//
// "Promise<Equipamento | null>" = o retorno será uma promessa que,
// quando concluída, entregará OU um Equipamento OU null (em caso de erro).
export const buscarDadosEstoque = async (
  idEquipamento: number, // Parâmetro: o número do equipamento lido no QR Code
): Promise<Equipamento | null> => {
  // O bloco try/catch garante que erros de rede não "quebrem" o app:
  // tudo dentro do "try" é tentado; se falhar, o "catch" trata o erro com segurança.
  try {
    // -------------------------------------------------------
    // PASSO 1: Montar a URL com o ID dinâmico do QR Code
    // -------------------------------------------------------
    // Usamos uma template string (crase + ${}) para inserir o ID na URL.
    // Exemplo: se idEquipamento = 5, a URL será:
    // "https://jsonplaceholder.typicode.com/posts/5"
    //
    // IMPORTANTE: jsonplaceholder.typicode.com é uma API pública FALSA
    // usada para testes e desenvolvimento. Em produção, seria substituída
    // pelo endpoint real do sistema de inventário da empresa.
    const url = `https://jsonplaceholder.typicode.com/posts/${idEquipamento}`;

    // -------------------------------------------------------
    // PASSO 2: Fazer a requisição HTTP (GET) para a API
    // -------------------------------------------------------
    // "await" pausa a função AQUI até a internet responder.
    // O app continua funcionando normalmente (não trava a tela),
    // pois o React Native gerencia isso em segundo plano.
    const resposta = await fetch(url);

    // -------------------------------------------------------
    // PASSO 3: Verificar se a API respondeu com sucesso
    // -------------------------------------------------------
    // "resposta.ok" é true quando o status HTTP está entre 200-299 (sucesso).
    // Se o ID não existir na API, ela retorna status 404 (Not Found),
    // então "resposta.ok" será false e lançamos um erro manualmente.
    if (!resposta.ok) {
      throw new Error("Equipamento não encontrado na base de dados externa.");
    }

    // -------------------------------------------------------
    // PASSO 4: Converter a resposta bruta para objeto JavaScript
    // -------------------------------------------------------
    // A API retorna os dados como texto no formato JSON (ex: '{"id":5,"title":"..."}').
    // O método .json() transforma esse texto em um objeto JS que podemos usar.
    // Também é assíncrono, então usamos "await" novamente.
    const dadosDaAPI = await resposta.json();
    // Neste ponto, dadosDaAPI contém algo como:
    // { id: 5, userId: 1, title: "nesciunt quas odio", body: "repudiandae..." }

    // -------------------------------------------------------
    // PASSO 5: Mapear (adaptar) os dados da API para o nosso formato
    // -------------------------------------------------------
    // A API externa retorna campos com nomes e significados diferentes
    // do que o nosso app espera. Fazemos aqui uma "tradução":
    //
    //   dadosDaAPI.id        → id (mantemos o mesmo)
    //   "Equipamento de TI #X" → title (criamos um nome amigável)
    //   dadosDaAPI.title     → body (reaproveitamos o título da API como descrição técnica)
    //   "BRM-2026-X*7"       → patrimonio (geramos um código interno fictício)
    //
    // Multiplicar o ID por 7 é apenas uma forma de simular um número de
    // patrimônio diferente do ID. Em produção, viria diretamente do banco de dados.
    return {
      id: dadosDaAPI.id,
      title: `Equipamento de TI #${dadosDaAPI.id}`,
      body: dadosDaAPI.title,
      patrimonio: `BRM-2026-${dadosDaAPI.id * 7}`,
    };
  } catch (erro) {
    // -------------------------------------------------------
    // TRATAMENTO DE ERRO: Qualquer falha cai aqui
    // -------------------------------------------------------
    // Possíveis causas: sem internet, ID inexistente (404),
    // API fora do ar, JSON malformado, etc.
    // Registramos o erro no console para debug e retornamos null,
    // sinalizando para a tela que a busca não teve sucesso.
    console.error("Erro ao buscar dados da API de estoque:", erro);
    return null;
  }
};
