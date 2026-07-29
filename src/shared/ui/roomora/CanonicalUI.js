import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { shadow } from '../shadow';

export const money = (value) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export function Avatar({ name, uri, size = 44 }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary[50],
        borderWidth: 1,
        borderColor: theme.colors.primary[200],
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Text
          style={{
            color: theme.colors.primary[700],
            fontFamily: theme.typography.bold,
            fontSize: size * 0.34,
          }}
        >
          {String(name || 'R').trim().charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  avatar,
  avatarName,
  onAvatarPress,
  onBack,
  rightIcon,
  onRightPress,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.header}>
      <View style={styles.headerLeading}>
        {onBack ? (
          <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.82}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {onAvatarPress || avatar || avatarName ? (
        <TouchableOpacity onPress={onAvatarPress} disabled={!onAvatarPress} activeOpacity={0.82}>
          <Avatar name={avatarName} uri={avatar} />
        </TouchableOpacity>
      ) : rightIcon ? (
        <TouchableOpacity style={styles.iconButton} onPress={onRightPress} activeOpacity={0.82}>
          <Ionicons name={rightIcon} size={23} color={theme.colors.text.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function BalanceCard({ balance, payable, receivable, pendingCount, onPress }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const body = (
    <View style={styles.balanceCard}>
      <View style={styles.balanceTop}>
        <Text style={styles.balanceEyebrow}>TOPLAM BAKİYEM</Text>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Ionicons name="time-outline" size={14} color={theme.colors.primary[100]} />
            <Text style={styles.pendingText}>{pendingCount} bekleyen</Text>
          </View>
        )}
      </View>
      <Text style={styles.balanceValue}>{money(balance)}</Text>
      <View style={styles.balanceDivider} />
      <View style={styles.balanceColumns}>
        <View style={styles.balanceColumn}>
          <Text style={styles.balanceLabel}>Alacak</Text>
          <Text style={styles.receivableValue}>{money(receivable)}</Text>
        </View>
        <View style={styles.balanceColumn}>
          <Text style={styles.balanceLabel}>Borç</Text>
          <Text style={styles.payableValue}>{money(payable)}</Text>
        </View>
      </View>
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>{body}</TouchableOpacity>
  ) : body;
}

export function ActionTile({ icon, label, onPress, tone = 'blue' }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const color = tone === 'green' ? theme.colors.success[700] : theme.colors.primary[700];
  const background = tone === 'green' ? theme.colors.success[50] : theme.colors.primary[50];
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress} activeOpacity={0.84}>
      <View style={[styles.actionIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={25} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Pill({ label, active, onPress, icon }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={15}
          color={active ? theme.colors.text.onPrimary : theme.colors.text.secondary}
        />
      )}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ListRow({
  icon = 'receipt-outline',
  title,
  subtitle,
  amount,
  amountTone = 'default',
  badge,
  badgeTone = 'neutral',
  onPress,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const amountColor = amountTone === 'positive'
    ? theme.colors.success[700]
    : amountTone === 'negative'
      ? theme.colors.error[700]
      : theme.colors.text.primary;
  const tone = {
    success: [theme.colors.success[50], theme.colors.success[700]],
    warning: [theme.colors.warning[50], theme.colors.warning[700]],
    error: [theme.colors.error[50], theme.colors.error[700]],
    info: [theme.colors.primary[50], theme.colors.primary[700]],
    neutral: [theme.colors.neutral[100], theme.colors.text.secondary],
  }[badgeTone] || [theme.colors.neutral[100], theme.colors.text.secondary];

  return (
    <TouchableOpacity
      style={styles.listRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.84}
    >
      <View style={styles.listIcon}>
        <Ionicons name={icon} size={22} color={theme.colors.primary[700]} />
      </View>
      <View style={styles.listBody}>
        <Text style={styles.listTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.listSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={styles.listEnd}>
        {amount !== undefined && <Text style={[styles.listAmount, { color: amountColor }]}>{money(amount)}</Text>}
        {!!badge && (
          <View style={[styles.statusBadge, { backgroundColor: tone[0] }]}>
            <Text style={[styles.statusText, { color: tone[1] }]}>{badge}</Text>
          </View>
        )}
      </View>
      {!!onPress && <Ionicons name="chevron-forward" size={18} color={theme.colors.neutral[400]} />}
    </TouchableOpacity>
  );
}

export function PrimaryButton({ label, icon = 'add', onPress, disabled, danger = false }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <TouchableOpacity
      style={[
        styles.primaryButton,
        danger && { backgroundColor: theme.colors.error[600] },
        disabled && { opacity: 0.45 },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.86}
    >
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, description, action, onAction }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={theme.colors.primary[600]} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!description && <Text style={styles.emptyDescription}>{description}</Text>}
      {!!action && <PrimaryButton label={action} onPress={onAction} />}
    </View>
  );
}

export function LoadingState({ label = 'Yükleniyor...' }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={theme.colors.primary[600]} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  title = 'Veriler alınamadı',
  description = 'Bağlantını kontrol edip tekrar deneyin.',
  onRetry,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.error[50] }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={theme.colors.error[700]} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {!!onRetry && <PrimaryButton label="Tekrar Dene" icon="refresh" onPress={onRetry} />}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1 },
  headerTitle: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.extrabold,
    fontSize: 25,
    lineHeight: 30,
  },
  headerSubtitle: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 21,
  },
  sectionAction: {
    color: theme.colors.primary[700],
    fontFamily: theme.typography.semibold,
    fontSize: 14,
  },
  balanceCard: {
    borderRadius: theme.radius.sm,
    padding: 22,
    marginTop: 16,
    backgroundColor: theme.colors.primary[900],
    ...shadow(3, 'rgba(23,40,57,0.2)'),
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceEyebrow: {
    color: theme.colors.balanceHero.muted,
    fontFamily: theme.typography.semibold,
    fontSize: 13,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: theme.colors.balanceHero.badge,
  },
  pendingText: { color: theme.colors.balanceHero.badgeText, fontFamily: theme.typography.semibold, fontSize: 11 },
  balanceValue: {
    color: '#fff',
    fontFamily: theme.typography.extrabold,
    fontSize: 36,
    lineHeight: 44,
    marginTop: 14,
  },
  balanceDivider: { height: 1, backgroundColor: theme.colors.balanceHero.divider, marginVertical: 18 },
  balanceColumns: { flexDirection: 'row', gap: 28 },
  balanceColumn: { flex: 1 },
  balanceLabel: { color: theme.colors.balanceHero.muted, fontFamily: theme.typography.medium, fontSize: 14 },
  receivableValue: {
    color: theme.colors.balanceHero.receivable,
    fontFamily: theme.typography.bold,
    fontSize: 22,
    marginTop: 4,
  },
  payableValue: {
    color: theme.colors.balanceHero.payable,
    fontFamily: theme.typography.bold,
    fontSize: 22,
    marginTop: 4,
  },
  actionTile: {
    flex: 1,
    minHeight: 116,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    padding: 16,
    justifyContent: 'space-between',
    ...shadow(1, 'rgba(23,40,57,0.08)'),
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 15,
  },
  pill: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillActive: {
    backgroundColor: theme.colors.primary[700],
    borderColor: theme.colors.primary[700],
  },
  pillText: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.semibold,
    fontSize: 13,
  },
  pillTextActive: { color: '#fff' },
  listRow: {
    minHeight: 78,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    ...shadow(1, 'rgba(23,40,57,0.07)'),
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBody: { flex: 1, minWidth: 0 },
  listTitle: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 16,
  },
  listSubtitle: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    marginTop: 3,
  },
  listEnd: { alignItems: 'flex-end', gap: 5 },
  listAmount: {
    fontFamily: theme.typography.bold,
    fontSize: 15,
  },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: theme.typography.bold, fontSize: 10 },
  primaryButton: {
    minHeight: 52,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[600],
    ...shadow(2, 'rgba(47,111,168,0.22)'),
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: theme.typography.bold,
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  emptyDescription: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 18,
  },
  loadingState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.medium,
    fontSize: 14,
    marginTop: 12,
  },
});
