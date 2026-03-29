import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { ledgerApi, houseApi } from '../services/api';

const LedgerDetailScreen = ({ route }) => {
  const { houseId, houseName } = route.params || {};
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [ledgerLines, setLedgerLines] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (houseId) fetchLedgerData();
  }, [houseId]);

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const [ledgerResponse, membersResponse] = await Promise.all([ledgerApi.byHouse(houseId), houseApi.getMembers(houseId)]);
      const ledgerData = ledgerResponse?.data?.data || ledgerResponse?.data || [];
      const membersData = membersResponse?.data?.data || membersResponse?.data || [];
      setLedgerLines(Array.isArray(ledgerData) ? ledgerData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch {
      Alert.alert('Hata', 'Borç/alacak detayları alınırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });

  const getMemberName = (userId) => {
    const member = members.find((item) => item.userId === userId || item.id === userId);
    return member ? member.fullName || member.name : `Kullanıcı ${userId}`;
  };

  const groupedLedger = ledgerLines.reduce((acc, line) => {
    const key = `${line.fromUserId}-${line.toUserId}`;
    if (!acc[key]) {
      acc[key] = {
        fromUserId: line.fromUserId,
        toUserId: line.toUserId,
        totalAmount: 0,
        lines: [],
        latestDate: line.postDate,
      };
    }
    acc[key].totalAmount += line.amount || 0;
    acc[key].lines.push(line);
    if (new Date(line.postDate) > new Date(acc[key].latestDate)) {
      acc[key].latestDate = line.postDate;
    }
    return acc;
  }, {});

  const sortedLedger = Object.values(groupedLedger).sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Borç/Alacak Detayları</Text>
        </View>
        <View style={[CommonStyles.card, { alignItems: 'center', padding: 40 }]}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Text style={{ color: theme.colors.text.secondary, marginTop: 16 }}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Borç/Alacak Detayları</Text>
          <Text style={CommonStyles.subtitle}>{houseName || ''}</Text>
        </View>

        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>Özet</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Toplam İşlem</Text>
              <Text style={styles.summaryValue}>{ledgerLines.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Aktif Çift</Text>
              <Text style={styles.summaryValue}>{sortedLedger.length}</Text>
            </View>
          </View>
        </View>

        {sortedLedger.length === 0 ? (
          <View style={CommonStyles.card}>
            <Text style={styles.emptyText}>Henüz borç/alacak kaydı bulunmuyor.</Text>
          </View>
        ) : (
          sortedLedger.map((group, index) => (
            <View key={index} style={CommonStyles.card}>
              <View style={styles.ledgerHeader}>
                <View style={styles.ledgerInfo}>
                  <Text style={styles.ledgerFrom}>{getMemberName(group.fromUserId)}</Text>
                  <Text style={styles.ledgerArrow}>→</Text>
                  <Text style={styles.ledgerTo}>{getMemberName(group.toUserId)}</Text>
                </View>
                <Text style={styles.ledgerTotalAmount}>{formatAmount(group.totalAmount)}</Text>
              </View>

              <Text style={styles.ledgerSubtext}>
                {group.lines.length} işlem • Son: {formatDate(group.latestDate)}
              </Text>

              {group.lines.slice(0, 3).map((line, lineIndex) => (
                <View key={line.id || lineIndex} style={styles.ledgerDetail}>
                  <Text style={styles.ledgerDetailDate}>{formatDate(line.postDate)}</Text>
                  <Text style={styles.ledgerDetailAmount}>{formatAmount(line.amount)}</Text>
                </View>
              ))}

              {group.lines.length > 3 && <Text style={styles.ledgerMore}>+{group.lines.length - 3} işlem daha...</Text>}
            </View>
          ))
        )}

        <TouchableOpacity style={CommonStyles.menuButton} onPress={fetchLedgerData}>
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.primary.background }]}>
            <Text style={CommonStyles.buttonIcon}>🔄</Text>
            <Text style={CommonStyles.buttonText}>Yenile</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
    summaryItem: { alignItems: 'center' },
    summaryLabel: { fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 },
    summaryValue: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary[600] },
    ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    ledgerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    ledgerFrom: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    ledgerArrow: { fontSize: 16, color: theme.colors.text.secondary, marginHorizontal: 8 },
    ledgerTo: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    ledgerTotalAmount: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary[600] },
    ledgerSubtext: { fontSize: 12, color: theme.colors.text.secondary, marginBottom: 12 },
    ledgerDetail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      paddingLeft: 16,
    },
    ledgerDetailDate: { fontSize: 12, color: theme.colors.text.secondary },
    ledgerDetailAmount: { fontSize: 12, color: theme.colors.text.primary },
    ledgerMore: { fontSize: 12, color: theme.colors.text.secondary, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
    emptyText: { fontSize: 16, color: theme.colors.text.secondary, textAlign: 'center', padding: 20 },
  });
}

export default LedgerDetailScreen;
