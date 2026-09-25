import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import {
  Clock,
  CheckCircle,
  XCircle,
  Users,
  LogOut,
  Plus,
  Home,
  Settings,
  User,
  ChevronRight,
  ShieldCheck,
  CalendarCheck,
  BarChart3,
  MessageSquare,
  QrCode,
  Package,
  Bell,
  Building2,
  Shield,
  Layers,
  UserCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../config/api';
import { NewRequestModal } from './NewRequestModal';
import { OpenRequestsScreen } from './OpenRequestsScreen';
import { PreAuthorizationsScreen } from './PreAuthorizationsScreen';
import { PresentVisitorsScreen } from './PresentVisitorsScreen';
import { PackagesScreen } from '../packages/PackagesScreen';
import { WhatsAppConfigScreen } from '../admin/WhatsAppConfigScreen';
import { UsersManagementScreen } from '../admin/UsersManagementScreen';
import { ClientsManagementScreen } from '../admin/ClientsManagementScreen';
import { ReportsScreen } from '../reports/ReportsScreen';
import { useRealtime } from '../../contexts/RealtimeContext';

export const DashboardScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'pending' | 'present' | 'packages' | 'reports' | 'whatsapp' | 'settings' | 'users_mgmt' | 'clients_mgmt'
  >('dashboard');
  const [packagesCount, setPackagesCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [summary, setSummary] = useState({
    pendingCount: 0,
    authorizedCount: 0,
    presentCount: 0,
    deniedTodayCount: 0,
  });

  const { addListener } = useRealtime();

  const fetchSummary = async () => {
    try {
      const [summaryRes, pkgsRes] = await Promise.allSettled([
        api.get('/visit-requests/summary'),
        api.get('/packages/pending'),
      ]);
      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.data) {
        setSummary(summaryRes.value.data.data);
      }
      if (pkgsRes.status === 'fulfilled' && pkgsRes.value.data?.data) {
        setPackagesCount(pkgsRes.value.data.data.length || 0);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchSummary();
    const unsubCreated = addListener('visit_request:created', fetchSummary);
    const unsubUpdated = addListener('visit_request:updated', fetchSummary);
    const unsubPkgCreated = addListener('package:created', fetchSummary);
    const unsubPkgPicked = addListener('package:picked_up', fetchSummary);
    const interval = setInterval(fetchSummary, 15000);
    return () => {
      unsubCreated();
      unsubUpdated();
      unsubPkgCreated();
      unsubPkgPicked();
      clearInterval(interval);
    };
  }, [addListener]);

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 12);

  const renderContent = () => {
    if (activeTab === 'pending') return <OpenRequestsScreen />;
    if (activeTab === 'present') return <PresentVisitorsScreen />;
    if (activeTab === 'packages') return <PackagesScreen onBack={() => setActiveTab('dashboard')} />;
    if (activeTab === 'whatsapp') return <WhatsAppConfigScreen onBack={() => setActiveTab('settings')} />;
    if (activeTab === 'users_mgmt') return <UsersManagementScreen onBack={() => setActiveTab('settings')} />;
    if (activeTab === 'clients_mgmt') return <ClientsManagementScreen onBack={() => setActiveTab('settings')} />;
    if (activeTab === 'preauthorizations') return <PreAuthorizationsScreen onBack={() => setActiveTab('settings')} />;
    if (activeTab === 'reports') return <ReportsScreen />;
    if (activeTab === 'settings') {
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#F8FAFC' }}
          contentContainerStyle={{ padding: 18, paddingBottom: bottomInset + 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header do Menu */}
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsSectionTitle}>Painel & Cadastros</Text>
            <Text style={styles.settingsSectionSubtitle}>
              Cadastre e gerencie a equipe da portaria, moradores e integrações.
            </Text>
          </View>

          {/* Card 1: Cadastrar & Gerenciar Porteiros */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setActiveTab('users_mgmt')}
            activeOpacity={0.85}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <UserCheck size={22} color="#1D4ED8" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.menuCardTitle}>Cadastrar & Gerenciar Porteiros</Text>
              <Text style={styles.menuCardSubtitle}>
                Adicione operadores, defina senhas e perfis de acesso.
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Card 2: Cadastrar & Gerenciar Moradores */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setActiveTab('clients_mgmt')}
            activeOpacity={0.85}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#DCFCE7' }]}>
              <Building2 size={22} color="#16A34A" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.menuCardTitle}>Cadastrar & Gerenciar Moradores</Text>
              <Text style={styles.menuCardSubtitle}>
                Cadastre apartamentos, residentes e números de WhatsApp.
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Card 3: Conexão WhatsApp */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setActiveTab('whatsapp')}
            activeOpacity={0.85}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#EDE9FE' }]}>
              <MessageSquare size={22} color="#7C3AED" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.menuCardTitle}>Conexão WhatsApp (Baileys)</Text>
              <Text style={styles.menuCardSubtitle}>
                Aparelhos conectados, QR Code ao vivo e status.
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Card 4: Pré-Autorizações Agendadas */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setActiveTab('preauthorizations')}
            activeOpacity={0.85}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <CalendarCheck size={22} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.menuCardTitle}>Pré-Autorizações Agendadas</Text>
              <Text style={styles.menuCardSubtitle}>
                Visitas pré-cadastradas para o dia de hoje.
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Card 5: Logout */}
          <TouchableOpacity
            style={styles.settingsLogoutBtn}
            onPress={signOut}
            activeOpacity={0.85}
          >
            <LogOut size={18} color={colors.statusDenied} />
            <Text style={styles.settingsLogoutBtnText}>Sair da Conta</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // Dashboard Tab (Design Exato do Mockup)
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho Azul Marinho Profundo */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {/* Avatar + Saudação */}
            <View style={styles.userProfileRow}>
              <View style={styles.avatarCircle}>
                <User size={24} color={colors.white} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.greetingTitle}>
                  Olá, {user?.name ? user.name.split(' ')[0] : 'Porteiro'}
                </Text>
                <Text style={styles.greetingSubtitle}>Portaria</Text>
              </View>
            </View>

            {/* Ações da Direita: Notificações (Sino) & Configurações (Engrenagem) */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => setActiveTab('pending')}
                activeOpacity={0.75}
              >
                <Bell size={22} color={colors.white} />
                {summary.pendingCount > 0 && <View style={styles.notificationDot} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerIconButton, { marginLeft: 10 }]}
                onPress={() => setActiveTab('settings')}
                activeOpacity={0.75}
              >
                <Settings size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Conteúdo Principal com Fundo Cinza Suave */}
        <View style={styles.bodyContainer}>
          {/* Ação Principal: Nova Visita */}
          <TouchableOpacity
            style={styles.primaryActionCard}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.88}
          >
            <View style={styles.primaryActionIconBg}>
              <Plus size={30} color={colors.white} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.primaryActionTitle}>Nova Visita</Text>
              <Text style={styles.primaryActionSubtitle}>
                Registrar chegada de visitante ou prestador de serviço
              </Text>
            </View>
            <ChevronRight size={22} color="#94A3B8" />
          </TouchableOpacity>

          {/* Cards Lado a Lado: Agendados & Encomendas */}
          <View style={styles.secondaryCardsRow}>
            {/* Card Agendados */}
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={() => setActiveTab('preauthorizations')}
              activeOpacity={0.85}
            >
              <View style={[styles.secondaryIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <CalendarCheck size={26} color="#D97706" />
              </View>
              <Text style={styles.secondaryCardTitle}>Agendados</Text>
              <Text style={styles.secondaryCardSubtitle}>Pré-autorizações</Text>
            </TouchableOpacity>

            {/* Card Encomendas */}
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={() => setActiveTab('packages')}
              activeOpacity={0.85}
            >
              <View style={[styles.secondaryIconCircle, { backgroundColor: '#EDE9FE' }]}>
                <Package size={26} color="#7C3AED" />
                {packagesCount > 0 && (
                  <View style={styles.secondaryBadge}>
                    <Text style={styles.secondaryBadgeText}>{packagesCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.secondaryCardTitle}>Encomendas</Text>
              <Text style={styles.secondaryCardSubtitle}>Recebimentos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F203D" />

      <View style={styles.container}>
        {renderContent()}

        {/* Barra de Navegação Inferior Exata do Mockup com Proteção de Insets Android */}
        <View style={[styles.bottomTabBar, { paddingBottom: bottomInset }]}>
          {/* 1. Início */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.8}
          >
            <Home
              size={22}
              color={activeTab === 'dashboard' ? '#2563EB' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'dashboard' && styles.tabLabelActive,
              ]}
            >
              Início
            </Text>
            {activeTab === 'dashboard' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          {/* 2. Aguardando */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.8}
          >
            <View>
              <Clock
                size={22}
                color={activeTab === 'pending' ? '#2563EB' : '#94A3B8'}
              />
              {summary.pendingCount > 0 && (
                <View style={styles.tabBadgeDot}>
                  <Text style={styles.tabBadgeText}>{summary.pendingCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'pending' && styles.tabLabelActive,
              ]}
            >
              Aguardando
            </Text>
            {activeTab === 'pending' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          {/* 3. Presentes */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('present')}
            activeOpacity={0.8}
          >
            <Users
              size={22}
              color={activeTab === 'present' ? '#2563EB' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'present' && styles.tabLabelActive,
              ]}
            >
              Presentes
            </Text>
            {activeTab === 'present' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          {/* 4. Relatórios */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.8}
          >
            <BarChart3
              size={22}
              color={activeTab === 'reports' ? '#2563EB' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'reports' && styles.tabLabelActive,
              ]}
            >
              Relatórios
            </Text>
            {activeTab === 'reports' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          {/* 5. Menu */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <Settings
              size={22}
              color={activeTab === 'settings' ? '#2563EB' : '#94A3B8'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'settings' && styles.tabLabelActive,
              ]}
            >
              Menu
            </Text>
            {activeTab === 'settings' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>

        <NewRequestModal
          visible={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchSummary();
            setActiveTab('pending');
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F203D',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  // Cabeçalho Azul Marinho
  header: {
    backgroundColor: '#0F203D',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 22,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  // Corpo da Página
  bodyContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // Card Organização
  organizationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 12,
  },
  organizationText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  // Card Ação Principal: Nova Visita
  primaryActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  primaryActionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  secondaryCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  secondaryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  secondaryCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  secondaryBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  secondaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  accessOverviewCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 16,
  },
  accessHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  accessHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accessIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#0F203D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  accessHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  // 3 Colunas de Métricas
  metricsContainer: {
    flexDirection: 'row',
    paddingTop: 14,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  metricValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },

  // Atalhos Principais (Grid 4 colunas)
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  shortcutCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  shortcutCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  shortcutBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    paddingHorizontal: 5,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  shortcutBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Banner Auditoria & Segurança
  auditSecurityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  auditIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0F203D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  auditSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Seção Orientações da Portaria
  guidanceSection: {
    marginBottom: 16,
  },
  guidanceSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  guidanceScroll: {
    paddingRight: 10,
  },
  guidanceCard: {
    width: 250,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  guidanceBadgeBlue: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  guidanceBadgeBlueText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
  },
  guidanceBadgeGreen: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  guidanceBadgeGreenText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },
  guidanceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  guidanceCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  guidanceBtnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F203D',
    borderRadius: 8,
    paddingVertical: 9,
  },
  guidanceBtnDarkText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  guidanceBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 9,
  },
  guidanceBtnGreenText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '700',
  },

  // Bottom Navigation Bar Exata do Mockup
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  activeTabIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2563EB',
    marginTop: 4,
  },
  tabBadgeDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    height: 16,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.white,
  },
  tabBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },

  // Menu / Configurações Hub Administrativo
  settingsHeader: {
    marginBottom: 16,
  },
  settingsSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  settingsSectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  settingsLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 18,
  },
  settingsLogoutBtnText: {
    color: colors.statusDenied,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});
