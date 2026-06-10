import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronDown, Calendar, X } from 'lucide-react-native';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

const CATEGORIAS = ['Deportes', 'Estudio', 'Ocio', 'Proyectos'];
const EMOJI_CAT: Record<string, string> = { Deportes: '⚽', Estudio: '📚', Ocio: '🎮', Proyectos: '💼' };
const RECOMPENSAS = ['Sin costo', 'Costo compartido', 'Incentivo para asistentes'];
const EMOJI_REC: Record<string, string> = { 'Sin costo': '🆓', 'Costo compartido': '💸', 'Incentivo para asistentes': '🎁' };

const CAT_COLOR: Record<string, string> = {
  Deportes: '#00D191', Estudio: '#F08A35', Ocio: '#4A90E2', Proyectos: '#7C3AED',
};

const formatearFechaBoton = (d: Date) =>
  d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function CreateActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Deportes');
  const [fechaHora, setFechaHora] = useState<Date | null>(null);
  const [lugar, setLugar] = useState('');
  const [cuposMin, setCuposMin] = useState('2');
  const [cuposMax, setCuposMax] = useState('10');
  const [recompensa, setRecompensa] = useState('Sin costo');
  const [duracionHoras, setDuracionHoras] = useState(2);
  const [publicando, setPublicando] = useState(false);

  // Control del picker
  const [mostrarPickerFecha, setMostrarPickerFecha] = useState(false);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [modalIOS, setModalIOS] = useState(false);
  const [tempFecha, setTempFecha] = useState(new Date());

  const abrirPicker = () => {
    const base = fechaHora ?? (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(15, 0, 0, 0); return d; })();
    setTempFecha(base);
    if (Platform.OS === 'ios') {
      setModalIOS(true);
    } else {
      setMostrarPickerFecha(true);
    }
  };

  const onAndroidFecha = (_: any, fecha?: Date) => {
    setMostrarPickerFecha(false);
    if (fecha) {
      setTempFecha(fecha);
      setMostrarPickerHora(true);
    }
  };

  const onAndroidHora = (_: any, hora?: Date) => {
    setMostrarPickerHora(false);
    if (hora) {
      const resultado = new Date(tempFecha);
      resultado.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
      setFechaHora(resultado);
    }
  };

  const seleccionarCategoria = () => {
    Alert.alert('Categoría', 'Selecciona una categoría',
      CATEGORIAS.map(c => ({ text: `${EMOJI_CAT[c]} ${c}`, onPress: () => setCategoria(c) }))
        .concat([{ text: 'Cancelar', style: 'cancel', onPress: () => {} }])
    );
  };

  const publicar = async () => {
    if (!titulo.trim()) { Alert.alert('Falta', 'Ingresa el nombre de la actividad.'); return; }
    if (!fechaHora) { Alert.alert('Falta', 'Selecciona la fecha y hora.'); return; }
    if (fechaHora <= new Date()) { Alert.alert('Error', 'La fecha debe ser en el futuro.'); return; }
    if (!lugar.trim()) { Alert.alert('Falta', 'Ingresa el lugar.'); return; }

    const min = parseInt(cuposMin), max = parseInt(cuposMax);
    if (isNaN(min) || min < 2) { Alert.alert('Error', 'El mínimo de participantes es 2.'); return; }
    if (isNaN(max) || max > 30) { Alert.alert('Error', 'El máximo de participantes es 30.'); return; }
    if (min > max) { Alert.alert('Error', 'El mínimo no puede ser mayor que el máximo.'); return; }

    setPublicando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión');

      const { error } = await supabase.from('actividades').insert({
        creador_id: user.id,
        titulo: titulo.trim(),
        categoria,
        fecha_hora: fechaHora.toISOString(),
        lugar: lugar.trim(),
        cupos_min: min,
        cupos_max: max,
        recompensa,
        duracion_horas: duracionHoras,
      });

      if (error) throw error;

      setTitulo(''); setFechaHora(null); setLugar('');
      setCuposMin('2'); setCuposMax('10'); setRecompensa('Sin costo'); setDuracionHoras(2);

      Alert.alert('¡Publicada!', 'La actividad ya aparece en el tablón para todos.', [
        { text: 'Ver tablón', onPress: () => router.replace('/(tabs)') },
        { text: 'Crear otra', style: 'cancel' },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo publicar la actividad.');
    } finally {
      setPublicando(false);
    }
  };

  const catColor = CAT_COLOR[categoria] ?? Colors.primary;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Header con gradiente igual al resto de la app */}
      <LinearGradient colors={['#1C0A42', '#0A0A14']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Nueva Actividad</Text>
        <Text style={styles.headerSub}>Completa los datos y publica</Text>
      </LinearGradient>

      <View style={styles.form}>

        {/* Nombre */}
        <Text style={styles.label}>Nombre de la actividad</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Pichanga del sábado"
          placeholderTextColor={Colors.textMuted}
          value={titulo}
          onChangeText={setTitulo}
          maxLength={80}
        />

        {/* Categoría */}
        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity style={[styles.selector, { borderColor: catColor + '55' }]} onPress={seleccionarCategoria}>
          <View style={[styles.catDot, { backgroundColor: catColor }]} />
          <Text style={[styles.selectorText, { color: catColor }]}>{EMOJI_CAT[categoria]} {categoria}</Text>
          <ChevronDown color={Colors.textMuted} size={18} />
        </TouchableOpacity>

        {/* Fecha y hora */}
        <Text style={styles.label}>Fecha y hora</Text>
        <TouchableOpacity style={styles.selector} onPress={abrirPicker}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Calendar color={fechaHora ? Colors.accent : Colors.textMuted} size={18} />
            <Text style={[styles.selectorText, !fechaHora && { color: Colors.textMuted }]}>
              {fechaHora ? formatearFechaBoton(fechaHora) : 'Seleccionar fecha y hora'}
            </Text>
          </View>
          <ChevronDown color={Colors.textMuted} size={18} />
        </TouchableOpacity>

        {Platform.OS === 'android' && mostrarPickerFecha && (
          <DateTimePicker value={tempFecha} mode="date" minimumDate={new Date()} onChange={onAndroidFecha} />
        )}
        {Platform.OS === 'android' && mostrarPickerHora && (
          <DateTimePicker value={tempFecha} mode="time" is24Hour onChange={onAndroidHora} />
        )}

        {Platform.OS === 'ios' && (
          <Modal visible={modalIOS} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecciona fecha y hora</Text>
                  <TouchableOpacity onPress={() => setModalIOS(false)}>
                    <X size={22} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempFecha}
                  mode="datetime"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_, d) => { if (d) setTempFecha(d); }}
                  locale="es-ES"
                  style={{ width: '100%' }}
                />
                <TouchableOpacity
                  style={styles.modalConfirmar}
                  onPress={() => { setFechaHora(tempFecha); setModalIOS(false); }}
                >
                  <Text style={styles.modalConfirmarText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Lugar */}
        <Text style={styles.label}>Lugar</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Campus UCSP, cancha principal"
          placeholderTextColor={Colors.textMuted}
          value={lugar}
          onChangeText={setLugar}
        />

        {/* Cupos */}
        <View style={styles.rowGap}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Mín. participantes</Text>
            <TextInput
              style={styles.inputCenter}
              value={cuposMin}
              onChangeText={setCuposMin}
              keyboardType="numeric"
              maxLength={2}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Máx. participantes</Text>
            <TextInput
              style={styles.inputCenter}
              value={cuposMax}
              onChangeText={setCuposMax}
              keyboardType="numeric"
              maxLength={2}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Condición de asistencia */}
        <Text style={styles.label}>Condición de asistencia</Text>
        <View style={styles.conditionsBox}>
          {RECOMPENSAS.map((r, i) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.conditionRow,
                i < RECOMPENSAS.length - 1 && styles.conditionDivider,
                recompensa === r && styles.conditionRowSelected,
              ]}
              onPress={() => setRecompensa(r)}
            >
              <View style={[styles.radio, recompensa === r && styles.radioSelected]}>
                {recompensa === r && <View style={styles.radioPunto} />}
              </View>
              <Text style={[styles.conditionText, recompensa === r && styles.conditionTextSelected]}>
                {EMOJI_REC[r]} {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duración */}
        <Text style={styles.label}>Duración de la actividad</Text>
        <View style={styles.duracionRow}>
          {[1, 2, 3, 4, 6, 8].map(h => (
            <TouchableOpacity
              key={h}
              style={[styles.duracionBtn, duracionHoras === h && styles.duracionBtnActive]}
              onPress={() => setDuracionHoras(h)}
            >
              <Text style={[styles.duracionTxt, duracionHoras === h && styles.duracionTxtActive]}>
                {h}h
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.duracionHint}>
          ⏱ El chat grupal expira 2h después de que termine la actividad
        </Text>

        {/* Publicar */}
        <TouchableOpacity
          style={[styles.publishButton, publicando && styles.publishButtonDisabled]}
          onPress={publicar}
          disabled={publicando}
        >
          {publicando
            ? <ActivityIndicator color="white" />
            : <Text style={styles.publishButtonText}>Publicar actividad ✓</Text>
          }
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },

  form: { padding: 20 },

  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, marginTop: 20, letterSpacing: 0.5, textTransform: 'uppercase' },

  input: {
    backgroundColor: Colors.card, padding: 14, borderRadius: 12, fontSize: 15,
    color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  inputCenter: {
    backgroundColor: Colors.card, padding: 14, borderRadius: 12, textAlign: 'center',
    fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border, fontWeight: '700',
  },

  selector: {
    backgroundColor: Colors.card, padding: 14, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  selectorText: { fontSize: 15, color: Colors.text, flex: 1 },

  rowGap: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },

  conditionsBox: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  conditionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  conditionDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  conditionRowSelected: { backgroundColor: Colors.primary + '18' },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  conditionText: { fontSize: 14, color: Colors.textSecondary },
  conditionTextSelected: { color: Colors.text, fontWeight: '600' },

  duracionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  duracionBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.elevated, borderWidth: 1, borderColor: Colors.border,
  },
  duracionBtnActive: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  duracionTxt: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  duracionTxtActive: { color: Colors.primaryLight, fontWeight: '700' },
  duracionHint: { color: Colors.textMuted, fontSize: 11, marginTop: 10, marginBottom: 4 },

  publishButton: {
    backgroundColor: Colors.accent, padding: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 32, marginBottom: 50,
  },
  publishButtonDisabled: { opacity: 0.6 },
  publishButtonText: { color: 'white', fontWeight: '700', fontSize: 17 },

  // Modal iOS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: Colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalConfirmar: {
    backgroundColor: Colors.primary, padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 16,
  },
  modalConfirmarText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
