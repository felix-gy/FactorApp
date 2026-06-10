import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { Colors } from '../../constants/Theme';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { procesarUrlOAuth } from '../_layout';

WebBrowser.maybeCompleteAuthSession();

// Login solo gestiona el botón de Google y el intercambio OAuth.
// Toda la navegación la maneja _layout.tsx via onAuthStateChange (nunca se desmonta).
export default function LoginScreen() {
  const { warn } = useLocalSearchParams<{ warn?: string }>();
  const [correoInvalido, setCorreoInvalido] = useState(false);

  const handleGoogleLogin = async () => {
    setCorreoInvalido(false);
    try {
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
        return;
      }

      const redirectTo = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data?.url ?? '', redirectTo);

      if (result.type === 'success' && result.url) {
        // Intercambiar el código por sesión.
        // _layout.tsx recibe SIGNED_IN via onAuthStateChange y navega automáticamente.
        await procesarUrlOAuth(result.url);
      }
    } catch {
      setCorreoInvalido(true);
      Alert.alert(
        '⚠️ Correo no institucional',
        'Necesitas iniciar sesión con tu correo @ucsp.edu.pe.',
        [{ text: 'Entendido' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>T</Text>
      </View>
      <Text style={styles.title}>Factor Comun</Text>
      <Text style={styles.subtitle}>Conecta. Actúa. Pertenece.</Text>

      {(warn === '1' || correoInvalido) && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Necesitas iniciar sesión con un correo institucional @ucsp.edu.pe
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
        <Text style={styles.googleButtonText}>Continuar con Google</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>Usa tu cuenta institucional @ucsp.edu.pe</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 30 },
  logoCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  logoText: { color: 'white', fontSize: 60, fontWeight: 'bold' },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', letterSpacing: 4 },
  subtitle: { color: Colors.textMuted, fontSize: 16, marginTop: 10, marginBottom: 50 },
  warningBox: { backgroundColor: '#FF3B30', borderRadius: 10, padding: 14, width: '100%', marginBottom: 20 },
  warningText: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 14 },
  googleButton: { backgroundColor: 'white', flexDirection: 'row', padding: 18, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center' },
  googleButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  footerText: { color: Colors.textMuted, fontSize: 12, marginTop: 20 },
});
