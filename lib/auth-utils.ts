// NUEVO: Archivo compartido con la función de advertencia de correo no institucional.
// Se usa tanto en login.tsx (celular, Alert nativo) como en index.tsx (web, mensaje inline).
import { Alert, Platform } from 'react-native';

// NUEVO: Muestra advertencia cuando el correo no es @ucsp.edu.pe
// En celular usa Alert.alert nativo con botón "Entendido"
// En web esta función solo se usa como fallback desde login.tsx (el flujo principal
// de web usa un banner inline para evitar que Chrome bloquee window.alert)
export const mostrarAdvertenciaCorreo = () => {
  if (Platform.OS === 'web') {
    window.alert(
      '⚠️ Correo no institucional\n\nNecesitas iniciar sesión con un correo de la UCSP (@ucsp.edu.pe).\n\nEjemplo: tu.nombre@ucsp.edu.pe'
    );
  } else {
    Alert.alert(
      '⚠️ Correo no institucional',
      'Necesitas iniciar sesión con un correo de la UCSP.\n\nEjemplo: tu.nombre@ucsp.edu.pe',
      [{ text: 'Entendido', style: 'default' }]
    );
  }
};
// HASTA AQUI LO NUEVO
