import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Theme';

const CARRERAS = [
  'Administración de negocios',
  'Arquitectura y Urbanismo',
  'Ciencia de la Computación',
  'Ciencia de Datos',
  'Contabilidad',
  'Derecho',
  'Educación',
  'Ingeniería Ambiental',
  'Ingeniería Civil',
  'Ingeniería Electrónica y de Telecomunicaciones',
  'Ingeniería Industrial',
  'Ingeniería Mecatrónica',
  'Inteligencia Artificial',
  'Medicina Humana',
  'Psicología',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Guardia: si Expo Router restaura esta pantalla sin sesión activa, _layout.tsx
  // ya redirigirá vía INITIAL_SESSION. Este check es por si acaso.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/(auth)/login');
    });
  }, []);

  const handleContinuar = async () => {
    if (!carreraSeleccionada) {
      if (Platform.OS === 'web') {
        window.alert('Selecciona tu carrera para continuar.');
      } else {
        Alert.alert('Carrera requerida', 'Selecciona tu carrera para continuar.');
      }
      return;
    }

    setGuardando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión');

      const nombre = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? '';

      const { error } = await supabase.from('perfiles').upsert({
        id: user.id,
        nombre,
        carrera: carreraSeleccionada,
      });

      if (error) throw error;
      router.replace('/(tabs)');
    } catch (e: any) {
      const mensaje = e?.message ?? 'Error al guardar el perfil.';
      if (Platform.OS === 'web') {
        window.alert(mensaje);
      } else {
        Alert.alert('Error', mensaje);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>¿Cuál es tu carrera?</Text>
        <Text style={styles.subtitulo}>Esto nos ayuda a conectarte con actividades relevantes para ti.</Text>
      </View>

      <ScrollView style={styles.lista} contentContainerStyle={styles.listaContent}>
        {CARRERAS.map((carrera) => {
          const seleccionada = carreraSeleccionada === carrera;
          return (
            <TouchableOpacity
              key={carrera}
              style={[styles.opcion, seleccionada && styles.opcionSeleccionada]}
              onPress={() => setCarreraSeleccionada(carrera)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, seleccionada && styles.radioSeleccionado]}>
                {seleccionada && <View style={styles.radioPunto} />}
              </View>
              <Text style={[styles.opcionTexto, seleccionada && styles.opcionTextoSeleccionado]}>
                {carrera}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.boton, (!carreraSeleccionada || guardando) && styles.botonDeshabilitado]}
          onPress={handleContinuar}
          disabled={!carreraSeleccionada || guardando}
        >
          {guardando
            ? <ActivityIndicator color="white" />
            : <Text style={styles.botonTexto}>Continuar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 24 },
  titulo: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  subtitulo: { color: '#B0A8C5', fontSize: 14, lineHeight: 20 },
  lista: { flex: 1 },
  listaContent: { paddingHorizontal: 20, paddingBottom: 20 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  opcionSeleccionada: {
    backgroundColor: 'rgba(123,63,228,0.2)',
    borderColor: Colors.primary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#B0A8C5',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSeleccionado: { borderColor: Colors.primary },
  radioPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  opcionTexto: { color: '#B0A8C5', fontSize: 15, flex: 1 },
  opcionTextoSeleccionado: { color: 'white', fontWeight: '600' },
  footer: { padding: 20 },
  boton: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonDeshabilitado: { opacity: 0.45 },
  botonTexto: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
