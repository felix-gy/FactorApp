import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/Theme';
import type { Session } from '@supabase/supabase-js';

export const unstable_settings = { initialRouteName: 'index' };

// Procesa el callback OAuth (PKCE o implicit). Se llama desde Linking y desde login.tsx.
export const procesarUrlOAuth = async (url: string): Promise<void> => {
  if (url.includes('access_token=')) {
    const frag = (url.includes('#') ? url.split('#')[1] : url.split('?')[1]) ?? '';
    const p = new URLSearchParams(frag);
    const at = p.get('access_token'), rt = p.get('refresh_token');
    if (at && rt) {
      const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      if (error) throw error;
    }
  } else {
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) throw error;
  }
};

type AuthEvento = { event: string; session: Session | null };

// RootLayout NUNCA se desmonta → único lugar seguro para manejar auth y navegación.
export default function RootLayout() {
  const router = useRouter();
  const [authEvento, setAuthEvento] = useState<AuthEvento | undefined>(undefined);
  // Cuando detectamos correo no-ucsp, SIGNED_OUT debe navegar a login?warn=1
  const pendingNoUCSP = useRef(false);

  useEffect(() => {
    // Android: si la app fue reiniciada por el deep link OAuth, procesar la URL de inicio
    Linking.getInitialURL().then(url => {
      if (url && (url.includes('code=') || url.includes('access_token='))) {
        procesarUrlOAuth(url).catch(() => {});
        // onAuthStateChange dispara SIGNED_IN y maneja la navegación automáticamente
      }
    });

    // Suscribirse a todos los cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthEvento({ event, session: session ?? null });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Navegar cuando cambia el estado de autenticación
  useEffect(() => {
    if (!authEvento) return;

    // TOKEN_REFRESHED no requiere navegación (el usuario ya está en la pantalla correcta)
    if (authEvento.event === 'TOKEN_REFRESHED') return;

    const { session } = authEvento;

    const redirigir = async () => {
      if (!session) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const oauthEnProgreso =
            window.location.search.includes('code=') ||
            window.location.hash.includes('access_token=');
          const oauthRechazado =
            window.location.search.includes('error=') ||
            window.location.hash.includes('error=');
          if (oauthRechazado) router.replace('/(auth)/login?warn=1' as any);
          else if (!oauthEnProgreso) router.replace('/(auth)/login');
        } else {
          // Si venía de un rechazo no-ucsp, mostrar aviso en login
          const path = pendingNoUCSP.current ? '/(auth)/login?warn=1' : '/(auth)/login';
          pendingNoUCSP.current = false;
          router.replace(path as any);
        }
        return;
      }
      /*
      // Verificar correo institucional
      const email = session.user?.email ?? '';
      if (!email.endsWith('@ucsp.edu.pe')) {
        pendingNoUCSP.current = true;
        await supabase.auth.signOut();
        // SIGNED_OUT navega automáticamente a /(auth)/login?warn=1
        return;
      }
*/
      // Verificar si ya completó el onboarding
      try {
        const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
        // Ahora también evaluamos si la carrera es la que el Trigger pone por defecto
        if (!perfil || perfil.carrera === 'Por Definir' || perfil.carrera === 'Fase Beta') {
          // Si no ha elegido carrera, lo obligamos a pasar por el Onboarding
          router.replace('/(auth)/onboarding');
        } else {
          // Si ya tiene una carrera real (ej. "Ingeniería Industrial"), lo dejamos pasar
          router.replace('/(tabs)');
        }       
    } catch {
      router.replace('/(auth)/onboarding');
    }
    };

    redirigir();
  }, [authEvento]);

  // Mostrar spinner mientras se determina el estado de autenticación inicial
  if (!authEvento) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
