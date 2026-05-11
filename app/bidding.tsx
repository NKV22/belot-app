import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SUIT_ORDER: {[key: string]: number} = {
  'Спатия': 0, 'Каро': 1, 'Купа': 2, 'Пика': 3, 'Без Коз': 4, 'Всичко Коз': 5,
};

export default function Bidding() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const dealer = parseInt(params.dealer as string) || 1;
  const igrach1 = params.igrach1 as string || 'Играч 1';
  const igrach2 = params.igrach2 as string || 'Играч 2';
  const igrach3 = params.igrach3 as string || 'Играч 3';
  const igrach4 = params.igrach4 as string || 'Играч 4';

  const playerNames: {[key: number]: string} = {
    1: igrach1, 2: igrach2, 3: igrach3, 4: igrach4
  };

  // Редът на наддаване започва от играча след раздаващия
  const biddingOrder = [
    (dealer % 4) + 1,
    ((dealer + 1) % 4) + 1,
    ((dealer + 2) % 4) + 1,
    ((dealer + 3) % 4) + 1,
  ];

  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [bids, setBids] = useState<any[]>(
    params.currentBids ? JSON.parse(params.currentBids as string) : []
  );
  const [passes, setPasses] = useState<number[]>([]);

  const suits = [
    { name: 'Спатия', emoji: '♣', color: '#1a3a1a' },
    { name: 'Каро', emoji: '♦', color: '#3a1a1a' },
    { name: 'Купа', emoji: '♥', color: '#3a1a1a' },
    { name: 'Пика', emoji: '♠', color: '#1a1a2e' },
    { name: 'Без Коз', emoji: '🃏', color: '#2a2a2a' },
    { name: 'Всичко Коз', emoji: '👑', color: '#3a2a0a' },
  ];

  const getLastNormalBid = () => {
    for (let i = bids.length - 1; i >= 0; i--) {
      if (!bids[i].level) return bids[i];
    }
    return null;
  };

  const getLastBid = () => bids[bids.length - 1] || null;

  const isSuitDisabled = (suitName: string) => {
    const lastNormal = getLastNormalBid();
    if (!lastNormal) return false;
    return SUIT_ORDER[suitName] <= SUIT_ORDER[lastNormal.suit];
  };

  const isLevelDisabled = (level: string) => {
    const last = getLastBid();
    if (!last) return true;
    if (level === 'Контра') return last.level !== null && last.level !== undefined;
    if (level === 'Реконтра') return last.level !== 'Контра';
    return false;
  };

  const handlePass = (playerNum: number) => {
    const newPasses = [...passes, playerNum];
    setPasses(newPasses);

    // Ако всички 4 са пасирали → всички пас
    if (newPasses.length === 4) {
      Alert.alert('Всички пасираха!', 'Преминаваме към следващото раздаване.', [
        {
          text: 'OK',
          onPress: () => router.replace({
            pathname: '/igra' as any,
            params: { ...params, allPass: 'true' }
          })
        }
      ]);
      return;
    }

    // Ако има бид и последните 3 са пасирали → играта е определена
    if (getLastNormalBid() && newPasses.length >= 3) {
      Alert.alert('Наддаването приключи!', `Играе се на ${getLastNormalBid()?.suit}`, [
        {
          text: 'Запази',
          onPress: saveAndReturn
        }
      ]);
    }
  };

  const confirmBid = (team: number) => {
    const teamName = `Отбор ${team}`;
    let newBid: any;

    if (selectedLevel) {
      newBid = { team: teamName, bid: `${selectedLevel}!`, suit: '', level: selectedLevel };
    } else if (selectedSuit) {
      const suit = suits.find(s => s.name === selectedSuit);
      newBid = {
        team: teamName,
        bid: `Играе на ${suit?.emoji} ${selectedSuit}`,
        suit: selectedSuit,
        level: null
      };
    } else {
      Alert.alert('Избери боя!');
      return;
    }

    const newBids = [...bids, newBid];
    setBids(newBids);
    setPasses([]); // Нулираме пасовете след нов бид
    setSelectedSuit(null);
    setSelectedLevel(null);
  };

  const saveAndReturn = () => {
    router.replace({
      pathname: '/igra' as any,
      params: { ...params, savedBids: JSON.stringify(bids), allPass: 'false' }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🃏 Наддаване</Text>
      <Text style={styles.dealerInfo}>Раздава: {playerNames[dealer]}</Text>

      <Text style={styles.sectionTitle}>Ред на наддаване:</Text>
      <View style={styles.biddingOrderRow}>
        {biddingOrder.map((playerNum, i) => (
          <View key={i} style={styles.playerOrderItem}>
            <Text style={styles.playerOrderNum}>{i + 1}</Text>
            <Text style={styles.playerOrderName}>{playerNames[playerNum]}</Text>
            {passes.includes(playerNum) && <Text style={styles.passedBadge}>Пас</Text>}
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Избери боя:</Text>
      <View style={styles.suitsGrid}>
        {suits.map((suit) => (
          <TouchableOpacity
            key={suit.name}
            style={[
              styles.suitButton,
              { backgroundColor: suit.color },
              selectedSuit === suit.name && styles.suitButtonActive,
              isSuitDisabled(suit.name) && styles.suitButtonDisabled,
            ]}
            onPress={() => {
              if (isSuitDisabled(suit.name)) {
                Alert.alert('Невалиден бид', 'Вече е казана по-висока боя!');
                return;
              }
              setSelectedSuit(suit.name);
              setSelectedLevel(null);
            }}
          >
            <Text style={styles.suitEmoji}>{suit.emoji}</Text>
            <Text style={[styles.suitName, isSuitDisabled(suit.name) && styles.disabledText]}>
              {suit.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
<TouchableOpacity 
       style={styles.allPassButton}
        onPress={() => {
        Alert.alert('Всички пасираха!', 'Ново раздаване!', [{
        text: 'OK',
        onPress: () => router.replace({
        pathname: '/igra' as any,
        params: { ...params, allPass: 'true', savedBids: JSON.stringify(bids) }
      })
    }]);
  }}
>
  <Text style={styles.allPassButtonText}>🚫 Всички пасираха</Text>
</TouchableOpacity>
      <Text style={styles.sectionTitle}>Специално:</Text>
      <View style={styles.levelsRow}>
        {['Контра', 'Реконтра'].map(level => (
          <TouchableOpacity
            key={level}
            style={[
              styles.levelButton,
              selectedLevel === level && styles.levelButtonActive,
              isLevelDisabled(level) && styles.levelButtonDisabled,
            ]}
            onPress={() => {
              if (isLevelDisabled(level)) {
                Alert.alert('Невалидно', level === 'Контра' ? 'Контра само след нормален бид!' : 'Реконтра само след Контра!');
                return;
              }
              setSelectedLevel(level);
              setSelectedSuit(null);
            }}
          >
            <Text style={[styles.levelText, isLevelDisabled(level) && styles.disabledText]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(selectedSuit || selectedLevel) && (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmTitle}>
            Кой казва: {selectedLevel || `${suits.find(s => s.name === selectedSuit)?.emoji} ${selectedSuit}`}?
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity style={styles.team1Button} onPress={() => confirmBid(1)}>
              <Text style={styles.confirmButtonText}>🔵 Отбор 1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.team2Button} onPress={() => confirmBid(2)}>
              <Text style={styles.confirmButtonText}>🔴 Отбор 2</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {bids.length > 0 && (
        <ScrollView style={styles.bidsHistory}>
          <Text style={styles.bidsTitle}>📜 История:</Text>
          {bids.map((bid, i) => (
            <Text key={i} style={[styles.bidItem, bid.level && styles.specialBid]}>
              {bid.team}: {bid.bid}
            </Text>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={saveAndReturn}>
        <Text style={styles.saveButtonText}>✅ Запази наддаването</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Назад без запазване</Text>
      </TouchableOpacity>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 5 },
  dealerInfo: { color: '#FFD700', textAlign: 'center', fontSize: 14, marginBottom: 15 },
  sectionTitle: { color: '#90EE90', fontSize: 14, marginBottom: 8 },
  biddingOrderRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  playerOrderItem: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8, alignItems: 'center' },
  playerOrderNum: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  playerOrderName: { color: 'white', fontSize: 11, textAlign: 'center' },
  passedBadge: { color: '#ff6b6b', fontSize: 10, fontWeight: 'bold' },
  suitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  suitButton: { width: '30%', padding: 8, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  suitButtonActive: { borderColor: '#FFD700' },
  suitButtonDisabled: { opacity: 0.3 },
  suitEmoji: { fontSize: 20 },
  suitName: { color: 'white', fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  disabledText: { color: '#aaa' },
  levelsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  levelButton: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'transparent' },
  levelButtonActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.2)' },
  levelButtonDisabled: { opacity: 0.3 },
  levelText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  confirmRow: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 12, marginBottom: 12 },
  confirmTitle: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  confirmButtons: { flexDirection: 'row', gap: 10 },
  team1Button: { flex: 1, backgroundColor: '#1a3a8a', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  team2Button: { flex: 1, backgroundColor: '#8a1a1a', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  confirmButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  bidsHistory: { maxHeight: 80, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 10, marginBottom: 10 },
  bidsTitle: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  bidItem: { color: 'white', fontSize: 13, paddingVertical: 3 },
  specialBid: { color: '#FFD700', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 25, alignItems: 'center', marginBottom: 8 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, borderRadius: 25, alignItems: 'center' },
  backButtonText: { color: 'white', fontSize: 14 },
  allPassButton: { backgroundColor: 'rgba(255,0,0,0.3)', paddingVertical: 12, borderRadius: 25, alignItems: 'center', marginBottom: 8 },
allPassButtonText: { color: '#ff9090', fontSize: 16, fontWeight: 'bold' },
});