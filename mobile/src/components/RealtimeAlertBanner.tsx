import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { useRealtime } from '../contexts/RealtimeContext';
import { colors } from '../theme/colors';

export const RealtimeAlertBanner: React.FC = () => {
  const { activeAlert, dismissAlert } = useRealtime();

  if (!activeAlert) return null;

  const isAuth = activeAlert.type === 'AUTHORIZED';
  const isDeny = activeAlert.type === 'DENIED';

  const bannerBg = isAuth
    ? '#064E3B' // Verde escuro elegante
    : isDeny
    ? '#7F1D1D' // Vermelho escuro
    : colors.surfaceElevated;

  const borderColor = isAuth
    ? colors.statusAuthorized
    : isDeny
    ? colors.statusDenied
    : colors.primaryLight;

  return (
    <View style={styles.container}>
      <View style={[styles.banner, { backgroundColor: bannerBg, borderColor }]}>
        <View style={styles.iconColumn}>
          {isAuth && <CheckCircle2 size={28} color={colors.statusAuthorized} />}
          {isDeny && <XCircle size={28} color={colors.statusDenied} />}
          {!isAuth && !isDeny && <Info size={28} color={colors.primaryLight} />}
        </View>

        <View style={styles.contentColumn}>
          <Text style={styles.title}>{activeAlert.title}</Text>
          <Text style={styles.message}>{activeAlert.message}</Text>
          {activeAlert.destinationName && (
            <Text style={styles.meta}>
              Destino: <Text style={{ color: colors.white, fontWeight: '700' }}>{activeAlert.destinationName}</Text>
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={dismissAlert} style={styles.closeButton} activeOpacity={0.7}>
          <X size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 35,
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 10,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  iconColumn: {
    marginRight: 12,
  },
  contentColumn: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    lineHeight: 17,
  },
  meta: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
  },
  closeButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});
