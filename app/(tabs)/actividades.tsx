import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Copy, Star, Clock } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

type ActividadMia = {
  id: number;
  titulo: string;
  categoria: string;
  fecha_hora: string;
  lugar: string;
  cupos_min: number;
  cupos_max: number;
  duracion_horas: number;
  estado: string;
  participantes: { id: number }[];
};

const CAT_COLOR: Record<string, string> = {
  Deportes: '#00D191', Estudio: '#F08A35', Ocio: '#4A90E2', Proyectos: '#7C3AED',
};
const CAT_EMOJI: Record<string, string> = {
  Deportes: '⚽', Estudio: '📚', Ocio: '🎮', Proyectos: '💼',
};

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

const chatExpiraEn = (act: ActividadMia): Date =>
  new Date(new Date(act.fecha_hora).getTime() + (act.duracion_horas + 2) * 3600000);

const estaExpirado = (act: ActividadMia): boolean =>
  Date.now() > chatExpiraEn(act).getTime();

const chatActivo = (act: ActividadMia): boolean =>
  act.participantes.length >= act.cupos_min && !estaExpirado(act);

type RatingModalProps = {
  visible: boolean;
  onClose: () => void;
  actividadId: number;
  userId: string;
  onSubmit: (puntuacion: number) => void;
};

function RatingModal({ visible, onClose, actividadId, userId, onSubmit }: RatingModalProps) {
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  const opciones = [
    { puntuacion: 3, emoji: '🌟', label: 'Excelente', color: Colors.success },
    { puntuacion: 2, emoji: '👍', label: 'Buena', color: Colors.accent },
    { puntuacion: 1, emoji: '😐', label: 'Regular', color: Colors.textMuted },
  ];

  const enviar = async () => {
    if (!seleccion) return;
    setEnviando(true);
    try {
      await supabase.from('calificaciones').upsert({
        actividad_id: actividadId,
        calificador_id: userId,
        tipo: 'actividad',
        calificado_id: userId,
        puntuacion: seleccion,
      });
      onSubmit(seleccion);
    } catch { /* silencioso */ } finally { setEnviando(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={mStyles.overlay}>
        <View style={mStyles.modal}>
          <Text style={mStyles.emoji}>🎉</Text>
          <Text style={mStyles.title}>¡Actividad finalizada!</Text>
          <Text style={mStyles.sub}>¿Cómo fue la experiencia?</Text>

          <View style={mStyles.options}>
            {opciones.map(op => (
              <TouchableOpacity
                key={op.puntuacion}
                style={[mStyles.option, seleccion === op.puntuacion && { borderColor: op.color, backgroundColor: op.color + '18' }]}
                onPress={() => setSeleccion(op.puntuacion)}
              >
                <Text style={mStyles.optEmoji}>{op.emoji}</Text>
                <Text style={[mStyles.optLabel, seleccion === op.puntuacion && { color: op.color }]}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[mStyles.submitBtn, (!seleccion || enviando) && { opacity: 0.5 }]}
            onPress={enviar}
            disabled={!seleccion || enviando}
          >
            {enviando
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={mStyles.submitTxt}>Enviar calificación</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={mStyles.skip}>Omitir por ahora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ActividadesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'activos' | 'historial'>('activos');
  const [actividades, setActividades] = useState<ActividadMia[]>([]);
  const [userId, setUserId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [ratingActId, setRatingActId] = useState<number | null>(null);
  const [calificadas, setCalificadas] = useState<Set<number>>(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: myParts } = await supabase
        .from('participantes').select('actividad_id').eq('usuario_id', user.id);
      const actIds = (myParts ?? []).map((p: any) => p.actividad_id);
      if (actIds.length === 0) { setActividades([]); return; }

      const { data } = await supabase
        .from('actividades')
        .select('id,titulo,categoria,fecha_hora,lugar,cupos_min,cupos_max,duracion_horas,estado,participantes(id)')
        .in('id', actIds);

      if (data) setActividades(data as ActividadMia[]);

      // Ver cuáles ya están calificadas
      const { data: cals } = await supabase
        .from('calificaciones')
        .select('actividad_id')
        .eq('calificador_id', user.id)
        .eq('tipo', 'actividad');
      if (cals) setCalificadas(new Set(cals.map((c: any) => c.actividad_id)));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const activos = actividades.filter(a => !estaExpirado(a));
  const historial = actividades.filter(a => estaExpirado(a));
  const lista = tab === 'activos' ? activos : historial;

  const clonarActividad = async (act: ActividadMia) => {
    Alert.alert('Clonar actividad', `¿Crear una copia de "${act.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Clonar', onPress: async () => {
          try {
            const mañana = new Date(act.fecha_hora);
            mañana.setDate(mañana.getDate() + 7);
            const { error } = await supabase.from('actividades').insert({
              creador_id: userId,
              titulo: act.titulo,
              categoria: act.categoria,
              fecha_hora: mañana.toISOString(),
              lugar: act.lugar,
              cupos_min: act.cupos_min,
              cupos_max: act.cupos_max,
              duracion_horas: act.duracion_horas,
              recompensa: 'Sin costo',
            });
            if (error) throw error;
            Alert.alert('¡Clonada!', 'La actividad se programó para la próxima semana.');
            cargar();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: act }: { item: ActividadMia }) => {
    const color = CAT_COLOR[act.categoria] ?? Colors.primary;
    const count = act.participantes.length;
    const expira = chatExpiraEn(act);
    const chat = chatActivo(act);
    const expirado = estaExpirado(act);
    const yaCalificada = calificadas.has(act.id);

    const destino = () => {
      if (tab === 'historial') return router.push(`/activity/${act.id}`);
      // Activos: si chat activo → chat directo, si no → info
      if (chat) return router.push(`/chat/${act.id}` as any);
      return router.push(`/activity/${act.id}`);
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={destino}
        activeOpacity={0.88}
      >
        <View style={[styles.cardLeft, { backgroundColor: color }]}>
          <Text style={styles.cardEmoji}>{CAT_EMOJI[act.categoria] ?? '📌'}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{act.titulo}</Text>
          <View style={styles.metaRow}>
            <Clock size={11} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatFecha(act.fecha_hora)}</Text>
          </View>
          <Text style={styles.metaParticipantes}>{count} participante{count !== 1 ? 's' : ''}</Text>

          {/* Etiqueta de estado */}
          {!expirado && chat && (
            <View style={[styles.badge, { backgroundColor: Colors.success + '22' }]}>
              <Text style={[styles.badgeText, { color: Colors.success }]}>💬 Chat activo</Text>
            </View>
          )}
          {!expirado && !chat && count < act.cupos_min && (
            <View style={[styles.badge, { backgroundColor: Colors.warning + '22' }]}>
              <Text style={[styles.badgeText, { color: Colors.warning }]}>
                ⏳ Esperando {act.cupos_min - count} más
              </Text>
            </View>
          )}
          {expirado && (
            <View style={[styles.badge, { backgroundColor: Colors.textMuted + '22' }]}>
              <Text style={[styles.badgeText, { color: Colors.textMuted }]}>Finalizada</Text>
            </View>
          )}
        </View>

        {/* Acciones del lado derecho */}
        <View style={styles.cardActions}>
          {!expirado && chat && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: color + '22' }]}
              onPress={() => router.push(`/chat/${act.id}` as any)}
            >
              <MessageSquare size={18} color={color} />
            </TouchableOpacity>
          )}
          {expirado && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: Colors.primary + '22' }]}
              onPress={() => clonarActividad(act)}
            >
              <Copy size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {expirado && !yaCalificada && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: Colors.accent + '22', marginTop: 6 }]}
              onPress={() => setRatingActId(act.id)}
            >
              <Star size={18} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1C0A42', '#0A0A14']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Mis Actividades</Text>

        {/* Pestañas */}
        <View style={styles.tabs}>
          {(['activos', 'historial'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'activos' ? `Activos (${activos.length})` : `Historial (${historial.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {cargando ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 40 }} />
      ) : lista.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{tab === 'activos' ? '⚡' : '📋'}</Text>
          <Text style={styles.emptyTitle}>
            {tab === 'activos' ? 'Sin actividades activas' : 'Sin historial'}
          </Text>
          <Text style={styles.emptySub}>
            {tab === 'activos'
              ? 'Únete o crea una actividad para verla aquí.'
              : 'Las actividades finalizadas aparecerán aquí.'}
          </Text>
          {tab === 'activos' && (
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/(tabs)/create' as any)}
            >
              <Text style={styles.ctaBtnText}>Crear nueva actividad</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={a => a.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 100 }}
        />
      )}

      <RatingModal
        visible={ratingActId !== null}
        onClose={() => setRatingActId(null)}
        actividadId={ratingActId ?? 0}
        userId={userId}
        onSubmit={(p) => {
          setCalificadas(prev => new Set([...prev, ratingActId!]));
          setRatingActId(null);
          Alert.alert('¡Gracias!', p === 3 ? '¡Qué buena actividad! 🌟' : p === 2 ? 'Gracias por tu opinión 👍' : 'Anotado para mejorar 📝');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 0, paddingHorizontal: 20 },
  headerTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 4 },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.accent },
  tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: Colors.accent },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, marginBottom: 10,
    flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  cardLeft: { width: 50, justifyContent: 'center', alignItems: 'center' },
  cardEmoji: { fontSize: 20 },
  cardContent: { flex: 1, padding: 12 },
  cardTitle: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  metaText: { color: Colors.textSecondary, fontSize: 11 },
  metaParticipantes: { color: Colors.textMuted, fontSize: 11, marginBottom: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardActions: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, gap: 4 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyEmoji: { fontSize: 54, marginBottom: 14 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  ctaBtn: {
    backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12,
  },
  ctaBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28, alignItems: 'center',
    borderTopWidth: 1, borderColor: Colors.border,
  },
  emoji: { fontSize: 42, marginBottom: 8 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  sub: { color: Colors.textSecondary, fontSize: 14, marginBottom: 24 },
  options: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  option: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.elevated,
  },
  optEmoji: { fontSize: 26, marginBottom: 6 },
  optLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  submitBtn: {
    backgroundColor: Colors.accent, width: '100%', padding: 15,
    borderRadius: 14, alignItems: 'center', marginBottom: 12,
  },
  submitTxt: { color: 'white', fontWeight: '700', fontSize: 15 },
  skip: { color: Colors.textMuted, fontSize: 13 },
});
