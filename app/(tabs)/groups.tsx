import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Clock, MapPin, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

type MiParticipacion = {
  rol: string;
  actividades: {
    id: number;
    titulo: string;
    categoria: string;
    fecha_hora: string;
    lugar: string;
    estado: string;
    cupos_min: number;
    cupos_max: number;
  };
};

const EMOJI_CAT: Record<string, string> = {
  Deportes: '⚽', Estudio: '📚', Ocio: '🎮', Proyectos: '💼',
};
const COLOR_CAT: Record<string, string> = {
  Deportes: '#00D191', Estudio: '#F08A35', Ocio: '#4A90E2', Proyectos: '#7B3FE4',
};
const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  abierto:    { label: 'Abierto',    color: '#00D191' },
  confirmado: { label: 'Confirmado', color: '#4A90E2' },
  cerrado:    { label: 'Cerrado',    color: '#999' },
  cancelado:  { label: 'Cancelado',  color: '#E53935' },
};

const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

export default function GroupsScreen() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [participaciones, setParticipaciones] = useState<MiParticipacion[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('participantes')
        .select('rol, actividades(id, titulo, categoria, fecha_hora, lugar, estado, cupos_min, cupos_max)')
        .eq('usuario_id', user.id)
        .order('fecha_union', { ascending: false });

      if (data) setParticipaciones(data as MiParticipacion[]);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const renderItem = ({ item }: { item: MiParticipacion }) => {
    const act = item.actividades;
    const color = COLOR_CAT[act.categoria] ?? Colors.primary;
    const est = ESTADO_LABEL[act.estado] ?? { label: act.estado, color: '#999' };
    const esOrganizador = item.rol === 'organizador';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/activity/${act.id}`)}
        activeOpacity={0.85}
      >
        <View style={[styles.categoryBar, { backgroundColor: color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.emoji}>{EMOJI_CAT[act.categoria] ?? '📌'}</Text>
            <Text style={styles.titulo} numberOfLines={1}>{act.titulo}</Text>
            <View style={[styles.rolBadge, { backgroundColor: esOrganizador ? Colors.primary : '#E8F5E9' }]}>
              <Text style={[styles.rolText, { color: esOrganizador ? 'white' : '#2E7D32' }]}>
                {esOrganizador ? 'Tuya' : 'Unido'}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Clock size={12} color="#888" />
            <Text style={styles.infoText}>{formatearFecha(act.fecha_hora)}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={12} color="#888" />
            <Text style={styles.infoText} numberOfLines={1}>{act.lugar}</Text>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: `${est.color}20` }]}>
            <Text style={[styles.estadoText, { color: est.color }]}>{est.label}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#CCC" style={{ alignSelf: 'center', marginRight: 12 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Actividades</Text>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : participaciones.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏕️</Text>
          <Text style={styles.emptyTitle}>Sin actividades aún</Text>
          <Text style={styles.emptySubtitle}>Crea una actividad o únete a una desde el tablón.</Text>
        </View>
      ) : (
        <FlatList
          data={participaciones}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { backgroundColor: Colors.background, padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  card: { backgroundColor: 'white', borderRadius: 14, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  categoryBar: { width: 6 },
  cardContent: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  emoji: { fontSize: 16 },
  titulo: { fontSize: 15, fontWeight: 'bold', color: '#1A1A2E', flex: 1 },
  rolBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rolText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  infoText: { fontSize: 12, color: '#666', flex: 1 },
  estadoBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center' },
});
