import { StyleSheet, Text, View } from 'react-native';

export default function CalcHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BendCalc</Text>
      <Text style={styles.hint}>输入参数查看结果</Text>
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
