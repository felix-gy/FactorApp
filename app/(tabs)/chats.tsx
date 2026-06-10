import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MessageSquare, Users } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

type ChatActivo = {
  id: number;
  titulo: string;
  categoria: string;
  cupos_min: number;
  cupos_max: number;
  participantes: { id: number }[];
};

const COLOR_CAT: Record<string, string> = {
  Deportes: '#00D191', Estudio: '#F08A35', Ocio: '#4A90E2', Proyectos: '#7B3FE4',
};
const EMOJI_CAT: Record<string, string> = {
  Deportes: '⚽', Estudio: '📚', Ocio: '🎮', Proyectos: '💼',
};

export default function ChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatActivo[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myParts } = await supabase
        .from('participantes')
        .select('actividad_id')
        .eq('usuario_id', user.id);

      const actIds = (myParts ?? []).map((p: any) => p.actividad_id);
      if (actIds.length === 0) { setChats([]); return; }

      const { data: acts } = await supabase
        .from('actividades')
        .select('id, titulo, categoria, cupos_min, cupos_max, participantes(id)')
        .in('id', actIds)
        .eq('estado', 'abierto');

      const abiertos = (acts ?? []).filter(
        (a: any) => a.participantes.length >= a.cupos_min
      );
      setChats(abiertos as ChatActivo[]);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const renderChat = ({ item }: { item: ChatActivo }) => {
    const color = COLOR_CAT[item.categoria] ?? Colors.primary;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/chat/${item.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Text style={styles.emoji}>{EMOJI_CAT[item.categoria] ?? '📌'}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.titulo}</Text>
          <View style={styles.metaRow}>
            <Users size={12} color="#888" />
            <Text style={styles.metaText}>{item.participantes.length} participantes</Text>
            <View style={styles.activoBadge}>
              <Text style={styles.activoText}>Chat activo</Text>
            </View>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats Grupales</Text>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <MessageSquare size={50} color="#CCC" />
          <Text style={styles.emptyTitle}>Sin chats activos</Text>
          <Text style={styles.emptySubtitle}>
            Los chats se abren cuando el grupo alcanza el mínimo de participantes requeridos.
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id.toString()}
          renderItem={renderChat}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { backgroundColor: Colors.background, padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  card: {
    backgroundColor: 'white', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F5', gap: 12,
  },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#888' },
  activoBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  activoText: { fontSize: 10, color: '#2E7D32', fontWeight: '700' },
  chevron: { fontSize: 24, color: '#CCC', marginRight: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },
});
