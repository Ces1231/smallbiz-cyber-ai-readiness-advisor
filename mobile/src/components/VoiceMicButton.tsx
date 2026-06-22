/**
 * VoiceMicButton — mic button for voice input.
 * Grey when idle, red when recording, spinner while processing.
 * Props: onTranscript: (text: string) => void; style?: ViewStyle
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { colors } from '../theme/colors';

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
  style?: ViewStyle;
}

export function VoiceMicButton({ onTranscript, style }: VoiceMicButtonProps) {
  const { recording, startRecording, stopRecording, error } = useVoiceInput();
  const [processing, setProcessing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }

  async function handlePress() {
    if (processing) return;

    if (!recording) {
      // Start recording
      await startRecording();
      startPulse();
    } else {
      // Stop recording and transcribe
      stopPulse();
      setProcessing(true);
      try {
        const text = await stopRecording();
        if (text) {
          onTranscript(text);
        }
      } finally {
        setProcessing(false);
      }
    }
  }

  const iconName: 'mic' | 'mic-circle' | 'stop-circle' = processing
    ? 'stop-circle'
    : recording
    ? 'mic-circle'
    : 'mic';

  const btnColor = recording ? colors.red : colors.muted;

  return (
    <>
      <Animated.View style={[{ transform: [{ scale: pulseAnim }] }, style]}>
        <TouchableOpacity
          style={[styles.btn, recording && styles.btnRecording]}
          onPress={handlePress}
          disabled={processing}
          accessibilityLabel={recording ? 'Stop recording' : 'Start voice input'}
          accessibilityRole="button"
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.cyan} />
          ) : (
            <Ionicons name={iconName} size={22} color={btnColor} />
          )}
        </TouchableOpacity>
      </Animated.View>
      {!!error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRecording: {
    borderColor: 'rgba(251,113,133,0.5)',
    backgroundColor: 'rgba(251,113,133,0.08)',
  },
  errorText: {
    fontSize: 11,
    color: colors.red,
    marginTop: 4,
    maxWidth: 180,
  },
});
