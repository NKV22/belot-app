import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ─── Стойности на картите ────────────────────────────────────────
// Нормални стойности (без коз)
const CARD_VALUES: {[key: string]: number} = {
  'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2,
  '9': 0, '8': 0, '7': 0,
};

// Стойности в козова боя
const CARD_VALUES_KOZ: {[key: string]: number} = {
  'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 20,
  '9': 14, '8': 0, '7': 0,
};

// Картите на боята към буква
const KOZ_MAP: {[key: string]: string} = {
  'Пика': 'S', 'Купа': 'H', 'Каро': 'D', 'Спатия': 'C'
};

// Емоджита на боите
const SUIT_EMOJI: {[key: string]: string} = {
  'Пика': '♠', 'Купа': '♥', 'Каро': '♦', 'Спатия': '♣',
  'Без Коз': '🃏', 'Всичко Коз': '👑'
};

// ─── Изчисляване на точки от карти ──────────────────────────────
const getCardValue = (card: string, kozSuit: string, gameType: string): number => {
  const value = card.slice(0, -1);   // напр. "K" от "KS"
  const suit = card[card.length - 1].toUpperCase(); // напр. "S" от "KS"

  if (gameType === 'Всичко Коз') {
    // При Всичко Коз всички карти са коз
    return CARD_VALUES_KOZ[value] || 0;
  }
  if (gameType === 'Без Коз') {
    // При Без Коз използваме нормалните стойности (удвояването е после)
    return CARD_VALUES[value] || 0;
  }
  // При козов цвят - проверяваме дали картата е от козовата боя
  const kozLetter = KOZ_MAP[kozSuit] || 'S';
  if (suit === kozLetter) return CARD_VALUES_KOZ[value] || 0;
  return CARD_VALUES[value] || 0;
};

const calculatePoints = (cards: string[], kozSuit: string, gameType: string): number => {
  return cards.reduce((sum, card) => sum + getCardValue(card, kozSuit, gameType), 0);
};

// ─── Закръгляване ────────────────────────────────────────────────
const roundPoints = (pts1: number, pts2: number, gameType: string) => {
  // При Без Коз - удвой преди закръгляне
  if (gameType === 'Без Коз') {
    pts1 = pts1 * 2;
    pts2 = pts2 * 2;
  }

  const rem1 = pts1 % 10;
  const rem2 = pts2 % 10;

  let rounded1: number;
  let rounded2: number;

  // Специално закръгляне при Всичко Коз и Козов:
  // Ако и двата завършват на 4+ → по-малкият закръгля нагоре
  if (gameType !== 'Без Коз' && rem1 >= 4 && rem2 >= 4) {
    if (pts1 < pts2) {
      rounded1 = Math.ceil(pts1 / 10);
      rounded2 = Math.floor(pts2 / 10);
    } else {
      rounded1 = Math.floor(pts1 / 10);
      rounded2 = Math.ceil(pts2 / 10);
    }
  } else {
    rounded1 = Math.round(pts1 / 10);
    rounded2 = Math.round(pts2 / 10);
  }

  return { rounded1, rounded2 };
};

// ─── Намиране на комбинации ──────────────────────────────────────
const findAllCombinations = (cards: string[], kozSuit: string, gameType: string, hands: any[], teamPlayerIds: string[]) => {
  // При Без Коз - НУЛА комбинации (само капо и последно 10)
  if (gameType === 'Без Коз') return { belot: [], sequences: [], fours: [] };

  const suits: {[key: string]: string[]} = {};
  const values: {[key: string]: string[]} = {};
  const valueOrder = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const kozLetter = KOZ_MAP[kozSuit] || 'S';

  // Раздели картите по боя и по стойност
  cards.forEach(card => {
    const value = card.slice(0, -1);
    const suit = card[card.length - 1];
    if (!suits[suit]) suits[suit] = [];
    if (!values[value]) values[value] = [];
    suits[suit].push(value);
    values[value].push(suit);
  });

  // ─── Белот ────────────────────────────────────────────────────
  // Белот = K + Q от козова боя
  // Валиден само ако играчът го е изиграл правилно
  const belot: {name: string, points: number}[] = [];

  if (gameType === 'Козов') {
    // Проверяваме дали играч от отбора има K и Q от коз
    // И дали ги е изиграл в правилен момент (от историята на ръцете)
    const hasKozK = cards.some(c => c === `K${kozLetter}`);
    const hasKozQ = cards.some(c => c === `Q${kozLetter}`);

    if (hasKozK && hasKozQ) {
      // Проверяваме историята на ръцете дали белотът е валиден
      const belotValid = hands.some(hand => {
        const ledSuit = hand.ledSuit; // Поисканата боя в тази ръка
        return hand.cards.some((pc: any) => {
          // Картата е от козова боя (K или Q коз)
          const isKozCard = pc.card === `K${kozLetter}` || pc.card === `Q${kozLetter}`;
          // Хвърлена от играч от нашия отбор
          const isOurTeam = teamPlayerIds.includes(pc.playerId);
          // Хвърлена при козова боя или като първа карта
          const validPlay = ledSuit === kozLetter || hand.cards[0].playerId === pc.playerId;
          return isKozCard && isOurTeam && validPlay;
        });
      });

      if (belotValid) {
        belot.push({ name: 'Белот', points: 20 });
      }
    }
  }

  if (gameType === 'Всичко Коз') {
    // При Всичко Коз - белот от всяка боя
    ['S', 'H', 'D', 'C'].forEach(suit => {
      const hasK = cards.some(c => c === `K${suit}`);
      const hasQ = cards.some(c => c === `Q${suit}`);
      if (hasK && hasQ) {
        belot.push({ name: `Белот (${suit})`, points: 20 });
      }
    });
  }

  // ─── Поредни карти ────────────────────────────────────────────
  const sequences: {name: string, points: number, length: number, highCard: string}[] = [];

  Object.entries(suits).forEach(([suit, suitCards]) => {
    const sorted = suitCards
      .map(v => valueOrder.indexOf(v))
      .filter(i => i !== -1)
      .sort((a, b) => a - b);

    let curSeq = 1;
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === sorted[i - 1] + 1) {
        curSeq++;
      } else {
        if (curSeq >= 3) {
          const highCard = valueOrder[sorted[i - 1]];
          let seq = { name: '', points: 0, length: curSeq, highCard };
          if (curSeq >= 8) seq = { ...seq, name: 'Осморка', points: 250 };
          else if (curSeq === 7) seq = { ...seq, name: 'Седморка', points: 200 };
          else if (curSeq === 6) seq = { ...seq, name: 'Шесторка', points: 150 };
          else if (curSeq === 5) seq = { ...seq, name: 'Квинта', points: 100 };
          else if (curSeq === 4) seq = { ...seq, name: 'Кварт', points: 50 };
          else if (curSeq === 3) seq = { ...seq, name: 'Терца', points: 20 };
          sequences.push(seq);
        }
        curSeq = 1;
      }
    }
  });

  // ─── Четири еднакви ───────────────────────────────────────────
  const fourValues: {[key: string]: number} = {
    'J': 200, '9': 150, 'A': 100, '10': 100, 'K': 100, 'Q': 100
  };
  const fours: {name: string, points: number, value: string}[] = [];

  Object.entries(values).forEach(([value, valueSuits]) => {
    if (valueSuits.length === 4 && fourValues[value]) {
      fours.push({
        name: `Четири ${value}`,
        points: fourValues[value],
        value
      });
    }
  });

  return { belot, sequences, fours };
};

// ─── Разрешаване на конфликти между комбинации ───────────────────
const resolveConflicts = (
  seq1: any[], seq2: any[],
  four1: any[], four2: any[]
) => {
  const valueOrder = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  // ── Поредици ─────────────────────────────────────────────────
  // Само отборът с НАЙ-ДОБРАТА поредица взима всичките си поредици
  let finalSeq1: any[] = [];
  let finalSeq2: any[] = [];

  const best1 = seq1.reduce((best: any, s: any) => {
    if (!best) return s;
    if (s.length > best.length) return s;
    if (s.length === best.length && valueOrder.indexOf(s.highCard) > valueOrder.indexOf(best.highCard)) return s;
    return best;
  }, null);

  const best2 = seq2.reduce((best: any, s: any) => {
    if (!best) return s;
    if (s.length > best.length) return s;
    if (s.length === best.length && valueOrder.indexOf(s.highCard) > valueOrder.indexOf(best.highCard)) return s;
    return best;
  }, null);

  if (best1 && best2) {
    if (best1.length > best2.length) {
      // Отбор 1 има по-дълга поредица → взима всичките си
      finalSeq1 = seq1;
    } else if (best2.length > best1.length) {
      finalSeq2 = seq2;
    } else {
      // Равна дължина → сравни по висока карта
      const hi1 = valueOrder.indexOf(best1.highCard);
      const hi2 = valueOrder.indexOf(best2.highCard);
      if (hi1 > hi2) finalSeq1 = seq1;
      else if (hi2 > hi1) finalSeq2 = seq2;
      // Пълно равенство → НИКОЙ не взима (finalSeq остават [])
    }
  } else if (best1) {
    finalSeq1 = seq1;
  } else if (best2) {
    finalSeq2 = seq2;
  }

  // ── Четири еднакви ────────────────────────────────────────────
  // Само отборът с НАЙ-ДОБРОТО каре взима
  let finalFour1: any[] = [];
  let finalFour2: any[] = [];

  const bestFour1 = four1.reduce((best: any, f: any) => !best || f.points > best.points ? f : best, null);
  const bestFour2 = four2.reduce((best: any, f: any) => !best || f.points > best.points ? f : best, null);

  if (bestFour1 && bestFour2) {
    if (bestFour1.points > bestFour2.points) finalFour1 = four1;
    else if (bestFour2.points > bestFour1.points) finalFour2 = four2;
    // Равни → никой
  } else if (bestFour1) {
    finalFour1 = four1;
  } else if (bestFour2) {
    finalFour2 = four2;
  }

  return { finalSeq1, finalSeq2, finalFour1, finalFour2 };
};

// ─── ГЛАВЕН КОМПОНЕНТ ────────────────────────────────────────────
export default function Rezultat() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Данни от предишния екран
  const history = params.history ? JSON.parse(params.history as string) : {};
  const players = params.players ? JSON.parse(params.players as string) : {};
  const bids = params.bids ? JSON.parse(params.bids as string) : [];
  const hands = params.hands ? JSON.parse(params.hands as string) : [];
  const totalScores = params.totalScores ? JSON.parse(params.totalScores as string) : { otbor1: 0, otbor2: 0 };
  const hangingPoints = params.hangingPoints ? JSON.parse(params.hangingPoints as string) : { otbor1: 0, otbor2: 0 };

  // ─── Козова боя и множител ───────────────────────────────────
  const lastNormalBid = [...bids].reverse().find((b: any) => !b.level && b.suit !== 'Пас');
  const kozSuit = lastNormalBid?.suit || 'Пика';
  const gameType = ['Без Коз', 'Всичко Коз'].includes(kozSuit) ? kozSuit : 'Козов';
  const lastBid = [...bids].reverse().find((b: any) => b.suit !== 'Пас');
  const kontraMultiplier = lastBid?.level === 'Реконтра' ? 4 : lastBid?.level === 'Контра' ? 2 : 1;
  const announcingTeam = lastNormalBid?.team || null;

  // ─── Раздели играчите по отбори ──────────────────────────────
  const team1PlayerIds = Object.entries(players)
    .filter(([, p]: any) => p.team === 1)
    .map(([id]) => id);
  const team2PlayerIds = Object.entries(players)
    .filter(([, p]: any) => p.team === 2)
    .map(([id]) => id);

  // ─── Карти по отбори ─────────────────────────────────────────
  const team1Cards = team1PlayerIds.flatMap(id => history[id] || []);
  const team2Cards = team2PlayerIds.flatMap(id => history[id] || []);
  const hasCards = team1Cards.length > 0 || team2Cards.length > 0;

  // ─── Точки от карти ──────────────────────────────────────────
  let pts1 = calculatePoints(team1Cards, kozSuit, gameType);
  let pts2 = calculatePoints(team2Cards, kozSuit, gameType);

  // ─── Капо и последна ръка ────────────────────────────────────
  // Проверяваме кой отбор е спечелил всички ръце
  const team1HandWins = hands.filter((h: any) => team1PlayerIds.includes(h.winnerId)).length;
  const team2HandWins = hands.filter((h: any) => team2PlayerIds.includes(h.winnerId)).length;
  const totalHands = hands.length;

  const kapo1 = totalHands === 8 && team1HandWins === 8; // Отбор 1 е взел всички
  const kapo2 = totalHands === 8 && team2HandWins === 8; // Отбор 2 е взел всички
  const isLastHand = totalHands === 8 && !kapo1 && !kapo2;

  if (hasCards) {
    if (kapo1) {
      pts1 += 100; // Капо = +100
    } else if (kapo2) {
      pts2 += 100;
    } else if (isLastHand) {
      // Последна ръка = +10 за победителя
      if (pts1 >= pts2) pts1 += 10;
      else pts2 += 10;
    }
  }

  // ─── Комбинации ──────────────────────────────────────────────
  const result1 = findAllCombinations(team1Cards, kozSuit, gameType, hands, team1PlayerIds);
  const result2 = findAllCombinations(team2Cards, kozSuit, gameType, hands, team2PlayerIds);

  // Разреши конфликти (само един отбор взима поредиците/каретата)
  const { finalSeq1, finalSeq2, finalFour1, finalFour2 } = resolveConflicts(
    result1.sequences, result2.sequences,
    result1.fours, result2.fours
  );

  // Всички комбинации за всеки отбор
  const allCombos1 = [...result1.belot, ...finalSeq1, ...finalFour1];
  const allCombos2 = [...result2.belot, ...finalSeq2, ...finalFour2];

  const comboPoints1 = allCombos1.reduce((sum: number, c: any) => sum + c.points, 0);
  const comboPoints2 = allCombos2.reduce((sum: number, c: any) => sum + c.points, 0);

  let totalPts1 = pts1 + comboPoints1;
  let totalPts2 = pts2 + comboPoints2;

  // Добави висящите точки от предишни раздавания
  totalPts1 += hangingPoints.otbor1 || 0;
  totalPts2 += hangingPoints.otbor2 || 0;

  // ─── Висяща игра ─────────────────────────────────────────────
  // Ако точките са равни → играта виси
  const hanging = hasCards && totalPts1 === totalPts2;

  // ─── Изкарана/Вкарана ────────────────────────────────────────
  const announcingWon = !announcingTeam ? true :
    announcingTeam === 'Отбор 1'
      ? totalPts1 > totalPts2
      : totalPts2 > totalPts1;

  // ─── Финални точки ───────────────────────────────────────────
  let final1 = 0;
  let final2 = 0;

  if (!hasCards) {
    final1 = 0;
    final2 = 0;
  } else if (hanging) {
    // Висяща — обявилият не записва своите точки
    if (announcingTeam === 'Отбор 1') {
      final2 = totalPts2; // Само Отбор 2 записва
    } else if (announcingTeam === 'Отбор 2') {
      final1 = totalPts1;
    } else {
      // Без анонс — никой не записва висящите
      final1 = 0;
      final2 = 0;
    }
  } else if (!announcingWon) {
    // Вкарана — другият взема ВСИЧКИ точки × множител
    const allPoints = (totalPts1 + totalPts2) * kontraMultiplier;
    if (announcingTeam === 'Отбор 1') final2 = allPoints;
    else final1 = allPoints;
  } else {
    // Изкарана — всеки записва своите × множител
    final1 = totalPts1 * kontraMultiplier;
    final2 = totalPts2 * kontraMultiplier;
  }

  // ─── Закръгляване ────────────────────────────────────────────
  const { rounded1, rounded2 } = roundPoints(final1, final2, gameType);

  // ─── Нов общ резултат ─────────────────────────────────────────
  const newTotal1 = totalScores.otbor1 + rounded1;
  const newTotal2 = totalScores.otbor2 + rounded2;

  // ─── Проверка за победител (151+) ────────────────────────────
  const gameWinner = newTotal1 >= 151 || newTotal2 >= 151
    ? newTotal1 > newTotal2 ? '🔵 Отбор 1' : '🔴 Отбор 2'
    : null;

  const maxPoints = gameType === 'Козов' ? 162 : gameType === 'Всичко Коз' ? 258 : 260;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Резултат</Text>
      <Text style={styles.kozInfo}>
        {SUIT_EMOJI[kozSuit]} {kozSuit}
        {kontraMultiplier > 1 ? `  (x${kontraMultiplier})` : ''}
        {'  '}— Общо {maxPoints} т.
      </Text>

      {/* Победител */}
      {gameWinner && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerText}>🏆 {gameWinner} ПОБЕДИ ИГРАТА!</Text>
        </View>
      )}

      {/* Висяща игра */}
      {hanging && (
        <View style={styles.hangingBanner}>
          <Text style={styles.hangingText}>⚖️ Висяща игра! Точките се натрупват!</Text>
        </View>
      )}

      {/* Капо */}
      {(kapo1 || kapo2) && (
        <View style={styles.kapoBanner}>
          <Text style={styles.kapoText}>
            🎯 КАПО! {kapo1 ? '🔵 Отбор 1' : '🔴 Отбор 2'} взе всички ръце! (+100)
          </Text>
        </View>
      )}

      {/* Резултат от раздаването */}
      <View style={styles.scoreRow}>
        <View style={[styles.teamScore, announcingTeam === 'Отбор 1' && styles.announcingTeam]}>
          <Text style={styles.teamName}>🔵 Отбор 1</Text>
          {announcingTeam === 'Отбор 1' && (
            <Text style={styles.announcingBadge}>
              Обявил {SUIT_EMOJI[kozSuit]} {kozSuit}
            </Text>
          )}
          <Text style={styles.bigScore}>{hasCards ? rounded1 : 0}</Text>
          <Text style={styles.smallScore}>({hasCards ? final1 : 0} т.)</Text>
          <Text style={styles.totalScore}>Общо: {newTotal1}</Text>
        </View>

        <Text style={styles.vs}>VS</Text>

        <View style={[styles.teamScore, announcingTeam === 'Отбор 2' && styles.announcingTeam]}>
          <Text style={styles.teamName}>🔴 Отбор 2</Text>
          {announcingTeam === 'Отбор 2' && (
            <Text style={styles.announcingBadge}>
              Обявил {SUIT_EMOJI[kozSuit]} {kozSuit}
            </Text>
          )}
          <Text style={styles.bigScore}>{hasCards ? rounded2 : 0}</Text>
          <Text style={styles.smallScore}>({hasCards ? final2 : 0} т.)</Text>
          <Text style={styles.totalScore}>Общо: {newTotal2}</Text>
        </View>
      </View>

      {/* Детайли */}
      <ScrollView style={styles.details}>
        <Text style={styles.detailsTitle}>📊 Детайли:</Text>

        {!hasCards ? (
          <Text style={styles.noCardsText}>Все още няма изиграни карти</Text>
        ) : (
          <>
            {/* Точки от карти */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Точки от карти:</Text>
              <Text style={styles.detailValue}>{pts1 - (kapo1 ? 100 : 0) - (isLastHand && pts1 > pts2 ? 10 : 0)} — {pts2 - (kapo2 ? 100 : 0) - (isLastHand && pts2 > pts1 ? 10 : 0)}</Text>
            </View>

            {/* Последна ръка */}
            {isLastHand && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Последна ръка (+10):</Text>
                <Text style={styles.detailValue}>{pts1 > pts2 ? '🔵 +10' : '🔴 +10'}</Text>
              </View>
            )}

            {/* Капо */}
            {(kapo1 || kapo2) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Капо (+100):</Text>
                <Text style={styles.detailValue}>{kapo1 ? '🔵 +100' : '🔴 +100'}</Text>
              </View>
            )}

            {/* Висящи точки */}
            {(hangingPoints.otbor1 > 0 || hangingPoints.otbor2 > 0) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Висящи точки:</Text>
                <Text style={styles.detailValue}>+{hangingPoints.otbor1} — +{hangingPoints.otbor2}</Text>
              </View>
            )}

            {/* Комбинации Отбор 1 */}
            {allCombos1.map((combo: any, i: number) => (
              <View key={`c1${i}`} style={styles.detailRow}>
                <Text style={styles.detailLabel}>🔵 {combo.name}:</Text>
                <Text style={styles.detailValue}>+{combo.points} т.</Text>
              </View>
            ))}

            {/* Комбинации Отбор 2 */}
            {allCombos2.map((combo: any, i: number) => (
              <View key={`c2${i}`} style={styles.detailRow}>
                <Text style={styles.detailLabel}>🔴 {combo.name}:</Text>
                <Text style={styles.detailValue}>+{combo.points} т.</Text>
              </View>
            ))}

            {/* Общо */}
            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.detailLabel}>Общо преди закръгляне:</Text>
              <Text style={styles.detailValue}>{final1} — {final2}</Text>
            </View>

            {/* Множител */}
            {kontraMultiplier > 1 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Множител:</Text>
                <Text style={styles.detailValue}>x{kontraMultiplier}</Text>
              </View>
            )}

            {/* Ръце статистика */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Спечелени ръце:</Text>
              <Text style={styles.detailValue}>{team1HandWins} — {team2HandWins}</Text>
            </View>

            {/* Статус на играта */}
            {hanging && (
              <View style={styles.hangingDetail}>
                <Text style={styles.hangingDetailText}>
                  ⚖️ Равни точки — висяща игра!{'\n'}
                  {announcingTeam ? `${announcingTeam} не записва точки.` : ''}
                </Text>
              </View>
            )}

            {!hanging && !announcingWon && announcingTeam && (
              <View style={styles.failedBid}>
                <Text style={styles.failedBidText}>
                  ❌ {announcingTeam} не изпълни анонса!{'\n'}
                  Другият отбор взема всички {(totalPts1 + totalPts2) * kontraMultiplier} точки!
                </Text>
              </View>
            )}

            {!hanging && announcingWon && announcingTeam && (
              <View style={styles.wonBid}>
                <Text style={styles.wonBidText}>
                  ✅ {announcingTeam} изпълни анонса!
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Бутони */}
      <View style={styles.bottomButtons}>
        {/* Таблица с всички раздавания */}
        <TouchableOpacity
          style={styles.tablicaButton}
          onPress={() => router.push({
            pathname: '/tablica' as any,
            params: {
              deals: params.deals || '[]',
              totalScores: JSON.stringify({ otbor1: newTotal1, otbor2: newTotal2 }),
            }
          })}
        >
          <Text style={styles.tablicaButtonText}>📊 Таблица</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a', padding: 20, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 5 },
  kozInfo: { color: '#90EE90', textAlign: 'center', fontSize: 15, marginBottom: 10 },
  winnerBanner: { backgroundColor: 'rgba(255,215,0,0.4)', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 10 },
  winnerText: { color: '#FFD700', fontSize: 20, fontWeight: 'bold' },
  hangingBanner: { backgroundColor: 'rgba(255,165,0,0.3)', borderRadius: 10, padding: 8, alignItems: 'center', marginBottom: 8 },
  hangingText: { color: '#FFD700', fontSize: 14, fontWeight: 'bold' },
  kapoBanner: { backgroundColor: 'rgba(0,200,100,0.3)', borderRadius: 10, padding: 8, alignItems: 'center', marginBottom: 8 },
  kapoText: { color: '#90EE90', fontSize: 14, fontWeight: 'bold' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  teamScore: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  announcingTeam: { borderColor: '#FFD700' },
  teamName: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  announcingBadge: { backgroundColor: '#FFD700', color: '#1a5c2a', fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 3, fontWeight: 'bold', textAlign: 'center' },
  bigScore: { color: '#FFD700', fontSize: 40, fontWeight: 'bold' },
  smallScore: { color: '#90EE90', fontSize: 11 },
  totalScore: { color: 'white', fontSize: 12, marginTop: 3 },
  vs: { color: 'white', fontSize: 18, fontWeight: 'bold', marginHorizontal: 8 },
  details: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, padding: 15, marginBottom: 10 },
  detailsTitle: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#FFD700', marginTop: 5 },
  detailLabel: { color: '#90EE90', fontSize: 13 },
  detailValue: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  failedBid: { backgroundColor: 'rgba(200,0,0,0.3)', borderRadius: 10, padding: 10, marginTop: 10 },
  failedBidText: { color: '#ff9090', fontSize: 13, textAlign: 'center' },
  wonBid: { backgroundColor: 'rgba(0,200,0,0.2)', borderRadius: 10, padding: 10, marginTop: 10 },
  wonBidText: { color: '#90EE90', fontSize: 13, textAlign: 'center' },
  hangingDetail: { backgroundColor: 'rgba(255,165,0,0.2)', borderRadius: 10, padding: 10, marginTop: 10 },
  hangingDetailText: { color: '#FFD700', fontSize: 13, textAlign: 'center' },
  noCardsText: { color: '#90EE90', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  bottomButtons: { flexDirection: 'row', gap: 10 },
  tablicaButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  tablicaButtonText: { color: 'white', fontSize: 16 },
  backButton: { flex: 2, backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  backButtonText: { color: '#1a5c2a', fontSize: 18, fontWeight: 'bold' },
});