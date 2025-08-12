import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { socket } from '../services/socket';

export default function Chat() {
    const { userId } = useLocalSearchParams();
    const [recipientId, setRecipientId] = useState('');
    const [text, setText] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on('receive-message', (message) => {
            setMessages((prev) => [...prev, { ...message, incoming: true }]);
        });
        return () => socket.off('receive-message');
    }, []);

    const sendMessage = () => {
        socket.emit('send-message', { senderId: userId, recipientId, text });
        setMessages((prev) => [...prev, { text, incoming: false }]);
        setText('');
    };

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Text>Recipient ID:</Text>
            <TextInput
                value={recipientId}
                onChangeText={setRecipientId}
                style={{ borderWidth: 1, marginVertical: 5, padding: 5 }}
            />

            <FlatList
                data={messages}
                renderItem={({ item }) => (
                    <Text style={{ color: item.incoming ? 'blue' : 'green' }}>
                        {item.text}
                    </Text>
                )}
                keyExtractor={(_, index) => index.toString()}
            />

            <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type message..."
                style={{ borderWidth: 1, marginVertical: 5, padding: 5 }}
            />
            <Button title="Send" onPress={sendMessage} />
        </View>
    );
}
