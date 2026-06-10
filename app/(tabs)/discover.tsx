import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Search, Trophy, BookOpen, Gamepad2, Briefcase, MapPin, Clock, Users } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

type Actividad = {
  id: number;
  titulo: string;
  categoria: string;
  fecha_hora: string;
  lugar: string;
  cupos_min: number;
  cupos_max: number;
  participantes: { id: number }[];
};

const CATEGORIAS = [
  { nombre: 'Todas',     icono: Search,    color: Colors.primary },
  { nombre: 'Deportes',  icono: Trophy,    color: '#00D191' },
  { nombre: 'Estudio',   icono: BookOpen,  color: '#F08A35' },
  { nombre: 'Ocio',      icono: Gamepad2,  color: '#4A90E2' },
  { nombre: 'Proyectos', icono: Briefcase, color: '#7B3FE4' },
];

const EMOJI_CAT: Record<string, string> = {
  Deportes: '⚽', Estudio: '📚', Ocio: '🎮', Proyectos: '💼',
};
const COLOR_CAT: Record<string, string> = {
  Deportes: '#00D191', Estudio: '#F08A35', Ocio: '#4A90E2', Proyectos: '#7B3FE4',
};

const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

export default function DiscoverScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      let query = supabase
        .from('actividades')
        .select('id, titulo, categoria, fecha_hora, lugar, cupos_min, cupos_max, participantes(id)')
        .eq('estado', 'abierto')
        .order('fecha_hora', { ascending: true });

      if (categoriaActiva !== 'Todas') {
        query = query.eq('categoria', categoriaActiva);
      }
      if (busqueda.trim()) {
        query = query.ilike('titulo', `%${busqueda.trim()}%`);
      }

      const { data } = await query;
      if (data) setActividades(data as Actividad[]);
    } finally {
      setCargando(false);
    }
  }, [categoriaActiva, busqueda]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const renderActividad = ({ item }: { item: Actividad }) => {
    const color = COLOR_CAT[item.categoria] ?? Colors.primary;
    const count = item.participantes.length;
    const lleno = count >= item.cupos_max;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/activity/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={[styles.categoryBar, { backgroundColor: color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.emoji}>{EMOJI_CAT[item.categoria] ?? '📌'}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.titulo}</Text>
            {lleno && (
              <View style={styles.lleno}>
                <Text style={styles.llenoText}>Lleno</Text>
              </View>
            )}
          </View>
          <View style={styles.infoRow}>
            <Clock size={12} color="#888" />
            <Text style={styles.infoText}>{formatearFecha(item.fecha_hora)}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={12} color="#888" />
            <Text style={styles.infoText} numberOfLines={1}>{item.lugar}</Text>
          </View>
          <View style={styles.infoRow}>
            <Users size={12} color="#888" />
            <Text style={styles.infoText}>{count}/{item.cupos_max} participantes</Text>
          </View>
        </View>
        <View style={[styles.verBtn, { backgroundColor: color }]}>
          <Text style={styles.verText}>Ver →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Descubrir</Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search color="#999" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar actividades..."
            placeholderTextColor="#999"
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={cargar}
            returnKeyType="search"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Text style={{ color: '#999', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros de categoría */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {CATEGORIAS.map(cat => {
            const activa = categoriaActiva === cat.nombre;
            const Icono = cat.icono;
            return (
              <TouchableOpacity
                key={cat.nombre}
                style={[styles.filterBtn, activa && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setCategoriaActiva(cat.nombre)}
              >
                <Icono size={15} color={activa ? 'white' : '#666'} />
                <Text style={[styles.filterText, activa && { color: 'white' }]}>{cat.nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contador */}
      {!cargando && (
        <Text style={styles.contador}>
          {actividades.length === 0
            ? 'Sin resultados'
            : `${actividades.length} actividad${actividades.length !== 1 ? 'es' : ''} encontrada${actividades.length !== 1 ? 's' : ''}`
          }
        </Text>
      )}

      {/* Lista */}
      {cargando ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : actividades.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Sin actividades</Text>
          <Text style={styles.emptySubtitle}>
            {busqueda ? `No hay resultados para "${busqueda}"` : 'No hay actividades abiertas en esta categoría.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={actividades}
          keyExtractor={item => item.id.toString()}
          renderItem={renderActividad}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { backgroundColor: Colors.background, padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  searchSection: { padding: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  filterScroll: { marginTop: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#EEE' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#666' },
  contador: { paddingHorizontal: 16, marginBottom: 8, color: '#999', fontSize: 12, fontStyle: 'italic' },
  card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  categoryBar: { width: 5 },
  cardContent: { flex: 1, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  emoji: { fontSize: 15 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E', flex: 1 },
  lleno: { backgroundColor: '#FF3B3020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  llenoText: { fontSize: 10, color: '#FF3B30', fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  infoText: { fontSize: 11, color: '#666', flex: 1 },
  verBtn: { justifyContent: 'center', paddingHorizontal: 14, opacity: 0.9 },
  verText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 46, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#999', textAlign: 'center' },
});
