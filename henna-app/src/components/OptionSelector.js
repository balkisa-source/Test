import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function OptionSelector({ label, options, selected, onSelect }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, selected === option.value && styles.optionSelected]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.optionEmoji]}>{option.emoji}</Text>
            <Text style={[styles.optionText, selected === option.value && styles.optionTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a4a2a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  options: {
    gap: 10,
    paddingRight: 20,
  },
  option: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d4a574',
    backgroundColor: '#fff9f5',
    minWidth: 80,
  },
  optionSelected: {
    backgroundColor: '#8b3a0f',
    borderColor: '#8b3a0f',
  },
  optionEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 12,
    color: '#7a4a2a',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
