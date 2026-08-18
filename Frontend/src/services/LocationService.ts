import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabaseClient';

const LOCATION_TASK_NAME = 'background-location-task';

export async function requestLocationPermissionsAsync() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.log('Permission to access location in foreground was denied');
    return false;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.log('Permission to access location in background was denied');
    // We can still proceed with foreground location
  }
  return true;
}

export async function startLocationTracking() {
  const hasPermission = await requestLocationPermissionsAsync();
  if (!hasPermission) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;

  // Background Location Tracking
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // Update every minute
      distanceInterval: 100, // Or every 100 meters
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "AURA is tracking your location",
        notificationBody: "Your location is being shared with your caregiver.",
        notificationColor: "#FF4500",
      },
    });
  }
}

export async function stopLocationTracking() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location background task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude } = location.coords;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase
          .from('user_locations')
          .upsert({ 
            user_id: session.user.id, 
            latitude, 
            longitude, 
            updated_at: new Date().toISOString() 
          }, { onConflict: 'user_id' });
      }
    }
  }
});
