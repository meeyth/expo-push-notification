import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { io } from 'socket.io-client';

const socket = io('https://expo-push-notification-server.onrender.com', {
    transports: ['websocket'],
});
export { socket };