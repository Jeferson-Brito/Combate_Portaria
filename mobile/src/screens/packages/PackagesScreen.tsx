import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Package,
  Plus,
  Building,
  KeyRound,
  CheckCircle2,
  Clock,
  Send,
  X,
  Truck,
  User,
  Barcode,
  ArrowLeft,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../config/api';

interface PackagesScreenProps {
  onBack?: () => void;
}

export const PackagesScreen: React.FC<PackagesScreenProps> = ({ onBack }) => {
  const [packages, setPackages] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Novo Pacote
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedDestId, setSelectedDestId] = useState('');
  const [carrier, setCarrier] = useState('Mercado Livre');
  const [trackingCode, setTrackingCode] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [sender, setSender] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Retirada com Código
  const [selectedPackageForPickup, setSelectedPackageForPickup] = useState<any | null>(null);
  const [inputPickupCode, setInputPickupCode] = useState('');
  const [pickedUpBy, setPickedUpBy] = useState('');
  const [isPickingUp, setIsPickingUp] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pkgsRes, destsRes] = await Promise.all([
        api.get('/packages/pending'),
        api.get('/destinations'),
      ]);

      setPackages(pkgsRes.data.data || []);
      const destList = destsRes.data.data?.destinations || destsRes.data.data || [];
      setDestinations(destList);
      if (destList.length > 0 && !selectedDestId) {
        setSelectedDestId(destList[0].id);
      }
    } catch (err) {
      console.warn('Erro ao carregar encomendas:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePackage = async () => {
    if (!selectedDestId) {
      Alert.alert('Atenção', 'Selecione a unidade de destino da encomenda.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/packages', {
        destinationId: selectedDestId,
        carrier,
        trackingCode: trackingCode.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        sender: sender.trim() || undefined,
      });

      if (res.data.success) {
        Alert.alert(
          '📦 Encomenda Recebida!',
          `Código de retirada ${res.data.data.pickupCode} enviado automaticamente para o WhatsApp do morador.`
        );
        setIsNewModalOpen(false);
        setTrackingCode('');
        setRecipientName('');
        setSender('');
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message || 'Falha ao registrar encomenda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!inputPickupCode.trim() || inputPickupCode.length !== 4) {
      Alert.alert('Atenção', 'Digite o código de 4 dígitos informado pelo morador.');
      return;
    }

    try {
      setIsPickingUp(true);
      const res = await api.post(`/packages/${selectedPackageForPickup.id}/pickup`, {
        pickupCode: inputPickupCode.trim(),
        pickedUpBy: pickedUpBy.trim() || undefined,
      });

      if (res.data.success) {
        Alert.alert('✅ Sucesso', 'Encomenda entregue ao morador com sucesso!');
        setSelectedPackageForPickup(null);
        setInputPickupCode('');
        setPickedUpBy('');
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Erro na Retirada', err.response?.data?.message || 'Código incorreto!');
    } finally {
      setIsPickingUp(false);
    }
  };

  const handleResendCode = async (pkgId: string) => {
    try {
      await api.post(`/packages/${pkgId}/resend-code`);
      Alert.alert('Enviado', 'Lembrete com código de retirada reenviado pelo WhatsApp.');
    } catch (err: any) {
      Alert.alert('Aviso', err.response?.data?.message || 'Não foi possível reenviar.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Nubank */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          <View style={styles.iconCircle}>
            <Package size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Controle de Encomendas</Text>
            <Text style={styles.headerSubtitle}>
              Recebimento de pacotes e código de retirada seguro
            </Text>
          </View>
        </View>

        {/* Botão + Receber Pacote */}
        <TouchableOpacity
          style={styles.receiveBtn}
          onPress={() => setIsNewModalOpen(true)}
          activeOpacity={0.85}
        >
          <Plus size={20} color={colors.primary} />
          <Text style={styles.receiveBtnText}>Receber Nova Encomenda</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Encomendas Aguardando Retirada */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando encomendas na portaria...</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={48} color={colors.statusAuthorized} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Nenhuma encomenda pendente</Text>
              <Text style={styles.emptySub}>
                Todas as encomendas foram retiradas pelos moradores.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.packageCard}>
              <View style={styles.cardHeader}>
                <View style={styles.carrierBadge}>
                  <Truck size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.carrierText}>{item.carrier || 'Encomenda'}</Text>
                </View>
                <Text style={styles.codeText}>{item.code}</Text>
              </View>

              <View style={styles.destRow}>
                <Building size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.destName}>
                  {item.destination?.name} {item.destination?.block ? `(${item.destination.block})` : ''}
                </Text>
                {item.client?.name && (
                  <Text style={styles.clientName}> — {item.client.name}</Text>
                )}
              </View>

              {item.trackingCode && (
                <View style={styles.detailRow}>
                  <Barcode size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={styles.detailText}>Rastreio: {item.trackingCode}</Text>
                </View>
              )}

              <View style={styles.timeRow}>
                <Clock size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.timeText}>
                  Recebido em {new Date(item.receivedAt).toLocaleDateString()} às{' '}
                  {new Date(item.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {/* Botões de Ação */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={() => handleResendCode(item.id)}
                >
                  <Send size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.resendText}>Reenviar Código</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickupBtn}
                  onPress={() => setSelectedPackageForPickup(item)}
                >
                  <KeyRound size={15} color={colors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.pickupBtnText}>Entregar Pacote</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal: Receber Encomenda */}
      <Modal visible={isNewModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receber Encomenda</Text>
              <TouchableOpacity onPress={() => setIsNewModalOpen(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Unidade / Destino *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {destinations.map((d: any) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.destChip, selectedDestId === d.id && styles.destChipActive]}
                    onPress={() => setSelectedDestId(d.id)}
                  >
                    <Text style={[styles.destChipText, selectedDestId === d.id && styles.destChipTextActive]}>
                      {d.name} {d.block ? `(${d.block})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Transportadora / Loja</Text>
              <View style={styles.carrierGrid}>
                {['Mercado Livre', 'Amazon', 'Correios', 'Shopee', 'Loggi', 'Outro'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.carrierOption, carrier === c && styles.carrierOptionActive]}
                    onPress={() => setCarrier(c)}
                  >
                    <Text style={[styles.carrierOptionText, carrier === c && styles.carrierOptionTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Código de Rastreio (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: BR123456789"
                placeholderTextColor={colors.textMuted}
                value={trackingCode}
                onChangeText={setTrackingCode}
              />

              <Text style={styles.label}>Nome do Destinatário (na etiqueta)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Carlos Santos"
                placeholderTextColor={colors.textMuted}
                value={recipientName}
                onChangeText={setRecipientName}
              />

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleCreatePackage}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Confirmar e Avisar Morador</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Entregar Pacote (Validação do Código) */}
      <Modal visible={!!selectedPackageForPickup} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 360 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Retirada</Text>
              <TouchableOpacity onPress={() => setSelectedPackageForPickup(null)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pickupHint}>
              Solicite ao morador o código de 4 dígitos que ele recebeu no WhatsApp para o pacote{' '}
              <Text style={{ fontWeight: '700' }}>{selectedPackageForPickup?.code}</Text>.
            </Text>

            <Text style={styles.label}>Código de 4 Dígitos *</Text>
            <TextInput
              style={styles.pickupCodeInput}
              placeholder="0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              value={inputPickupCode}
              onChangeText={setInputPickupCode}
            />

            <Text style={styles.label}>Quem está retirando? (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do morador ou familiar"
              placeholderTextColor={colors.textMuted}
              value={pickedUpBy}
              onChangeText={setPickedUpBy}
            />

            <TouchableOpacity
              style={[styles.submitBtn, isPickingUp && { opacity: 0.7 }]}
              onPress={handleConfirmPickup}
              disabled={isPickingUp}
            >
              {isPickingUp ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Liberar Entrega</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F1F5',
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  receiveBtn: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  receiveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  packageCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  carrierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4EBFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  carrierText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  destName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clientName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  resendBtn: {
    flex: 1,
    backgroundColor: '#F4EBFB',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pickupBtn: {
    flex: 1.3,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 8,
  },
  destChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    marginRight: 8,
  },
  destChipActive: {
    backgroundColor: colors.primary,
  },
  destChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  destChipTextActive: {
    color: colors.white,
  },
  carrierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  carrierOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  carrierOptionActive: {
    backgroundColor: '#F4EBFB',
    borderColor: colors.primary,
  },
  carrierOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  carrierOptionTextActive: {
    color: colors.primary,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  pickupCodeInput: {
    backgroundColor: '#F4EBFB',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 10,
    color: colors.primary,
    height: 60,
    marginBottom: 12,
  },
  pickupHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
