import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SUIT_ORDER: {[key: string]: number} = {
  'C': 0, 'D': 1, 'H': 2, 'S': 3,
  'c': 0, 'd': 1, 'h': 2, 's': 3,
};

const VALUE_ORDER: {[key: string]: number} = {
  '7': 0, '8': 1, '9': 2, '10': 3,
  'J': 4, 'Q': 5, 'K': 6, 'A': 7,
};

const sortCards = (cards: string[]) => {
  const unique = [...new Set(cards)];
  return unique.sort((a, b) => {
    const suitA = SUIT_ORDER[a[a.length - 1]] ?? 0;
    const suitB = SUIT_ORDER[b[b.length - 1]] ?? 0;
    if (suitA !== suitB) return suitA - suitB;
    const valA = VALUE_ORDER[a.slice(0, -1)] ?? 0;
    const valB = VALUE_ORDER[b.slice(0, -1)] ?? 0;
    return valA - valB;
  });
};

export default function Istoriq() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const history = params.history ? JSON.parse(params.history as string) : {};
  const players = params.players ? JSON.parse(params.players as string) : {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 История на картите</Text>

      <ScrollView>
        {Object.entries(players).map(([pid, player]: any) => (
          <View key={pid} style={styles.playerSection}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerName}>
                {player.team === 1 ? '🔵' : '🔴'} {player.name}
              </Text>
              <Text style={styles.cardCount}>
                {[...new Set(history[pid] || [])].length} карти
              </Text>
            </View>
            <View style={styles.cardsRow}>
              {(history[pid] || []).length === 0 ? (
                <Text style={styles.noCards}>Няма изиграни карти</Text>
              ) : (
                sortCards(history[pid] || []).map((card: string, i: number) => {
                  const suit = card[card.length - 1].toUpperCase();
                  const suitColors: {[key: string]: string} = {
                    'S': '#1a1a2e', 'C': '#1a3a1a',
                    'H': '#3a1a1a', 'D': '#3a1a1a'
                  };
                  const suitEmojis: {[key: string]: string} = {
                    'S': '♠', 'C': '♣', 'H': '♥', 'D': '♦'
                  };
                  return (
                    <View key={i} style={[styles.card, { backgroundColor: suitColors[suit] || 'white' }]}>
                      <Text style={styles.cardText}>
                        {card.slice(0, -1)}{suitEmojis[suit] || suit}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Назад</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 20 },
  playerSection: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 15, marginBottom: 15 },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  playerName: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  cardCount: { color: '#90EE90', fontSize: 14 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cardText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  noCards: { color: '#90EE90', fontStyle: 'italic' },
  backButton: { backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  backButtonText: { color: '#1a5c2a', fontSize: 18, fontWeight: 'bold' },
});