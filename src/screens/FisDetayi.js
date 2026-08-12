import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PanGestureHandler, PinchGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { houseApi, receiptsApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { LoadingState, PageHeader } from '../shared/ui/roomora/CanonicalUI';
import { BASE_URL } from '../shared/config/env';

const CATEGORY_OPTIONS = [
  { key: 'Market', label: 'Market' },
  { key: 'Food', label: 'Yemek' },
  { key: 'Other', label: 'Diğer' },
];

const MARKER_COLORS = [
  { fill: 'rgba(255, 214, 10, 0.28)', border: '#E3B700', badge: '#E3B700', text: '#5B4500' },
  { fill: 'rgba(52, 152, 219, 0.28)', border: '#2D8FD6', badge: '#2D8FD6', text: '#05375D' },
  { fill: 'rgba(46, 204, 113, 0.26)', border: '#21A75A', badge: '#21A75A', text: '#084523' },
  { fill: 'rgba(155, 89, 182, 0.26)', border: '#8E44AD', badge: '#8E44AD', text: '#38104B' },
  { fill: 'rgba(241, 196, 15, 0.28)', border: '#CDA40C', badge: '#CDA40C', text: '#5C4700' },
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseReceiptAmount = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  let normalized = raw
    .replace(/TL/gi, '')
    .replace(/\s+/g, '');

  if ((normalized.match(/[,.]/g) || []).length > 1) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const splitSegmentedReceiptLine = (line) => {
  const normalized = String(line || '').trim();
  const matches = [...normalized.matchAll(/\*?\s*(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)/g)];
  if (matches.length < 2) return [];

  const items = [];
  let previousEnd = 0;

  matches.forEach((match) => {
    const amount = parseReceiptAmount(match[0].replace('*', '').trim());
    const name = normalized
      .slice(previousEnd, match.index)
      .replace(/%\s*\d+[.,]?\d*/g, '')
      .replace(/[*:.-]+$/g, '')
      .trim();
    previousEnd = (match.index ?? 0) + match[0].length;

    if (amount > 0 && name && !isReceiptMetaName(name)) {
      items.push({
        name,
        price: amount,
        quantity: 1,
        lineTotal: amount,
        isAssigned: false,
        isShared: true,
        personalUserId: null,
      });
    }
  });

  return items;
};

const synthesizeItemsFromRawText = (rawText, detectedTotalAmount = 0) => {
  const text = String(rawText || '').trim();
  if (!text) {
    return detectedTotalAmount > 0
      ? [{ name: 'Fiş Toplamı', price: detectedTotalAmount, quantity: 1, lineTotal: detectedTotalAmount, isAssigned: false, isShared: true, personalUserId: null }]
      : [];
  }

  const ignoreKeywords = ['HESAP', 'KODU', 'BAKIYE', 'TARIH', 'SAAT', 'SATIS', 'KASIYER', 'ALINAN PARA', 'PARA USTU', 'GENEL TOPLAM', 'KDV', 'FIS NO'];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const upper = line.toUpperCase();
    const segmentedItems = splitSegmentedReceiptLine(line);
    if (segmentedItems.length > 0) {
      items.push(...segmentedItems);
      continue;
    }

    if (ignoreKeywords.some((keyword) => upper.includes(keyword))) {
      continue;
    }

    const inlineMatch = line.match(/^(?<name>.*?)(?<amount>\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)$/);
    if (inlineMatch?.groups?.name && inlineMatch?.groups?.amount) {
      const amount = parseReceiptAmount(inlineMatch.groups.amount);
      const name = inlineMatch.groups.name.trim().replace(/[*:.-]+$/g, '').trim();
      if (amount > 0 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(name)) {
        items.push({ name, price: amount, quantity: 1, lineTotal: amount, isAssigned: false, isShared: true, personalUserId: null });
        continue;
      }
    }

    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(line)) {
      continue;
    }
    if (/\(\s*\d+\s*ADET\s*X/i.test(upper) || /^\d{6,}/.test(line)) {
      continue;
    }

    const nextLine = lines[index + 1];
    const amount = parseReceiptAmount(nextLine);
    if (amount > 0) {
      items.push({
        name: line.replace(/[*:.-]+$/g, '').trim(),
        price: amount,
        quantity: 1,
        lineTotal: amount,
        isAssigned: false,
        isShared: true,
        personalUserId: null,
      });
      index += 1;
    }
  }

  if (items.length > 0) {
    return items.map((item, index) => ({ ...item, sortOrder: index }));
  }

  return detectedTotalAmount > 0
    ? [{ name: 'Fiş Toplamı', price: detectedTotalAmount, quantity: 1, lineTotal: detectedTotalAmount, isAssigned: false, isShared: true, personalUserId: null, sortOrder: 0 }]
    : [];
};

const normalizeReceiptItems = (items = []) => items.map((item, index) => ({
  ...item,
  sortOrder: item?.sortOrder ?? index,
  name: item?.name ?? '',
  price: toNumber(item?.price),
  quantity: toNumber(item?.quantity, 1),
  lineTotal: toNumber(item?.lineTotal ?? item?.price),
  isAssigned: item?.isAssigned === true,
  isShared: item?.isShared !== false,
}));

const RECEIPT_META_KEYWORDS = [
  'TCKN',
  'VKN',
  'VERGI',
  'NİHAI',
  'NIHAI',
  'HESAP ADI',
  'HESAP KODU',
  'BAKIYE',
  'TARIH',
  'SAAT',
  'SATIS',
  'KASIYER',
  'ALINAN PARA',
  'PARA USTU',
  'GENEL TOPLAM',
  'TOPLAM KDV',
  'ODENECEK',
  'TUTAR',
  'FIS NO',
  'Z NO',
  'VERESIYE',
  'KDV FISI',
];

const isReceiptMetaName = (value) => {
  const upper = String(value || '').trim().toUpperCase();
  if (!upper) return true;
  if (RECEIPT_META_KEYWORDS.some((keyword) => upper.includes(keyword))) return true;
  if (/^\d{6,}$/.test(upper)) return true;
  if (/^\d+\s+AD(?:ET)?\s+X\s+\d/.test(upper)) return true;
  return false;
};

const extractDetectedTotalFromRawText = (rawText) => {
  const text = String(rawText || '');
  if (!text.trim()) return 0;

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!/toplam|tutar|odenecek/i.test(line)) continue;
    const matches = [...line.matchAll(/\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?/g)];
    const last = matches.at(-1)?.[0];
    const amount = parseReceiptAmount(last);
    if (amount > 0) return amount;
  }

  return 0;
};

const isMeaningfulReceiptItem = (item) => {
  const name = String(item?.name || '').trim();
  const lineTotal = toNumber(item?.lineTotal ?? item?.price);
  const price = toNumber(item?.price);

  if (!name && lineTotal <= 0 && price <= 0) return false;
  if (/^isimsiz kalem$/i.test(name) && lineTotal <= 0 && price <= 0) return false;
  if (!/kalem|toplam/i.test(name) && isReceiptMetaName(name)) return false;
  return true;
};

const normalizeResolvedItems = (items = []) => items
  .filter(isMeaningfulReceiptItem)
  .map((item, index) => ({ ...item, sortOrder: index }));

const calculateItemsTotal = (items = []) => items.reduce((sum, item) => sum + toNumber(item?.lineTotal ?? item?.price), 0);

const resolveReceiptItems = (preferredItems = [], rawText = '', detectedTotalAmount = 0) => {
  // Backend'in (kutu/pozisyon bilgisiyle) çıkardığı kalemler her zaman ham
  // metni kör regex ile bölen synthesize fallback'inden daha güvenilir.
  // Fallback yalnızca backend hiç kalem döndürmediğinde kullanılır.
  const sanitizedPreferred = normalizeResolvedItems(normalizeReceiptItems(preferredItems));
  if (sanitizedPreferred.length) return sanitizedPreferred;

  return normalizeResolvedItems(synthesizeItemsFromRawText(rawText, detectedTotalAmount));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getRenderMetrics = (imageFrame, imageSourceSize) => {
  if (!imageFrame?.width || !imageFrame?.height || !imageSourceSize?.width || !imageSourceSize?.height) {
    return null;
  }

  const scale = Math.min(imageFrame.width / imageSourceSize.width, imageFrame.height / imageSourceSize.height);
  const renderedWidth = imageSourceSize.width * scale;
  const renderedHeight = imageSourceSize.height * scale;
  const offsetX = (imageFrame.width - renderedWidth) / 2;
  const offsetY = (imageFrame.height - renderedHeight) / 2;

  return {
    scale,
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    centerX: imageFrame.width / 2,
    centerY: imageFrame.height / 2,
  };
};

function FisDetayiInner({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const receiptId = route?.params?.receiptId;
  const houseId = route?.params?.houseId || user?.defaultHouseId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [payerUserId, setPayerUserId] = useState(String(user?.id || ''));
  const [category, setCategory] = useState('Market');
  const [editingIndex, setEditingIndex] = useState(null);
  const [draftItem, setDraftItem] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [imageFrame, setImageFrame] = useState({ width: 0, height: 260 });
  const [imageSourceSize, setImageSourceSize] = useState({ width: 1, height: 1 });
  const [focusedOverlayIndex, setFocusedOverlayIndex] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [pinchPreviewScale, setPinchPreviewScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState({ x: 0, y: 0 });
  const [activeMarkerKey, setActiveMarkerKey] = useState(null);
  const [imageInteractionEnabled, setImageInteractionEnabled] = useState(false);
  const [draftSelection, setDraftSelection] = useState(null);
  const draftSelectionRef = useRef(null);
  const isConverted = String(receipt?.status ?? '').toLowerCase() === 'converted'
    || Number(receipt?.status) === 3;

  const load = async () => {
    if (!receiptId || !houseId) return;
    setLoading(true);
    try {
      const [receiptRes, membersRes] = await Promise.all([
        receiptsApi.getById(receiptId),
        houseApi.getMembers(houseId),
      ]);

      let receiptData = receiptRes?.data;
      const rawMembers = Array.isArray(membersRes?.data?.data)
        ? membersRes.data.data
        : Array.isArray(membersRes?.data)
          ? membersRes.data
          : [];

      const normalizedMembers = rawMembers
        .map((item) => ({
          id: Number(item.userId ?? item.id),
          fullName: item.fullName ?? item.name ?? 'Uye',
        }))
        .filter((item) => Number.isFinite(item.id));

      let normalizedItems = normalizeReceiptItems(receiptData?.items || []);
      const meaningfulExistingItems = normalizeResolvedItems(normalizedItems);
      const rawDetectedTotal = extractDetectedTotalFromRawText(receiptData?.rawOcrText);
      const explicitExistingTotal = calculateItemsTotal(meaningfulExistingItems);
      const hasMeaninglessSavedItems = normalizedItems.some((item) => !isMeaningfulReceiptItem(item));
      const receiptIsConverted = String(receiptData?.status ?? '').toLowerCase() === 'converted'
        || Number(receiptData?.status) === 3;
      const shouldReparse = !receiptIsConverted && (
        normalizedItems.length === 0
        || normalizedItems.every((item) => toNumber(item.lineTotal) <= 0)
        || normalizedItems.every((item) => item.boxLeft == null || item.boxTop == null || item.boxWidth == null || item.boxHeight == null)
        || meaningfulExistingItems.length === 0
        || hasMeaninglessSavedItems
        || (rawDetectedTotal > 0 && explicitExistingTotal + 0.5 < rawDetectedTotal)
      );

      if (shouldReparse) {
        try {
          const reparsedRes = await receiptsApi.reparse(receiptId);
          if (reparsedRes?.data) {
            receiptData = reparsedRes.data;
            normalizedItems = normalizeReceiptItems(receiptData?.items || []);
          }
        } catch {}
      }

      const correctedDetectedTotal = Math.max(
        toNumber(receiptData?.detectedTotalAmount),
        extractDetectedTotalFromRawText(receiptData?.rawOcrText)
      );

      setReceipt({
        ...receiptData,
        detectedTotalAmount: correctedDetectedTotal,
      });
      setItems(resolveReceiptItems(normalizedItems, receiptData?.rawOcrText, correctedDetectedTotal));
      setMembers(normalizedMembers);
      if (!payerUserId && normalizedMembers.length > 0) {
        setPayerUserId(String(normalizedMembers[0].id));
      }
    } catch {
      Alert.alert('Hata', 'Fiş detayları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [receiptId, houseId]);

  const imageUri = receipt?.imageUrl
    ? (receipt.imageUrl.startsWith('http') ? receipt.imageUrl : `${BASE_URL}${receipt.imageUrl}`)
    : null;

  useEffect(() => {
    if (!imageUri) return undefined;

    let cancelled = false;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setImageSourceSize({ width, height });
        }
      },
      () => {
      }
    );

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const patchItem = (index, next) => {
    if (isConverted) return;
    setItems((prev) => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...next } : item
    )));
  };

  const toggleSelected = (index) => {
    if (isConverted) return;
    setSelectedIndexes((prev) => (
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    ));
  };

  const clearSelected = () => {
    setSelectedIndexes([]);
    setFocusedOverlayIndex(null);
  };

  const applyBulkAssignment = ({ isShared, personalUserId = null }) => {
    if (isConverted) return;
    if (!selectedIndexes.length) return;
    setItems((prev) => prev.map((item, index) => (
      selectedIndexes.includes(index)
        ? {
          ...item,
          isAssigned: true,
          isShared,
          personalUserId: isShared ? null : personalUserId,
        }
        : item
    )));
    setSelectedIndexes([]);
    setFocusedOverlayIndex(null);
  };

  const addItem = () => {
    if (isConverted) return;
    setItems((prev) => [
      ...prev,
      {
        name: '',
        price: 0,
        quantity: 1,
        lineTotal: 0,
        isAssigned: false,
        isShared: true,
        personalUserId: null,
        sortOrder: prev.length,
      },
    ]);
  };

  const removeItem = (index) => {
    if (isConverted) return;
    setItems((prev) => prev
      .filter((_, itemIndex) => itemIndex !== index)
      .map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })));
    setSelectedIndexes((prev) => prev.filter((itemIndex) => itemIndex !== index).map((itemIndex) => (itemIndex > index ? itemIndex - 1 : itemIndex)));
    if (focusedOverlayIndex === index) setFocusedOverlayIndex(null);
  };

  const openEditor = (index) => {
    if (isConverted) return;
    const source = items[index];
    if (!source) return;

    setEditingIndex(index);
    setDraftItem({
      name: source.name ?? '',
      price: String(source.price ?? ''),
      quantity: String(source.quantity ?? 1),
      lineTotal: String(source.lineTotal ?? source.price ?? 0),
      isShared: source.isShared !== false,
      personalUserId: source.personalUserId ?? null,
    });
  };

  const closeEditor = () => {
    setEditingIndex(null);
    setDraftItem(null);
  };

  const saveEditor = () => {
    if (editingIndex == null || !draftItem) return;

    const price = toNumber(draftItem.price);
    const quantity = toNumber(draftItem.quantity, 1) || 1;
    const lineTotal = toNumber(draftItem.lineTotal, price * quantity);

    patchItem(editingIndex, {
      name: String(draftItem.name || '').trim(),
      price,
      quantity,
      lineTotal,
      isAssigned: true,
      isShared: Boolean(draftItem.isShared),
      personalUserId: draftItem.isShared ? null : draftItem.personalUserId,
    });
    closeEditor();
  };

  const buildPayloadItems = () => {
    const normalized = items
      .filter(isMeaningfulReceiptItem)
      .map((item, index) => ({
      name: String(item.name || '').trim() || `Kalem ${index + 1}`,
      price: toNumber(item.price),
      quantity: toNumber(item.quantity, 1) || 1,
      lineTotal: toNumber(item.lineTotal, toNumber(item.price) * (toNumber(item.quantity, 1) || 1)),
      boxLeft: item.boxLeft ?? null,
      boxTop: item.boxTop ?? null,
      boxWidth: item.boxWidth ?? null,
      boxHeight: item.boxHeight ?? null,
      isAssigned: Boolean(item.isAssigned),
      isShared: Boolean(item.isShared),
      personalUserId: item.isShared ? null : item.personalUserId,
      sortOrder: index,
    }));

    const detectedTotal = toNumber(receipt?.detectedTotalAmount);
    const explicitTotal = normalized.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const remainder = Number((detectedTotal - explicitTotal).toFixed(2));

    if (detectedTotal > 0 && remainder > 0.01) {
      normalized.push({
        name: 'Ortak Kalan Tutar',
        price: remainder,
        quantity: 1,
        lineTotal: remainder,
        boxLeft: null,
        boxTop: null,
        boxWidth: null,
        boxHeight: null,
        isAssigned: true,
        isShared: true,
        personalUserId: null,
        sortOrder: normalized.length,
      });
    }

    return normalized;
  };

  const saveDraft = async ({ silent = false } = {}) => {
    if (!receiptId) return null;
    const payloadItems = buildPayloadItems();
    if (!payloadItems.length) {
      if (!silent) Alert.alert('Uyarı', 'En az bir fiş kalemi olmalı.');
      return null;
    }
    if (payloadItems.some((item) => !item.isShared && !item.personalUserId)) {
      if (!silent) Alert.alert('Uyarı', 'Kişisel işaretlenen her kalem için bir kişi seçmelisin.');
      return null;
    }

    setSaving(true);
    try {
      const preservedDetectedTotal = Math.max(
        toNumber(receipt?.detectedTotalAmount),
        extractDetectedTotalFromRawText(receipt?.rawOcrText),
        payloadItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
      );

      const response = await receiptsApi.update(receiptId, {
        storeName: receipt?.storeName || 'Fiş',
        receiptDate: receipt?.receiptDate,
        detectedTotalAmount: preservedDetectedTotal,
        items: payloadItems,
      });
      const nextReceipt = response?.data;
      if (nextReceipt) {
        const normalizedItems = (nextReceipt.items || []).map((item, index) => ({
          ...item,
          sortOrder: item.sortOrder ?? index,
          price: toNumber(item.price),
          quantity: toNumber(item.quantity, 1),
          lineTotal: toNumber(item.lineTotal ?? item.price),
          isAssigned: item?.isAssigned === true,
          isShared: item.isShared !== false,
        }));
        const correctedDetectedTotal = Math.max(
          toNumber(nextReceipt?.detectedTotalAmount),
          extractDetectedTotalFromRawText(nextReceipt?.rawOcrText)
        );
        setReceipt({
          ...nextReceipt,
          detectedTotalAmount: correctedDetectedTotal,
        });
        setItems(resolveReceiptItems(normalizedItems, nextReceipt?.rawOcrText, correctedDetectedTotal));
      }
      return nextReceipt;
    } catch {
      if (!silent) Alert.alert('Hata', 'Fiş taslağı kaydedilemedi.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const convertToExpense = async () => {
    if (!payerUserId) {
      Alert.alert('Uyarı', 'Önce ödeyen kişiyi seç.');
      return;
    }

    const saved = await saveDraft({ silent: true });
    if (!saved) {
      Alert.alert('Hata', 'Dönüşüm öncesi fiş kaydedilemedi.');
      return;
    }

    setSaving(true);
    try {
      await receiptsApi.convertToExpense(receiptId, {
        payerUserId: Number(payerUserId),
        note: receipt?.storeName || 'Fişten oluşturuldu',
        category,
      });
      Alert.alert('Başarılı', 'Fiş harcamaya dönüştürüldü.');
      navigation.navigate('MainTabs', { screen: 'TumHarcamalar' });
    } catch {
      Alert.alert('Hata', 'Fiş harcamaya dönüştürülemedi.');
    } finally {
      setSaving(false);
    }
  };

  const deleteReceipt = () => {
    if (!receiptId || isConverted || saving) return;
    Alert.alert(
      'Fişi sil',
      'Bu fiş ve taranan görseli kalıcı olarak silinecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await receiptsApi.remove(receiptId);
              navigation.goBack();
            } catch {
              Alert.alert('Hata', 'Fiş silinemedi. Lütfen tekrar dene.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const explicitTotal = items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
  const detectedTotal = toNumber(receipt?.detectedTotalAmount);
  const total = detectedTotal > 0 ? Math.max(detectedTotal, explicitTotal) : explicitTotal;
  const missingAmount = Math.max(Number((total - explicitTotal).toFixed(2)), 0);
  const personalTotal = items
    .filter((item) => !item.isShared)
    .reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
  const sharedTotal = Math.max(total - personalTotal, 0);

  const totalZoom = imageZoom * pinchPreviewScale;
  const totalPan = {
    x: panOffset.x + panDrag.x,
    y: panOffset.y + panDrag.y,
  };
  const canPageScroll = !imageInteractionEnabled;
  const renderMetrics = useMemo(() => getRenderMetrics(imageFrame, imageSourceSize), [imageFrame, imageSourceSize]);

  const markerOptions = [
    { key: 'shared', label: 'Ortak', type: 'shared', color: { fill: 'rgba(231, 76, 60, 0.26)', border: '#D64534', badge: '#D64534', text: '#6A1510' } },
    ...members.map((member, index) => ({
      key: `user-${member.id}`,
      label: member.fullName,
      type: 'personal',
      userId: member.id,
      color: MARKER_COLORS[index % MARKER_COLORS.length],
    })),
  ];

  const activeMarker = markerOptions.find((option) => option.key === activeMarkerKey) || null;

  const deactivateImageInteraction = () => {
    setImageInteractionEnabled(false);
    setActiveMarkerKey(null);
    setDraftSelection(null);
    draftSelectionRef.current = null;
    clearSelected();
  };

  const clampPan = (value, axis, zoom = totalZoom) => {
    const base = axis === 'x' ? imageFrame.width : imageFrame.height;
    const max = Math.max(0, ((base * zoom) - base) / 2);
    return Math.min(max, Math.max(-max, value));
  };

  const overlayStyleFor = (item) => {
    if (!renderMetrics) return null;

    if (item.boxLeft == null || item.boxTop == null || item.boxWidth == null || item.boxHeight == null) {
      return null;
    }

    return {
      left: renderMetrics.offsetX + (item.boxLeft * renderMetrics.scale),
      top: renderMetrics.offsetY + (item.boxTop * renderMetrics.scale),
      width: Math.max(item.boxWidth * renderMetrics.scale, 44),
      height: Math.max(item.boxHeight * renderMetrics.scale, 26),
    };
  };

  const compactPriceOverlayStyleFor = (item) => {
    const overlay = overlayStyleFor(item);
    if (!overlay) return null;

    return {
      ...overlay,
      width: Math.max(Math.min(overlay.width, 96), 52),
      height: Math.max(Math.min(overlay.height, 32), 24),
    };
  };

  const getItemMarker = (item) => {
    if (!item.isAssigned) {
      return { fill: 'rgba(231, 76, 60, 0.18)', border: '#D64534', badge: '#FFF0EE', text: '#8F1F16' };
    }
    if (item.isShared) {
      return markerOptions[0].color;
    }
    const personal = markerOptions.find((option) => option.type === 'personal' && Number(option.userId) === Number(item.personalUserId));
    return personal?.color || { fill: 'rgba(255,255,255,0.18)', border: '#FFFFFF', badge: '#FFFFFF', text: '#333333' };
  };

  const framePointToImagePoint = (x, y) => {
    if (!renderMetrics) return null;

    const unscaledX = renderMetrics.centerX + ((x - renderMetrics.centerX - totalPan.x) / totalZoom);
    const unscaledY = renderMetrics.centerY + ((y - renderMetrics.centerY - totalPan.y) / totalZoom);

    const clampedX = clamp(unscaledX, renderMetrics.offsetX, renderMetrics.offsetX + renderMetrics.renderedWidth);
    const clampedY = clamp(unscaledY, renderMetrics.offsetY, renderMetrics.offsetY + renderMetrics.renderedHeight);

    return {
      frameX: clampedX,
      frameY: clampedY,
      imageX: (clampedX - renderMetrics.offsetX) / renderMetrics.scale,
      imageY: (clampedY - renderMetrics.offsetY) / renderMetrics.scale,
    };
  };

  const normalizeSelectionToImageBox = (selection) => {
    if (!selection) return null;

    const start = framePointToImagePoint(selection.startX, selection.startY);
    const end = framePointToImagePoint(selection.endX, selection.endY);
    if (!start || !end) return null;

    let left = Math.min(start.imageX, end.imageX);
    let top = Math.min(start.imageY, end.imageY);
    let width = Math.abs(end.imageX - start.imageX);
    let height = Math.abs(end.imageY - start.imageY);

    if (width < 16 && height < 16) {
      width = 180 / (renderMetrics?.scale || 1);
      height = 42 / (renderMetrics?.scale || 1);
      left = clamp(start.imageX - (width / 2), 0, imageSourceSize.width - width);
      top = clamp(start.imageY - (height / 2), 0, imageSourceSize.height - height);
    }

    return {
      boxLeft: Math.round(left),
      boxTop: Math.round(top),
      boxWidth: Math.max(24, Math.round(width)),
      boxHeight: Math.max(18, Math.round(height)),
    };
  };

  const getItemBox = (item) => {
    if (item?.boxLeft == null || item?.boxTop == null || item?.boxWidth == null || item?.boxHeight == null) {
      return null;
    }
    return {
      left: Number(item.boxLeft),
      top: Number(item.boxTop),
      right: Number(item.boxLeft) + Number(item.boxWidth),
      bottom: Number(item.boxTop) + Number(item.boxHeight),
    };
  };

  const findIntersectingItemIndex = (box) => {
    if (!box) return -1;
    const candidate = {
      left: box.boxLeft,
      top: box.boxTop,
      right: box.boxLeft + box.boxWidth,
      bottom: box.boxTop + box.boxHeight,
    };

    let bestIndex = -1;
    let bestScore = 0;

    items.forEach((item, index) => {
      const current = getItemBox(item);
      if (!current) return;

      const overlapWidth = Math.max(0, Math.min(candidate.right, current.right) - Math.max(candidate.left, current.left));
      const overlapHeight = Math.max(0, Math.min(candidate.bottom, current.bottom) - Math.max(candidate.top, current.top));
      const overlapArea = overlapWidth * overlapHeight;
      if (overlapArea <= 0) return;

      const currentArea = Math.max(1, (current.right - current.left) * (current.bottom - current.top));
      const candidateArea = Math.max(1, (candidate.right - candidate.left) * (candidate.bottom - candidate.top));
      const score = overlapArea / Math.min(currentArea, candidateArea);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    return bestScore >= 0.12 ? bestIndex : -1;
  };

  const buildManualItem = (imageBox, marker) => {
    const nextIndex = items.length + 1;
    const baseName = marker?.type === 'shared'
      ? `Ortak Kalem ${nextIndex}`
      : `${marker?.label || 'Kişisel'} Kalem ${nextIndex}`;

    return {
      name: baseName,
      price: 0,
      quantity: 1,
      lineTotal: 0,
      boxLeft: imageBox.boxLeft,
      boxTop: imageBox.boxTop,
      boxWidth: imageBox.boxWidth,
      boxHeight: imageBox.boxHeight,
      isAssigned: true,
      isShared: marker?.type === 'shared',
      personalUserId: marker?.type === 'personal' ? marker.userId : null,
      sortOrder: items.length,
    };
  };

  const finalizeSelection = (selection) => {
    if (!activeMarker || !selection) {
      setDraftSelection(null);
      return;
    }

    const imageBox = normalizeSelectionToImageBox(selection);
    setDraftSelection(null);
    draftSelectionRef.current = null;
    if (!imageBox) return;

    const existingIndex = findIntersectingItemIndex(imageBox);
    if (existingIndex >= 0) {
      patchItem(existingIndex, {
        boxLeft: imageBox.boxLeft,
        boxTop: imageBox.boxTop,
        boxWidth: imageBox.boxWidth,
        boxHeight: imageBox.boxHeight,
        isAssigned: true,
        isShared: activeMarker.type === 'shared',
        personalUserId: activeMarker.type === 'personal' ? activeMarker.userId : null,
      });
      setFocusedOverlayIndex(existingIndex);
      setSelectedIndexes([existingIndex]);
      return;
    }

    const nextIndex = items.length;
    setItems((prev) => [...prev, buildManualItem(imageBox, activeMarker)]);
    setFocusedOverlayIndex(nextIndex);
    setSelectedIndexes([nextIndex]);
  };

  const handleOverlayPress = (index) => {
    if (!activeMarker) {
      setFocusedOverlayIndex(index);
      setSelectedIndexes([index]);
      return;
    }

    const option = activeMarker;
    if (option?.type === 'shared') {
      patchItem(index, { isAssigned: true, isShared: true, personalUserId: null });
    } else if (option?.type === 'personal') {
      patchItem(index, { isAssigned: true, isShared: false, personalUserId: option.userId });
    }

    setFocusedOverlayIndex(index);
    setSelectedIndexes([index]);
  };

  const clampZoom = (value) => Math.min(3, Math.max(1, value));

  const handlePinchGesture = (event) => {
    const nextScale = clampZoom(event.nativeEvent.scale || 1);
    setPinchPreviewScale(nextScale);
  };

  const handlePinchStateChange = (event) => {
    const { oldState, scale } = event.nativeEvent;
    if (oldState === GestureState.ACTIVE) {
      const nextZoom = clampZoom(imageZoom * (scale || 1));
      setImageZoom(nextZoom);
      setPanOffset((prev) => ({
        x: clampPan(prev.x, 'x', nextZoom),
        y: clampPan(prev.y, 'y', nextZoom),
      }));
      setPinchPreviewScale(1);
    }
  };

  const handlePanGesture = (event) => {
    if (totalZoom <= 1.01) return;
    setPanDrag({
      x: event.nativeEvent.translationX,
      y: event.nativeEvent.translationY,
    });
  };

  const handlePanStateChange = (event) => {
    if (event.nativeEvent.oldState === GestureState.ACTIVE) {
      const nextX = clampPan(panOffset.x + event.nativeEvent.translationX, 'x');
      const nextY = clampPan(panOffset.y + event.nativeEvent.translationY, 'y');
      setPanOffset({ x: nextX, y: nextY });
      setPanDrag({ x: 0, y: 0 });
    }
  };

  const drawResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => Boolean(activeMarker),
    onMoveShouldSetPanResponder: () => Boolean(activeMarker),
    onPanResponderGrant: (event) => {
      if (!activeMarker) return;
      const { locationX, locationY } = event.nativeEvent;
      setImageInteractionEnabled(true);
      const nextSelection = {
        startX: locationX,
        startY: locationY,
        endX: locationX,
        endY: locationY,
      };
      draftSelectionRef.current = nextSelection;
      setDraftSelection(nextSelection);
    },
    onPanResponderMove: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      setDraftSelection((prev) => {
        const next = prev ? {
          ...prev,
          endX: locationX,
          endY: locationY,
        } : prev;
        draftSelectionRef.current = next;
        return next;
      });
    },
    onPanResponderRelease: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      const currentSelection = draftSelectionRef.current;
      finalizeSelection(currentSelection ? {
        ...currentSelection,
        endX: locationX,
        endY: locationY,
      } : null);
    },
    onPanResponderTerminate: () => {
      setDraftSelection(null);
      draftSelectionRef.current = null;
    },
  }), [activeMarker, items.length, totalPan.x, totalPan.y, totalZoom, renderMetrics, imageSourceSize.width, imageSourceSize.height]);

  const visibleItems = useMemo(() => (
    items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const topA = a.item?.boxTop ?? Number.MAX_SAFE_INTEGER;
        const topB = b.item?.boxTop ?? Number.MAX_SAFE_INTEGER;
        if (topA !== topB) return topA - topB;
        return a.index - b.index;
      })
  ), [items]);
  const draftSelectionStyle = useMemo(() => {
    if (!draftSelection || !activeMarker) return null;
    const left = Math.min(draftSelection.startX, draftSelection.endX);
    const top = Math.min(draftSelection.startY, draftSelection.endY);
    const width = Math.max(12, Math.abs(draftSelection.endX - draftSelection.startX));
    const height = Math.max(12, Math.abs(draftSelection.endY - draftSelection.startY));

    return {
      left,
      top,
      width,
      height,
      borderColor: activeMarker.color.border,
      backgroundColor: activeMarker.color.fill,
    };
  }, [draftSelection, activeMarker]);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
        <PageHeader title="Fiş Tarama Sonucu" onBack={() => navigation.goBack()} />
        <LoadingState label="Fiş okunuyor..." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
        scrollEnabled={canPageScroll}
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title={isConverted ? 'Fiş Detayı' : 'Fiş Tarama Sonucu'}
          subtitle={isConverted ? 'Kaydedilmiş fiş' : 'Bilgileri kontrol edip kaydet'}
          onBack={() => navigation.goBack()}
        />
        {imageUri ? (
          <>
            <View style={styles.zoomToolbar}>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setImageZoom((prev) => Math.max(1, Number((prev - 0.25).toFixed(2))))}>
                <Text style={styles.zoomButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.zoomLabel}>Yakınlık %{Math.round(imageZoom * 100)}</Text>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setImageZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}>
                <Text style={styles.zoomButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomResetButton} onPress={() => setImageZoom(1)}>
                <Text style={styles.zoomResetButtonText}>Sıfırla</Text>
              </TouchableOpacity>
            </View>
            {!isConverted ? (
              <>
                <View style={styles.markerToolbar}>
                  {markerOptions.map((option) => {
                    const active = activeMarkerKey === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.markerPill,
                          active
                            ? { backgroundColor: option.color.fill, borderColor: option.color.border }
                            : styles.markerPillInactive,
                          active && styles.markerPillActive,
                        ]}
                        onPress={() => {
                          setActiveMarkerKey((prev) => {
                            const next = prev === option.key ? null : option.key;
                            setImageInteractionEnabled(Boolean(next));
                            if (!next) setDraftSelection(null);
                            return next;
                          });
                        }}
                      >
                        <View style={[styles.markerDot, { backgroundColor: option.color.badge }]} />
                        <Text
                          style={[
                            styles.markerPillText,
                            { color: active ? option.color.text : theme.colors.text.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.markerHint}>
                  {imageInteractionEnabled
                    ? (activeMarker
                      ? `${activeMarker.label} için ürünün üstüne dokun veya küçük bir alan çiz. Kutular yalnızca gerçek ürün konumu varsa ya da sen oluşturduysan görünür.`
                      : 'Fotoğraf aktif. Kutular sadece okunabilen ürünler veya senin oluşturduğun alanlar için gösterilir.')
                    : 'Kalemleri doğrudan aşağıdaki kartlardan kişiye atayabilirsin. Fotoğraftan ayırmak istersen önce üstten bir kişi seç.'}
                </Text>
              </>
            ) : (
              <View style={styles.convertedNotice}>
                <Text style={styles.convertedNoticeTitle}>Harcamaya dönüştürüldü</Text>
                <Text style={styles.convertedNoticeText}>Bu fiş kayıt bütünlüğü için salt okunur gösteriliyor.</Text>
              </View>
            )}
            <PinchGestureHandler onGestureEvent={handlePinchGesture} onHandlerStateChange={handlePinchStateChange}>
              <View>
                <PanGestureHandler
                  enabled={imageInteractionEnabled && !activeMarker && totalZoom > 1.01}
                  minDist={16}
                  minPointers={1}
                  maxPointers={1}
                  onGestureEvent={handlePanGesture}
                  onHandlerStateChange={handlePanStateChange}
                >
                  <View
                    style={styles.previewFrame}
                    onTouchStart={() => setImageInteractionEnabled(true)}
                    onLayout={(event) => {
                      const { width, height } = event.nativeEvent.layout;
                      if (width && height) {
                        setImageFrame({ width, height });
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.previewCanvas,
                        {
                          transform: [
                            { scale: totalZoom },
                            { translateX: totalPan.x },
                            { translateY: totalPan.y },
                          ],
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.preview}
                        resizeMode="contain"
                        onLoad={(event) => {
                          const source = event.nativeEvent?.source;
                          if (source?.width && source?.height) {
                            setImageSourceSize({ width: source.width, height: source.height });
                          }
                        }}
                      />
                      {items.map((item, index) => {
                        const hasRealBox = item.boxLeft != null && item.boxTop != null && item.boxWidth != null && item.boxHeight != null;
                        const overlay = hasRealBox ? compactPriceOverlayStyleFor(item) : null;
                        if (!overlay) return null;
                        const marker = getItemMarker(item);
                        const focused = focusedOverlayIndex === index;
                        const selected = selectedIndexes.includes(index);
                        return (
                          <Pressable
                            key={`overlay-${item.id || index}`}
                            style={[
                              styles.imageOverlayHit,
                              overlay,
                              { borderColor: marker.border, backgroundColor: marker.fill },
                              !hasRealBox && styles.imageOverlayHitFallback,
                              !item.isAssigned && styles.imageOverlayHitIdle,
                              selected && styles.imageOverlayHitSelected,
                              focused && styles.imageOverlayHitActive,
                            ]}
                            onPress={() => handleOverlayPress(index)}
                          >
                            <View style={[
                              styles.imageOverlayBadge,
                              { backgroundColor: marker.badge },
                              !item.isAssigned && styles.imageOverlayBadgeIdle,
                              selected && styles.imageOverlayBadgeSelected,
                              focused && styles.imageOverlayBadgeActive,
                            ]}
                            >
                              <Text style={[
                                styles.imageOverlayBadgeText,
                                !item.isAssigned ? styles.imageOverlayBadgeTextIdle : { color: theme.colors.text.onPrimary },
                                (selected || focused) && styles.imageOverlayBadgeTextActive,
                              ]}
                              >
                                {index + 1}
                              </Text>
                            </View>
                            <Text style={styles.imageOverlayPriceText} numberOfLines={1}>
                              {toNumber(item.lineTotal || item.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View
                      style={StyleSheet.absoluteFill}
                      pointerEvents={activeMarker ? 'auto' : 'box-none'}
                      {...drawResponder.panHandlers}
                    >
                      {draftSelectionStyle ? (
                        <View style={[styles.draftSelectionBox, draftSelectionStyle]} />
                      ) : null}
                    </View>
                  </View>
                </PanGestureHandler>
              </View>
            </PinchGestureHandler>
          </>
        ) : null}

        {focusedOverlayIndex != null && items[focusedOverlayIndex] ? (
          <View style={styles.focusInfoCard}>
            <View style={styles.focusInfoHeader}>
              <Text style={styles.focusInfoTitle}>
                Secili kalem: {items[focusedOverlayIndex].name || `Kalem ${focusedOverlayIndex + 1}`}
              </Text>
              <TouchableOpacity onPress={() => setFocusedOverlayIndex(null)}>
                <Text style={styles.bulkClear}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.focusInfoText}>
              Bu kalemin kime ait oldugunu hemen asagidaki karttan secebilirsin. Fotografta yeni bir urun ayirmak istersen ustten kisi secip urunun ustunde alan ciz.
            </Text>
          </View>
        ) : null}

        <View style={styles.section} onTouchStart={deactivateImageInteraction}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kalemler ve paylaşım</Text>
            {!isConverted ? (
              <TouchableOpacity onPress={addItem}>
                <Text style={styles.addText}>+ Kalem ekle</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.sectionHint}>
            {isConverted
              ? 'Fiş kalemleri ve paylaşım bilgileri tamamlanan harcama kaydıyla eşleşir.'
              : 'Her kalemin altından `Ortak` veya bir ev arkadaşı seç. Fotoğraftaki numaraya dokunursan ilgili kalem kartı vurgulanır.'}
          </Text>

          {visibleItems.map(({ item, index }) => {
            const owner = members.find((member) => Number(member.id) === Number(item.personalUserId));
            const isFocused = focusedOverlayIndex === index;

            return (
              <View
                key={`${index}-${item.id || 'new'}`}
                style={[styles.itemCard, isFocused && styles.itemCardSelected]}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.itemHeaderLeft}>
                    <View style={styles.itemNumberBadge}>
                      <Text style={styles.itemNumberBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name || 'İsimsiz kalem'}</Text>
                      <Text style={styles.itemSubText}>
                        {item.boxLeft != null ? 'Fotoğraftan seçildi' : 'Elle eklendi'}
                      </Text>
                    </View>
                  </View>
                  {!isConverted ? (
                    <View style={styles.itemActions}>
                      <TouchableOpacity onPress={() => openEditor(index)}>
                        <Text style={styles.editText}>Düzenle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeItem(index)}>
                        <Text style={styles.removeText}>Sil</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                <View style={styles.itemStatsRow}>
                  <View style={styles.itemStatBox}>
                    <Text style={styles.itemStatLabel}>Fiyat</Text>
                    <Text style={styles.itemStatValue}>
                      {toNumber(item.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </Text>
                  </View>
                  <View style={styles.itemStatBox}>
                    <Text style={styles.itemStatLabel}>Adet</Text>
                    <Text style={styles.itemStatValue}>{toNumber(item.quantity, 1).toLocaleString('tr-TR')}</Text>
                  </View>
                  <View style={styles.itemStatBox}>
                    <Text style={styles.itemStatLabel}>Toplam</Text>
                    <Text style={styles.itemStatValue}>
                      {toNumber(item.lineTotal).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </Text>
                  </View>
                </View>

                <View style={styles.assignmentHeader}>
                  <Text style={styles.assignmentLabel}>Bu kalem kime ait?</Text>
                  {!item.isShared ? (
                    <View style={styles.personalOwnerBadge}>
                      <Text style={styles.personalOwnerText}>{owner?.fullName || 'Kişisel'}</Text>
                    </View>
                  ) : (
                    <View style={[styles.personalOwnerBadge, styles.itemOwnerPillShared]}>
                      <Text style={[styles.personalOwnerText, styles.itemOwnerPillSharedText]}>Ortak</Text>
                    </View>
                  )}
                </View>

                {!isConverted ? <View style={styles.quickAssignRow}>
                  <TouchableOpacity
                    style={[styles.quickAssignButton, item.isShared && styles.quickAssignButtonActive]}
                    onPress={() => patchItem(index, { isAssigned: true, isShared: true, personalUserId: null })}
                  >
                    <Text style={[styles.quickAssignText, item.isShared && styles.quickAssignTextActive]}>Ortak</Text>
                  </TouchableOpacity>
                  {members.map((member) => {
                    const active = !item.isShared && Number(item.personalUserId) === Number(member.id);
                    return (
                      <TouchableOpacity
                        key={`assign-${index}-${member.id}`}
                        style={[styles.quickAssignButton, active && styles.quickAssignButtonActive]}
                        onPress={() => patchItem(index, { isAssigned: true, isShared: false, personalUserId: member.id })}
                      >
                        <Text style={[styles.quickAssignText, active && styles.quickAssignTextActive]} numberOfLines={1}>
                          {member.fullName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View> : null}
              </View>
            );
          })}
        </View>

        <View style={styles.summaryCard} onTouchStart={deactivateImageInteraction}>
          <Text style={styles.summaryTitle}>{receipt?.storeName || 'Fis Detayi'}</Text>
          <Text style={styles.summarySub}>
            {receipt?.receiptDate ? new Date(receipt.receiptDate).toLocaleDateString('tr-TR') : 'Tarih seçilmedi'}
          </Text>
          <Text style={styles.summaryAmount}>
            {total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </Text>
          <View style={styles.summaryMetaRow}>
            <View style={styles.summaryMetaBadge}>
              <Text style={styles.summaryMetaLabel}>Ortak</Text>
              <Text style={styles.summaryMetaValue}>{sharedTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
            </View>
            <View style={styles.summaryMetaBadge}>
              <Text style={styles.summaryMetaLabel}>Kişisel</Text>
              <Text style={styles.summaryMetaValue}>{personalTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
            </View>
          </View>
          {missingAmount > 0.01 ? (
            <View style={styles.missingAmountCard}>
              <Text style={styles.missingAmountTitle}>Eksik okunan tutar var</Text>
              <Text style={styles.missingAmountText}>
                Fiş toplamı {total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}, kalemlerin toplamı ise {explicitTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}.
                Kalan {missingAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} tutar ortak kalacak. İstersen `Kalem ekle` ile eksik ürünü manuel girebilirsin.
              </Text>
            </View>
          ) : null}
        </View>

        {!isConverted ? (
          <>
            <View style={styles.section} onTouchStart={deactivateImageInteraction}>
              <Text style={styles.sectionTitle}>Ödeyen</Text>
              <View style={styles.chips}>
                {members.map((member) => {
                  const active = String(member.id) === String(payerUserId);
                  return (
                    <TouchableOpacity
                      key={String(member.id)}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setPayerUserId(String(member.id))}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{member.fullName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section} onTouchStart={deactivateImageInteraction}>
              <Text style={styles.sectionTitle}>Kategori</Text>
              <View style={styles.chips}>
                {CATEGORY_OPTIONS.map((option) => {
                  const active = option.key === category;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategory(option.key)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => saveDraft()} disabled={saving}>
              <Text style={styles.secondaryButtonText}>{saving ? 'Kaydediliyor...' : 'Taslağı Kaydet'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={convertToExpense} disabled={saving}>
              <Text style={styles.primaryButtonText}>Harcamaya Dönüştür</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteReceiptButton} onPress={deleteReceipt} disabled={saving}>
              <Text style={styles.deleteReceiptButtonText}>Fişi Sil</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={editingIndex != null && !!draftItem} transparent animationType="slide" onRequestClose={closeEditor}>
        <Pressable style={styles.modalBackdrop} onPress={closeEditor} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}>
          <View style={styles.modalSheet}>
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
              enableOnAndroid
              extraScrollHeight={20}
              keyboardOpeningTime={0}
            >
              <Text style={styles.modalTitle}>Kalemi düzenle</Text>
              <Text style={styles.modalHint}>Ürün adını, fiyatını ve paylaşım tipini burada güncelleyebilirsin.</Text>

              <TextInput
                style={styles.input}
                placeholder="Ürün adı"
                value={draftItem?.name ?? ''}
                onChangeText={(value) => setDraftItem((prev) => ({ ...prev, name: value }))}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.half]}
                  placeholder="Fiyat"
                  keyboardType="decimal-pad"
                  value={draftItem?.price ?? ''}
                  onChangeText={(value) => setDraftItem((prev) => {
                    const quantity = toNumber(prev?.quantity, 1) || 1;
                    const numeric = toNumber(value);
                    return { ...prev, price: value, lineTotal: String((numeric * quantity).toFixed(2)) };
                  })}
                />
                <TextInput
                  style={[styles.input, styles.half]}
                  placeholder="Adet"
                  keyboardType="decimal-pad"
                  value={draftItem?.quantity ?? '1'}
                  onChangeText={(value) => setDraftItem((prev) => {
                    const price = toNumber(prev?.price);
                    const numeric = toNumber(value, 1) || 1;
                    return { ...prev, quantity: value, lineTotal: String((price * numeric).toFixed(2)) };
                  })}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Toplam"
                keyboardType="decimal-pad"
                value={draftItem?.lineTotal ?? ''}
                onChangeText={(value) => setDraftItem((prev) => ({ ...prev, lineTotal: value }))}
              />

              <View style={styles.chips}>
                <TouchableOpacity
                  style={[styles.chip, draftItem?.isShared && styles.chipActive]}
                  onPress={() => setDraftItem((prev) => ({ ...prev, isShared: true, personalUserId: null }))}
                >
                  <Text style={[styles.chipText, draftItem?.isShared && styles.chipTextActive]}>Ortak</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, !draftItem?.isShared && styles.chipActive]}
                  onPress={() => setDraftItem((prev) => ({ ...prev, isShared: false }))}
                >
                  <Text style={[styles.chipText, !draftItem?.isShared && styles.chipTextActive]}>Kişisel</Text>
                </TouchableOpacity>
              </View>

              {!draftItem?.isShared ? (
                <View style={styles.chips}>
                  {members.map((member) => {
                    const active = Number(draftItem?.personalUserId) === Number(member.id);
                    return (
                      <TouchableOpacity
                        key={`draft-${member.id}`}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setDraftItem((prev) => ({ ...prev, personalUserId: member.id }))}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{member.fullName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalSecondaryButton} onPress={closeEditor}>
                  <Text style={styles.modalSecondaryButtonText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={saveEditor}>
                  <Text style={styles.modalPrimaryButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

class FisDetayiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('FisDetayi render hatası:', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontWeight: '800', fontSize: 17, marginBottom: 8, textAlign: 'center' }}>
            Fiş görüntülenemedi
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            Bu fişi açarken beklenmeyen bir hata oluştu. Lütfen geri dönüp tekrar dene.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#172839', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
            onPress={() => this.props.navigation?.goBack?.()}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Geri dön</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function FisDetayi(props) {
  return (
    <FisDetayiErrorBoundary navigation={props.navigation}>
      <FisDetayiInner {...props} />
    </FisDetayiErrorBoundary>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  previewFrame: { width: '100%', height: 260, borderRadius: 8, backgroundColor: theme.colors.neutral[100], marginBottom: 14, overflow: 'hidden', position: 'relative' },
  previewCanvas: { position: 'relative', backgroundColor: theme.colors.neutral[100], width: '100%', height: '100%' },
  preview: { width: '100%', height: '100%' },
  zoomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  zoomButtonText: { color: theme.colors.text.primary, fontSize: 20, fontWeight: '900' },
  zoomLabel: { color: theme.colors.text.secondary, fontWeight: '700', flex: 1 },
  zoomResetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  zoomResetButtonText: { color: theme.colors.text.primary, fontWeight: '700' },
  markerToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  markerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  markerPillInactive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.neutral[200],
  },
  markerPillActive: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  markerPillText: {
    fontWeight: '800',
    maxWidth: 90,
  },
  draftSelectionBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 12,
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  markerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.success[600],
    justifyContent: 'center',
  },
  markerDoneButtonPassive: {
    backgroundColor: theme.colors.primary[600],
  },
  markerDoneButtonText: {
    color: theme.colors.text.onPrimary,
    fontWeight: '900',
  },
  markerHint: {
    color: theme.colors.text.secondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  convertedNotice: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.success[50],
    borderWidth: 1,
    borderColor: theme.colors.success[200],
    marginBottom: 12,
  },
  convertedNoticeTitle: { color: theme.colors.success[700], fontWeight: '900', marginBottom: 4 },
  convertedNoticeText: { color: theme.colors.text.secondary, lineHeight: 18 },
  imageOverlayHit: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    zIndex: 5,
  },
  imageOverlayHitIdle: {
      borderStyle: 'dashed',
      backgroundColor: 'rgba(231, 76, 60, 0.18)',
    },
  imageOverlayHitFallback: {
      justifyContent: 'center',
      paddingHorizontal: 14,
      backgroundColor: 'rgba(231, 76, 60, 0.22)',
    },
  imageOverlayHitSelected: {
    borderColor: theme.colors.warning[700],
    backgroundColor: 'rgba(255,196,0,0.22)',
    shadowColor: theme.colors.warning[700],
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  imageOverlayHitActive: {
    borderColor: theme.colors.primary[700],
    backgroundColor: 'rgba(38,110,255,0.34)',
    shadowColor: theme.colors.primary[700],
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  imageOverlayBadge: {
    marginTop: 3,
    marginLeft: 3,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayBadgeIdle: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  imageOverlayBadgeActive: {
    backgroundColor: theme.colors.primary[700],
  },
  imageOverlayBadgeSelected: {
    backgroundColor: theme.colors.warning[700],
  },
  imageOverlayBadgeText: {
    color: theme.colors.primary[700],
    fontWeight: '900',
    fontSize: 11,
  },
  imageOverlayBadgeTextIdle: {
      color: '#8F1F16',
    },
  imageOverlayBadgeTextActive: {
    color: theme.colors.text.onPrimary,
  },
  imageOverlayFallbackText: {
    color: theme.colors.text.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    marginRight: 6,
  },
  imageOverlayPriceText: {
    color: theme.colors.text.primary,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 6,
    marginRight: 6,
    alignSelf: 'center',
  },
  summaryCard: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.neutral[200], marginBottom: 14 },
  summaryTitle: { color: theme.colors.text.primary, fontWeight: '900', fontSize: 18 },
  summarySub: { color: theme.colors.text.secondary, marginTop: 4 },
  summaryAmount: { color: theme.colors.primary[700], fontWeight: '900', fontSize: 22, marginTop: 10 },
  summaryMetaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  summaryMetaBadge: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  summaryMetaLabel: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  summaryMetaValue: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '800' },
  missingAmountCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.warning[50],
    borderWidth: 1,
    borderColor: theme.colors.warning[200],
  },
  missingAmountTitle: { color: theme.colors.warning[800], fontWeight: '900', marginBottom: 6 },
  missingAmountText: { color: theme.colors.text.secondary, lineHeight: 18 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: theme.colors.text.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  sectionHint: { color: theme.colors.text.secondary, marginBottom: 10, lineHeight: 18 },
  addText: { color: theme.colors.primary[700], fontWeight: '800' },
  rawCard: { padding: 14, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  rawText: { color: theme.colors.text.secondary, lineHeight: 20 },
  focusInfoCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: 14,
  },
  focusInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  focusInfoTitle: { color: theme.colors.primary[800], fontWeight: '900', fontSize: 15, flex: 1, paddingRight: 10 },
  focusInfoText: { color: theme.colors.text.secondary, lineHeight: 18 },
  overlayActionCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: 14,
  },
  bulkCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginBottom: 12,
  },
  bulkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bulkTitle: { color: theme.colors.primary[800], fontWeight: '800', fontSize: 15 },
  bulkClear: { color: theme.colors.primary[700], fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  filterButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
  },
  filterButtonActive: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  filterButtonText: { color: theme.colors.text.primary, fontWeight: '700', textAlign: 'center' },
  filterButtonTextActive: { color: theme.colors.primary[700] },
  itemCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.neutral[200], marginBottom: 10 },
  itemCardSelected: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[50] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  itemIndex: { color: theme.colors.text.secondary, fontWeight: '700' },
  itemHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  itemNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[600],
    marginRight: 10,
  },
  itemNumberBadgeText: { color: theme.colors.text.onPrimary, fontWeight: '900' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemSubText: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },
  editText: { color: theme.colors.primary[700], fontWeight: '800' },
  itemOwnerPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.warning[100],
  },
  itemOwnerPillShared: {
    backgroundColor: theme.colors.success[100],
  },
  itemOwnerPillText: {
    color: theme.colors.warning[800],
    fontWeight: '800',
    fontSize: 12,
  },
  itemOwnerPillSharedText: {
    color: theme.colors.success[800],
  },
  selectButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  selectButtonActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  selectButtonText: { color: theme.colors.text.primary, fontWeight: '700', fontSize: 12 },
  selectButtonTextActive: { color: theme.colors.text.onPrimary },
  removeText: { color: theme.colors.error[600], fontWeight: '800' },
  itemName: { color: theme.colors.text.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  itemStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  itemStatBox: { flex: 1, borderRadius: 12, padding: 10, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  itemStatLabel: { color: theme.colors.text.secondary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  itemStatValue: { color: theme.colors.text.primary, fontWeight: '800', fontSize: 13 },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  assignmentLabel: { color: theme.colors.text.secondary, fontSize: 13, fontWeight: '700' },
  quickAssignRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickAssignButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  quickAssignButtonActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  quickAssignText: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    maxWidth: 120,
  },
  quickAssignTextActive: {
    color: theme.colors.text.onPrimary,
  },
  personalOwnerBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.warning[100],
  },
  personalOwnerText: { color: theme.colors.warning[800], fontWeight: '800' },
  input: { borderWidth: 1, borderColor: theme.colors.neutral[200], borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text.primary, backgroundColor: theme.colors.background, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, backgroundColor: theme.colors.neutral[100], marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: theme.colors.primary[600] },
  chipText: { color: theme.colors.text.primary, fontWeight: '700' },
  chipTextActive: { color: theme.colors.text.onPrimary },
  secondaryButton: { borderRadius: 14, borderWidth: 1, borderColor: theme.colors.neutral[200], paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  secondaryButtonText: { color: theme.colors.text.primary, fontWeight: '800' },
  primaryButton: { borderRadius: 14, backgroundColor: theme.colors.primary[600], paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: theme.colors.text.onPrimary, fontWeight: '900' },
  deleteReceiptButton: { paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  deleteReceiptButtonText: { color: theme.colors.error[700], fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)' },
  modalSheet: { backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 26, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  modalContent: { paddingBottom: Platform.OS === 'ios' ? 28 : 40 },
  modalTitle: { color: theme.colors.text.primary, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  modalHint: { color: theme.colors.text.secondary, lineHeight: 18, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalSecondaryButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  modalSecondaryButtonText: { color: theme.colors.text.primary, fontWeight: '800' },
  modalPrimaryButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.colors.primary[600] },
  modalPrimaryButtonText: { color: theme.colors.text.onPrimary, fontWeight: '800' },
});
