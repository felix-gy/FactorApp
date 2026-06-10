import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MapPin, Clock, Users, X } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW * 0.82;

type Actividad = {
  id: number;
  titulo: string;
  categoria: string;
  fecha_hora: string;
  lugar: string;
  cupos_min: number;
  cupos_max: number;
  creador_id: string;
  participantes: { id: number; usuario_id: string }[];
};

const CAT_COLOR: Record<string, string> = {
  Deportes: '#00D191', Estudio: '#F08A35', Ocio: '#4A90E2', Proyectos: '#7C3AED',
};
const CAT_EMOJI: Record<string, string> = {
  Deportes: '⚽', Estudio: '📚', Ocio: '🎮', Proyectos: '💼',
};
const CATEGORIAS = ['Todas', 'Deportes', 'Estudio', 'Ocio', 'Proyectos'];

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });

const saludar = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export default function ExplorarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [userId, setUserId] = useState('');
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [cargando, setCargando] = useState(true);
  const [uniendose, setUniendose] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: p } = await supabase
          .from('perfiles').select('nombre').eq('id', user.id).single();
        if (p) setNombre(p.nombre.split(' ')[0]);
      }

      let q = supabase
        .from('actividades')
        .select('id,titulo,categoria,fecha_hora,lugar,cupos_min,cupos_max,creador_id,participantes(id,usuario_id)')
        .eq('estado', 'abierto')
        .order('fecha_hora', { ascending: true });

      if (categoria !== 'Todas') q = q.eq('categoria', categoria);
      if (busqueda.trim()) q = q.ilike('titulo', `%${busqueda.trim()}%`);

      const { data } = await q;
      if (data) setActividades(data as Actividad[]);
    } finally {
      setCargando(false);
    }
  }, [categoria, busqueda]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const unirse = async (act: Actividad) => {
    setUniendose(act.id);
    try {
      await supabase.from('participantes').insert({
        actividad_id: act.id, usuario_id: userId, rol: 'asistente',
      });
      await cargar();
    } catch { /* silencioso */ } finally { setUniendose(null); }
  };

  const renderCard = ({ item: act }: { item: Actividad }) => {
    const count = act.participantes.length;
    const lleno = count >= act.cupos_max;
    const yaUnido = act.participantes.some(p => p.usuario_id === userId);
    const esCreador = act.creador_id === userId;
    const color = CAT_COLOR[act.categoria] ?? Colors.primary;
    const progreso = Math.min(count / act.cupos_max, 1);
    const cargandoEste = uniendose === act.id;

    return (
      <TouchableOpacity
        style={[styles.card, { width: CARD_W }]}
        onPress={() => router.push(`/activity/${act.id}`)}
        activeOpacity={0.9}
      >
        <View style={[styles.cardStripe, { backgroundColor: color }]} />
        <View style={styles.cardBody}>

          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>{CAT_EMOJI[act.categoria] ?? '📌'}</Text>
            <View style={[styles.catPill, { backgroundColor: color + '25' }]}>
              <Text style={[styles.catPillText, { color }]}>{act.categoria}</Text>
            </View>
            {lleno && (
              <View style={styles.llenoBadge}>
                <Text style={styles.llenoText}>Lleno</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{act.titulo}</Text>

          <View style={styles.metaRow}>
            <Clock size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatFecha(act.fecha_hora)}</Text>
          </View>
          <View style={styles.metaRow}>
            <MapPin size={13} color={Colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{act.lugar}</Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progreso * 100}%` as any, backgroundColor: color }]} />
            </View>
            <View style={styles.progressRow}>
              <Users size={11} color={Colors.textMuted} />
              <Text style={styles.progressText}>{count}/{act.cupos_max} cupos</Text>
              {count < act.cupos_min && (
                <Text style={[styles.progressText, { color: Colors.warning }]}>
                  · mín {act.cupos_min}
                </Text>
              )}
            </View>
          </View>

          {esCreador ? (
            <View style={[styles.actionBtn, { backgroundColor: Colors.elevated }]}>
              <Text style={[styles.actionBtnTxt, { color: Colors.primary }]}>★ Tu actividad</Text>
            </View>
          ) : yaUnido ? (
            <View style={[styles.actionBtn, { backgroundColor: Colors.success + '22' }]}>
              <Text style={[styles.actionBtnTxt, { color: Colors.success }]}>✓ Unido</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: lleno ? Colors.elevated : color },
                cargandoEste && { opacity: 0.6 },
              ]}
              onPress={() => !lleno && !cargandoEste && unirse(act)}
              disabled={lleno || cargandoEste}
            >
              {cargandoEste
                ? <ActivityIndicator size="small" color="white" />
                : <Text style={styles.actionBtnTxt}>{lleno ? 'Lleno' : 'Unirme'}</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header degradado */}
      <LinearGradient colors={['#1C0A42', '#0A0A14']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.greeting}>
          {saludar()}{nombre ? `, ${nombre}` : ''} 👋
        </Text>
        <Text style={styles.headerSub}>¿Qué hacemos hoy en la UCSP?</Text>

        <View style={styles.searchBar}>
          <Search color={Colors.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar actividades..."
            placeholderTextColor={Colors.textMuted}
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={cargar}
            returnKeyType="search"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <X color={Colors.textMuted} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Tags de categoría */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagsWrap}
        contentContainerStyle={styles.tagsContent}
      >
        {CATEGORIAS.map(cat => {
          const activo = categoria === cat;
          const c = cat === 'Todas' ? Colors.accent : (CAT_COLOR[cat] ?? Colors.primary);
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.tag, activo && { backgroundColor: c, borderColor: c }]}
              onPress={() => setCategoria(cat)}
            >
              {cat !== 'Todas' && <Text>{CAT_EMOJI[cat]}</Text>}
              <Text style={[styles.tagText, activo && { color: 'white' }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Contador */}
      {!cargando && actividades.length > 0 && (
        <Text style={styles.feedLabel}>
          {actividades.length} actividad{actividades.length !== 1 ? 'es' : ''} disponible{actividades.length !== 1 ? 's' : ''}
        </Text>
      )}

      {/* Feed de tarjetas */}
      {cargando ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 48 }} />
      ) : actividades.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Sin actividades</Text>
          <Text style={styles.emptySub}>
            {busqueda
              ? `No hay resultados para "${busqueda}"`
              : 'No hay actividades abiertas en esta categoría.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={actividades}
          keyExtractor={a => a.id.toString()}
          renderItem={renderCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + 16}
          decelerationRate="fast"
          contentContainerStyle={styles.feedList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 22, paddingHorizontal: 20 },
  greeting: { color: Colors.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { color: Colors.textSecondary, fontSize: 14, marginTop: 3, marginBottom: 18 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  tagsWrap: { marginTop: 16, flexGrow: 0 },
  tagsContent: { paddingHorizontal: 16, gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  tagText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  feedLabel: { color: Colors.textMuted, fontSize: 12, paddingHorizontal: 20, marginTop: 14, marginBottom: 6 },
  feedList: { paddingHorizontal: 16, paddingBottom: 100, gap: 16, alignItems: 'flex-start' },
  card: {
    backgroundColor: Colors.card, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  cardStripe: { height: 4 },
  cardBody: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardEmoji: { fontSize: 20 },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catPillText: { fontSize: 11, fontWeight: '700' },
  llenoBadge: { marginLeft: 'auto' as any, backgroundColor: Colors.error + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  llenoText: { fontSize: 10, color: Colors.error, fontWeight: '700' },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: '700', marginBottom: 10, lineHeight: 23 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  metaText: { color: Colors.textSecondary, fontSize: 12, flex: 1 },
  progressSection: { marginTop: 12, marginBottom: 14 },
  progressBg: { height: 5, backgroundColor: Colors.elevated, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  progressText: { color: Colors.textMuted, fontSize: 11 },
  actionBtn: { padding: 13, borderRadius: 12, alignItems: 'center' },
  actionBtnTxt: { color: 'white', fontWeight: '700', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 50, marginBottom: 14 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
