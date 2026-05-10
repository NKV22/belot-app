import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function NovaIgra() {
  const router = useRouter();
  const [igrachi, setIgrachi] = useState({
    igrach1: "",
    igrach2: "",
    igrach3: "",
    igrach4: "",
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🃏 Нова игра</Text>
      <Text style={styles.subtitle}>Въведи имената на играчите</Text>

      <View style={styles.teamsContainer}>
        <View style={styles.team}>
          <Text style={styles.teamTitle}>Отбор 1</Text>
          <TextInput
            style={styles.input}
            placeholder="Играч 1"
            placeholderTextColor="#aaa"
            value={igrachi.igrach1}
            onChangeText={(t) => setIgrachi({...igrachi, igrach1: t})}
          />
          <TextInput
            style={styles.input}
            placeholder="Играч 3"
            placeholderTextColor="#aaa"
            value={igrachi.igrach3}
            onChangeText={(t) => setIgrachi({...igrachi, igrach3: t})}
          />
        </View>

        <View style={styles.team}>
          <Text style={styles.teamTitle}>Отбор 2</Text>
          <TextInput
            style={styles.input}
            placeholder="Играч 2"
            placeholderTextColor="#aaa"
            value={igrachi.igrach2}
            onChangeText={(t) => setIgrachi({...igrachi, igrach2: t})}
          />
          <TextInput
            style={styles.input}
            placeholder="Играч 4"
            placeholderTextColor="#aaa"
            value={igrachi.igrach4}
            onChangeText={(t) => setIgrachi({...igrachi, igrach4: t})}
          />
        </View>
      </View>

       <TouchableOpacity 
  style={styles.button} 
  onPress={() => router.push({
    pathname: '/igra',
    params: {
      igrach1: igrachi.igrach1 || 'Играч 1',
      igrach2: igrachi.igrach2 || 'Играч 2',
      igrach3: igrachi.igrach3 || 'Играч 3',
      igrach4: igrachi.igrach4 || 'Играч 4',
    }
  })}>
  <Text style={styles.buttonText}>Започни игра</Text>
</TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5c2a',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#90EE90',
    textAlign: 'center',
    marginBottom: 30,
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  team: {
    width: '48%',
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 12,
    color: 'white',
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a5c2a',
  },
});