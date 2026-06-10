import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Animated, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, MapPin, Clock, Users, ChevronDown, CheckCircle } from 'lucide-react-native';
import { Colors } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';
import { BottomNav } from '../../components/BottomNav';

type Mensaje = {
  id: number;
  contenido: string;
  fecha_envio: string;
  usuario_id: string;
  perfiles: { nombre: string } | null;
};

type Participante = {
  id: number;
  usuario_id: string;
  rol: string;
  perfiles: { nombre: string } | null;
};

type ActInfo = {
  titulo: string;
  categoria: string;
  fecha_hora: string;
  lugar: string;
  cupos_min: number;
  cupos_max: number;
  duracion_horas: number;
  recompensa: string;
  participantes: Participante[];
};

const CAT_COLOR: Record<string, string> = {
  Deportes: '#00D191', Estudio: '#F08A35', Ocio: '#4A90E2', Proyectos: '#7C3AED',
};

const iniciales = (n: string) => {
  const p = n.trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
};

const nombreCorto = (n: string) => {
  const p = n.trim().split(/\s+/);
  if (p.length >= 4) return `${p[0]} ${p[2]}`;
  return p.slice(0, 2).join(' ');
};

const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

const formatCountdown = (ms: number) => {
  if (ms <= 0) return 'Expirado';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [act, setAct] = useState<ActInfo | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [userId, setUserId] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [infoVisible, setInfoVisible] = useState(false);
  const [expiraEn, setExpiraEn] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');
  const flatRef = useRef<FlatList>(null);
  const infoAnim = useRef(new Animated.Value(0)).current;
  const ultimoCount = useRef(0);

  // Carga la info de la actividad (una sola vez al montar)
  const cargarInfo = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: actData } = await supabase
        .from('actividades')
        .select('titulo,categoria,fecha_hora,lugar,cupos_min,cupos_max,duracion_horas,recompensa,participantes(id,usuario_id,rol,perfiles(nombre))')
        .eq('id', id)
        .single();

      if (actData) {
        setAct(actData as ActInfo);
        const exp = new Date(
          new Date(actData.fecha_hora).getTime() +
          ((actData.duracion_horas ?? 2) + 2) * 3600000
        );
        setExpiraEn(exp);
      }
    } finally { setCargando(false); }
  }, [id]);

  // Carga solo mensajes (usado en el polling)
  const cargarMensajes = useCallback(async () => {
    const { data: msgs } = await supabase
      .from('mensajes')
      .select('id,contenido,fecha_envio,usuario_id,perfiles(nombre)')
      .eq('actividad_id', id)
      .order('fecha_envio', { ascending: true });
    if (msgs) setMensajes(msgs as Mensaje[]);
  }, [id]);

  // Polling: recarga mensajes cada 2.5s mientras el chat está enfocado.
  // Más confiable que Realtime WebSocket en RN/Expo y suficiente para un chat.
  useFocusEffect(useCallback(() => {
    cargarInfo();
    cargarMensajes();
    const intervalo = setInterval(() => { cargarMensajes(); }, 2500);
    return () => clearInterval(intervalo);
  }, [cargarInfo, cargarMensajes]));

  useEffect(() => {
    if (!expiraEn) return;
    const tick = () => setCountdown(formatCountdown(expiraEn.getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiraEn]);

  // Scroll al fondo solo cuando llegan mensajes nuevos (no en cada poll)
  useEffect(() => {
    if (mensajes.length > ultimoCount.current) {
      const animar = ultimoCount.current > 0; // primera carga sin animación
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: animar }), 80);
    }
    ultimoCount.current = mensajes.length;
  }, [mensajes]);

  const toggleInfo = () => {
    Animated.spring(infoAnim, {
      toValue: infoVisible ? 0 : 1,
      useNativeDriver: false,
      tension: 70, friction: 12,
    }).start();
    setInfoVisible(v => !v);
  };

  const enviarMensaje = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    const contenido = texto.trim();
    setTexto('');
    try {
      const { error } = await supabase.from('mensajes').insert({
        actividad_id: Number(id), usuario_id: userId, contenido,
      });
      if (error) throw error;
      await cargarMensajes();
    } catch (e: any) {
      setTexto(contenido);
      Alert.alert('Error', e.message ?? 'No se pudo enviar.');
    } finally { setEnviando(false); }
  };

  const color = CAT_COLOR[act?.categoria ?? ''] ?? Colors.primary;

  if (cargando) {
    return (
      <View style={[s.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const infoPanelHeight = infoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, act ? Math.min(120 + (act.participantes?.length ?? 0) * 8, 280) : 200],
  });

  const count = act?.participantes?.length ?? 0;
  const progreso = act ? Math.min(count / act.cupos_max, 1) : 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header estilo WhatsApp */}
      <View style={[s.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft color="white" size={26} />
        </TouchableOpacity>

        <TouchableOpacity style={s.headerCenter} onPress={toggleInfo} activeOpacity={0.8}>
          <Text style={s.headerTitle} numberOfLines={1}>{act?.titulo ?? 'Chat'}</Text>
          <View style={s.headerSubRow}>
            <Text style={s.headerSub}>{act?.categoria} · {count} participantes</Text>
            <Animated.View style={{
              transform: [{ rotate: infoAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }]
            }}>
              <ChevronDown color="rgba(255,255,255,0.8)" size={14} />
            </Animated.View>
          </View>
        </TouchableOpacity>

        {countdown ? (
          <View style={s.countdownPill}>
            <Text style={s.countdownTxt}>⏱ {countdown}</Text>
          </View>
        ) : null}
      </View>

      {/* Panel de información completo (se despliega al tocar el header) */}
      <Animated.View style={[s.infoPanel, { maxHeight: infoPanelHeight, backgroundColor: color }]}>
        <ScrollView style={s.infoPanelScroll} scrollEnabled={false}>
          {act && (
            <View style={s.infoPanelInner}>
              <View style={s.infoRow}>
                <Clock size={13} color="rgba(255,255,255,0.8)" />
                <Text style={s.infoTxt}>{formatFecha(act.fecha_hora)}</Text>
              </View>
              <View style={s.infoRow}>
                <MapPin size={13} color="rgba(255,255,255,0.8)" />
                <Text style={s.infoTxt}>{act.lugar}</Text>
              </View>
              <View style={s.infoRow}>
                <CheckCircle size={13} color="rgba(255,255,255,0.8)" />
                <Text style={s.infoTxt}>{act.recompensa} · Duración {act.duracion_horas}h</Text>
              </View>
              {/* Barra de cupos */}
              <View style={s.infoRow}>
                <Users size={13} color="rgba(255,255,255,0.8)" />
                <Text style={s.infoTxt}>{count}/{act.cupos_max} cupos · mín. {act.cupos_min}</Text>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${progreso * 100}%` as any }]} />
              </View>
              {/* Avatares de participantes */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {(act.participantes ?? []).map(p => (
                  <View key={p.id} style={s.avatarWrap}>
                    <View style={[s.avatar, { backgroundColor: p.rol === 'organizador' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)' }]}>
                      <Text style={s.avatarTxt}>{iniciales(p.perfiles?.nombre ?? '?')}</Text>
                    </View>
                    <Text style={s.avatarName} numberOfLines={1}>
                      {p.perfiles?.nombre?.split(' ')[0] ?? '—'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Área de mensajes + input (se comprime cuando abre el teclado) */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Mensajes */}
        {mensajes.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>Sé el primero en escribir 👋</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={mensajes}
            keyExtractor={m => m.id.toString()}
            contentContainerStyle={s.msgList}
            renderItem={({ item: m, index }) => {
              const esMio = m.usuario_id === userId;
              const anterior = mensajes[index - 1];
              const mostrarNombre = !esMio && (
                index === 0 || anterior?.usuario_id !== m.usuario_id
              );
              return (
                <View style={[s.msgRow, esMio && s.msgRowMio]}>
                  <View style={[s.bubble, esMio ? [s.bubbleMio, { backgroundColor: color }] : s.bubbleOtro]}>
                    {mostrarNombre && (
                      <Text style={[s.senderName, { color }]}>
                        {nombreCorto(m.perfiles?.nombre ?? 'Usuario')}
                      </Text>
                    )}
                    <Text style={[s.msgTxt, esMio && s.msgTxtMio]}>{m.contenido}</Text>
                    <Text style={[s.msgHora, esMio && s.msgHoraMio]}>{formatHora(m.fecha_envio)}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input bar — sube con el teclado */}
        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={s.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={Colors.textMuted}
            value={texto}
            onChangeText={setTexto}
            returnKeyType="send"
            onSubmitEditing={enviarMensaje}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: color }, (!texto.trim() || enviando) && s.sendDisabled]}
            onPress={enviarMensaje}
            disabled={!texto.trim() || enviando}
          >
            {enviando
              ? <ActivityIndicator size="small" color="white" />
              : <Send size={18} color="white" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Navegación inferior */}
      <BottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { color: 'white', fontSize: 15, fontWeight: '700' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  countdownPill: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countdownTxt: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600' },

  // Info panel
  infoPanel: { overflow: 'hidden' },
  infoPanelScroll: {},
  infoPanelInner: { padding: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoTxt: { color: 'rgba(255,255,255,0.92)', fontSize: 12, flex: 1, lineHeight: 17 },
  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 3 },
  avatarWrap: { alignItems: 'center', marginRight: 10, width: 44 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: 'white', fontWeight: '700', fontSize: 12 },
  avatarName: { color: 'rgba(255,255,255,0.8)', fontSize: 9, marginTop: 3, textAlign: 'center' },

  // Mensajes
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTxt: { color: Colors.textMuted, fontSize: 14 },
  msgList: { paddingHorizontal: 12, paddingVertical: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 3 },
  msgRowMio: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  bubbleMio: { borderBottomRightRadius: 3 },
  bubbleOtro: { backgroundColor: Colors.card, borderBottomLeftRadius: 3, borderWidth: 1, borderColor: Colors.border },
  senderName: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  msgTxt: { fontSize: 14, color: Colors.text, lineHeight: 19 },
  msgTxtMio: { color: 'white' },
  msgHora: { fontSize: 10, color: Colors.textMuted, marginTop: 3, textAlign: 'right' },
  msgHoraMio: { color: 'rgba(255,255,255,0.6)' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingTop: 10,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    color: Colors.text, maxHeight: 100, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  sendDisabled: { opacity: 0.35 },
});
