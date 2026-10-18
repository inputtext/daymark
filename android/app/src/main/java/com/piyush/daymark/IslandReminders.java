package com.piyush.daymark;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.Map;

/**
 * Local reminders survive the React WebView closing and device restart.
 * Uses inexact, idle-aware AlarmManager alarms: precise delivery is NOT
 * guaranteed under Doze / power management, and no exact-alarm permission is
 * requested. The normal notification is the essential delivery mechanism.
 */
public final class IslandReminders {
    static final String PREFS = "daymark:island:v1";
    static final String ENABLED = "enabled";
    static final String REMINDER_PREFIX = "reminder:";
    static final String ACTION_FIRE = "com.piyush.daymark.island.FIRE";
    static final String ACTION_SNOOZE = "com.piyush.daymark.island.SNOOZE";
    static final String ACTION_DISMISS = "com.piyush.daymark.island.DISMISS";
    static final String ACTION_SHOW_ISLAND = "com.piyush.daymark.island.SHOW_FROM_NOTIFICATION";
    static final String CHANNEL_REMINDERS = "daymark_reminders";
    static final String CHANNEL_OVERLAY = "daymark_island_overlay";
    private IslandReminders() {}

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean enabled(Context context) {
        return prefs(context).getBoolean(ENABLED, false);
    }

    static void setEnabled(Context context, boolean value) {
        prefs(context).edit().putBoolean(ENABLED, value).apply();
        if (!value) context.stopService(new Intent(context, DaymarkIslandService.class));
    }

    static void setHapticLevel(Context context, String level) {
        if (!"off".equals(level) && !"subtle".equals(level)
                && !"balanced".equals(level) && !"strong".equals(level))
            throw new IllegalArgumentException("Unknown Daymark haptic level");
        prefs(context).edit().putString("hapticLevel", level).apply();
    }

    static String hapticLevel(Context context) {
        return prefs(context).getString("hapticLevel", "balanced");
    }

    // Purely visual, per-device animation preferences. Reminders and alarms
    // remain independent, including when Floating Island is switched off.
    static String motionStyle(Context context) {
        String stored = prefs(context).getString("motionStyle", IslandMotion.SPRING);
        try { return IslandMotion.validate(stored); }
        catch (IllegalArgumentException invalid) { return IslandMotion.SPRING; }
    }

    static void setMotionStyle(Context context, String style) {
        prefs(context).edit().putString("motionStyle", IslandMotion.validate(style)).apply();
    }

    static boolean motionReduced(Context context) {
        return prefs(context).getBoolean("motionReduced", false);
    }

    static void setMotionReduced(Context context, boolean value) {
        prefs(context).edit().putBoolean("motionReduced", value).apply();
    }

    // Position is stored locally and applied by WindowManager on every preview.
    // "camera" requests full-screen layout, but Android owns the status bar
    // and may still restrict overlays near the physical camera cutout.
    static String placementMode(Context context) {
        return prefs(context).getString("placementMode", "camera");
    }
    static int placementX(Context context) {
        return prefs(context).getInt("placementX", 0);
    }
    static int placementY(Context context) {
        return prefs(context).getInt("placementY", 0);
    }
    static int placementWidth(Context context) {
        return prefs(context).getInt("placementWidth", 280);
    }
    static void setPlacement(Context context, String mode, int x, int y, int width) {
        if (!"camera".equals(mode) && !"safe".equals(mode))
            throw new IllegalArgumentException("Unknown placement mode");
        if (x < -120 || x > 120 || y < -24 || y > 140 || width < 180 || width > 340)
            throw new IllegalArgumentException("Placement outside allowed range");
        prefs(context).edit().putString("placementMode", mode)
                .putInt("placementX", x).putInt("placementY", y)
                .putInt("placementWidth", width).apply();
    }

    static String cleanTitle(String title) {
        String normalized = title == null ? "" : title.trim();
        if (normalized.isEmpty()) normalized = "Your Daymark reminder";
        return normalized.length() > 120 ? normalized.substring(0, 120) : normalized;
    }

    static String cleanId(String id) {
        if (id == null || !id.matches("[a-zA-Z0-9:_-]{1,100}"))
            throw new IllegalArgumentException("Invalid reminder ID");
        return id;
    }

    static int notificationId(String id) {
        return (id.hashCode() & 0x7fffffff) | 0x10000;
    }

    static PendingIntent alarmIntent(Context context, String id, int flags) {
        Intent intent = new Intent(context, IslandReminderReceiver.class).setAction(ACTION_FIRE)
                .putExtra("id", id);
        return PendingIntent.getBroadcast(context, notificationId(id), intent, flags | PendingIntent.FLAG_IMMUTABLE);
    }

    static void recordDelivery(Context context, String delivery, String overlay) {
        prefs(context).edit().putLong("lastDeliveryAt", System.currentTimeMillis())
                .putString("lastDelivery", delivery)
                .putString("lastOverlay", overlay).apply();
    }

    static void recordOverlay(Context context, String overlay) {
        prefs(context).edit().putString("lastOverlay", overlay)
                .putLong("lastOverlayAt", System.currentTimeMillis()).apply();
    }

    static String lastDelivery(Context context) {
        return prefs(context).getString("lastDelivery", "No reminders delivered yet");
    }

    static String lastOverlay(Context context) {
        return prefs(context).getString("lastOverlay", "No overlay attempts yet");
    }

    static long lastOverlayAt(Context context) {
        return prefs(context).getLong("lastOverlayAt", 0L);
    }

    static long lastDeliveryAt(Context context) {
        return prefs(context).getLong("lastDeliveryAt", 0L);
    }

    static long lastRestoreAt(Context context) {
        return prefs(context).getLong("lastRestoreAt", 0L);
    }

    static int lastRestoreCount(Context context) {
        return prefs(context).getInt("lastRestoreCount", 0);
    }

    static void schedule(Context context, String id, String title, long at) throws JSONException {
        cleanId(id);
        if (at < System.currentTimeMillis() + 5000L)
            throw new IllegalArgumentException("Schedule a future reminder (at least five seconds ahead)");
        String safeTitle = cleanTitle(title);
        JSONObject item = new JSONObject().put("id", id).put("title", safeTitle).put("at", at);
        // Register the alarm before recording it, so a denied alarm cannot
        // appear in Daymark as an indefinitely pending reminder.
        placeAlarm(context, id, at);
        prefs(context).edit().putString(REMINDER_PREFIX + id, item.toString()).apply();
    }

    static void placeAlarm(Context context, String id, long at) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) throw new IllegalStateException("Android alarms are unavailable");
        PendingIntent operation = alarmIntent(context, id, PendingIntent.FLAG_UPDATE_CURRENT);
        // Intentionally inexact; an exact-alarm or calendar-alarm policy exemption is not claimed.
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation);
    }

    static JSONObject pending(Context context, String id) {
        String serialized = prefs(context).getString(REMINDER_PREFIX + id, null);
        if (serialized == null) return null;
        try { return new JSONObject(serialized); }
        catch (JSONException invalid) { return null; }
    }

    static void removeRecord(Context context, String id) {
        prefs(context).edit().remove(REMINDER_PREFIX + id).apply();
    }

    static void cancel(Context context, String id) {
        cleanId(id);
        removeRecord(context, id);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager != null) {
            PendingIntent operation = alarmIntent(context, id, PendingIntent.FLAG_NO_CREATE);
            if (operation != null) {
                manager.cancel(operation);
                operation.cancel();
            }
        }
        NotificationManager notifications =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notifications != null) notifications.cancel(notificationId(id));
    }

    static int scheduledCount(Context context) {
        int count = 0;
        for (String key : prefs(context).getAll().keySet())
            if (key.startsWith(REMINDER_PREFIX)) count++;
        return count;
    }

    static void restore(Context context) {
        final long now = System.currentTimeMillis();
        int restored = 0;
        for (Map.Entry<String, ?> entry : prefs(context).getAll().entrySet()) {
            if (!entry.getKey().startsWith(REMINDER_PREFIX)) continue;
            try {
                JSONObject item = new JSONObject((String) entry.getValue());
                String id = cleanId(item.getString("id"));
                long at = item.getLong("at");
                if (at > now + 5000L) {
                    placeAlarm(context, id, at);
                    restored++;
                } else removeRecord(context, id); // Stale alarm: avoid triggering after reboot.
            } catch (Exception invalid) {
                prefs(context).edit().remove(entry.getKey()).apply();
            }
        }
        prefs(context).edit().putLong("lastRestoreAt", now)
                .putInt("lastRestoreCount", restored).apply();
    }

    static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel reminders = new NotificationChannel(
                CHANNEL_REMINDERS, "Task reminders", NotificationManager.IMPORTANCE_HIGH);
        reminders.setDescription("Reminders that you explicitly scheduled in Daymark");
        manager.createNotificationChannel(reminders);
        NotificationChannel island = new NotificationChannel(
                CHANNEL_OVERLAY, "Floating reminder preview", NotificationManager.IMPORTANCE_LOW);
        island.setDescription("Temporary notification while the opt-in Daymark Island is visible");
        manager.createNotificationChannel(island);
    }

    static Notification.Builder notification(Context context, String channel) {
        return Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, channel)
                : new Notification.Builder(context);
    }

    static PendingIntent openApp(Context context, String id) {
        Intent open = new Intent(context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("daymark_reminder_id", id);
        return PendingIntent.getActivity(context, notificationId(id),
                open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static Notification buildReminderNotification(Context context, String id, String title) {
        ensureChannels(context);
        Intent snoozeIntent = new Intent(context, IslandReminderReceiver.class)
                .setAction(ACTION_SNOOZE).putExtra("id", id).putExtra("title", title);
        PendingIntent snooze = PendingIntent.getBroadcast(context,
                notificationId(id) ^ 0x40000000, snoozeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // A user interaction with a notification is an Android exemption from
        // some background FGS start restrictions. Keep the standard heads-up
        // notification regardless of whether the optional overlay can open.
        Notification.Builder builder = notification(context, CHANNEL_REMINDERS)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle("Daymark reminder")
                .setContentText(cleanTitle(title))
                .setContentIntent(openApp(context, id))
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setPriority(Notification.PRIORITY_HIGH)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .addAction(android.R.drawable.ic_menu_recent_history, "Snooze 10 min", snooze);

        // Don't show an inert Show Island action if it is turned off or lacks
        // permission. Swiping/tapping this user-initiated action never schedules
        // a second reminder or cancels the existing notification.
        if (enabled(context) && Settings.canDrawOverlays(context)) {
            Intent showIntent = new Intent(context, IslandReminderReceiver.class)
                    .setAction(ACTION_SHOW_ISLAND)
                    .putExtra("id", id)
                    .putExtra("title", cleanTitle(title));
            PendingIntent showIsland = PendingIntent.getBroadcast(context,
                    notificationId(id) ^ 0x20000000, showIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            builder.addAction(android.R.drawable.ic_menu_view, "Show Island", showIsland);
        }
        return builder.addAction(android.R.drawable.ic_menu_view,
                "Open Daymark", openApp(context, id)).build();
    }

    static boolean notifyDue(Context context, String id, String title) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(
                Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return false;
        try {
            manager.notify(notificationId(id), buildReminderNotification(context, id, title));
            // Posted does not mean visually presented: DND and channel settings
            // may suppress heads-up alerts, sound or lock-screen visibility.
            return true;
        } catch (SecurityException denied) {
            return false;
        }
    }
}
