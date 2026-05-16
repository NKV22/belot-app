import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const SERVER_URL = 'https://nkv22-belotserver.hf.space';

export default function Lobby() {
  const router = useRouter();
  const [ime, setIme] = useState('');
  const [kod, setKod] = useState('');
  const [loading, setLoading] = useState(false);

  const createLobby = async () => {
    if (!ime) { Alert.alert('Въведи своето име!'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/lobby/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ime }),
      });
      const data = await res.json();
      router.push({
        pathname: '/waiting-room' as any,
        params: { code: data.code, player_id: '1', name: ime }
      });
    } catch {
      Alert.alert('Грешка', 'Не може да се свърже със сървъра');
    }
    setLoading(false);
  };

  const joinLobby = async () => {
    if (!ime) { Alert.alert('Въведи своето име!'); return; }
    if (!kod) { Alert.alert('Въведи код на лобито!'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/lobby/${kod}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ime }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('Грешка', data.error); setLoading(false); return; }
      router.push({
        pathname: '/waiting-room' as any,
        params: { code: kod, player_id: data.player_id, name: ime }
      });
    } catch {
      Alert.alert('Грешка', 'Не може да се свърже със сървъра');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🃏 Белот</Text>
      <Text style={styles.subtitle}>Multiplayer</Text>

      <TextInput
        style={styles.input}
        placeholder="Твоето име"
        placeholderTextColor="#aaa"
        value={ime}
        onChangeText={setIme}
      />

      <TouchableOpacity style={styles.createButton} onPress={createLobby} disabled={loading}>
        <Text style={styles.createButtonText}>
          {loading ? '⏳ Зарежда...' : '➕ Създай игра'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>или</Text>
        <View style={styles.line} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Код на лобито"
        placeholderTextColor="#aaa"
        value={kod}
        onChangeText={setKod}
        autoCapitalize="characters"
      />

      <TouchableOpacity style={styles.joinButton} onPress={joinLobby} disabled={loading}>
        <Text style={styles.joinButtonText}>🚪 Присъедини се</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a', padding: 20, justifyContent: 'center' },
  title: { fontSize: 48, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#90EE90', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 15, color: 'white', fontSize: 16, marginBottom: 15 },
  createButton: { backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginBottom: 20 },
  createButtonText: { color: '#1a5c2a', fontSize: 18, fontWeight: 'bold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  dividerText: { color: '#90EE90', marginHorizontal: 10 },
  joinButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  joinButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});