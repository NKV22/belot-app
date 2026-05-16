import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SUIT_EMOJI: {[key: string]: string} = {
  'Пика': '♠', 'Купа': '♥', 'Каро': '♦', 'Спатия': '♣',
  'Без Коз': '🃏', 'Всичко Коз': '👑', '': '?'
};

export default function Tablica() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const deals = params.deals ? JSON.parse(params.deals as string) : [];
  const totalScores = params.totalScores
    ? JSON.parse(params.totalScores as string)
    : { otbor1: 0, otbor2: 0 };

  // Проверка за победител (151+)
  const winner = totalScores.otbor1 >= 151 || totalScores.otbor2 >= 151
    ? totalScores.otbor1 > totalScores.otbor2
      ? '🔵 Отбор 1'
      : '🔴 Отбор 2'
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Таблица</Text>

      {/* Победител */}
      {winner && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerText}>🏆 {winner} ПОБЕДИ!</Text>
        </View>
      )}

      {/* Общ резултат */}
      <View style={styles.totalRow}>
        <View style={styles.totalTeam}>
          <Text style={styles.totalLabel}>🔵 Отбор 1</Text>
          <Text style={[
            styles.totalScore,
            totalScores.otbor1 >= 151 && styles.winScore
          ]}>
            {totalScores.otbor1}
          </Text>
        </View>
        <View style={styles.totalMiddle}>
          <Text style={styles.totalMiddleText}>ОБЩО</Text>
          <Text style={styles.totalMiddleSub}>до 151</Text>
        </View>
        <View style={styles.totalTeam}>
          <Text style={styles.totalLabel}>🔴 Отбор 2</Text>
          <Text style={[
            styles.totalScore,
            totalScores.otbor2 >= 151 && styles.winScore
          ]}>
            {totalScores.otbor2}
          </Text>
        </View>
      </View>

      {/* Заглавен ред */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { flex: 0.4 }]}>#</Text>
        <Text style={[styles.headerCell, { flex: 0.5 }]}>Коз</Text>
        <Text style={styles.headerCell}>🔵 Отб.1</Text>
        <Text style={styles.headerCell}>🔴 Отб.2</Text>
        <Text style={[styles.headerCell, { flex: 1.5 }]}>Статус</Text>
      </View>

      {/* Раздавания */}
      <ScrollView style={styles.dealsList}>
        {deals.length === 0 ? (
          <Text style={styles.noDeals}>Все още няма завършени раздавания</Text>
        ) : (
          deals.map((deal: any, i: number) => (
            <View key={i} style={[styles.dealRow, i % 2 === 0 && styles.dealRowAlt]}>
              <Text style={[styles.cell, { flex: 0.4 }]}>{deal.razdavane}</Text>
              <Text style={[styles.cell, { flex: 0.5 }]}>
                {SUIT_EMOJI[deal.koz] || '?'}
              </Text>
              <Text style={[styles.cell, deal.pts1 > deal.pts2 && styles.winCell]}>
                {deal.pts1}
              </Text>
              <Text style={[styles.cell, deal.pts2 > deal.pts1 && styles.winCell]}>
                {deal.pts2}
              </Text>
              <Text style={[styles.cell, styles.noteCell, { flex: 1.5 }]}>
                {deal.note}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Прогрес към 151 */}
      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Прогрес към 151:</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              styles.progressFill1,
              { width: `${Math.min((totalScores.otbor1 / 151) * 100, 100)}%` }
            ]} />
          </View>
          <Text style={styles.progressLabel}>
            🔵 {Math.round((totalScores.otbor1 / 151) * 100)}%
          </Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              styles.progressFill2,
              { width: `${Math.min((totalScores.otbor2 / 151) * 100, 100)}%` }
            ]} />
          </View>
          <Text style={styles.progressLabel}>
            🔴 {Math.round((totalScores.otbor2 / 151) * 100)}%
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Назад</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 15 },
  winnerBanner: { backgroundColor: 'rgba(255,215,0,0.4)', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
  winnerText: { color: '#FFD700', fontSize: 22, fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15, padding: 15, marginBottom: 15 },
  totalTeam: { flex: 1, alignItems: 'center' },
  totalLabel: { color: '#90EE90', fontSize: 14 },
  totalScore: { color: '#FFD700', fontSize: 44, fontWeight: 'bold' },
  winScore: { color: '#00ff88' },
  totalMiddle: { alignItems: 'center', marginHorizontal: 10 },
  totalMiddleText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  totalMiddleSub: { color: '#90EE90', fontSize: 11 },
  headerRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 8, marginBottom: 5 },
  headerCell: { flex: 1, color: '#FFD700', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  dealsList: { flex: 1, marginBottom: 10 },
  dealRow: { flexDirection: 'row', padding: 10, borderRadius: 6 },
  dealRowAlt: { backgroundColor: 'rgba(255,255,255,0.05)' },
  cell: { flex: 1, color: 'white', fontSize: 13, textAlign: 'center' },
  winCell: { color: '#FFD700', fontWeight: 'bold' },
  noteCell: { fontSize: 11, color: '#90EE90' },
  noDeals: { color: '#90EE90', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  progressSection: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12, marginBottom: 10 },
  progressTitle: { color: '#90EE90', fontSize: 13, marginBottom: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  progressBar: { flex: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  progressFill1: { backgroundColor: '#4488ff' },
  progressFill2: { backgroundColor: '#ff4444' },
  progressLabel: { color: 'white', fontSize: 12, width: 60 },
  backButton: { backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  backButtonText: { color: '#1a5c2a', fontSize: 18, fontWeight: 'bold' },
});