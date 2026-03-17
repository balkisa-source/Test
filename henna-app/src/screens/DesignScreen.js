import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

export default function DesignScreen({ route, navigation }) {
  const { svg, style, complexity, placement } = route.params;

  async function handleShare() {
    try {
      await Share.share({
        message: `My ${complexity} ${style} henna design for ${placement}!\n\nCreated with Henna Design App`,
        title: 'My Henna Design',
      });
    } catch (err) {
      Alert.alert('Share Failed', err.message);
    }
  }

  function handleRegenerate() {
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Design</Text>
          <Text style={styles.subtitle}>
            {complexity.charAt(0).toUpperCase() + complexity.slice(1)} {style} · {placement}
          </Text>
        </View>

        <View style={styles.designCard}>
          <SvgXml xml={svg} width="100%" height={420} />
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>✦ How to use this design</Text>
          <Text style={styles.tipItem}>• Screenshot or print this design</Text>
          <Text style={styles.tipItem}>• Place under tracing paper and trace the outlines</Text>
          <Text style={styles.tipItem}>• Transfer to your skin using a henna cone</Text>
          <Text style={styles.tipItem}>• Let dry 2–6 hours for best color</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share Design</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.regenBtn} onPress={handleRegenerate}>
            <Text style={styles.regenBtnText}>✦ New Design</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fdf5ee',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4a1c00',
  },
  subtitle: {
    fontSize: 14,
    color: '#a0623a',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  designCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#4a1c00',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 24,
    alignItems: 'center',
  },
  tips: {
    backgroundColor: '#fff3e8',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#8b3a0f',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a1c00',
    marginBottom: 10,
  },
  tipItem: {
    fontSize: 13,
    color: '#7a4a2a',
    marginBottom: 5,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  shareBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8b3a0f',
  },
  shareBtnText: {
    color: '#8b3a0f',
    fontSize: 16,
    fontWeight: '700',
  },
  regenBtn: {
    backgroundColor: '#8b3a0f',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8b3a0f',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  regenBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
