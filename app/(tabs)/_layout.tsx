import { Tabs } from 'expo-router';
import { Compass, Plus, Zap, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0D0D1A',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Explorar',
        tabBarIcon: ({ color }) => <Compass color={color} size={22} strokeWidth={1.8} />,
      }} />

      <Tabs.Screen name="create" options={{
        title: 'Crear',
        tabBarIcon: ({ color }) => <Plus color={color} size={22} strokeWidth={1.8} />,
      }} />

      <Tabs.Screen name="actividades" options={{
        title: 'Actividades',
        tabBarIcon: ({ color }) => <Zap color={color} size={22} strokeWidth={1.8} />,
      }} />

      <Tabs.Screen name="profile" options={{
        title: 'Perfil',
        tabBarIcon: ({ color }) => <User color={color} size={22} strokeWidth={1.8} />,
      }} />

      {/* Rutas ocultas del tab bar */}
      <Tabs.Screen name="discover"    options={{ href: null }} />
      <Tabs.Screen name="groups"      options={{ href: null }} />
      <Tabs.Screen name="chats"       options={{ href: null }} />
    </Tabs>
  );
}
