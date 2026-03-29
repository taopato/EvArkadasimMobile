import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';

const AcceptInvitationScreen = ({ navigation, route }) => {
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Davet Kabul Et</Text>
          <Text style={CommonStyles.subtitle}>
            Bu özellik yakında eklenecek
          </Text>
        </View>

        <View style={CommonStyles.card}>
          <Text style={styles.infoText}>
            📨 Davet kabul etme özelliği geliştirme aşamasındadır.
          </Text>
        </View>

        <TouchableOpacity 
          style={CommonStyles.menuButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.neutral.background }]}>
            <Text style={CommonStyles.buttonIcon}>🔙</Text>
            <Text style={CommonStyles.buttonText}>Geri Dön</Text>
            <Text style={CommonStyles.buttonSubtext}>Önceki sayfaya dön</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    infoText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      lineHeight: 24,
      textAlign: 'center',
    },
  });
}

export default AcceptInvitationScreen; 
