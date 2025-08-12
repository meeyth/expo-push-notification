import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotificationsAsync(userId) {
    let token;

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            alert('Permission for notifications denied!');
            return;
        }

        token = (await Notifications.getExpoPushTokenAsync()).data;

        // Save token to backend
        await fetch('https://expo-push-notification-server.onrender.com/save-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, expoPushToken: token }),
        });
    }

    return token;
}
