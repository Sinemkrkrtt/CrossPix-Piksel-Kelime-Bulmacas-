import React from 'react';
import Svg, { Path, Polygon, G } from 'react-native-svg';

export default function Logo({ size = 150 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <G strokeLinejoin="round" strokeWidth="4">
        {/* Sol Yüzey (Koyu Lacivert - Derinlik Hissi) */}
        <Polygon points="15,40 60,65 60,110 15,85" fill="#1E1E2C" stroke="#4A4A68" />
        
        {/* Sağ Yüzey (Orta Lacivert) */}
        <Polygon points="60,65 105,40 105,85 60,110" fill="#2A2A3D" stroke="#4A4A68" />
        
        {/* Üst Yüzey - Altın Sarısı Diorama/Bulmaca Zemini */}
        <Polygon points="60,15 105,40 60,65 15,40" fill="#FFD700" stroke="#FFC107" />
        
        {/* Üst Yüzeydeki Picross Izgarası (Minimalist Çizgiler) */}
        <Path d="M37.5 27.5 L82.5 52.5" stroke="#2A2A3D" strokeWidth="2.5" opacity="0.6" />
        <Path d="M82.5 27.5 L37.5 52.5" stroke="#2A2A3D" strokeWidth="2.5" opacity="0.6" />
        
        {/* Tepeye Yerleştirilen Minik "Hedef" veya "Bina" Simgesi (Beyaz) */}
        <Polygon points="60,25 70,30 60,35 50,30" fill="#FFFFFF" />
        <Polygon points="50,30 60,35 60,45 50,40" fill="#E0E0E0" />
        <Polygon points="60,35 70,30 70,40 60,45" fill="#BDBDBD" />
      </G>
    </Svg>
  );
}