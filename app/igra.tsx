import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { Buffer } from "buffer";
import jpeg from "jpeg-js";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState, useEffect } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Редът е ТОЧНО от model.names (33 класа, DS е боклук на индекс 20)
const CARD_CLASSES: string[] = [
  '10C','10D','10H','10S',   // 0-3
  '7C','7D','7H','7S',       // 4-7
  '8C','8D','8H','8S',       // 8-11
  '9C','9D','9H','9S',       // 12-15
  'AC','AD','AH','AS',       // 16-19
  'DS',                       // 20
  'JC','JD','JH','JS',       // 21-24
  'KC','KD','KH','KS',       // 25-28
  'QC','QD','QH','QS',       // 29-32
];

const CARD_VALUES: {[key: string]: number} = {
  'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0,
};
const CARD_VALUES_KOZ: {[key: string]: number} = {
  'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 20, '9': 14, '8': 0, '7': 0,
};
const KOZ_MAP: {[key: string]: string} = {
  'Пика': 'S', 'Купа': 'H', 'Каро': 'D', 'Спатия': 'C'
};

interface PlayedCard { card: string; playerId: string; }
interface Hand { cards: PlayedCard[]; ledSuit: string; winnerId: string; }
interface Deal { razdavane: number; koz: string; pts1: number; pts2: number; note: string; }

const getCardValue = (card: string, kozSuit: string, gameType: string): number => {
  const value = card.slice(0, -1);
  const suit = card[card.length - 1].toUpperCase();
  if (gameType === 'Всичко Коз') return CARD_VALUES_KOZ[value] || 0;
  if (gameType === 'Без Коз') return CARD_VALUES[value] || 0;
  const kozLetter = KOZ_MAP[kozSuit] || 'S';
  if (suit === kozLetter) return CARD_VALUES_KOZ[value] || 0;
  return CARD_VALUES[value] || 0;
};

const calculatePoints = (cards: string[], kozSuit: string, gameType: string): number => {
  return cards.reduce((sum, card) => sum + getCardValue(card, kozSuit, gameType), 0);
};

const roundPoints = (pts1: number, pts2: number, gameType: string) => {
  if (gameType === 'Без Коз') { pts1 *= 2; pts2 *= 2; }
  const rem1 = pts1 % 10, rem2 = pts2 % 10;
  if (gameType !== 'Без Коз' && rem1 >= 4 && rem2 >= 4) {
    return pts1 < pts2
      ? { r1: Math.ceil(pts1 / 10), r2: Math.floor(pts2 / 10) }
      : { r1: Math.floor(pts1 / 10), r2: Math.ceil(pts2 / 10) };
  }
  return { r1: Math.round(pts1 / 10), r2: Math.round(pts2 / 10) };
};

const findCombinations = (cards: string[], kozSuit: string, gameType: string, hands: Hand[], teamIds: string[]) => {
  if (gameType === 'Без Коз') return { belot: [], sequences: [], fours: [] };
  const suits: {[key: string]: string[]} = {};
  const values: {[key: string]: string[]} = {};
  const valueOrder = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const kozLetter = KOZ_MAP[kozSuit] || 'S';
  cards.forEach(card => {
    const v = card.slice(0, -1);
    const s = card[card.length - 1];
    if (!suits[s]) suits[s] = [];
    if (!values[v]) values[v] = [];
    suits[s].push(v);
    values[v].push(s);
  });
  const belot: any[] = [];
  if (gameType === 'Козов') {
    const hasK = cards.some(c => c === `K${kozLetter}`);
    const hasQ = cards.some(c => c === `Q${kozLetter}`);
    if (hasK && hasQ) {
      const valid = hands.some(hand =>
        hand.cards.some(pc => {
          const isKozCard = pc.card === `K${kozLetter}` || pc.card === `Q${kozLetter}`;
          const isOurTeam = teamIds.includes(pc.playerId);
          const validPlay = hand.ledSuit === kozLetter || hand.cards[0].playerId === pc.playerId;
          return isKozCard && isOurTeam && validPlay;
        })
      );
      if (valid) belot.push({ name: 'Белот', points: 20 });
    }
  }
  if (gameType === 'Всичко Коз') {
    ['S', 'H', 'D', 'C'].forEach(s => {
      if (cards.some(c => c === `K${s}`) && cards.some(c => c === `Q${s}`)) {
        belot.push({ name: `Белот (${s})`, points: 20 });
      }
    });
  }
  const sequences: any[] = [];
  Object.entries(suits).forEach(([, suitCards]) => {
    const sorted = suitCards.map(v => valueOrder.indexOf(v)).filter(i => i !== -1).sort((a, b) => a - b);
    let cur = 1;
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === sorted[i-1] + 1) { cur++; }
      else {
        if (cur >= 3) {
          const highCard = valueOrder[sorted[i-1]];
          const pts = cur >= 8 ? 250 : cur === 7 ? 200 : cur === 6 ? 150 : cur === 5 ? 100 : cur === 4 ? 50 : 20;
          const name = cur >= 8 ? 'Осморка' : cur === 7 ? 'Седморка' : cur === 6 ? 'Шесторка' : cur === 5 ? 'Квинта' : cur === 4 ? 'Кварт' : 'Терца';
          sequences.push({ name, points: pts, length: cur, highCard });
        }
        cur = 1;
      }
    }
  });
  const fourPts: {[key: string]: number} = { 'J': 200, '9': 150, 'A': 100, '10': 100, 'K': 100, 'Q': 100 };
  const fours: any[] = [];
  Object.entries(values).forEach(([v, vs]) => {
    if (vs.length === 4 && fourPts[v]) fours.push({ name: `Четири ${v}`, points: fourPts[v], value: v });
  });
  return { belot, sequences, fours };
};

const resolveConflicts = (seq1: any[], seq2: any[], four1: any[], four2: any[]) => {
  const valueOrder = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const getBest = (seqs: any[]) => seqs.reduce((best: any, s: any) => {
    if (!best) return s;
    if (s.length > best.length) return s;
    if (s.length === best.length && valueOrder.indexOf(s.highCard) > valueOrder.indexOf(best.highCard)) return s;
    return best;
  }, null);
  let fSeq1: any[] = [], fSeq2: any[] = [];
  const b1 = getBest(seq1), b2 = getBest(seq2);
  if (b1 && b2) {
    if (b1.length > b2.length) fSeq1 = seq1;
    else if (b2.length > b1.length) fSeq2 = seq2;
    else {
      const hi1 = valueOrder.indexOf(b1.highCard), hi2 = valueOrder.indexOf(b2.highCard);
      if (hi1 > hi2) fSeq1 = seq1;
      else if (hi2 > hi1) fSeq2 = seq2;
    }
  } else if (b1) fSeq1 = seq1;
  else if (b2) fSeq2 = seq2;
  let fFour1: any[] = [], fFour2: any[] = [];
  const bf1 = four1.reduce((b: any, f: any) => !b || f.points > b.points ? f : b, null);
  const bf2 = four2.reduce((b: any, f: any) => !b || f.points > b.points ? f : b, null);
  if (bf1 && bf2) {
    if (bf1.points > bf2.points) fFour1 = four1;
    else if (bf2.points > bf1.points) fFour2 = four2;
  } else if (bf1) fFour1 = four1;
  else if (bf2) fFour2 = four2;
  return { fSeq1, fSeq2, fFour1, fFour2 };
};

const PlayerCards = ({ playerId, history }: { playerId: string, history: {[key: string]: string[]} }) => {
  const cards = history[playerId] || [];
  if (cards.length === 0) return null;
  return (
    <View style={playerCardStyles.row}>
      {cards.map((card, i) => (<Text key={i} style={playerCardStyles.card}>{card}</Text>))}
    </View>
  );
};
const playerCardStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center', marginTop: 3, maxWidth: 80 },
  card: { backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 8, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 3 },
});

export default function Igra() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [razdavane, setRazdavane] = useState(1);
  const [dealer, setDealer] = useState(1);
  const [currentTurn, setCurrentTurn] = useState(2);
  const [totalScores, setTotalScores] = useState({ otbor1: 0, otbor2: 0 });
  const [deals, setDeals] = useState<Deal[]>([]);
  const [hangingPoints, setHangingPoints] = useState({ otbor1: 0, otbor2: 0 });
  const [currentHandCards, setCurrentHandCards] = useState<PlayedCard[]>([]);
  const [cardsHistory, setCardsHistory] = useState<{[key: string]: string[]}>({});
  const [hands, setHands] = useState<Hand[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [kozSuit, setKozSuit] = useState('');
  const [kameraOtvorena, setKameraOtvorena] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const tflite = useTensorflowModel(require("../assets/cards.tflite"), []);
  const model = tflite.state === "loaded" ? tflite.model : undefined;

  const igrach1 = params.igrach1 as string || 'Играч 1';
  const igrach2 = params.igrach2 as string || 'Играч 2';
  const igrach3 = params.igrach3 as string || 'Играч 3';
  const igrach4 = params.igrach4 as string || 'Играч 4';
  const code = params.code as string;
  const player_id = params.player_id as string;

  const playerNames: {[key: string]: string} = { '1': igrach1, '2': igrach2, '3': igrach3, '4': igrach4 };
  const players = {
    '1': { name: igrach1, team: 1 }, '2': { name: igrach2, team: 2 },
    '3': { name: igrach3, team: 1 }, '4': { name: igrach4, team: 2 },
  };
  const turnOrder = ['2', '3', '4', '1'];
  const nextDealer = (d: number) => (d % 4) + 1;

  useEffect(() => {
    if (params.savedBids) {
      const saved = JSON.parse(params.savedBids as string);
      setBids(saved);
      const last = [...saved].reverse().find((b: any) => !b.level && b.suit !== 'Пас');
      if (last) setKozSuit(last.suit);
    }
    if (params.allPass === 'true') startNextDeal();
  }, [params.savedBids, params.allPass]);

  useEffect(() => {
    if (hands.length === 8) calculateAndSaveDeal();
  }, [hands]);

  const calculateAndSaveDeal = () => {
    const team1Ids = ['1', '3'];
    const team2Ids = ['2', '4'];
    const team1Cards = team1Ids.flatMap(id => cardsHistory[id] || []);
    const team2Cards = team2Ids.flatMap(id => cardsHistory[id] || []);
    const gameType = ['Без Коз', 'Всичко Коз'].includes(kozSuit) ? kozSuit : kozSuit ? 'Козов' : 'Козов';

    const lastNormalBid = [...bids].reverse().find((b: any) => !b.level && b.suit !== 'Пас');
    const announcingTeam = lastNormalBid?.team || null;
    const lastBid = [...bids].reverse().find((b: any) => b.suit !== 'Пас');
    const kontra = lastBid?.level === 'Реконтра' ? 4 : lastBid?.level === 'Контра' ? 2 : 1;

    let pts1 = calculatePoints(team1Cards, kozSuit, gameType);
    let pts2 = calculatePoints(team2Cards, kozSuit, gameType);

    const t1wins = hands.filter(h => team1Ids.includes(h.winnerId)).length;
    const t2wins = hands.filter(h => team2Ids.includes(h.winnerId)).length;
    const kapo1 = t1wins === 8, kapo2 = t2wins === 8;

    if (kapo1) pts1 += 100;
    else if (kapo2) pts2 += 100;
    else if (pts1 >= pts2) pts1 += 10;
    else pts2 += 10;

    const r1 = findCombinations(team1Cards, kozSuit, gameType, hands, team1Ids);
    const r2 = findCombinations(team2Cards, kozSuit, gameType, hands, team2Ids);
    const { fSeq1, fSeq2, fFour1, fFour2 } = resolveConflicts(r1.sequences, r2.sequences, r1.fours, r2.fours);
    const c1 = [...r1.belot, ...fSeq1, ...fFour1].reduce((s: number, c: any) => s + c.points, 0);
    const c2 = [...r2.belot, ...fSeq2, ...fFour2].reduce((s: number, c: any) => s + c.points, 0);

    let total1 = pts1 + c1 + hangingPoints.otbor1;
    let total2 = pts2 + c2 + hangingPoints.otbor2;

    const hanging = total1 === total2;
    const announcingWon = !announcingTeam ? true :
      announcingTeam === 'Отбор 1' ? total1 > total2 : total2 > total1;

    let final1 = 0, final2 = 0;
    let note = '';

    if (hanging) {
      note = '⚖️ Висяща';
      if (announcingTeam === 'Отбор 1') { final2 = total2; }
      else if (announcingTeam === 'Отбор 2') { final1 = total1; }
      setHangingPoints({
        otbor1: announcingTeam === 'Отбор 2' ? total1 : 0,
        otbor2: announcingTeam === 'Отбор 1' ? total2 : 0,
      });
    } else if (!announcingWon) {
      note = '❌ Вкарана';
      const all = (total1 + total2) * kontra;
      if (announcingTeam === 'Отбор 1') final2 = all;
      else final1 = all;
      setHangingPoints({ otbor1: 0, otbor2: 0 });
    } else {
      note = '✅ Изкарана';
      final1 = total1 * kontra;
      final2 = total2 * kontra;
      setHangingPoints({ otbor1: 0, otbor2: 0 });
    }
    if (kapo1) note += ' 🎯Капо';
    if (kapo2) note += ' 🎯Капо';

    const { r1: rounded1, r2: rounded2 } = roundPoints(final1, final2, gameType);
    const newTotal1 = totalScores.otbor1 + rounded1;
    const newTotal2 = totalScores.otbor2 + rounded2;
    setTotalScores({ otbor1: newTotal1, otbor2: newTotal2 });

    const newDeal: Deal = { razdavane, koz: kozSuit, pts1: rounded1, pts2: rounded2, note };
    setDeals(prev => [...prev, newDeal]);

    const winner151 = newTotal1 >= 151 || newTotal2 >= 151;
    Alert.alert(
      `Раздаване ${razdavane} приключи!`,
      `${note}\n\n🔵 Отбор 1: +${rounded1} (Общо: ${newTotal1})\n🔴 Отбор 2: +${rounded2} (Общо: ${newTotal2})${winner151 ? '\n\n🏆 ' + (newTotal1 > newTotal2 ? 'Отбор 1' : 'Отбор 2') + ' ПОБЕДИ!' : ''}`,
      [{ text: winner151 ? '🏆 Край!' : 'Следващо →', onPress: () => { if (!winner151) startNextDeal(); } }]
    );
  };

  const startNextDeal = () => {
    const newDealer = nextDealer(dealer);
    setDealer(newDealer);
    setRazdavane(prev => prev + 1);
    setCurrentTurn((newDealer % 4) + 1);
    setBids([]); setKozSuit(''); setCurrentHandCards([]); setCardsHistory({}); setHands([]);
  };

  const determineWinner = (handCards: PlayedCard[], ledSuit: string): string => {
    const kozLetter = KOZ_MAP[kozSuit] || '';
    const getStr = (card: string) => {
      const v = card.slice(0, -1);
      const s = card[card.length - 1].toUpperCase();
      if (s === kozLetter) return (CARD_VALUES_KOZ[v] || 0) + 100;
      if (s === ledSuit) return CARD_VALUES[v] || 0;
      return -1;
    };
    let wId = handCards[0].playerId, high = getStr(handCards[0].card);
    handCards.forEach(({ card, playerId }) => {
      const s = getStr(card);
      if (s > high) { high = s; wId = playerId; }
    });
    return wId;
  };

  const finishHand = (handCards: PlayedCard[]) => {
    if (handCards.length !== 4) return;
    const firstCard = handCards[0].card;
    const ledSuit = firstCard[firstCard.length - 1].toUpperCase();
    const winnerId = determineWinner(handCards, ledSuit);
    const newHand: Hand = { cards: handCards, ledSuit, winnerId };

    setHands(prev => [...prev, newHand]);
    setCardsHistory(prev => {
      const updated = { ...prev };
      handCards.forEach(({ card, playerId }) => {
        if (!updated[playerId]) updated[playerId] = [];
        if (!updated[playerId].includes(card)) updated[playerId] = [...updated[playerId], card];
      });
      return updated;
    });
    setCurrentTurn(parseInt(winnerId));
    Alert.alert('✅ Ръката приключи!', `${playerNames[winnerId]} спечели ръката!`, [{ text: 'OK' }]);
    setCurrentHandCards([]);
  };

  // === Снимка на ръката → разпознаване → разпределяне по позиция ===
  const scanHand = async () => {
    if (!cameraRef.current || model == null || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: true });
      if (!photo) { setScanning(false); return; }

      // намали до 640x640 (native, бързо) и вземи base64
      const manip = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 640, height: 640 } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG }
      );

      // декодирай JPEG → RGBA пиксели
      const raw = Buffer.from(manip.base64 as string, "base64");
      const decoded = jpeg.decode(raw, { useTArray: true });

      // изгради вход 640x640x3 float32, нормализиран 0-1
      const input = new Float32Array(640 * 640 * 3);
      for (let i = 0, j = 0; j < input.length; i += 4, j += 3) {
        input[j] = decoded.data[i] / 255;
        input[j + 1] = decoded.data[i + 1] / 255;
        input[j + 2] = decoded.data[i + 2] / 255;
      }

      const outputs = model.runSync([input.buffer]);
      const dets = new Float32Array(outputs[0] as any); // (1,300,6): x1,y1,x2,y2,conf,cls

      // събери уникалните карти (най-висока увереност за всяка)
      const best: {[card: string]: { card: string; cx: number; cy: number; conf: number }} = {};
      for (let i = 0; i < dets.length; i += 6) {
        const conf = dets[i + 4];
        if (conf < 0.5) continue;
        const cls = Math.round(dets[i + 5]);
        const name = CARD_CLASSES[cls];
        if (!name || name === "DS") continue;
        const cx = (dets[i] + dets[i + 2]) / 2;
        const cy = (dets[i + 1] + dets[i + 3]) / 2;
        if (!best[name] || conf > best[name].conf) best[name] = { card: name, cx, cy, conf };
      }
      const cards = Object.values(best);
      if (cards.length < 4) {
        Alert.alert("Опитай пак", `Разпознах ${cards.length} карти. Нагласи телефона да се виждат и 4-те ясно.`);
        setScanning(false);
        return;
      }

      // разпредели по позиция спрямо центъра на четирите карти
      const cxAvg = cards.reduce((s, d) => s + d.cx, 0) / cards.length;
      const cyAvg = cards.reduce((s, d) => s + d.cy, 0) / cards.length;
      const byPlayer: {[pid: string]: { card: string; conf: number }} = {};
      for (const d of cards) {
        const dx = d.cx - cxAvg, dy = d.cy - cyAvg;
        let pid: string;
        if (Math.abs(dy) >= Math.abs(dx)) pid = dy > 0 ? '1' : '3'; // долу=1, горе=3
        else pid = dx > 0 ? '2' : '4';                              // дясно=2, ляво=4
        if (!byPlayer[pid] || d.conf > byPlayer[pid].conf) byPlayer[pid] = { card: d.card, conf: d.conf };
      }

      if (Object.keys(byPlayer).length !== 4) {
        Alert.alert("Опитай пак", "Картите не са разположени ясно в четирите посоки (долу/горе/ляво/дясно). Нагласи ги и снимай пак.");
        setScanning(false);
        return;
      }

      // подреди в ред на игра, започвайки от този на ход (той води боята)
      const startIdx = turnOrder.indexOf(currentTurn.toString());
      const orderedPlayers = [0, 1, 2, 3].map(k => turnOrder[(startIdx + k) % 4]);
      const handCards: PlayedCard[] = orderedPlayers.map(pid => ({ card: byPlayer[pid].card, playerId: pid }));

      setCurrentHandCards(handCards);
      setKameraOtvorena(false);
      finishHand(handCards);
    } catch (e: any) {
      Alert.alert("Грешка при сканиране", String(e?.message || e));
    } finally {
      setScanning(false);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setKameraOtvorena(true);
  };
  const closeCamera = () => setKameraOtvorena(false);

  if (kameraOtvorena) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} animateShutter={false} />
        <View style={[styles.cameraOverlay, StyleSheet.absoluteFill]}>
          <View style={styles.turnBanner}>
            <Text style={styles.turnText}>🎯 Води: {playerNames[currentTurn.toString()]}</Text>
          </View>
          <View style={styles.guideBox}>
            <Text style={styles.guideText}>Снимай 4-те карти на масата{"\n"}твоята да е най-долу</Text>
          </View>
          <TouchableOpacity
            style={[styles.captureButton, scanning && styles.captureDisabled]}
            onPress={scanHand}
            disabled={scanning || model == null}
          >
            <Text style={styles.captureButtonText}>
              {model == null ? "Зарежда модел..." : scanning ? "⏳ Разпознавам..." : "📸 Снимай ръката"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={closeCamera}>
            <Text style={styles.closeButtonText}>✕ Затвори</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.rezultatBar}>
        <View style={styles.otborScore}><Text style={styles.otborIme}>Отбор 1</Text><Text style={styles.score}>{totalScores.otbor1}</Text></View>
        <View style={styles.centerInfo}>
          <View style={styles.oborContainer}><Text style={styles.oborText}>Раздаване {razdavane}</Text></View>
          <Text style={styles.handsText}>{hands.length}/8 ръце</Text>
        </View>
        <View style={styles.otborScore}><Text style={styles.otborIme}>Отбор 2</Text><Text style={styles.score}>{totalScores.otbor2}</Text></View>
      </View>

      <View style={styles.masa}>
        <View style={styles.topPlayer}>
          <Text style={[styles.playerName, currentTurn === 3 && styles.activeTurn]}>{dealer === 3 ? '🃏 ' : ''}{igrach3}{currentTurn === 3 ? ' 🎯' : ''}</Text>
          <PlayerCards playerId="3" history={cardsHistory} />
        </View>
        <View style={styles.middleRow}>
          <View style={styles.sidePlayer}>
            <Text style={[styles.playerName, currentTurn === 4 && styles.activeTurn]}>{dealer === 4 ? '🃏 ' : ''}{igrach4}{currentTurn === 4 ? ' 🎯' : ''}</Text>
            <PlayerCards playerId="4" history={cardsHistory} />
          </View>
          <View style={styles.centerMasa}>
            {currentHandCards.length === 0 ? (
              <><Text style={styles.centerText}>🃏</Text><Text style={styles.centerSubText}>Маса</Text></>
            ) : (
              <><Text style={styles.handCount}>{currentHandCards.length}/4</Text>
                {currentHandCards.map((pc, i) => (<Text key={i} style={styles.masaCard}>{pc.card}</Text>))}</>
            )}
          </View>
          <View style={styles.sidePlayer}>
            <Text style={[styles.playerName, currentTurn === 2 && styles.activeTurn]}>{dealer === 2 ? '🃏 ' : ''}{igrach2}{currentTurn === 2 ? ' 🎯' : ''}</Text>
            <PlayerCards playerId="2" history={cardsHistory} />
          </View>
        </View>
        <View style={styles.bottomPlayer}>
          <PlayerCards playerId="1" history={cardsHistory} />
          <Text style={[styles.playerName, currentTurn === 1 && styles.activeTurn]}>{dealer === 1 ? '🃏 ' : ''}{igrach1}{currentTurn === 1 ? ' 🎯' : ''}</Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cameraButton} onPress={openCamera}>
          <Text style={styles.cameraButtonText}>📷 Сканирай ръка</Text>
        </TouchableOpacity>
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.historyButton} onPress={() => router.push({ pathname: '/istoriq' as any, params: { history: JSON.stringify(cardsHistory), players: JSON.stringify(players), hands: JSON.stringify(hands) } })}>
            <Text style={styles.historyButtonText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.biddingButton} onPress={() => router.push({ pathname: '/bidding' as any, params: { code, player_id, igrach1, igrach2, igrach3, igrach4, currentBids: JSON.stringify(bids), dealer: dealer.toString() } })}>
            <Text style={styles.biddingButtonText}>🎯 Наддаване</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rezultatButton} onPress={() => router.push({ pathname: '/rezultat' as any, params: { history: JSON.stringify(cardsHistory), players: JSON.stringify(players), bids: JSON.stringify(bids), hands: JSON.stringify(hands), totalScores: JSON.stringify(totalScores), hangingPoints: JSON.stringify(hangingPoints), deals: JSON.stringify(deals), lastObor: hands.length === 8 ? 'true' : 'false' } })}>
            <Text style={styles.rezultatButtonText}>🏆</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tablicaButton} onPress={() => router.push({ pathname: '/tablica' as any, params: { deals: JSON.stringify(deals), totalScores: JSON.stringify(totalScores) } })}>
            <Text style={styles.tablicaButtonText}>📊</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20, gap: 12 },
  turnBanner: { backgroundColor: 'rgba(255,215,0,0.3)', borderRadius: 10, padding: 8, alignItems: 'center' },
  turnText: { color: '#FFD700', fontSize: 16, fontWeight: 'bold' },
  guideBox: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 10 },
  guideText: { color: 'white', fontSize: 13, textAlign: 'center' },
  captureButton: { backgroundColor: '#FFD700', paddingVertical: 16, borderRadius: 25, alignItems: 'center' },
  captureDisabled: { backgroundColor: 'rgba(255,215,0,0.4)' },
  captureButtonText: { color: '#1a5c2a', fontSize: 18, fontWeight: 'bold' },
  closeButton: { backgroundColor: 'rgba(200,0,0,0.8)', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  closeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  rezultatBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 15, paddingTop: 50 },
  otborScore: { alignItems: 'center' },
  otborIme: { color: '#90EE90', fontSize: 12 },
  score: { color: '#FFD700', fontSize: 28, fontWeight: 'bold' },
  centerInfo: { alignItems: 'center' },
  oborContainer: { backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, marginBottom: 3 },
  oborText: { color: '#1a5c2a', fontWeight: 'bold', fontSize: 14 },
  handsText: { color: '#90EE90', fontSize: 10 },
  masa: { flex: 1, justifyContent: 'space-between', padding: 20 },
  topPlayer: { alignItems: 'center' },
  middleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sidePlayer: { alignItems: 'center', maxWidth: 80 },
  centerMasa: { width: 110, height: 110, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFD700' },
  centerText: { fontSize: 32 },
  centerSubText: { color: '#FFD700', fontSize: 11 },
  handCount: { color: '#FFD700', fontSize: 14, fontWeight: 'bold' },
  masaCard: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  bottomPlayer: { alignItems: 'center' },
  playerName: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  activeTurn: { color: '#FFD700' },
  buttons: { padding: 15, paddingBottom: 50, gap: 10 },
  cameraButton: { backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  cameraButtonText: { color: '#1a5c2a', fontSize: 18, fontWeight: 'bold' },
  bottomButtons: { flexDirection: 'row', gap: 8 },
  historyButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  historyButtonText: { fontSize: 18 },
  biddingButton: { flex: 2, backgroundColor: 'rgba(255,165,0,0.3)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  biddingButtonText: { color: '#FFD700', fontSize: 13 },
  rezultatButton: { flex: 1, backgroundColor: 'rgba(255,215,0,0.3)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  rezultatButtonText: { fontSize: 18 },
  tablicaButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  tablicaButtonText: { fontSize: 18 },
});