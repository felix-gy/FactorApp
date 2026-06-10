import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { MapPin, Clock, Users, ChevronLeft, CheckCircle, LogOut, MessageSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';
import { BottomNav } from '../../components/BottomNav';

type Participante = {
  id: number;
  usuario_id: string;
  rol: string;
  perfiles: { nombre: string } | null;
};

type Actividad = {
  id: number;
  titulo: string;
  categoria: string;
  fecha_hora: string;
  lugar: string;
  estado: string;
  cupos_min: number;
  cupos_max: number;
  recompensa: string;
  creador_id: string;
  participantes: Participante[];
};

const CAT_COLOR: Record<string, string> = {
  Deportes: '#00D191', Estudio: '#F08A35', Ocio: '#4A90E2', Proyectos: '#7C3AED',
};
const CAT_EMOJI: Record<string, string> = {
  Deportes: '⚽', Estudio: '📚', Ocio: '🎮', Proyectos: '💼',
};

const iniciales = (n: string) => {
  const p = n.trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
};

const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

export default function ActivityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cargando, setCargando] = useState(true);
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [userId, setUserId] = useState('');
  const [accionando, setAccionando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('actividades')
        .select('id,titulo,categoria,fecha_hora,lugar,estado,cupos_min,cupos_max,recompensa,creador_id,participantes(id,usuario_id,rol,perfiles(nombre))')
        .eq('id', id)
        .single();
      if (data) setActividad(data as Actividad);
    } finally { setCargando(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (cargando) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }
  if (!actividad) {
    return (
      <View style={s.loading}>
        <Text style={{ color: Colors.textSecondary }}>Actividad no encontrada.</Text>
      </View>
    );
  }

  const yaUnido = actividad.participantes.some(p => p.usuario_id === userId);
  const esCreador = actividad.creador_id === userId;
  const count = actividad.participantes.length;
  const lleno = count >= actividad.cupos_max;
  const chatAbierto = count >= actividad.cupos_min;
  const color = CAT_COLOR[actividad.categoria] ?? Colors.primary;
  const progreso = Math.min(count / actividad.cupos_max, 1);

  const unirse = async () => {
    setAccionando(true);
    try {
      const { error } = await supabase.from('participantes').insert({
        actividad_id: Number(id), usuario_id: userId, rol: 'asistente',
      });
      if (error) throw error;
      await cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo unir.');
    } finally { setAccionando(false); }
  };

  const salir = () => {
    Alert.alert('Salir', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive', onPress: async () => {
          setAccionando(true);
          try {
            await supabase.from('participantes')
              .delete().eq('actividad_id', Number(id)).eq('usuario_id', userId);
            await cargar();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'No se pudo salir.');
          } finally { setAccionando(false); }
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      {/* Header con degradado */}
      <LinearGradient
        colors={[color, Colors.background]}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ChevronLeft color="white" size={26} />
        </TouchableOpacity>
        <Text style={s.headerEmoji}>{CAT_EMOJI[actividad.categoria] ?? '📌'}</Text>
        <Text style={s.headerTitle} numberOfLines={2}>{actividad.titulo}</Text>
        <Text style={s.headerSub}>{actividad.categoria} · UCSP</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>

        {/* Info básica */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <Clock size={15} color={color} />
            <Text style={s.infoText}>{formatearFecha(actividad.fecha_hora)}</Text>
          </View>
          <View style={s.infoRow}>
            <MapPin size={15} color={color} />
            <Text style={s.infoText}>{actividad.lugar}</Text>
          </View>
          <View style={s.infoRow}>
            <Users size={15} color={color} />
            <Text style={s.infoText}>{count}/{actividad.cupos_max} participantes · mín. {actividad.cupos_min}</Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={s.card}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progreso * 100}%` as any, backgroundColor: color }]} />
          </View>
          {count < actividad.cupos_min && (
            <Text style={s.quorumHint}>
              ⏳ Faltan {actividad.cupos_min - count} persona{actividad.cupos_min - count !== 1 ? 's' : ''} para el quórum
            </Text>
          )}
        </View>

        {/* Condición */}
        <View style={[s.card, s.row]}>
          <CheckCircle size={15} color={color} />
          <Text style={s.rewardText}>{actividad.recompensa}</Text>
        </View>

        {/* Participantes */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Participantes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {actividad.participantes.map(p => (
              <View key={p.id} style={s.avatarWrap}>
                <View style={[s.avatar, { backgroundColor: p.rol === 'organizador' ? color : Colors.elevated }]}>
                  <Text style={s.avatarTxt}>{iniciales(p.perfiles?.nombre ?? '?')}</Text>
                </View>
                <Text style={s.avatarName} numberOfLines={1}>
                  {p.perfiles?.nombre?.split(' ')[0] ?? '—'}
                </Text>
                {p.rol === 'organizador' && <Text style={[s.avatarRole, { color }]}>★ org.</Text>}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Chat grupal */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Chat Grupal</Text>
          {chatAbierto ? (
            yaUnido ? (
              <TouchableOpacity
                style={[s.chatBtn, { backgroundColor: color }]}
                onPress={() => router.push(`/chat/${actividad.id}` as any)}
              >
                <MessageSquare size={17} color="white" />
                <Text style={s.chatBtnTxt}>Abrir chat grupal</Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.chatHint}>🔒 Únete para acceder al chat</Text>
            )
          ) : (
            <Text style={s.chatHint}>
              💬 El chat se activa con {actividad.cupos_min} participantes ({count}/{actividad.cupos_min})
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Barra inferior: acción + navegación */}
      <View style={s.bottomArea}>
        <View style={s.actionRow}>
          {esCreador ? (
            <View style={[s.actionBtn, { backgroundColor: Colors.elevated }]}>
              <Text style={[s.actionTxt, { color: Colors.primary }]}>★ Eres el organizador</Text>
            </View>
          ) : yaUnido ? (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.error + '20' }]} onPress={salir} disabled={accionando}>
              {accionando ? <ActivityIndicator size="small" color={Colors.error} /> : (
                <>
                  <LogOut size={16} color={Colors.error} />
                  <Text style={[s.actionTxt, { color: Colors.error, marginLeft: 8 }]}>Salir de la actividad</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: lleno || actividad.estado !== 'abierto' ? Colors.elevated : color }]}
              onPress={unirse}
              disabled={lleno || accionando || actividad.estado !== 'abierto'}
            >
              {accionando ? <ActivityIndicator size="small" color="white" /> : (
                <Text style={s.actionTxt}>
                  {lleno ? 'Actividad llena' : actividad.estado !== 'abierto' ? 'Cerrada' : '✓ Quiero unirme'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <BottomNav />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingBottom: 24, paddingHorizontal: 20 },
  back: { marginBottom: 10 },
  headerEmoji: { fontSize: 28, marginBottom: 4 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  card: {
    backgroundColor: Colors.card, marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  infoText: { color: Colors.textSecondary, fontSize: 14, flex: 1, lineHeight: 20 },
  progressBg: { height: 7, backgroundColor: Colors.elevated, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  quorumHint: { color: Colors.warning, fontSize: 12, marginTop: 7 },
  rewardText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  avatarWrap: { alignItems: 'center', marginRight: 14, width: 52 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: 'white', fontWeight: '700', fontSize: 14 },
  avatarName: { color: Colors.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center' },
  avatarRole: { fontSize: 9, textAlign: 'center', fontWeight: '600' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 10 },
  chatBtnTxt: { color: 'white', fontWeight: '700', fontSize: 14 },
  chatHint: { color: Colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  bottomArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  actionRow: { padding: 12 },
  actionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 12 },
  actionTxt: { color: 'white', fontWeight: '700', fontSize: 15 },
});
