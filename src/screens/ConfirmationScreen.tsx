import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { JSX } from "react/jsx-runtime";

// Importamos a função de busca e a interface do arquivo de serviço.
import {
  buscarDadosEstoque,
  Equipamento,
} from "../screens/services/apiService";

// Chave usada para salvar/ler dados no AsyncStorage (armazenamento local do celular).
// Usar uma constante evita erros de digitação ao referenciar a mesma chave em vários lugares.
const STORE_KEY = "@scanned_qrcodes";

// Formato de cada registro salvo localmente no AsyncStorage
interface ScannedRecord {
  id: number; // Timestamp em ms, serve como ID único do registro
  data: string; // O texto bruto lido pelo QR Code
  timestamp: string; // Data/hora da leitura em formato ISO (ex: "2026-05-22T10:30:00.000Z")
}

// Tipo das props desta tela, gerado automaticamente pelo React Navigation.
// Garante que route.params sempre terá o formato esperado (scannedData: string).
type ConfirmationScreenProps = StackScreenProps<
  RootStackParamList,
  "Confirmation"
>;

export default function ConfirmationScreen({
  route,
  navigation,
}: ConfirmationScreenProps): JSX.Element {
  // Lê o dado recebido da tela anterior (o texto/JSON lido pelo QR Code).
  // O "|| { scannedData: "Dado não disponível" }" é um fallback de segurança
  // caso a tela seja aberta sem parâmetros (situação improvável, mas protegida).
  const { scannedData } = route.params || {
    scannedData: "Dado não disponível",
  };

  // Estado que exibe uma mensagem de status para o usuário durante o processamento
  const [status, setStatus] = useState<string>("Processando...");

  // -------------------------------------------------------
  // ESTADOS ADICIONADOS para o fluxo de busca na API externa
  // -------------------------------------------------------

  // loadingAPI: controla a visibilidade do indicador de carregamento (spinner).
  // true  = está buscando na API   → mostra a "rodinha" girando
  // false = busca encerrada        → esconde a "rodinha"
  const [loadingAPI, setLoadingAPI] = useState<boolean>(false);

  // equipamentoDados: armazena o equipamento retornado pela API.
  // null    = ainda não buscou, ou a busca falhou → exibe o layout padrão
  // objeto  = busca bem-sucedida                  → exibe a ficha técnica
  const [equipamentoDados, setEquipamentoDados] = useState<Equipamento | null>(
    null,
  );

  // -------------------------------------------------------
  // FUNÇÃO: storeData
  // -------------------------------------------------------
  // Salva textos brutos ou QR Codes não reconhecidos no AsyncStorage
  // (banco de dados local do celular, persiste mesmo fechando o app).
  const storeData = async (data: string): Promise<void> => {
    try {
      // Lê os registros já salvos anteriormente (pode ser null na primeira vez)
      const existingData = await AsyncStorage.getItem(STORE_KEY);

      // Se já existir dados, converte o JSON de volta para array; senão, começa vazio
      const dataArray: ScannedRecord[] = existingData
        ? JSON.parse(existingData)
        : [];

      // Cria o novo registro com ID único baseado no horário atual (Date.now() = ms desde 1970)
      const newRecord: ScannedRecord = {
        id: Date.now(),
        data: data,
        timestamp: new Date().toISOString(),
      };

      // Adiciona o novo registro ao final do array e salva tudo de volta
      dataArray.push(newRecord);
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(dataArray));
      setStatus("Sucesso! O dado foi guardado no armazenamento local.");
    } catch (e) {
      console.error("Erro ao guardar o dado:", e);
      setStatus("Falha ao guardar o dado.");
    }
  };

  // -------------------------------------------------------
  // useEffect: Executado automaticamente quando a tela é montada
  // -------------------------------------------------------
  // O array de dependências "[scannedData]" significa que este efeito
  // roda toda vez que o valor de scannedData mudar (na prática, roda
  // uma vez ao abrir a tela, pois scannedData vem fixo da navegação).
  useEffect(() => {
    const processarLeitura = async () => {
      // Proteção: não faz nada se não houver dado para processar
      if (!scannedData) return;

      try {
        // -------------------------------------------------------
        // PASSO 1: Tentar interpretar o texto do QR Code como JSON
        // -------------------------------------------------------
        // QR Codes podem conter texto simples ("www.site.com") ou
        // JSON estruturado ('{"tipo":"patrimonio","id_equipamento":5}').
        // JSON.parse lança uma exceção se o texto NÃO for JSON válido,
        // o que nos leva direto ao bloco "catch"
        const objetoDados = JSON.parse(scannedData);

        // -------------------------------------------------------
        // PASSO 2: Verificar se é um QR Code do tipo "patrimônio"
        // -------------------------------------------------------
        // Checamos dois campos para ter certeza:
        //   objetoDados.tipo === "patrimonio" → identifica o cenário correto
        //   objetoDados.id_equipamento        → garante que o ID existe
        // Se qualquer um falhar, cai no "else" e trata como dado genérico.
        if (objetoDados.tipo === "patrimonio" && objetoDados.id_equipamento) {
          // Atualiza o status visível na tela para o usuário saber o que está acontecendo
          setStatus("Buscando dados no sistema de inventário externo...");

          // Liga a "rodinha" de carregamento (ActivityIndicator) na tela
          setLoadingAPI(true);

          // -------------------------------------------------------
          // PASSO 3: Chamar a função do apiService para buscar na API
          // -------------------------------------------------------
          // Aqui conectamos o QR Code com a API externa.
          // "await" pausa aqui até a internet responder (pode levar 1-3 segundos).
          // O resultado será um objeto Equipamento ou null (se falhar).
          const resultado = await buscarDadosEstoque(
            objetoDados.id_equipamento, // Passa o ID lido do QR Code para a função
          );

          if (resultado) {
            // Busca bem-sucedida: salva o equipamento no estado para renderizar na tela
            setEquipamentoDados(resultado);
            setStatus("Sucesso! Dados recuperados via API Externa.");
          } else {
            // A função retornou null: ID inválido ou sem conexão
            setStatus("Erro: Equipamento não localizado na API de estoque.");
          }

          // Desliga a "rodinha" independentemente do resultado
          setLoadingAPI(false);

          // "return": evita que o código continue
          // e chame storeData() por engano após o fluxo de patrimônio
          return;
        }

        // -------------------------------------------------------
        // PASSO 2b: JSON válido, mas não é do tipo "patrimônio"
        // -------------------------------------------------------
        // Pode ser um QR Code de outra tarefa (produto, usuário, etc.).
        // Salva o texto bruto no AsyncStorage para não perder a leitura.
        await storeData(scannedData);
      } catch (error) {
        // -------------------------------------------------------
        // PASSO 1b: O texto do QR Code NÃO é JSON (exceção do JSON.parse)
        // -------------------------------------------------------
        // Exemplos: URLs, números, textos livres como "Sala 204 - Impressora"
        // Neste caso, apenas salva o texto bruto normalmente.
        await storeData(scannedData);
      }
    };

    // Dispara a função assíncrona de processamento
    processarLeitura();
  }, [scannedData]); // Dependência: reprocessa se scannedData mudar

  // -------------------------------------------------------
  // RENDERIZAÇÃO (JSX)
  // -------------------------------------------------------
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Resultado da Leitura</Text>

      {/* ---------------------------------------------------
          CAIXA DE STATUS
          Mostra o progresso do processamento ao usuário.
          O spinner (ActivityIndicator) aparece apenas enquanto
          status === "Processando..." OU loadingAPI === true.
      --------------------------------------------------- */}
      <View style={styles.statusBox}>
        {(status === "Processando..." || loadingAPI) && (
          <ActivityIndicator size="small" color="#007bff" />
        )}
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* ---------------------------------------------------
          RENDERIZAÇÃO CONDICIONAL: bifurcação principal da tela
          
          SE equipamentoDados !== null  → QR Code era de patrimônio
                                          e a API respondeu com sucesso
                                          → Exibe a Ficha Técnica
          
          SENÃO                         → QR Code era texto simples,
                                          JSON desconhecido, ou API falhou
                                          → Exibe o layout padrão
      --------------------------------------------------- */}
      {equipamentoDados ? (
        // -------------------------------------------------------
        // Exibe as informações que vieram da API externa mapeadas
        // -------------------------------------------------------
        <View style={styles.estoqueContainer}>
          <Text style={styles.sectionHeader}>
            📦 Ficha Técnica do Equipamento (API)
          </Text>

          <View style={styles.cardInfo}>
            {/* equipamentoDados.title = "Equipamento de TI #5" (gerado no apiService) */}
            <Text style={styles.infoLabel}>Identificação:</Text>
            <Text style={styles.infoValue}>{equipamentoDados.title}</Text>

            {/* equipamentoDados.patrimonio = "BRM-2026-35" (gerado no apiService) */}
            <Text style={styles.infoLabel}>Código de Patrimônio:</Text>
            <Text style={styles.patrimonioBadge}>
              {equipamentoDados.patrimonio}
            </Text>

            {/* equipamentoDados.body = título original da API (reaproveitado como descrição) */}
            <Text style={styles.infoLabel}>Especificação Técnica:</Text>
            <Text style={styles.infoValueDesc}>{equipamentoDados.body}</Text>
          </View>

          {/* Ação de confirmação de inventário — usa o código de patrimônio no alerta */}
          <Text style={styles.actionsHeader}>Ações de Estoque Disponíveis</Text>
          <Button
            title="Conferir Equipamento (API)"
            onPress={() =>
              alert(
                `Inventário confirmado para o patrimônio: ${equipamentoDados.patrimonio}`,
              )
            }
            color="#28a745"
          />
        </View>
      ) : (
        // -------------------------------------------------------
        // Exibe o texto bruto lido pelo QR Code e as 4 ações genéricas
        // -------------------------------------------------------
        <View>
          <Text style={styles.dataLabel}>Dado Bruto Lido:</Text>
          <Text style={styles.dataText}>{scannedData}</Text>

          <Text style={styles.actionsHeader}>Ações Padrão (4 Ações)</Text>
          <Button
            title="Executar Ação 1"
            onPress={() => alert("Ação 1 executada")}
          />
          <View style={styles.miniSpacer} />
          <Button
            title="Executar Ação 2"
            onPress={() => alert("Ação 2 executada")}
          />
          <View style={styles.miniSpacer} />
          <Button
            title="Executar Ação 3"
            onPress={() => alert("Ação 3 executada")}
          />
          <View style={styles.miniSpacer} />
          <Button
            title="Executar Ação 4"
            onPress={() => alert("Ação 4 executada")}
          />
        </View>
      )}

      <View style={styles.spacer} />
      {/* Navega de volta para a tela inicial, limpando toda a pilha de navegação */}
      <Button
        title="Voltar para Início"
        onPress={() => navigation.popToTop()}
        color="#6c757d"
      />
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// Os estilos abaixo seguem o padrão StyleSheet do React Native.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#212529",
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  dataText: {
    fontSize: 15,
    marginBottom: 20,
    color: "#007bff",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 5,
    fontFamily: "monospace",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e9ecef",
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  statusText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "500",
    color: "#495057",
  },
  actionsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 15,
    color: "#343a40",
  },
  estoqueContainer: {
    backgroundColor: "#fff",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 12,
  },
  cardInfo: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6c757d",
    textTransform: "uppercase",
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },
  infoValueDesc: {
    fontSize: 14,
    color: "#495057",
    fontStyle: "italic",
    lineHeight: 20,
  },
  patrimonioBadge: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
    backgroundColor: "#17a2b8",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginVertical: 4,
  },
  miniSpacer: {
    height: 8,
  },
  spacer: {
    height: 30,
  },
  bottomSpacer: {
    height: 50,
  },
});
