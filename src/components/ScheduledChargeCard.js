import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../shared/theme/ThemeProvider';
import { PremiumCard } from '../shared/ui/premium/Card';

const money = (value) => new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const typeIcon = (type) => {
  if (type === 'Rent') return 'home-outline';
  if (type === 'Internet') return 'wifi-outline';
  if (type === 'Electric') return 'flash-outline';
  if (type === 'Water') return 'water-outline';
  return 'calendar-outline';
};

const statusMeta = (cycle, theme) => {
  if (!cycle) return { label: 'YAKLAŞAN', bg: theme.colors.neutral[100], fg: theme.colors.text.secondary };
  if (cycle.externalPaid) return { label: 'ÖDENDİ', bg: theme.colors.success[50], fg: theme.colors.success[700] };
  if (cycle.isOverdue) return { label: 'GECİKTİ', bg: theme.colors.error[50], fg: theme.colors.error[700] };
  if (cycle.isCollectionOpen) return { label: 'ÖDENMEDİ', bg: theme.colors.warning[50], fg: theme.colors.warning[700] };
  return { label: 'YAKLAŞAN', bg: theme.colors.neutral[100], fg: theme.colors.text.secondary };
};

export default function ScheduledChargeCard({
  plan,
  currentUserId,
  busy,
  onToggleShare,
  onToggleExternal,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const cycle = plan?.cycle;
  const meta = statusMeta(cycle, theme);
  const shares = Array.isArray(cycle?.shares) ? cycle.shares : [];
  const myShare = shares.find((share) => Number(share.userId) === Number(currentUserId));
  const visibleShares = plan?.isPayer ? shares : (myShare ? [myShare] : []);

  return (
    <PremiumCard elevation="small" padding="medium" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name={typeIcon(plan?.type)} size={21} color={theme.colors.primary[700]} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{plan?.title || 'Dönemsel ödeme'}</Text>
          <Text style={styles.subtitle}>
            Ayın {plan?.collectionStartDay}-{plan?.dueDay} arası • {plan?.payerName}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Aylık tutar</Text>
          <Text style={styles.amount}>{money(plan?.fixedAmount)}</Text>
        </View>
        {cycle && (
          <View style={styles.progressTextWrap}>
            <Text style={styles.progressValue}>{cycle.paidCount}/{cycle.totalShareCount}</Text>
            <Text style={styles.progressLabel}>pay tamamlandı</Text>
          </View>
        )}
      </View>

      {!cycle?.isCollectionOpen && !cycle?.externalPaid ? (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.infoText}>Ayın {plan?.collectionStartDay}. günü Borçlarım alanında açılır.</Text>
        </View>
      ) : (
        <>
          <View style={styles.divider} />
          {visibleShares.map((share) => {
            const isPaid = share.status === 'Paid';
            const isPayerShare = Boolean(share.isPayer);
            const canToggle = Boolean(plan?.isPayer && !isPayerShare && !busy);
            return (
              <TouchableOpacity
                key={String(share.userId)}
                style={styles.shareRow}
                activeOpacity={canToggle ? 0.75 : 1}
                disabled={!canToggle}
                onPress={() => onToggleShare?.(plan, share, !isPaid)}
                accessibilityRole={canToggle ? 'button' : undefined}
                accessibilityLabel={`${share.userName} kira payı ${isPaid ? 'ödendi' : 'ödenmedi'}`}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{String(share.userName || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.shareText}>
                  <Text style={styles.shareName}>{share.userName}</Text>
                  <Text style={styles.shareAmount}>{isPayerShare ? 'Kendi payı' : money(share.amount)}</Text>
                </View>
                <View style={[styles.shareStatus, isPaid ? styles.sharePaid : styles.shareUnpaid]}>
                  <Ionicons
                    name={isPaid ? 'checkmark-circle' : share.status === 'Overdue' ? 'alert-circle' : 'time'}
                    size={14}
                    color={isPaid ? theme.colors.success[700] : share.status === 'Overdue' ? theme.colors.error[700] : theme.colors.warning[700]}
                  />
                  <Text style={[
                    styles.shareStatusText,
                    { color: isPaid ? theme.colors.success[700] : share.status === 'Overdue' ? theme.colors.error[700] : theme.colors.warning[700] },
                  ]}>
                    {isPaid ? 'Ödendi' : share.status === 'Overdue' ? 'Gecikti' : 'Ödenmedi'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {plan?.isPayer && (
            <TouchableOpacity
              style={[styles.externalButton, cycle?.externalPaid && styles.externalButtonPaid]}
              disabled={busy}
              activeOpacity={0.82}
              onPress={() => onToggleExternal?.(plan, !cycle?.externalPaid)}
              accessibilityRole="button"
              accessibilityLabel={cycle?.externalPaid ? 'Ev sahibine ödeme durumunu geri al' : 'Ev sahibine ödendi işaretle'}
            >
              {busy ? (
                <ActivityIndicator size="small" color={theme.colors.text.onPrimary} />
              ) : (
                <Ionicons name={cycle?.externalPaid ? 'checkmark-circle' : 'home-outline'} size={18} color={theme.colors.text.onPrimary} />
              )}
              <Text style={styles.externalButtonText}>
                {cycle?.externalPaid ? 'Ev sahibine ödendi' : 'Ev sahibine ödendi işaretle'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </PremiumCard>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: { marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
    marginRight: 11,
  },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '800' },
  subtitle: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 3 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 },
  amountLabel: { color: theme.colors.text.secondary, fontSize: 11, fontWeight: '700' },
  amount: { color: theme.colors.text.primary, fontSize: 20, fontWeight: '900', marginTop: 2 },
  progressTextWrap: { alignItems: 'flex-end' },
  progressValue: { color: theme.colors.primary[700], fontSize: 15, fontWeight: '900' },
  progressLabel: { color: theme.colors.text.secondary, fontSize: 11, marginTop: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  infoText: { color: theme.colors.text.secondary, fontSize: 12, flex: 1 },
  divider: { height: 1, backgroundColor: theme.colors.neutral[200], marginTop: 14, marginBottom: 5 },
  shareRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.neutral[100], marginRight: 9 },
  avatarText: { color: theme.colors.text.primary, fontSize: 12, fontWeight: '800' },
  shareText: { flex: 1 },
  shareName: { color: theme.colors.text.primary, fontSize: 13, fontWeight: '700' },
  shareAmount: { color: theme.colors.text.secondary, fontSize: 11, marginTop: 2 },
  shareStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  sharePaid: { backgroundColor: theme.colors.success[50] },
  shareUnpaid: { backgroundColor: theme.colors.warning[50] },
  shareStatusText: { fontSize: 11, fontWeight: '800' },
  externalButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[700],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 9,
  },
  externalButtonPaid: { backgroundColor: theme.colors.success[700] },
  externalButtonText: { color: theme.colors.text.onPrimary, fontSize: 13, fontWeight: '800' },
});
