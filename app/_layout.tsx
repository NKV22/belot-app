import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="nova-igra" options={{ headerShown: false }} />
      <Stack.Screen name="igra" options={{ headerShown: false }} />
      <Stack.Screen name="waiting-room" options={{ headerShown: false }} />
      <Stack.Screen name="lobby" options={{ headerShown: false }} />
      <Stack.Screen name="istoriq" options={{ headerShown: false }} />
      <Stack.Screen name="bidding" options={{ headerShown: false }} />
      <Stack.Screen name="rezultat" options={{ headerShown: false }} />
    </Stack>
  );
}

