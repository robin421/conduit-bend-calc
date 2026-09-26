import { StyleSheet, Text, View } from 'react-native';

export default function LookupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>速查表</Text>
      <Text style={styles.hint}>占位页面</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2933',
  },
  hint: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});
