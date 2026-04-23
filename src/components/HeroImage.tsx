import React, { useState } from 'react';
import { Image, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  uri: string;
  gradient: [string, string];
  style?: StyleProp<ViewStyle>;
  overlay?: boolean;
  children?: React.ReactNode;
};

export function HeroImage({ uri, gradient, style, overlay = true, children }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {failed || !uri ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      )}
      {overlay ? (
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#203A5D' },
});
