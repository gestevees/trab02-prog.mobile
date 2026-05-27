import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// 1. Importe as suas telas
import HomeScreen from "./src/screens/HomeScreen";
import ScannerScreen from "./src/screens/ScannerScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ConfirmationScreen from "./src/screens/ConfirmationScreen";
import CartScreen from "./src/screens/CartScreen";

// 2. Defina e EXPORTE o tipo com as rotas do app
export type RootStackParamList = {
  // 'undefined' significa que a rota não recebe parâmetros
  Home: undefined;

  // Exemplo caso recebesse parâmetros:
  // Scanner: { scannerId: string }
  Scanner: undefined;

  History: undefined;

  Confirmation: {
    scannedData: string;
  };

  Cart: undefined;
};

// 3. Passe o tipo criado para o Stack Navigator
const Stack = createStackNavigator<RootStackParamList>();

export default function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Início" }}
        />

        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{ title: "Escanear QR Code" }}
        />

        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: "Histórico" }}
        />

        <Stack.Screen
          name="Confirmation"
          component={ConfirmationScreen}
          options={{ title: "Resultado da Leitura" }}
        />

        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ title: "Carrinho de Compras" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

