import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import OptionSelector from '../components/OptionSelector';
import { generateHennaDesign } from '../services/claudeService';

const STYLES = [
  { value: 'traditional', label: 'Traditional', emoji: '🌸' },
  { value: 'arabic', label: 'Arabic', emoji: '🌙' },
  { value: 'geometric', label: 'Geometric', emoji: '🔷' },
  { value: 'moroccan', label: 'Moroccan', emoji: '⭐' },
];

const COMPLEXITIES = [
  { value: 'simple', label: 'Simple', emoji: '✨' },
  { value: 'medium', label: 'Medium', emoji: '🎨' },
  { value: 'intricate', label: 'Intricate', emoji: '💎' },
];

const PLACEMENTS = [
  { value: 'hand', label: 'Hand', emoji: '🖐️' },
  { value: 'arm', label: 'Forearm', emoji: '💪' },
  { value: 'foot', label: 'Foot', emoji: '🦶' },
  { value: 'back', label: 'Back of Hand', emoji: '✋' },
];

export default function HomeScreen({ navigation }) {
  const [style, setStyle] = useState('traditional');
  const [complexity, setComplexity] = useState('medium');
  const [placement, setPlacement] = useState('hand');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY) {
      Alert.alert(
        'API Key Missing',
        'Please set EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file.',
      );
      return;
    }

    setLoading(true);
    try {
      const svg = await generateHennaDesign({ style, complexity, placement, customPrompt });
      navigation.navigate('Design', { svg, style, complexity, placement });
    } catch (err) {
      console.error(err);
      Alert.alert('Generation Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Henna Design</Text>
          <Text style={styles.subtitle}>Create your perfect henna pattern</Text>
        </View>

        <View style={styles.card}>
          <OptionSelector
            label="Style"
            options={STYLES}
            selected={style}
            onSelect={setStyle}
          />
          <OptionSelector
            label="Complexity"
            options={COMPLEXITIES}
            selected={complexity}
            onSelect={setComplexity}
          />
          <OptionSelector
            label="Placement"
            options={PLACEMENTS}
            selected={placement}
            onSelect={setPlacement}
          />

          <Text style={styles.inputLabel}>Custom Notes (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. add butterflies, more flowers, peacock motif..."
            placeholderTextColor="#c4956a"
            value={customPrompt}
            onChangeText={setCustomPrompt}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.generateBtnText}>  Generating design...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>✦ Generate Design</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          AI will generate an SVG pattern you can trace or print
        </Text>
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
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4a1c00',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#a0623a',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#4a1c00',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a4a2a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#d4a574',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#4a1c00',
    backgroundColor: '#fff9f5',
    textAlignVertical: 'top',
  },
  generateBtn: {
    backgroundColor: '#8b3a0f',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#8b3a0f',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  generateBtnDisabled: {
    backgroundColor: '#c4956a',
    shadowOpacity: 0,
    elevation: 0,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
    color: '#a0623a',
    fontSize: 13,
    marginTop: 12,
    opacity: 0.8,
  },
});
