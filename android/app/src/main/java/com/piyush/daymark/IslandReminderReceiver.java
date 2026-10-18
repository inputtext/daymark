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
        if (IslandReminders.ACTION_SHOW_ISLAND.equals(action)) {
            // Explicit tap in the existing reminder notification, not a new
            // notification or a fresh scheduled alarm. Android generally
            // permits this FGS launch because it follows user interaction.
            showIsland(context, id, IslandReminders.cleanTitle(intent.getStringExtra("title")), true);
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
        boolean notificationPosted = IslandReminders.notifyDue(context, id, title);
        IslandReminders.recordDelivery(context,
                notificationPosted ? "Notification posted (visibility depends on Android settings)"
                        : "Notification blocked or disabled", "Not attempted");
        showIsland(context, id, title, false);
    }

    /** Automatic alarm delivery is best-effort on modern Android. Notification
     * user actions get a separate attempt without bypassing OS restrictions.
     */
    private static void showIsland(Context context, String id, String title, boolean userRequested) {
        if (!IslandReminders.enabled(context)) {
            IslandReminders.recordOverlay(context, "Floating Island switched off");
            return;
        }
        if (!Settings.canDrawOverlays(context)) {
            IslandReminders.recordOverlay(context, "Display over other apps permission missing");
            return;
        }
        KeyguardManager lock = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        if (lock != null && lock.isDeviceLocked()) {
            IslandReminders.recordOverlay(context, "Phone locked — use the normal notification");
            return;
        }
        Intent overlay = new Intent(context, DaymarkIslandService.class)
                .setAction(DaymarkIslandService.ACTION_SHOW)
                .putExtra("id", id).putExtra("title", title);
        try {
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(overlay);
            else context.startService(overlay);
            IslandReminders.recordOverlay(context,
                    userRequested ? "User tapped Show Island: starting" : "Automatic overlay requested");
        } catch (RuntimeException restricted) {
            // Android 12–16 can reject background foreground-service launches
            // even when the overlay permission is granted (Android 15+ tightened
            // the permission-only exemption). The normal alert remains posted.
            IslandReminders.recordOverlay(context,
                    (userRequested ? "Notification action" : "Automatic background start")
                            + " blocked by Android: " + restricted.getClass().getSimpleName());
        }
    }
}
