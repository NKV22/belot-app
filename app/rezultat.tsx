import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CARD_VALUES: {[key: string]: number} = {
  'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2,
  '9': 0, '8': 0, '7': 0,
};

const CARD_VALUES_KOZ: {[key: string]: number} = {
  'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 20,
  '9': 14, '8': 0, '7': 0,
};

const getCardValue = (card: string, kozSuit: string, gameType: string) => {
  const value = card.slice(0, -1);
  const suit = card[card.length - 1].toUpperCase();
  
  if (gameType === 'Всичко Коз') return CARD_VALUES_KOZ[value] || 0;
  if (gameType === 'Без Коз') return (CARD_VALUES[value] || 0) * 2;
  
  const kozMap: {[key: string]: string} = {
    'Пика': 'S', 'Купа': 'H', 'Каро': 'D', 'Спатия': 'C'
  };
  
  if (suit === kozMap[kozSuit]) return CARD_VALUES_KOZ[value] || 0;
  return CARD_VALUES[value] || 0;
};

const calculatePoints = (cards: string[], kozSuit: string, gameType: string) => {
  return cards.reduce((sum, card) => sum + getCardValue(card, kozSuit, gameType), 0);
};

const findCombinations = (cards: string[]) => {
  const suits: {[key: string]: string[]} = {};
  const values: {[key: string]: string[]} = {};
  const valueOrder = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  cards.forEach(card => {
    const value = card.slice(0, -1);
    const suit = card[card.length - 1];
    if (!suits[suit]) suits[suit] = [];
    if (!values[value]) values[value] = [];
    suits[suit].push(value);
    values[value].push(suit);
  });

  let bestCombo = { name: '', points: 0 };

  Object.entries(suits).forEach(([suit, suitCards]) => {
    const sorted = suitCards
      .map(v => valueOrder.indexOf(v))
      .filter(i => i !== -1)
      .sort((a, b) => a - b);

    let maxSeq = 1, curSeq = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i-1] + 1) {
        curSeq++;
        maxSeq = Math.max(maxSeq, curSeq);
      } else {
        curSeq = 1;
      }
    }

    let combo = { name: '', points: 0 };
    if (maxSeq >= 8) combo = { name: 'Осморка', points: 250 };
    else if (maxSeq === 7) combo = { name: 'Седморка', points: 200 };
    else if (maxSeq === 6) combo = { name: 'Шесторка', points: 150 };
    else if (maxSeq === 5) combo = { name: 'Квинта', points: 100 };
    else if (maxSeq === 4) combo = { name: 'Кварт', points: 50 };
    else if (maxSeq === 3) combo = { name: 'Терца', points: 20 };
    if (combo.points > bestCombo.points) bestCombo = combo;
  });

  const fourOf: {[key: string]: number} = {
    'J': 200, '9': 150, 'A': 100, '10': 100, 'K': 100, 'Q': 100
  };
  Object.entries(values).forEach(([value, valueSuits]) => {
    if (valueSuits.length === 4 && fourOf[value]) {
      const combo = { name: `Четири ${value}`, points: fourOf[value] };
      if (combo.points > bestCombo.points) bestCombo = combo;
    }
  });

  return bestCombo;
};

export default function Rezultat() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const history = params.history ? JSON.parse(params.history as string) : {};
  const players = params.players ? JSON.parse(params.players as string) : {};
  const bids = params.bids ? JSON.parse(params.bids as string) : [];
  const lastObor = params.lastObor === 'true';

  const lastNormalBid = [...bids].reverse().find((b: any) => !b.level);
  const kozSuit = lastNormalBid?.suit || 'Пика';
  const gameType = ['Без Коз', 'Всичко Коз'].includes(kozSuit) ? kozSuit : 'Козов';
  const lastBid = bids[bids.length - 1];
  const kontraMultiplier = lastBid?.level === 'Реконтра' ? 4 : lastBid?.level === 'Контра' ? 2 : 1;
  const announcingTeam = lastNormalBid?.team || 'Отбор 1';

  const team1Players = Object.entries(players).filter(([,p]: any) => p.team === 1).map(([id]) => id);
  const team2Players = Object.entries(players).filter(([,p]: any) => p.team === 2).map(([id]) => id);

  const team1Cards = team1Players.flatMap(id => history[id] || []);
  const team2Cards = team2Players.flatMap(id => history[id] || []);

  const hasCards = team1Cards.length > 0 || team2Cards.length > 0;

  let pts1 = calculatePoints(team1Cards, kozSuit, gameType);
  let pts2 = calculatePoints(team2Cards, kozSuit, gameType);

  if (lastObor) {
    if (pts1 > pts2) pts1 += 10;
    else pts2 += 10;
  }

  const combo1 = findCombinations(team1Cards);
  const combo2 = findCombinations(team2Cards);
  const totalPts1 = pts1 + combo1.points;
  const totalPts2 = pts2 + combo2.points;

  const announcingWon = announcingTeam === 'Отбор 1'
    ? totalPts1 > totalPts2
    : totalPts2 > totalPts1;

  let final1 = 0;
  let final2 = 0;

  if (!announcingWon && hasCards) {
    if (announcingTeam === 'Отбор 1') {
      final2 = (totalPts1 + totalPts2) * kontraMultiplier;
    } else {
      final1 = (totalPts1 + totalPts2) * kontraMultiplier;
    }
  } else {
    final1 = totalPts1 * kontraMultiplier;
    final2 = totalPts2 * kontraMultiplier;
  }

  const rounded1 = Math.round(final1 / 10);
  const rounded2 = Math.round(final2 / 10);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Резултат</Text>
      <Text style={styles.kozInfo}>
        Коз: {kozSuit} {kontraMultiplier > 1 ? `(x${kontraMultiplier})` : ''}
      </Text>

      <View style={styles.scoreRow}>
        <View style={[styles.teamScore, announcingTeam === 'Отбор 1' && styles.announcingTeam]}>
          <Text style={styles.teamName}>🔵 Отбор 1</Text>
          {announcingTeam === 'Отбор 1' && (
  <Text style={styles.announcingBadge}>
    Обявил {lastNormalBid?.suit || ''}
  </Text>
)}
          <Text style={styles.bigScore}>{hasCards ? rounded1 : 0}</Text>
          <Text style={styles.smallScore}>({hasCards ? final1 : 0} т.)</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={[styles.teamScore, announcingTeam === 'Отбор 2' && styles.announcingTeam]}>
          <Text style={styles.teamName}>🔴 Отбор 2</Text>
          {announcingTeam === 'Отбор 2' && (
  <Text style={styles.announcingBadge}>
    Обявил {lastNormalBid?.suit || ''}
  </Text>
)}
          <Text style={styles.bigScore}>{hasCards ? rounded2 : 0}</Text>
          <Text style={styles.smallScore}>({hasCards ? final2 : 0} т.)</Text>
        </View>
      </View>

      <ScrollView style={styles.details}>
        <Text style={styles.detailsTitle}>📊 Детайли:</Text>

        {!hasCards ? (
          <Text style={styles.noCardsText}>Все още няма изиграни карти</Text>
        ) : (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Точки от карти:</Text>
              <Text style={styles.detailValue}>{pts1} — {pts2}</Text>
            </View>

            {combo1.points > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>🔵 Комбинация:</Text>
                <Text style={styles.detailValue}>{combo1.name} (+{combo1.points})</Text>
              </View>
            )}

            {combo2.points > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>🔴 Комбинация:</Text>
                <Text style={styles.detailValue}>{combo2.name} (+{combo2.points})</Text>
              </View>
            )}

            {!announcingWon && (
              <View style={styles.failedBid}>
                <Text style={styles.failedBidText}>
                  ❌ {announcingTeam} не изпълни анонса! Другият отбор взема всички точки!
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Назад</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a', padding: 20, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 5 },
  kozInfo: { color: '#90EE90', textAlign: 'center', fontSize: 16, marginBottom: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  teamScore: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, padding: 15, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  announcingTeam: { borderColor: '#FFD700' },
  teamName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  announcingBadge: { backgroundColor: '#FFD700', color: '#1a5c2a', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4, fontWeight: 'bold' },
  bigScore: { color: '#FFD700', fontSize: 48, fontWeight: 'bold' },
  smallScore: { color: '#90EE90', fontSize: 12 },
  vs: { color: 'white', fontSize: 20, fontWeight: 'bold', marginHorizontal: 10 },
  details: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, padding: 15, marginBottom: 15 },
  detailsTitle: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  detailLabel: { color: '#90EE90', fontSize: 14 },
  detailValue: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  failedBid: { backgroundColor: 'rgba(200,0,0,0.3)', borderRadius: 10, padding: 10, marginTop: 10 },
  failedBidText: { color: '#ff9090', fontSize: 14, textAlign: 'center' },
  noCardsText: { color: '#90EE90', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  backButton: { backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  backButtonText: { color: '#1a5c2a', fontSize: 18, fontWeight: 'bold' },
});