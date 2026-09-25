import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Clock,
  CircleCheck,
  CircleX,
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
  Package,
  Bell,
  Building2,
  UserCheck,
  LogIn,
  Car,
  Building,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../config/api';
import { NewRequestModal } from './NewRequestModal';
import { OpenRequestsScreen } from './OpenRequestsScreen';
import { PreAuthorizationsScreen } from './PreAuthorizationsScreen';
import { PresentVisitorsScreen } from './PresentVisitorsScreen';
import { AuthorizedRequestsScreen } from './AuthorizedRequestsScreen';
import { NotificationsModal } from './NotificationsModal';
import { PackagesScreen } from '../packages/PackagesScreen';
import { WhatsAppConfigScreen } from '../admin/WhatsAppConfigScreen';
import { UsersManagementScreen } from '../admin/UsersManagementScreen';
import { ClientsManagementScreen } from '../admin/ClientsManagementScreen';
import { OrganizationProfileScreen } from '../admin/OrganizationProfileScreen';
import { ReportsScreen } from '../reports/ReportsScreen';
import { AppHeader } from '../../components/AppHeader';
import { useRealtime, RealtimeAlert } from '../../contexts/RealtimeContext';

export const DashboardScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'pending'
    | 'authorized'
    | 'present'
    | 'packages'
    | 'reports'
    | 'whatsapp'
    | 'settings'
    | 'users_mgmt'
    | 'clients_mgmt'
    | 'preauthorizations'
    | 'org_profile'
  >('dashboard');
  const [orgProfile, setOrgProfile] = useState<{
    companyName?: string;
    unitLabel?: string;
    clientLabel?: string;
    type?: string;
  }>({});
  const [packagesCount, setPackagesCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeAlert[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [entryProcessingId, setEntryProcessingId] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    pendingCount: 0,
    authorizedCount: 0,
    presentCount: 0,
    deniedTodayCount: 0,
  });

  const { addListener } = useRealtime();

  const fetchSummaryAndRequests = useCallback(async () => {
    try {
      setIsLoadingRequests(true);
      const [summaryRes, pkgsRes, historyRes] = await Promise.allSettled([
        api.get('/visit-requests/summary'),
        api.get('/packages/pending'),
        api.get('/visit-requests/history?limit=30'),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.data) {
        setSummary(summaryRes.value.data.data);
      }
      if (pkgsRes.status === 'fulfilled' && pkgsRes.value.data?.data) {
        setPackagesCount(pkgsRes.value.data.data.length || 0);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value.data?.data?.requests) {
        const list = historyRes.value.data.data.requests;
        // Ordena: PENDING sempre no topo, depois AUTHORIZED, depois os demais
        const sorted = [...list].sort((a: any, b: any) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          if (a.status === 'AUTHORIZED' && b.status !== 'AUTHORIZED') return -1;
          if (a.status !== 'AUTHORIZED' && b.status === 'AUTHORIZED') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setRecentRequests(sorted);
      }
    } catch (err) {
      console.warn('Erro ao atualizar dashboard:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  const fetchOrgProfile = useCallback(async () => {
    try {
      const res = await api.get('/organizations/current');
      if (res.data?.success && res.data?.data?.profile) {
        setOrgProfile(res.data.data.profile);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchSummaryAndRequests();
    fetchOrgProfile();

    const unsubCreated = addListener('visit_request:created', fetchSummaryAndRequests);
    const unsubUpdated = addListener('visit_request:updated', fetchSummaryAndRequests);
    const unsubPkgCreated = addListener('package:created', fetchSummaryAndRequests);
    const unsubPkgPicked = addListener('package:picked_up', fetchSummaryAndRequests);
    const unsubAlert = addListener('notification:alert', (alert: RealtimeAlert) => {
      setNotifications((prev) => [alert, ...prev]);
      fetchSummaryAndRequests();
    });

    const interval = setInterval(fetchSummaryAndRequests, 15000);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubPkgCreated();
      unsubPkgPicked();
      unsubAlert();
      clearInterval(interval);
    };
  }, [addListener, fetchSummaryAndRequests, fetchOrgProfile]);

  const handleRegisterEntry = async (requestId: string, visitorName: string) => {
    try {
      setEntryProcessingId(requestId);
      await api.post(`/visit-requests/${requestId}/entry`, {
        reason: 'Entrada registrada na portaria pelo dashboard',
      });
      Alert.alert('Sucesso! 🟢', `Entrada de ${visitorName} registrada no local.`);
      fetchSummaryAndRequests();
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message || 'Falha ao registrar entrada.');
    } finally {
      setEntryProcessingId(null);
    }
  };

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0) + 14;
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 12);

  const renderContent = () => {
    if (activeTab === 'pending') return <OpenRequestsScreen />;
    if (activeTab === 'authorized') return <AuthorizedRequestsScreen />;
    if (activeTab === 'present') return <PresentVisitorsScreen />;
    if (activeTab === 'packages') return <PackagesScreen onBack={() => setActiveTab('dashboard')} />;
    if (activeTab === 'preauthorizations') return <PreAuthorizationsScreen onBack={() => setActiveTab('dashboard')} />;
    if (activeTab === 'whatsapp') return <WhatsAppConfigScreen onBack={() => setActiveTab('settings')} />;
    if (activeTab === 'users_mgmt') return <UsersManagementScreen onBack={() => setActiveTab('settings')} />;
    if (activeTab === 'clients_mgmt') return <ClientsManagementScreen onBack={() => setActiveTab('settings')} />;
    if (activeTab === 'reports') return <ReportsScreen />;
    if (activeTab === 'org_profile') {
      return (
        <OrganizationProfileScreen
          onBack={() => setActiveTab('settings')}
          onSaved={() => {
            fetchOrgProfile();
            fetchSummaryAndRequests();
          }}
        />
      );
    }

    if (activeTab === 'settings') {
      return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <AppHeader
            title="Configurações & Cadastros"
            subtitle="Gestão do posto, operadores, unidades e conexões"
            onBack={() => setActiveTab('dashboard')}
          />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, paddingBottom: bottomInset + 80 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Card 0: Perfil do Estabelecimento / Empresa */}
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => setActiveTab('org_profile')}
              activeOpacity={0.85}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Building size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.menuCardTitle}>Perfil do Estabelecimento / Empresa</Text>
                <Text style={styles.menuCardSubtitle}>
                  {orgProfile.companyName
                    ? `${orgProfile.companyName} (${orgProfile.type || 'Personalizado'})`
                    : 'Defina o segmento: Residencial, Comercial, Clínica, etc.'}
                </Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>

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

            {/* Card 2: Cadastrar & Gerenciar Destinos / Clientes */}
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => setActiveTab('clients_mgmt')}
              activeOpacity={0.85}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <Building2 size={22} color="#16A34A" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.menuCardTitle}>
                  {orgProfile.clientLabel
                    ? `Cadastrar & Gerenciar ${orgProfile.clientLabel}s`
                    : 'Cadastrar & Gerenciar Moradores'}
                </Text>
                <Text style={styles.menuCardSubtitle}>
                  Cadastre unidades, residentes e números de WhatsApp.
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

            {/* Card 4: Logout */}
            <TouchableOpacity
              style={styles.settingsLogoutBtn}
              onPress={signOut}
              activeOpacity={0.85}
            >
              <LogOut size={18} color={colors.statusDenied} />
              <Text style={styles.settingsLogoutBtnText}>Sair da Conta</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    // Dashboard Tab Principal
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho Azul Marinho Profundo */}
        <View style={[styles.header, { paddingTop: topInset }]}>
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
                <Text style={styles.greetingSubtitle}>
                  {orgProfile.companyName || 'Portaria Principal'}
                </Text>
              </View>
            </View>

            {/* Ações da Direita: Notificações (Sino) & Configurações (Engrenagem) */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => setIsNotificationsModalOpen(true)}
                activeOpacity={0.75}
              >
                <Bell size={22} color={colors.white} />
                {(notifications.length > 0 || summary.pendingCount > 0) && (
                  <View style={styles.notificationDot} />
                )}
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

        {/* Conteúdo Principal */}
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

          {/* Seção: Solicitações de Acesso (Unificada com Pendentes no Topo) */}
          <View style={styles.listSectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Solicitações de Acesso</Text>
              <View style={styles.statusPillsRow}>
                {summary.pendingCount > 0 && (
                  <TouchableOpacity
                    onPress={() => setActiveTab('pending')}
                    style={styles.pillPending}
                    activeOpacity={0.8}
                  >
                    <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                    <Text style={styles.pillPendingText}>{summary.pendingCount} pendente(s)</Text>
                  </TouchableOpacity>
                )}
                {summary.authorizedCount > 0 && (
                  <TouchableOpacity
                    onPress={() => setActiveTab('authorized')}
                    style={styles.pillAuthorized}
                    activeOpacity={0.8}
                  >
                    <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={styles.pillAuthorizedText}>{summary.authorizedCount} autorizado(s)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isLoadingRequests && recentRequests.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingRequestsText}>Atualizando solicitações...</Text>
              </View>
            ) : recentRequests.length === 0 ? (
              <View style={styles.emptyRequestsCard}>
                <Clock size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyRequestsTitle}>Nenhuma solicitação recente</Text>
                <Text style={styles.emptyRequestsSubtitle}>
                  Toque em "+ Nova Visita" para registrar uma nova entrada na portaria.
                </Text>
              </View>
            ) : (
              recentRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isAuthorized = req.status === 'AUTHORIZED';
                const isEntered = req.status === 'ENTERED';
                const isDenied = req.status === 'DENIED';

                const timeFormatted = new Date(req.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View
                    key={req.id}
                    style={[
                      styles.requestCard,
                      isPending && styles.cardPendingBorder,
                      isAuthorized && styles.cardAuthorizedBorder,
                      isEntered && styles.cardEnteredBorder,
                      isDenied && styles.cardDeniedBorder,
                    ]}
                  >
                    {/* Header do Card com Badge */}
                    <View style={styles.requestCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isPending && (
                          <View style={styles.badgePending}>
                            <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                            <Text style={styles.badgePendingText}>AGUARDANDO MORADOR</Text>
                          </View>
                        )}
                        {isAuthorized && (
                          <View style={styles.badgeAuthorized}>
                            <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
                            <Text style={styles.badgeAuthorizedText}>AUTORIZADO</Text>
                          </View>
                        )}
                        {isEntered && (
                          <View style={styles.badgeEntered}>
                            <UserCheck size={12} color="#2563EB" style={{ marginRight: 4 }} />
                            <Text style={styles.badgeEnteredText}>NO LOCAL</Text>
                          </View>
                        )}
                        {isDenied && (
                          <View style={styles.badgeDenied}>
                            <CircleX size={12} color="#DC2626" style={{ marginRight: 4 }} />
                            <Text style={styles.badgeDeniedText}>RECUSADO</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.requestCodeText}>{req.code}</Text>
                    </View>

                    {/* Nome do Visitante */}
                    <Text style={styles.requestVisitorName}>{req.visitor?.name}</Text>

                    {req.visitor?.company && (
                      <Text style={styles.requestCompany}>Empresa: {req.visitor.company}</Text>
                    )}

                    {/* Destino e Morador */}
                    <View style={styles.requestDestRow}>
                      <Building size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={styles.requestDestText}>
                        {req.destination?.name} {req.destination?.block ? `(${req.destination.block})` : ''}
                      </Text>
                      {req.client?.name && (
                        <Text style={styles.requestClientText}> • Morador: {req.client.name}</Text>
                      )}
                    </View>

                    {/* Veículo (se houver) */}
                    {req.vehicle?.model && (
                      <View style={styles.requestMetaRow}>
                        <Car size={14} color="#64748B" style={{ marginRight: 6 }} />
                        <Text style={styles.requestMetaText}>
                          {req.vehicle.model} {req.vehicle.licensePlate ? `• Placa ${req.vehicle.licensePlate}` : ''}
                        </Text>
                      </View>
                    )}

                    {/* Horário */}
                    <View style={styles.requestMetaRow}>
                      <Clock size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                      <Text style={styles.requestTimeText}>Registrado às {timeFormatted}</Text>
                    </View>

                    {/* Ação Rápida para Autorizados: Registrar Entrada */}
                    {isAuthorized && (
                      <TouchableOpacity
                        style={styles.quickEntryBtn}
                        onPress={() => handleRegisterEntry(req.id, req.visitor?.name)}
                        disabled={entryProcessingId === req.id}
                        activeOpacity={0.85}
                      >
                        {entryProcessingId === req.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <LogIn size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.quickEntryBtnText}>REGISTRAR ENTRADA</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Ação Rápida para Pendentes: Ver no Aguardando */}
                    {isPending && (
                      <TouchableOpacity
                        style={styles.quickPendingBtn}
                        onPress={() => setActiveTab('pending')}
                        activeOpacity={0.85}
                      >
                        <Clock size={14} color="#D97706" style={{ marginRight: 6 }} />
                        <Text style={styles.quickPendingBtnText}>Acompanhar / Reenviar WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
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

        {/* Barra de Navegação Inferior: 5 Abas */}
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

          {/* 3. Autorizados */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('authorized')}
            activeOpacity={0.8}
          >
            <View>
              <ShieldCheck
                size={22}
                color={activeTab === 'authorized' ? '#16A34A' : '#94A3B8'}
              />
              {summary.authorizedCount > 0 && (
                <View style={[styles.tabBadgeDot, { backgroundColor: '#16A34A' }]}>
                  <Text style={styles.tabBadgeText}>{summary.authorizedCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'authorized' && { color: '#16A34A', fontWeight: '700' },
              ]}
            >
              Autorizados
            </Text>
            {activeTab === 'authorized' && (
              <View style={[styles.activeTabIndicator, { backgroundColor: '#16A34A' }]} />
            )}
          </TouchableOpacity>

          {/* 4. Presentes */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('present')}
            activeOpacity={0.8}
          >
            <View>
              <Users
                size={22}
                color={activeTab === 'present' ? '#2563EB' : '#94A3B8'}
              />
              {summary.presentCount > 0 && (
                <View style={styles.tabBadgeDot}>
                  <Text style={styles.tabBadgeText}>{summary.presentCount}</Text>
                </View>
              )}
            </View>
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

          {/* 5. Relatórios */}
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
        </View>

        {/* Modal Nova Visita */}
        <NewRequestModal
          visible={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchSummaryAndRequests();
            setActiveTab('pending');
          }}
        />

        {/* Modal Notificações do Header */}
        <NotificationsModal
          visible={isNotificationsModalOpen}
          onClose={() => setIsNotificationsModalOpen(false)}
          notifications={notifications}
          onClear={() => setNotifications([])}
          onSelectNotification={(alert) => {
            if (alert.type === 'AUTHORIZED') {
              setActiveTab('authorized');
            } else if (alert.type === 'DENIED') {
              setActiveTab('reports');
            } else {
              setActiveTab('pending');
            }
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
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Cabeçalho Principal
  header: {
    backgroundColor: '#0F203D',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 10,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  greetingSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
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
    paddingTop: 16,
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
    marginBottom: 18,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  secondaryBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
  },
  secondaryBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  secondaryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Seção da Lista Unificada de Solicitações
  listSectionContainer: {
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillPendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  pillAuthorized: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillAuthorizedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRequestsText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  emptyRequestsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyRequestsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyRequestsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPendingBorder: {
    borderLeftColor: '#D97706',
  },
  cardAuthorizedBorder: {
    borderLeftColor: '#16A34A',
  },
  cardEnteredBorder: {
    borderLeftColor: '#2563EB',
  },
  cardDeniedBorder: {
    borderLeftColor: '#DC2626',
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  badgeAuthorized: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeAuthorizedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  badgeEntered: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeEnteredText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  badgeDenied: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeDeniedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  requestCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  requestVisitorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  requestCompany: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  requestDestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 2,
  },
  requestDestText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  requestClientText: {
    fontSize: 13,
    color: '#64748B',
  },
  requestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  requestMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  requestTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  quickEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  quickEntryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  quickPendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  quickPendingBtnText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
  },

  // Barra de Navegação Inferior
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

  // Hub Administrativo
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
