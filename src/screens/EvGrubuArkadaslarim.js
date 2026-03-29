import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { houseApi } from '../services/api';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';

const EvGrubuArkadaslarimScreen = ({ route, navigation }) => {
  const { houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    if (!houseId) {
      showToast('Geçerli bir ev ID\'si bulunamadı', 'error');
      navigation.goBack();
      return;
    }
    fetchMembers();
  }, [houseId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMembers();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const membersResponse = await houseApi.getMembers(houseId);
      if (membersResponse.data && Array.isArray(membersResponse.data)) {
        const members = membersResponse.data;
        const membersWithDebts = await Promise.all(
          members.map(async (member) => {
            try {
              const userId = member.userId || member.id;
              const debtResponse = await houseApi.getUserDebts(userId, houseId);
              const debtData = debtResponse.data;
              const netBalance = debtData.netBalance || 0;
              let debtStatus = 'Nötr';
              if (netBalance > 0) debtStatus = 'Alacaklı';
              else if (netBalance < 0) debtStatus = 'Borçlu';
              return {
                id: userId,
                fullName: member.name || member.fullName || 'İsimsiz Kullanıcı',
                email: member.email,
                debtStatus,
                balance: netBalance,
              };
            } catch (error) {
              return {
                id: member.userId || member.id,
                fullName: member.name || member.fullName || 'İsimsiz Kullanıcı',
                email: member.email,
                debtStatus: 'Nötr',
                balance: 0,
              };
            }
          })
        );
        setFriends(membersWithDebts);
      } else {
        setFriends([]);
      }
    } catch (error) {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (balance) => {
    if (balance > 0) return `Alacağı: ${balance.toFixed(0)} ₺`;
    if (balance < 0) return `Borcu: ${Math.abs(balance).toFixed(0)} ₺`;
    return '';
  };

  const getStatusColor = (balance) => {
    if (balance > 0) return theme.colors.success[600];
    if (balance < 0) return theme.colors.error[600];
    return theme.colors.neutral[600];
  };

  const handleMemberPress = (member) => {
    if (user && user.id === member.id) {
      return;
    }
    navigation.navigate('TwoPersonDebtDetail', {
      houseId,
      houseName,
      currentUserId: user.id,
      selectedUserId: member.id,
      selectedUserName: member.fullName,
    });
  };

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={CommonStyles.loadingText}>Ev arkadaşları yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>{houseName || 'Ev'} - Ev Arkadaşlarım</Text>
          <Text style={CommonStyles.subtitle}>
            {friends.length} üye • Harcama kategorilerini görüntüleyin
          </Text>
        </View>

        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>👥 Ev Arkadaşları</Text>
          <View style={CommonStyles.listContainer}>
            {friends.map((item) => {
              const isCurrentUser = user && user.id === item.id;
              const statusColor = getStatusColor(item.balance);
              const statusText = getStatusText(item.balance);
              return (
                <TouchableOpacity
                  key={String(item.id)}
                  style={CommonStyles.listItem}
                  onPress={() => handleMemberPress(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                      {item.fullName ? item.fullName.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={CommonStyles.listItemContent}>
                    <Text style={CommonStyles.listItemTitle}>
                      {item.fullName} {isCurrentUser && '(Sen)'}
                    </Text>
                    <Text style={CommonStyles.listItemSubtitle}>{item.email || 'Email yok'}</Text>
                  </View>
                  {statusText ? (
                    <View style={styles.balanceInfo}>
                      <Text style={[styles.balanceText, { color: statusColor }]}>
                        {statusText}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary },
    avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary[500], justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.background },
    balanceInfo: {
      alignItems: 'flex-end',
    },
    balanceText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}

export default EvGrubuArkadaslarimScreen;


