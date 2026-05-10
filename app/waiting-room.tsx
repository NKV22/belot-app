import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SERVER_URL = 'http://192.168.1.4:8000';

export default function WaitingRoom() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [players, setPlayers] = useState<{[key: string]: {name: string, team: number}}>({});
  const wsRef = useRef<WebSocket | null>(null);

  const code = params.code as string;
  const player_id = params.player_id as string;

  useEffect(() => {
    const ws = new WebSocket(`ws://192.168.1.4:8000/ws/${code}/${player_id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'state') {
        setPlayers(data.players);
      } else if (data.type === 'start_game') {
        const teamPlayers = Object.entries(data.players);
        const otbor1 = teamPlayers.filter(([,p]: any) => p.team === 1).map(([,p]: any) => p.name);
        const otbor2 = teamPlayers.filter(([,p]: any) => p.team === 2).map(([,p]: any) => p.name);
        router.push({
          pathname: '/igra' as any,
          params: {
            code,
            player_id,
            igrach1: otbor1[0] || 'Играч 1',
            igrach2: otbor2[0] || 'Играч 2',
            igrach3: otbor1[1] || 'Играч 3',
            igrach4: otbor2[1] || 'Играч 4',
          }
        });
      }
    };

    return () => ws.close();
  }, []);

  const shareCode = async () => {
    await Share.share({ message: `Присъедини се към моята Белот игра! Код: ${code}` });
  };

  const chooseTeam = (team: number) => {
    wsRef.current?.send(JSON.stringify({ type: 'choose_team', player_id, team }));
  };

  const startGame = () => {
    wsRef.current?.send(JSON.stringify({ type: 'start_game' }));
  };

  const myTeam = players[player_id]?.team;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🃏 Чакалня</Text>

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Код на играта</Text>
        <Text style={styles.code}>{code}</Text>
        <TouchableOpacity onPress={shareCode}>
          <Text style={styles.shareText}>📤 Сподели</Text>
        </TouchableOpacity>
      </View>

      {/* Избор на отбор */}
      <Text style={styles.sectionTitle}>Избери отбор:</Text>
      <View style={styles.teamsRow}>
        <TouchableOpacity
          style={[styles.teamButton, myTeam === 1 && styles.teamButtonActive]}
          onPress={() => chooseTeam(1)}
        >
          <Text style={styles.teamButtonText}>Отбор 1</Text>
          {Object.values(players).filter((p: any) => p.team === 1).map((p: any, i) => (
            <Text key={i} style={styles.teamMember}>✅ {p.name}</Text>
          ))}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.teamButton, myTeam === 2 && styles.teamButtonActive]}
          onPress={() => chooseTeam(2)}
        >
          <Text style={styles.teamButtonText}>Отбор 2</Text>
          {Object.values(players).filter((p: any) => p.team === 2).map((p: any, i) => (
            <Text key={i} style={styles.teamMember}>✅ {p.name}</Text>
          ))}
        </TouchableOpacity>
      </View>

      {/* Играчи без отбор */}
      {Object.values(players).some((p: any) => !p.team) && (
        <View style={styles.noTeam}>
          <Text style={styles.noTeamTitle}>⏳ Без отбор:</Text>
          {Object.values(players).filter((p: any) => !p.team).map((p: any, i) => (
            <Text key={i} style={styles.noTeamPlayer}>{p.name}</Text>
          ))}
        </View>
      )}

      {player_id === '1' && (
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>🎮 Започни играта!</Text>
        </TouchableOpacity>
      )}

      {player_id !== '1' && (
        <Text style={styles.waitText}>Чакай домакинът да започне...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a', padding: 20, paddingTop: 60 },
  title: { fontSize: 36, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 20 },
  codeBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15, padding: 15, alignItems: 'center', marginBottom: 20 },
  codeLabel: { color: '#90EE90', fontSize: 14 },
  code: { color: '#FFD700', fontSize: 40, fontWeight: 'bold', letterSpacing: 8 },
  shareText: { color: 'white', fontSize: 14, marginTop: 8 },
  sectionTitle: { color: '#90EE90', fontSize: 16, marginBottom: 10 },
  teamsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  teamButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 15, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  teamButtonActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.2)' },
  teamButtonText: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  teamMember: { color: 'white', fontSize: 13 },
  noTeam: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 10, marginBottom: 15 },
  noTeamTitle: { color: '#90EE90', fontSize: 14, marginBottom: 5 },
  noTeamPlayer: { color: 'white', fontSize: 14 },
  startButton: { backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  startButtonText: { color: '#1a5c2a', fontSize: 20, fontWeight: 'bold' },
  waitText: { color: '#90EE90', textAlign: 'center', marginTop: 20, fontSize: 16 },
});