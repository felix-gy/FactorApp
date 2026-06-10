import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/Theme';

// Pantalla de carga inicial y receptor del deep link OAuth.
// Si expo-router hace push de esta pantalla durante el callback OAuth:
//   - Ucsp login: espera SIGNED_IN y deja que _layout.tsx navegue a tabs (sin flash de login).
//   - Error / no-ucsp: retrocede al login tras 1.5s o al detectar SIGNED_OUT.
WebBrowser.maybeCompleteAuthSession();

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    if (!router.canGoBack()) return;

    let done = false;

    const t = setTimeout(() => {
      if (!done) {
        done = true;
        if (router.canGoBack()) router.back();
      }
    }, 1500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (done) return;
      if (event === 'SIGNED_IN' && session) {
        // Sesión válida establecida — _layout.tsx navega a tabs, no hacer nada aquí
        done = true;
        clearTimeout(t);
      } else if (event !== 'INITIAL_SESSION' && !session) {
        // Sin sesión (error, rechazo, sign out) — volver al login
        done = true;
        clearTimeout(t);
        if (router.canGoBack()) router.back();
      }
    });

    return () => {
      done = true;
      clearTimeout(t);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
