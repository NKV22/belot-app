import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SERVER_URL = 'http://192.168.1.4:8000';

export default function Igra() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [razdavane, setRazdavane] = useState(1);
  const [dealer, setDealer] = useState(1);
  const [rezultat, setRezultat] = useState({ otbor1: 0, otbor2: 0 });
  const [kameraOtvorena, setKameraOtvorena] = useState(false);
  const [detectedCards, setDetectedCards] = useState<string[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [cardsHistory, setCardsHistory] = useState<{[key: string]: string[]}>({});
  const [bids, setBids] = useState<any[]>([]);
  const [lastObor, setLastObor] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const igrach1 = params.igrach1 as string || 'Играч 1';
  const igrach2 = params.igrach2 as string || 'Играч 2';
  const igrach3 = params.igrach3 as string || 'Играч 3';
  const igrach4 = params.igrach4 as string || 'Играч 4';
  const code = params.code as string;
  const player_id = params.player_id as string;

  const playerNames: {[key: number]: string} = {
    1: igrach1, 2: igrach2, 3: igrach3, 4: igrach4
  };

  const nextDealer = (current: number) => (current % 4) + 1;

  useEffect(() => {
    if (params.savedBids) {
      setBids(JSON.parse(params.savedBids as string));
    }
    if (params.allPass === 'true') {
      const newDealer = nextDealer(dealer);
      setDealer(newDealer);
      setRazdavane(prev => prev + 1);
      setBids([]);
    }
  }, [params.savedBids, params.allPass]);

  const players = {
    '1': { name: igrach1, team: 1 },
    '2': { name: igrach2, team: 2 },
    '3': { name: igrach3, team: 1 },
    '4': { name: igrach4, team: 2 },
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    setKameraOtvorena(true);

    scanInterval.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: false,
          quality: 0.5,
        });

        const formData = new FormData();
        formData.append('file', {
          uri: photo!.uri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);

        const endpoint = code
          ? `${SERVER_URL}/scan/${code}/${player_id}`
          : `${SERVER_URL}/scan`;

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.cards.length > 0) {
          const newCards = data.cards.map((c: any) => c.card);
          setDetectedCards(newCards);
          setCardsHistory(prev => ({
            ...prev,
            [player_id]: [...new Set([...(prev[player_id] || []), ...newCards])]
          }));
        }
      } catch (error) {
        console.log('Scan error:', error);
      }
    }, 1500);
  };

  const stopScanning = () => {
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
    }
    setKameraOtvorena(false);
    setDetectedCards([]);
  };

  if (kameraOtvorena) {
    return (
      <View style={styles.container}>
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraTitle}>🃏 Сканиране в реално време</Text>
            <View style={styles.cardsDisplay}>
              {detectedCards.length === 0 ? (
                <Text style={styles.noCards}>Насочи камерата към картите...</Text>
              ) : (
                detectedCards.map((card, i) => (
                  <Text key={i} style={styles.detectedCard}>{card}</Text>
                ))
              )}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={stopScanning}>
              <Text style={styles.closeButtonText}>✕ Спри сканирането</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.rezultatBar}>
        <View style={styles.otborScore}>
          <Text style={styles.otborIme}>Отбор 1</Text>
          <Text style={styles.score}>{rezultat.otbor1}</Text>
        </View>
        <View style={styles.centerInfo}>
          <View style={styles.oborContainer}>
            <Text style={styles.oborText}>Раздаване {razdavane}</Text>
          </View>
          <Text style={styles.dealerText}>🃏 Раздава: {playerNames[dealer]}</Text>
          <Text style={styles.nextDealerText}>Следващ: {playerNames[nextDealer(dealer)]}</Text>
        </View>
        <View style={styles.otborScore}>
          <Text style={styles.otborIme}>Отбор 2</Text>
          <Text style={styles.score}>{rezultat.otbor2}</Text>
        </View>
      </View>

      <View style={styles.masa}>
        <View style={styles.topPlayer}>
          <Text style={styles.playerName}>
            {dealer === 2 ? '🃏 ' : ''}{igrach2}
          </Text>
        </View>

        <View style={styles.middleRow}>
          <View style={styles.sidePlayer}>
            <Text style={styles.playerName}>
              {dealer === 1 ? '🃏 ' : ''}{igrach1}
            </Text>
          </View>

          <View style={styles.centerMasa}>
            <Text style={styles.centerText}>🃏</Text>
            <Text style={styles.centerSubText}>Маса</Text>
          </View>

          <View style={styles.sidePlayer}>
            <Text style={styles.playerName}>
              {dealer === 3 ? '🃏 ' : ''}{igrach3}
            </Text>
          </View>
        </View>

        <View style={styles.bottomPlayer}>
          <Text style={styles.playerName}>
            {dealer === 4 ? '🃏 ' : ''}{igrach4}
          </Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cameraButton} onPress={startScanning}>
          <Text style={styles.cameraButtonText}>📷 Сканирай карти</Text>
        </TouchableOpacity>
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push({
              pathname: '/istoriq' as any,
              params: {
                history: JSON.stringify(cardsHistory),
                players: JSON.stringify(players)
              }
            })}
          >
            <Text style={styles.historyButtonText}>📋</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.biddingButton}
            onPress={() => router.push({
              pathname: '/bidding' as any,
              params: {
                code, player_id, igrach1, igrach2, igrach3, igrach4,
                currentBids: JSON.stringify(bids),
                dealer: dealer.toString(),
              }
            })}
          >
            <Text style={styles.biddingButtonText}>🎯 Наддаване</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rezultatButton}
            onPress={() => router.push({
              pathname: '/rezultat' as any,
              params: {
                history: JSON.stringify(cardsHistory),
                players: JSON.stringify(players),
                bids: JSON.stringify(bids),
                lastObor: lastObor ? 'true' : 'false',
              }
            })}
          >
            <Text style={styles.rezultatButtonText}>🏆</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              setLastObor(razdavane === 8);
              setRazdavane(razdavane + 1);
              setDealer(nextDealer(dealer));
              setBids([]);
            }}
          >
            <Text style={styles.nextButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a5c2a' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20, gap: 10 },
  cameraTitle: { color: 'white', textAlign: 'center', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 10 },
  cardsDisplay: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 15, borderRadius: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 60 },
  noCards: { color: '#aaa', fontSize: 14, fontStyle: 'italic' },
  detectedCard: { backgroundColor: '#FFD700', color: '#1a5c2a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontWeight: 'bold', fontSize: 14 },
  closeButton: { backgroundColor: 'rgba(200,0,0,0.8)', paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  closeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  rezultatBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 15, paddingTop: 50 },
  otborScore: { alignItems: 'center' },
  otborIme: { color: '#90EE90', fontSize: 12 },
  score: { color: '#FFD700', fontSize: 28, fontWeight: 'bold' },
  centerInfo: { alignItems: 'center' },
  oborContainer: { backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, marginBottom: 4 },
  oborText: { color: '#1a5c2a', fontWeight: 'bold', fontSize: 14 },
  dealerText: { color: 'white', fontSize: 11 },
  nextDealerText: { color: '#90EE90', fontSize: 10 },
  masa: { flex: 1, justifyContent: 'space-between', padding: 20 },
  topPlayer: { alignItems: 'center' },
  middleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sidePlayer: { alignItems: 'center' },
  centerMasa: { width: 120, height: 120, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFD700' },
  centerText: { fontSize: 40 },
  centerSubText: { color: '#FFD700', fontSize: 12 },
  bottomPlayer: { alignItems: 'center' },
  playerName: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  buttons: { padding: 20, gap: 10 },
  cameraButton: { backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  cameraButtonText: { color: '#1a5c2a', fontSize: 18, fontWeight: 'bold' },
  bottomButtons: { flexDirection: 'row', gap: 8 },
  historyButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  historyButtonText: { fontSize: 18 },
  biddingButton: { flex: 2, backgroundColor: 'rgba(255,165,0,0.3)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  biddingButtonText: { color: '#FFD700', fontSize: 14 },
  rezultatButton: { flex: 1, backgroundColor: 'rgba(255,215,0,0.3)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  rezultatButtonText: { fontSize: 18 },
  nextButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  nextButtonText: { color: 'white', fontSize: 16 },
});