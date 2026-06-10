import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, Plus, Zap, User } from 'lucide-react-native';
import { Colors } from '../constants/Theme';

const TABS = [
  { label: 'Explorar',    href: '/(tabs)',             icon: Compass },
  { label: 'Crear',       href: '/(tabs)/create',      icon: Plus    },
  { label: 'Actividades', href: '/(tabs)/actividades', icon: Zap     },
  { label: 'Perfil',      href: '/(tabs)/profile',     icon: User    },
];

export function BottomNav() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(tab => {
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.label}
            style={s.tab}
            onPress={() => router.push(tab.href as any)}
            activeOpacity={0.7}
          >
            <Icon color={Colors.textMuted} size={22} strokeWidth={1.8} />
            <Text style={s.label}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
});
