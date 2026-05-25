import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../App";
import { JSX } from "react/jsx-runtime";

// Serviços e Tipos
import { extrairCoordenadas } from "./services/geoService";
import { classificarQRCode } from "./services/validationService";
import { addToCart } from "./services/cartService";
import { ScannedRecord, TipoQRCode, ProdutoQRData, PatrimonioQRData } from "./services/types";
import { buscarDadosEstoque, Equipamento } from "./services/apiService";

const STORE_KEY = "@scanned_qrcodes";

type ConfirmationScreenProps = StackScreenProps<
  RootStackParamList,
  "Confirmation"
>;

export default function ConfirmationScreen({
  route,
  navigation,
}: ConfirmationScreenProps): JSX.Element {
  const { scannedData } = route.params || {
    scannedData: "Dado não disponível",
  };

  // -------------------------------------------------------
  // ESTADOS
  // -------------------------------------------------------
  const [status, setStatus] = useState<string>("Processando...");
  const [loadingAPI, setLoadingAPI] = useState<boolean>(false);
  const [equipamentoDados, setEquipamentoDados] = useState<Equipamento | null>(
    null,
  );
  const [tipoDetectado, setTipoDetectado] = useState<TipoQRCode>("generico");
  const [produtoDados, setProdutoDados] = useState<ProdutoQRData | null>(null);

  // -------------------------------------------------------
  // FUNÇÃO: storeData (Geolocalização)
  // Reescrita com regex flexível para capturar coordenadas
  // após '@' ou '=' em URLs do Google Maps
  // -------------------------------------------------------
  const storeData = async (data: string): Promise<void> => {
    try {
      // Regex flexível: Procura por '@' ou '=' e captura os dois conjuntos
      // de decimais seguintes
      const regex = /[@=](-?\d+\.\d+),(-?\d+\.\d+)/;
      const match = data.match(regex);

      if (!match) {
        setStatus("QR Code inválido. Utilize uma URL direta do Google Maps.");
        return;
      }

      const lat = match[1];
      const lng = match[2];

      const existingData = await AsyncStorage.getItem(STORE_KEY);
      const dataArray: ScannedRecord[] = existingData
        ? JSON.parse(existingData)
        : [];

      const newRecord: ScannedRecord = {
        id: Date.now(),
        data: `Latitude: ${lat} \nLongitude: ${lng}`,
        urlOriginal: data, // Salva o link completo para reabertura posterior
        timestamp: new Date().toISOString(),
        tipo: "geolocalizacao",
      };

      dataArray.push(newRecord);
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(dataArray));
      setStatus("Localização mapeada e salva offline!");
    } catch (e) {
      setStatus("Erro ao processar coordenadas.");
    }
  };

  // -------------------------------------------------------
  // FUNÇÃO: storeGenerico
  // Salva dados genéricos (texto puro) no AsyncStorage
  // -------------------------------------------------------
  const storeGenerico = async (data: string): Promise<void> => {
    try {
      const existingData = await AsyncStorage.getItem(STORE_KEY);
      const dataArray: ScannedRecord[] = existingData
        ? JSON.parse(existingData)
        : [];

      const newRecord: ScannedRecord = {
        id: Date.now(),
        data: data,
        timestamp: new Date().toISOString(),
        tipo: "generico",
      };

      dataArray.push(newRecord);
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(dataArray));
      setStatus("Sucesso! O dado foi guardado no armazenamento local.");
    } catch (e) {
      console.error("Erro ao guardar o dado:", e);
      setStatus("Falha ao guardar o dado.");
    }
  };

  // -------------------------------------------------------
  // FUNÇÃO: handleAddToCart
  // Adiciona o produto ao carrinho e também salva no histórico
  // -------------------------------------------------------
  const handleAddToCart = async (): Promise<void> => {
    if (!produtoDados) return;

    try {
      // Salva no carrinho
      await addToCart(produtoDados);

      // Também salva no histórico de QR Codes
      const existingData = await AsyncStorage.getItem(STORE_KEY);
      const dataArray: ScannedRecord[] = existingData
        ? JSON.parse(existingData)
        : [];

      const newRecord: ScannedRecord = {
        id: Date.now(),
        data: `${produtoDados.nome} — R$ ${produtoDados.preco.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        tipo: "produto",
      };

      dataArray.push(newRecord);
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(dataArray));

      Alert.alert(
        "Sucesso! 🛒",
        `"${produtoDados.nome}" foi adicionado ao carrinho.`,
        [{ text: "OK" }],
      );
      setStatus("Produto adicionado ao carrinho com sucesso!");
    } catch (e) {
      console.error("Erro ao adicionar ao carrinho:", e);
      Alert.alert("Erro", "Não foi possível adicionar o produto ao carrinho.");
      setStatus("Erro ao adicionar ao carrinho.");
    }
  };

  // -------------------------------------------------------
  // FUNÇÃO: abrirNoMapa
  // Abre a URL de geolocalização no app de mapas nativo
  // -------------------------------------------------------
  const abrirNoMapa = async (): Promise<void> => {
    try {
      const suportado = await Linking.canOpenURL(scannedData);
      if (suportado) {
        await Linking.openURL(scannedData);
      } else {
        Alert.alert(
          "Erro",
          "Não foi possível abrir este link de mapa no dispositivo.",
        );
      }
    } catch (error) {
      console.error("Erro ao tentar abrir o mapa:", error);
      Alert.alert("Erro", "Falha ao abrir o aplicativo de mapas.");
    }
  };

  // -------------------------------------------------------
  // useEffect — Classificação e processamento centralizado
  // -------------------------------------------------------
  useEffect(() => {
    const processarLeitura = async () => {
      if (!scannedData) return;

      const { tipo, dadosParsed } = classificarQRCode(scannedData);
      setTipoDetectado(tipo);

      switch (tipo) {
        case "patrimonio": {
          // Fluxo existente: busca na API de estoque
          const parsed = dadosParsed as PatrimonioQRData;
          setStatus("Buscando dados no sistema de inventário externo...");
          setLoadingAPI(true);

          const resultado = await buscarDadosEstoque(parsed.id_equipamento);

          if (resultado) {
            setEquipamentoDados(resultado);
            setStatus("Sucesso! Dados recuperados via API Externa.");
          } else {
            setStatus("Erro: Equipamento não localizado na API de estoque.");
          }

          setLoadingAPI(false);
          break;
        }
        case "produto": {
          // Fluxo NOVO: exibe dados do produto
          const parsed = dadosParsed as ProdutoQRData;
          setProdutoDados(parsed);
          setStatus(`Produto "${parsed.nome}" identificado!`);
          break;
        }
        case "geolocalizacao": {
          // Fluxo de geolocalização: usa o novo storeData com regex flexível
          await storeData(scannedData);
          break;
        }
        default: {
          // Genérico: salva o dado bruto no histórico
          await storeGenerico(scannedData);
          break;
        }
      }
    };

    processarLeitura();
  }, [scannedData]);

  // -------------------------------------------------------
  // RENDERIZAÇÃO (JSX) — 4 cenários visuais
  // -------------------------------------------------------
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Resultado da Leitura</Text>

      <View style={styles.statusBox}>
        {(status === "Processando..." || loadingAPI) && (
          <ActivityIndicator size="small" color="#007bff" />
        )}
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* ============================================= */}
      {/* CENÁRIO 1: PATRIMÔNIO / ESTOQUE (API)        */}
      {/* ============================================= */}
      {tipoDetectado === "patrimonio" && equipamentoDados ? (
        <View style={styles.estoqueContainer}>
          <Text style={styles.sectionHeader}>
            📦 Ficha Técnica do Equipamento (API)
          </Text>

          <View style={styles.cardInfo}>
            <Text style={styles.infoLabel}>Identificação:</Text>
            <Text style={styles.infoValue}>{equipamentoDados.title}</Text>

            <Text style={styles.infoLabel}>Código de Patrimônio:</Text>
            <Text style={styles.patrimonioBadge}>
              {equipamentoDados.patrimonio}
            </Text>

            <Text style={styles.infoLabel}>Especificação Técnica:</Text>
            <Text style={styles.infoValueDesc}>{equipamentoDados.body}</Text>
          </View>

          <Text style={styles.actionsHeader}>Ações de Estoque Disponíveis</Text>
          <Button
            title="Conferir Equipamento (API)"
            onPress={() =>
              alert(
                `Inventário confirmed para o patrimônio: ${equipamentoDados.patrimonio}`,
              )
            }
            color="#28a745"
          />
        </View>
      ) : tipoDetectado === "produto" && produtoDados ? (
        /* ============================================= */
        /* CENÁRIO 2: PRODUTO (NOVO)                     */
        /* ============================================= */
        <View style={styles.produtoContainer}>
          <Text style={[styles.sectionHeader, { color: "#ff6600" }]}>
            🛒 Produto Identificado
          </Text>

          <View style={styles.cardInfo}>
            <Text style={styles.infoLabel}>Nome do Produto:</Text>
            <Text style={styles.infoValue}>{produtoDados.nome}</Text>

            <Text style={styles.infoLabel}>Código do Produto:</Text>
            <Text style={styles.infoValue}>#{produtoDados.id_produto}</Text>

            <Text style={styles.infoLabel}>Preço:</Text>
            <Text style={styles.precoBadge}>
              R$ {produtoDados.preco.toFixed(2)}
            </Text>
          </View>

          <Text style={styles.actionsHeader}>Ações do Produto</Text>
          <Button
            title="🛒 Adicionar ao Carrinho"
            onPress={handleAddToCart}
            color="#ff6600"
          />
        </View>
      ) : tipoDetectado === "geolocalizacao" ? (
        /* ============================================= */
        /* CENÁRIO 3: GEOLOCALIZAÇÃO                     */
        /* ============================================= */
        <View>
          <Text style={[styles.sectionHeader, { color: "#28a745" }]}>
            🗺️ Localização Identificada
          </Text>

          <View style={styles.cardInfo}>
            <Text style={styles.infoLabel}>
              Coordenadas da Entrega / Ponto Turístico:
            </Text>
            <Text style={styles.dataText}>{scannedData}</Text>
          </View>

          <Text style={styles.actionsHeader}>Ações de Geolocalização</Text>
          <Button
            title="🗺️ Abrir no Google Maps"
            onPress={abrirNoMapa}
            color="#28a745"
          />
          <View style={styles.miniSpacer} />
          <Text style={{ fontSize: 14, color: "#6c757d" }}>
            A localização também foi salva no Histórico para acesso posterior.
          </Text>
        </View>
      ) : (
        /* ============================================= */
        /* CENÁRIO 4: GENÉRICO (FALLBACK)                */
        /* ============================================= */
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
      <Button
        title="Voltar para Início"
        onPress={() => navigation.popToTop()}
        color="#6c757d"
      />
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#ffffff" },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#212529",
  },
  dataLabel: { fontSize: 16, fontWeight: "600", marginTop: 10 },
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
  estoqueContainer: { backgroundColor: "#fff" },
  produtoContainer: { backgroundColor: "#fff" },
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
  precoBadge: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    backgroundColor: "#28a745",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginVertical: 6,
  },
  miniSpacer: { height: 8 },
  spacer: { height: 30 },
  bottomSpacer: { height: 50 },
});