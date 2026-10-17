package com.piyush.daymark;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import org.json.JSONObject;

/** Alarm notification always comes first; the floating overlay is opt-in and best effort. */
public class IslandReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            IslandReminders.restore(context);
            return;
        }
        String id = intent.getStringExtra("id");
        if (id == null) return;
        try { IslandReminders.cleanId(id); }
        catch (IllegalArgumentException invalid) { return; }
        if (IslandReminders.ACTION_SNOOZE.equals(action)) {
            String title = IslandReminders.cleanTitle(intent.getStringExtra("title"));
            try {
                IslandReminders.schedule(context, id, title,
                        System.currentTimeMillis() + 600_000L);
                NotificationManager manager = (NotificationManager) context.getSystemService(
                        Context.NOTIFICATION_SERVICE);
                if (manager != null) manager.cancel(IslandReminders.notificationId(id));
                context.stopService(new Intent(context, DaymarkIslandService.class));
            } catch (Exception ignored) { /* Delivery remains best effort. */ }
            return;
        }
        if (IslandReminders.ACTION_DISMISS.equals(action)) {
            NotificationManager manager = (NotificationManager) context.getSystemService(
                    Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.cancel(IslandReminders.notificationId(id));
            context.stopService(new Intent(context, DaymarkIslandService.class));
            return;
        }
        if (!IslandReminders.ACTION_FIRE.equals(action)) return;
        JSONObject reminder = IslandReminders.pending(context, id);
        if (reminder == null) return; // Cancelled, stale or spoofed intent.
        long now = System.currentTimeMillis();
        long at = reminder.optLong("at", 0L);
        if (at > now + 1000L) {
            IslandReminders.placeAlarm(context, id, at);
            return;
        }
        String title = IslandReminders.cleanTitle(reminder.optString("title"));
        IslandReminders.removeRecord(context, id);
        IslandReminders.notifyDue(context, id, title);

        if (!IslandReminders.enabled(context) || !Settings.canDrawOverlays(context)) return;
        KeyguardManager lock = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        if (lock != null && lock.isDeviceLocked()) return;
        Intent overlay = new Intent(context, DaymarkIslandService.class)
                .setAction(DaymarkIslandService.ACTION_SHOW)
                .putExtra("id", id).putExtra("title", title);
        try {
            // May be refused by Android's background FGS restrictions. A regular
            // notification was already posted and remains usable.
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(overlay);
            else context.startService(overlay);
        } catch (RuntimeException restricted) {
            // Notification fallback handles denied background service startup.
        }
    }
}
