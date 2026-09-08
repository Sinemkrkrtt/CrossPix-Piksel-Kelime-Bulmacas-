// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  useFonts,
  PixelifySans_500Medium,
  PixelifySans_600SemiBold,
  PixelifySans_700Bold,
} from '@expo-google-fonts/pixelify-sans';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';

import IntroScreen from './src/screens/IntroScreen';
import CityMapScreen from './src/screens/CityMapScreen';
import CityPuzzlesScreen from './src/screens/CityPuzzlesScreen'; // Şehir içi bulmacalar
import PixelPuzzleScreen from './src/screens/PixelPuzzleScreen'; // Simit çapraz bulmaca
import PaintPuzzleScreen from './src/screens/PaintPuzzleScreen'; // Detaylı şekil + kelime oyunu
import StoreScreen from './src/screens/StoreScreen'; // Joker mağazası
import JournalScreen from './src/screens/JournalScreen'; // Seyahat Defteri (hatıra koleksiyonu)
import LoginScreen from './src/screens/LoginScreen'; // Giriş
import RegisterScreen from './src/screens/RegisterScreen'; // Kayıt
import { EconomyProvider } from './src/economy/EconomyContext'; // Altın + joker cüzdanı
import { AuthProvider } from './src/auth/AuthContext'; // Firebase oturumu

const Stack = createStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    PixelifySans_500Medium,
    PixelifySans_600SemiBold,
    PixelifySans_700Bold,
    PressStart2P_400Regular,
    VT323_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <EconomyProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Intro" component={IntroScreen} />
            <Stack.Screen name="CityMap" component={CityMapScreen} />
            {/* Şehrin 5 bulmacasının listelendiği ara sayfa */}
            <Stack.Screen name="CityPuzzles" component={CityPuzzlesScreen} />
            {/* Simit çapraz bulmaca */}
            <Stack.Screen name="Puzzle" component={PixelPuzzleScreen} />
            {/* Detaylı piksel şekil + kelime oyunu (Lale, Nazar, Kedi, ...) */}
            <Stack.Screen name="Paint" component={PaintPuzzleScreen} />
            {/* Joker mağazası */}
            <Stack.Screen name="Store" component={StoreScreen} />
            {/* Seyahat Defteri — hatıra koleksiyonu */}
            <Stack.Screen name="Journal" component={JournalScreen} />
            {/* Giriş / kayıt kapısı */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </EconomyProvider>
    </AuthProvider>
  );
}