import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface MealNotificationSettings {
  enabled: boolean;
  breakfastHour: number;
  breakfastMinute: number;
  lunchHour: number;
  lunchMinute: number;
  dinnerHour: number;
  dinnerMinute: number;
}

const STORAGE_KEY = 'eatsy_notifications';

const DEFAULT_SETTINGS: MealNotificationSettings = {
  enabled: false,
  breakfastHour: 7,
  breakfastMinute: 30,
  lunchHour: 12,
  lunchMinute: 0,
  dinnerHour: 19,
  dinnerMinute: 0,
};

export const loadNotificationSettings = async (): Promise<MealNotificationSettings> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
};

export const saveNotificationSettings = async (settings: MealNotificationSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

const MEAL_IDS = ['eatsy-breakfast', 'eatsy-lunch', 'eatsy-dinner'];

export const scheduleMealNotifications = async (
  settings: MealNotificationSettings,
  labels: { breakfast: string; lunch: string; dinner: string },
): Promise<void> => {
  await cancelMealNotifications();
  if (!settings.enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const meals = [
    { id: MEAL_IDS[0], title: `🌅 ${labels.breakfast}`, hour: settings.breakfastHour, minute: settings.breakfastMinute },
    { id: MEAL_IDS[1], title: `☀️ ${labels.lunch}`, hour: settings.lunchHour, minute: settings.lunchMinute },
    { id: MEAL_IDS[2], title: `🌙 ${labels.dinner}`, hour: settings.dinnerHour, minute: settings.dinnerMinute },
  ];

  for (const meal of meals) {
    await Notifications.scheduleNotificationAsync({
      identifier: meal.id,
      content: {
        title: 'Eatsy',
        body: meal.title,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: meal.hour,
        minute: meal.minute,
      },
    });
  }
};

export const cancelMealNotifications = async (): Promise<void> => {
  for (const id of MEAL_IDS) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
};
