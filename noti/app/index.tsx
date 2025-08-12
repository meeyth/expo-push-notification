import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { socket } from '../services/socket';
import { registerForPushNotificationsAsync } from '../services/notifications';

export default function Home() {
  const [userId, setUserId] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (userId) {
      socket.emit('register', userId);
      registerForPushNotificationsAsync(userId);
    }
  }, [userId]);

  return (
    <View style={{ padding: 20 }}>
      <Text>Enter your User ID:</Text>
      <TextInput
        value={userId}
        onChangeText={setUserId}
        style={{ borderWidth: 1, padding: 8, marginVertical: 10 }}
      />
      <Button title="Go to Chat" onPress={() => router.push({ pathname: '/chat', params: { userId } })} />
    </View>
  );
}
