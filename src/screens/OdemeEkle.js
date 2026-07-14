// src/screens/CreatePaymentScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Platform, Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { paymentsApi, houseApi } from '../services/api';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

export default function CreatePaymentScreen({ navigation, route }) {
  const { user } = useAuth();
  const activeHouseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const activeHouseName = route?.params?.houseName || user?.defaultHouseName || 'Aktif Ev';
  const { alacakliUserId, suggestedAmount, chargeId } = route.params || {};
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [method, setMethod] = useState('Cash'); // 'BankTransfer' | 'Cash'
  const [selectedImage, setSelectedImage] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [pairBalance, setPairBalance] = useState(null);
  const { toast, showSuccess, showError, hideToast } = useToast();

  const formatCurrency = (value) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  useEffect(() => {
    if (!activeHouseId) {
      Alert.alert('Hata', 'Aktif bir ev grubu bulunamadı.');
      navigation.navigate('GrupListesi');
      return;
    }
    fetchMembers();
  }, [activeHouseId]);

  // Prefill: borç ekranından gelen seçimler
  useEffect(() => {
    if (alacakliUserId) setToUserId(String(alacakliUserId));
    if (suggestedAmount) setAmount(String(suggestedAmount));
  }, [alacakliUserId, suggestedAmount]);

  useEffect(() => {
    const loadPairBalance = async () => {
      if (!activeHouseId || !user?.id || !toUserId) {
        setPairBalance(null);
        return;
      }

      setBalanceLoading(true);
      try {
        const res = await houseApi.getUserDebtBetween(activeHouseId, Number(user.id), Number(toUserId));
        const body = res?.data?.data ?? res?.data ?? {};
        const currentNet = Number(body.net ?? body.netAmount ?? 0) || 0;

        setPairBalance({
          currentNet,
          payerName: user?.fullName || 'Sen',
          counterpartyName:
            body.userBName ||
            body.alacakliUserName ||
            members.find((m) => Number(m.userId ?? m.id) === Number(toUserId))?.fullName ||
            'Seçilen kişi',
        });
      } catch {
        setPairBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };

    loadPairBalance();
  }, [activeHouseId, toUserId, user?.id, user?.fullName, members]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await houseApi.getMembers(activeHouseId);
      const body = response?.data;
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      const otherMembers = (list || []).filter(m =>
        (m?.userId ?? m?.id) !== user.id && (m?.fullName || m?.name)
      );
      setMembers(otherMembers);
    } catch (error) {
      Alert.alert('Hata', 'Ev üyeleri alınamadı: ' + (error.message || ''));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const numericAmount = Math.abs(parseFloat(String(amount).replace(',', '.'))) || 0;
  const currentNet = Number(pairBalance?.currentNet || 0);
  const projectedNet = currentNet + numericAmount;
  const remainingDebt = projectedNet < 0 ? Math.abs(projectedNet) : 0;
  const remainingReceivable = projectedNet > 0 ? projectedNet : 0;
  const selectedMemberName =
    members.find((m) => Number(m.userId ?? m.id) === Number(toUserId))?.fullName ||
    pairBalance?.counterpartyName ||
    'Seçilen kişi';
  const currentStatusText =
    !toUserId
      ? 'Önce kime ödeme yapacağını seç.'
      : currentNet < 0
        ? `${selectedMemberName} kişisine ${formatCurrency(Math.abs(currentNet))} borcun var.`
        : currentNet > 0
          ? `${selectedMemberName} sana ${formatCurrency(currentNet)} borçlu görünüyor.`
          : `${selectedMemberName} ile şu an açık borç bakiyesi yok.`;
  const projectedStatusText =
    !toUserId || !numericAmount
      ? 'Tutar girdiğinde ödeme sonrası tahmini bakiye burada görünecek.'
      : projectedNet < 0
        ? `Bu ödeme sonrası ${selectedMemberName} kişisine kalan borcun ${formatCurrency(Math.abs(projectedNet))} olur.`
        : projectedNet > 0
          ? `Bu ödeme sonrası ${selectedMemberName} kişisinden ${formatCurrency(projectedNet)} alacaklı olursun.`
          : `Bu ödeme sonrası ${selectedMemberName} ile bakiye tamamen kapanır.`;

  const handleCreatePayment = async () => {
    setFormError('');
    if (!amount || !toUserId || !description.trim()) {
      const msg = 'Lütfen tüm alanları doldurun.';
      Alert.alert('Hata', msg);
      setFormError(msg);
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      const msg = 'Geçerli bir tutar giriniz.';
      Alert.alert('Hata', msg);
      setFormError(msg);
      return;
    }
    if (method === 'BankTransfer' && !selectedImage) {
      Alert.alert('Eksik', 'IBAN ile ödemede dekont zorunludur.');
      return;
    }

    setLoading(true);
    try {
      // Dekont dosyası hazırla (opsiyonel)
      let dekontFile = null;
      if (method === 'BankTransfer' && selectedImage) {
        if (Platform.OS === 'web') {
          const res = await fetch(selectedImage);
          const blob = await res.blob();
          dekontFile = new File([blob], 'payment_slip.jpg', { type: blob.type || 'image/jpeg' });
        } else {
          dekontFile = { uri: selectedImage, type: 'image/jpeg', name: 'payment_slip.jpg' };
        }
      }

      const payload = {
        houseId: activeHouseId,
        borcluUserId: Number(user.id),
        alacakliUserId: Number(toUserId),
        tutar: Number(numericAmount),
        method,
        note: description.trim(),
        chargeId: chargeId ? Number(chargeId) : undefined,
        dekontFile, // multipart
      };

      const response = await paymentsApi.create(payload);
      if (response?.data) {
        showSuccess('Ödeme başarıyla oluşturuldu!');
        // ödeme listelerini/borçları yenile
        const eventBus = (await import('../shared/events/bus')).default;
        eventBus.emit('payments:updated', { houseId: activeHouseId });
        setTimeout(() => navigation.goBack(), 1200);
      } else {
        throw new Error('Ödeme oluşturulamadı');
      }
    } catch (error) {
      const msg = 'Ödeme oluşturulurken bir sorun oluştu: ' + (error.response?.data?.message || error.message);
      showError(msg);
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  // izinler
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Kamera izni gereklidir.');
      return false;
    }
    return true;
  };
  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeri izni gereklidir.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const ok = await requestGalleryPermission();
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      // ❗ web’de hata veren MediaType yerine Options kullan
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  return (
    <View style={CommonStyles.container}>
      <KeyboardAwareScrollView
        style={CommonStyles.content}
        contentInsetAdjustmentBehavior="always"
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        keyboardOpeningTime={0}
      >
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Ödeme Yap</Text>
          <Text style={CommonStyles.subtitle}>
            {activeHouseName} grubunda arkadaşınıza ödeme yapın
          </Text>
        </View>

        <View style={CommonStyles.card}>
          {/* Ödeme Yöntemi */}
          <Text style={CommonStyles.label}>Ödeme Yöntemi</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setMethod('Cash')}
              style={{
                paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1,
                borderColor: method === 'Cash' ? theme.colors.success[600] : theme.colors.neutral[300],
                backgroundColor: method === 'Cash' ? theme.colors.success[100] : theme.colors.background,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: theme.colors.text.primary }}>Nakit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMethod('BankTransfer')}
              style={{
                paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1,
                borderColor: method === 'BankTransfer' ? theme.colors.primary[600] : theme.colors.neutral[300],
                backgroundColor: method === 'BankTransfer' ? theme.colors.primary[100] : theme.colors.background,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: theme.colors.text.primary }}>IBAN / Havale</Text>
            </TouchableOpacity>
          </View>

          {/* Kime? */}
          <View style={CommonStyles.inputContainer}>
            <Text style={CommonStyles.label}>Ödeme Yapılacak Kişi</Text>
            <View style={styles.memberGrid}>
              {members.map((m) => {
                const memberId = String(m.userId ?? m.id);
                const active = String(toUserId) === memberId;
                return (
                  <TouchableOpacity
                    key={memberId}
                    activeOpacity={0.88}
                    onPress={() => setToUserId(memberId)}
                    style={[
                      styles.memberChip,
                      {
                        backgroundColor: active ? theme.colors.primary[600] : theme.colors.background,
                        borderColor: active ? theme.colors.primary[600] : theme.colors.neutral[300],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberChipText,
                        { color: active ? theme.colors.text.onPrimary : theme.colors.text.primary },
                      ]}
                    >
                      {m.fullName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.balanceHeaderRow}>
              <Text style={styles.balanceTitle}>Borç Durumu</Text>
              {balanceLoading ? <ActivityIndicator size="small" color={theme.colors.primary[600]} /> : null}
            </View>
            <Text style={styles.balanceLead}>{currentStatusText}</Text>
            <Text style={styles.balanceHint}>{projectedStatusText}</Text>

          {!!toUserId && (
              <View style={styles.balanceMetrics}>
                <View style={[styles.metricBox, { backgroundColor: theme.colors.error[50] }]}>
                  <Text style={styles.metricLabel}>Şu anki borç</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.error[600] }]}>
                    {formatCurrency(currentNet < 0 ? Math.abs(currentNet) : 0)}
                  </Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: theme.colors.success[50] }]}>
                  <Text style={styles.metricLabel}>Ödeme sonrası alacak</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.success[600] }]}>
                    {formatCurrency(remainingReceivable)}
                  </Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: theme.colors.primary[50] }]}>
                  <Text style={styles.metricLabel}>Ödeme sonrası kalan borç</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.primary[700] }]}>
                    {formatCurrency(remainingDebt)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Tutar */}
          <View style={CommonStyles.inputContainer}>
            <Text style={CommonStyles.label}>Tutar (₺)</Text>
            {!!toUserId && currentNet < 0 && (
              <View style={styles.quickAmountRow}>
                <TouchableOpacity
                  style={styles.quickAmountBtn}
                  activeOpacity={0.88}
                  onPress={() => setAmount(String(Math.max(0, Math.round(Math.abs(currentNet)))))}
                >
                  <Text style={styles.quickAmountText}>Borcun kadar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAmountBtn}
                  activeOpacity={0.88}
                  onPress={() => setAmount('0')}
                >
                  <Text style={styles.quickAmountText}>Temizle</Text>
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, padding: 12, backgroundColor: theme.colors.background, fontSize: 16, color: theme.colors.text.primary }}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Açıklama */}
          <View style={CommonStyles.inputContainer}>
            <Text style={CommonStyles.label}>Açıklama</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, padding: 12, backgroundColor: theme.colors.background, fontSize: 16, color: theme.colors.text.primary, minHeight: 80, textAlignVertical: 'top' }}
              value={description}
              onChangeText={setDescription}
              placeholder="Ödeme açıklaması (örn: Kira payı, market alışverişi)"
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.payerInfo}>
            Ödeme Yapan: {user?.fullName || 'Bilinmeyen Kullanıcı'}
          </Text>

          {/* IBAN seçiliyse dekont yükleme */}
          {method === 'BankTransfer' && (
            <View style={CommonStyles.inputContainer}>
              <Text style={CommonStyles.label}>Dekont (Zorunlu)</Text>
              {selectedImage ? (
                <View style={{ alignItems: 'center' }}>
                  <Image source={{ uri: selectedImage }} style={{ width: 220, height: 160, borderRadius: 8, marginBottom: 8 }} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={pickImage} style={CommonStyles.menuButton} activeOpacity={0.8}>
                      <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.neutral.background }]}>
                        <Text style={CommonStyles.buttonText}>Galeriden Değiştir</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={takePhoto} style={CommonStyles.menuButton} activeOpacity={0.8}>
                      <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.neutral.background }]}>
                        <Text style={CommonStyles.buttonText}>Fotoğraf Çek</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={pickImage} style={CommonStyles.menuButton} activeOpacity={0.8}>
                    <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.primary.background, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                      <Ionicons name="image-outline" size={18} color={theme.colors.text.primary} />
                      <Text style={CommonStyles.buttonText}>Galeriden Yükle</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={takePhoto} style={CommonStyles.menuButton} activeOpacity={0.8}>
                    <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.warning.background, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                      <Ionicons name="camera-outline" size={18} color={theme.colors.text.primary} />
                      <Text style={CommonStyles.buttonText}>Fotoğraf Çek</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            CommonStyles.menuButton,
            (!amount || !toUserId || !description.trim() || loading || (method === 'BankTransfer' && !selectedImage)) && { opacity: 0.5 }
          ]}
          onPress={handleCreatePayment}
          disabled={!amount || !toUserId || !description.trim() || loading || (method === 'BankTransfer' && !selectedImage)}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.success.background }]}>
            <Ionicons name="card-outline" size={24} color={ColorThemes.success.foreground} style={{ marginBottom: 6 }} />
            <Text style={CommonStyles.buttonText}>
              {loading ? 'Ödeme Oluşturuluyor...' : 'Ödeme Yap'}
            </Text>
            <Text style={CommonStyles.buttonSubtext}>Ödeme isteği gönder</Text>
          </View>
        </TouchableOpacity>

          {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        )}

        {!!formError && (
          <View style={{ padding: 12 }}>
            <Text style={{ color: theme.colors.error[600] }}>{formError}</Text>
          </View>
        )}
      </KeyboardAwareScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    loadingOverlay: {
      position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
      alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.7)'
    },
    payerInfo: { textAlign: 'center', fontSize: 14, color: theme.colors.text.secondary, fontStyle: 'italic', marginVertical: 10 },
    balanceCard: {
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    balanceHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    balanceTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.text.primary,
    },
    balanceLead: {
      color: theme.colors.text.primary,
      lineHeight: 20,
      fontWeight: '600',
    },
    balanceHint: {
      marginTop: 6,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    balanceMetrics: {
      marginTop: 12,
      gap: 10,
    },
    memberGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 6,
    },
    quickAmountRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    quickAmountBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1,
      borderColor: theme.colors.primary[200],
    },
    quickAmountText: {
      color: theme.colors.primary[700],
      fontWeight: '800',
      fontSize: 12,
    },
    memberChip: {
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      minWidth: '48%',
    },
    memberChipText: {
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    metricBox: {
      borderRadius: 12,
      padding: 12,
    },
    metricLabel: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      marginBottom: 4,
      fontWeight: '600',
    },
    metricValue: {
      fontSize: 17,
      fontWeight: '800',
    },
  });
}
