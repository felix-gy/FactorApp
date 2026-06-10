// NUEVO: Polyfill necesario para que las URLs funcionen correctamente en React Native
import 'react-native-url-polyfill/auto';

// NUEVO: Librería oficial de Supabase para conectarse a la base de datos
import { createClient } from '@supabase/supabase-js';

// NUEVO: Almacenamiento local para guardar la sesión en el celular
import AsyncStorage from '@react-native-async-storage/async-storage';

// NUEVO: Detecta si la app corre en web o en celular
import { Platform } from 'react-native';

// NUEVO: URL y clave de tu proyecto en Supabase
const SUPABASE_URL = 'https://cllzdgxqinpojtuyzfbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbHpkZ3hxaW5wb2p0dXl6ZmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTMyNzQsImV4cCI6MjA5NDc4OTI3NH0.oWJiSzO9JDz21ObNNEEno6u979VCkzirnuQtVP2viqM';

// NUEVO: Crea la conexión con Supabase y la exporta para usarla en cualquier pantalla
// - En celular: guarda la sesión en AsyncStorage (almacenamiento local del celular)
// - En web: guarda la sesión en localStorage del navegador automáticamente
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: true,   // Renueva el token automáticamente antes de que expire
    persistSession: true,     // Mantiene la sesión aunque cierres y abras la app
    detectSessionInUrl: Platform.OS === 'web', // En web detecta el token desde la URL
  },
});
// HASTA AQUI LO NUEVO
