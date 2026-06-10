import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, ShieldCheck, Trophy, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

type Perfil = { nombre: string; carrera: string; tasa_asistencia: number };

const iniciales = (n: string) => {
  const p = n.trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
};

const LOGROS = [
  { id: 'a1', emoji: '⚡', titulo: 'Activador',   desc: '1ª actividad',      color: '#F59E0B', min: (t: number) => t >= 1 },
  { id: 'a5', emoji: '🤝', titulo: 'Social',       desc: '5 actividades',     color: '#4A90E2', min: (t: number) => t >= 5 },
  { id: 'a10',emoji: '🏆', titulo: 'Frecuente',    desc: '10 actividades',    color: '#F97316', min: (t: number) => t >= 10 },
  { id: 'as80',emoji:'📅', titulo: 'Constante',    desc: '80%+ asistencia',   color: '#10B981', min: (_: number, a: number) => a >= 80 },
  { id: 'as95',emoji:'⭐', titulo: 'Confiable',    desc: '95%+ asistencia',   color: '#7C3AED', min: (_: number, a: number) => a >= 95 },
  { id: 'org', emoji: '🎯', titulo: 'Organizador', desc: '3+ creadas',        color: '#EF4444', min: (_: number, __: number, o: number) => o >= 3 },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [total, setTotal] = useState(0);
  const [organizadas, setOrganizadas] = useState(0);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase
        .from('perfiles').select('nombre,carrera,tasa_asistencia').eq('id', user.id).single();
      if (p) setPerfil(p);

      const { count: ct } = await supabase
        .from('participantes').select('id', { count: 'exact', head: true }).eq('usuario_id', user.id).eq('estado_asistencia', 'asistio');
      setTotal(ct ?? 0);

      const { count: co } = await supabase
        .from('actividades').select('id', { count: 'exact', head: true }).eq('creador_id', user.id);
      setOrganizadas(co ?? 0);
    } finally { setCargando(false); }
  };

  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const tasa = perfil?.tasa_asistencia ?? 0;
  const rep = total === 0 ? null : (1 + (tasa / 100) * 4).toFixed(1);
  const nombre = perfil?.nombre ?? '—';
  const logros = LOGROS.map(l => ({ ...l, obtenido: l.min(total, tasa, organizadas) }));
  const nLogros = logros.filter(l => l.obtenido).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>

      {/* Header */}
      <LinearGradient colors={['#1C0A42', '#0A0A14']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <LinearGradient colors={['#F97316', '#7C3AED']} style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciales(nombre)}</Text>
        </LinearGradient>
        <Text style={styles.name}>{nombre}</Text>
        <View style={styles.ucspBadge}>
          <ShieldCheck size={13} color="#3DA9FC" />
          <Text style={styles.ucspText}>Estudiante UCSP verificado</Text>
        </View>
        {perfil?.carrera ? <Text style={styles.carrera}>{perfil.carrera}</Text> : null}
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Actividades', value: total.toString(), color: Colors.text },
          { label: 'Reputación',  value: rep ?? '—',       color: Colors.accent },
          { label: 'Asistencia',  value: total > 0 ? `${tasa}%` : '—', color: Colors.success },
        ].map((s, i) => (
          <View key={s.label} style={[styles.statBox, i > 0 && styles.statDivider]}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Barra de reputación */}
      {rep && (
        <View style={styles.section}>
          <View style={styles.secRow}>
            <Star size={15} color={Colors.accent} />
            <Text style={styles.secTitle}>Reputación</Text>
            <Text style={[styles.secTitle, { color: Colors.accent, marginLeft: 'auto' as any }]}>{rep}/5.0</Text>
          </View>
          <View style={styles.repBg}>
            <LinearGradient
              colors={['#F97316', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.repFill, { width: `${(parseFloat(rep) / 5) * 100}%` as any }]}
            />
          </View>
          <Text style={styles.repHint}>Basado en tu tasa de asistencia</Text>
        </View>
      )}

      {/* Logros */}
      <View style={styles.section}>
        <View style={styles.secRow}>
          <Trophy size={15} color={Colors.accent} />
          <Text style={styles.secTitle}>Logros</Text>
          <Text style={[styles.secTitle, { color: Colors.textMuted, marginLeft: 'auto' as any }]}>{nLogros}/{logros.length}</Text>
        </View>
        <View style={styles.logrosGrid}>
          {logros.map(l => (
            <View key={l.id} style={[styles.logroCard, !l.obtenido && { opacity: 0.45 }]}>
              <View style={[styles.logroCircle, { backgroundColor: l.obtenido ? l.color + '28' : Colors.elevated }]}>
                <Text style={{ fontSize: 22 }}>{l.emoji}</Text>
              </View>
              <Text style={styles.logroTitulo}>{l.titulo}</Text>
              <Text style={styles.logroDesc}>{l.desc}</Text>
              {l.obtenido && <View style={[styles.dot, { backgroundColor: l.color }]} />}
            </View>
          ))}
        </View>
      </View>

      {/* Logout */}
      <View style={[styles.section, { paddingTop: 8 }]}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert('Cerrar sesión', '¿Seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
          ])}
        >
          <LogOut color={Colors.error} size={18} />
          <Text style={styles.logoutTxt}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', paddingBottom: 30 },
  avatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { color: 'white', fontSize: 36, fontWeight: '800' },
  name: { color: Colors.text, fontSize: 22, fontWeight: '700', marginBottom: 10 },
  ucspBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#3DA9FC18', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#3DA9FC44', marginBottom: 6,
  },
  ucspText: { color: '#3DA9FC', fontSize: 12, fontWeight: '600' },
  carrera: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  section: { paddingHorizontal: 20, paddingTop: 22 },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  secTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  repBg: { height: 8, backgroundColor: Colors.elevated, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  repFill: { height: '100%', borderRadius: 4 },
  repHint: { color: Colors.textMuted, fontSize: 11 },
  logrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  logroCard: {
    width: '30%', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, position: 'relative',
  },
  logroCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 7 },
  logroTitulo: { color: Colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  logroDesc: { color: Colors.textMuted, fontSize: 9, textAlign: 'center' },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error + '44',
    padding: 15, borderRadius: 14,
  },
  logoutTxt: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
