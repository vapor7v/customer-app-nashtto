import messaging from '@react-native-firebase/messaging';

export const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.log('Error retrieving FCM token:', error);
  }
};   