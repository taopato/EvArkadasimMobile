import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { resolveMediaUrl } from '../shared/config/env';
import {
  Avatar,
  EmptyState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SectionHeader,
} from '../shared/ui/roomora/CanonicalUI';

export default function EvUyeleri({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const houseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const houseName = route?.params?.houseName || user?.defaultHouseName || 'Aktif Ev';
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [houseCover, setHouseCover] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = useCallback(async () => {
    if (!houseId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [response, houseResponse] = await Promise.all([
        houseApi.getMembers(houseId),
        houseApi.getById(houseId),
      ]);
      const raw = response?.data?.data ?? response?.data ?? [];
      setMembers((Array.isArray(raw) ? raw : []).map((member) => ({
        id: Number(member.userId ?? member.user?.id ?? member.id),
        name: member.fullName ?? member.name ?? member.user?.fullName ?? 'Ev arkadaşı',
        email: member.email ?? member.user?.email ?? '',
        photo: resolveMediaUrl(member.profileImageUrl ?? member.profilePhotoUrl ?? member.user?.profileImageUrl ?? member.user?.profilePhotoUrl),
        role: member.role ?? member.houseRole,
      })));
      setHouseCover(resolveMediaUrl(houseResponse?.data?.coverImageUrl));
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => { load(); }, [load]);

  const chooseHouseCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('İzin gerekli', 'Ev fotoğrafı seçmek için galeri izni vermelisin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.84,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;
    setUploadingCover(true);
    try {
      let prepared = asset;
      if (Platform.OS !== 'web') {
        prepared = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1600 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
        );
      }
      const image = Platform.OS === 'web'
        ? new File([await (await fetch(prepared.uri)).blob()], `ev-${Date.now()}.jpg`, { type: 'image/jpeg' })
        : { uri: prepared.uri, name: `ev-${Date.now()}.jpg`, type: 'image/jpeg' };
      const uploadResponse = await houseApi.uploadCoverImage(houseId, image);
      setHouseCover(resolveMediaUrl(uploadResponse?.data?.coverImageUrl));
    } catch (error) {
      Alert.alert('Fotoğraf yüklenemedi', error?.response?.data?.message || 'Lütfen tekrar dene.');
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary[600]} />}
      >
        <PageHeader title="Ev Üyeleri" subtitle={houseName} onBack={() => navigation.goBack()} rightIcon="person-add-outline" onRightPress={() => navigation.navigate('DavetEt', { houseId, houseName })} />
        {loading ? <LoadingState label="Ev arkadaşları yükleniyor..." /> : (
          <>
            <View style={styles.houseCard}>
              <TouchableOpacity style={styles.houseIcon} onPress={chooseHouseCover} disabled={uploadingCover}>
                {houseCover ? <Image source={{ uri: houseCover }} style={styles.houseImage} /> : <Ionicons name="camera-outline" size={27} color={theme.colors.primary[700]} />}
              </TouchableOpacity>
              <View style={styles.houseBody}>
                <Text style={styles.houseName}>{houseName}</Text>
                <Text style={styles.houseMeta}>{uploadingCover ? 'Fotoğraf yükleniyor...' : `${members.length} ev arkadaşı · Fotoğrafı değiştirmek için dokun`}</Text>
              </View>
            </View>
            <SectionHeader title="Ev arkadaşları" />
            {members.map((member) => (
              <TouchableOpacity
                key={String(member.id)}
                style={styles.memberRow}
                activeOpacity={0.84}
                onPress={() => member.id !== Number(user?.id) && navigation.navigate('KisiDetayi', {
                  houseId,
                  userAId: user?.id,
                  userBId: member.id,
                  userName: member.name,
                  userPhoto: member.photo,
                })}
              >
                <Avatar name={member.name} uri={member.photo} />
                <View style={styles.memberBody}>
                  <Text style={styles.memberName}>{member.name}{member.id === Number(user?.id) ? ' (Sen)' : ''}</Text>
                  <Text style={styles.memberEmail}>{member.email || (member.role === 'Owner' ? 'Ev yöneticisi' : 'Ev üyesi')}</Text>
                </View>
                {member.id !== Number(user?.id) && <Ionicons name="chevron-forward" size={19} color={theme.colors.neutral[400]} />}
              </TouchableOpacity>
            ))}
            {!members.length && <EmptyState icon="people-outline" title="Henüz üye yok" description="Ev arkadaşlarını davet ederek ortak yaşamı birlikte yönetmeye başlayın." />}
            <PrimaryButton label="Ev Arkadaşı Davet Et" icon="person-add-outline" onPress={() => navigation.navigate('DavetEt', { houseId, houseName })} />
            <SectionHeader title="Ev araçları" />
            <View style={styles.tools}>
              <Tool icon="wallet-outline" label="Borç / Alacak" onPress={() => navigation.navigate('DebtSummaryScreen', { houseId, houseName })} styles={styles} theme={theme} />
              <Tool icon="receipt-outline" label="Harcama Özeti" onPress={() => navigation.navigate('HarcamaOzeti', { houseId, houseName })} styles={styles} theme={theme} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Tool({ icon, label, onPress, styles, theme }) {
  return (
    <TouchableOpacity style={styles.tool} onPress={onPress} activeOpacity={0.84}>
      <Ionicons name={icon} size={24} color={theme.colors.primary[700]} />
      <Text style={styles.toolText}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  houseCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginTop: 12, borderRadius: 8, backgroundColor: theme.colors.primary[50], borderWidth: 1, borderColor: theme.colors.primary[200] },
  houseIcon: { width: 72, height: 52, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  houseImage: { width: '100%', height: '100%' },
  houseBody: { flex: 1 },
  houseName: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 19 },
  houseMeta: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 14, marginTop: 3 },
  memberRow: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200], marginBottom: 8, borderRadius: 8 },
  memberBody: { flex: 1 },
  memberName: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 16 },
  memberEmail: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 13, marginTop: 3 },
  tools: { flexDirection: 'row', gap: 10 },
  tool: { flex: 1, minHeight: 92, padding: 10, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200], alignItems: 'center', justifyContent: 'center', gap: 8 },
  toolText: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 12, textAlign: 'center' },
});
