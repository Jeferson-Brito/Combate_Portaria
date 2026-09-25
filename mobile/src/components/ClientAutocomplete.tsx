import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Search, Building, User, Phone, Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../config/api';

export interface ClientDestinationItem {
  id: string;
  name: string;
  whatsappNumber: string;
  company?: string;
  destinations: Array<{
    destination: {
      id: string;
      name: string;
      block?: string;
      code?: string;
    };
  }>;
}

interface ClientAutocompleteProps {
  onSelectClient: (client: ClientDestinationItem, selectedDestinationId: string) => void;
  selectedClientId?: string;
}

export const ClientAutocomplete: React.FC<ClientAutocompleteProps> = ({
  onSelectClient,
  selectedClientId,
}) => {
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<ClientDestinationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClientDestinationItem | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchClients(query);
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchClients = async (searchQuery: string) => {
    try {
      setIsLoading(true);
      const response = await api.get('/clients/search', {
        params: { q: searchQuery },
      });
      setClients(response.data.data.clients || []);
    } catch (err) {
      console.warn('Erro ao buscar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (client: ClientDestinationItem) => {
    setSelectedItem(client);
    const primaryDestId = client.destinations[0]?.destination.id || '';
    onSelectClient(client, primaryDestId);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Buscar Destino / Cliente (Apartamento, Sala, Nome)</Text>

      {/* Campo de Busca Rápida */}
      <View style={styles.searchBox}>
        <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Digite o número da unidade (ex: 8) ou nome..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        {isLoading && <ActivityIndicator size="small" color={colors.primaryLight} />}
      </View>

      {/* Lista de Resultados Rápidos (Autocomplete) */}
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        style={styles.list}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum cliente ou unidade encontrado.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isSelected = selectedItem?.id === item.id || selectedClientId === item.id;
          const destinationName =
            item.destinations.length > 0
              ? `${item.destinations[0].destination.name}${
                  item.destinations[0].destination.block
                    ? ` (${item.destinations[0].destination.block})`
                    : ''
                }`
              : 'Sem unidade vinculada';

          return (
            <TouchableOpacity
              style={[styles.resultItem, isSelected && styles.resultItemSelected]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <View style={styles.itemHeader}>
                <View style={styles.destinationBadge}>
                  <Building size={14} color={colors.primaryLight} style={{ marginRight: 4 }} />
                  <Text style={styles.destinationText}>{destinationName}</Text>
                </View>

                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Check size={14} color={colors.white} />
                  </View>
                )}
              </View>

              <View style={styles.clientDetails}>
                <View style={styles.row}>
                  <User size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={styles.clientName}>{item.name}</Text>
                </View>
                <View style={styles.row}>
                  <Phone size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={styles.clientPhone}>{item.whatsappNumber}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  list: {
    maxHeight: 320,
  },
  resultItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultItemSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  destinationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  destinationText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.statusAuthorized,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientDetails: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clientPhone: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyBox: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
