package com.piyush.daymark;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * React bridge for opt-in, LOCAL Android reminder windows.
 *
 * Deliberately no accessibility permission, no notification listener, no
 * intrusive persistent overlay, and no exact-alarm permission in this MVP.
 */
@CapacitorPlugin(name = "DaymarkIsland", permissions = {
        @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
})
public class DaymarkIslandPlugin extends Plugin {
    private JSObject status() {
        JSObject state = new JSObject();
        state.put("supported", true);
        state.put("enabled", IslandReminders.enabled(getContext()));
        state.put("overlayGranted", Settings.canDrawOverlays(getContext()));
        state.put("notificationsGranted", Build.VERSION.SDK_INT < 33
                || getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED);
        state.put("scheduledCount", IslandReminders.scheduledCount(getContext()));
        state.put("delivery", "inexact");
        return state;
    }

    @PluginMethod public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) { call.reject("enabled must be true or false"); return; }
        IslandReminders.setEnabled(getContext(), enabled);
        call.resolve(status());
    }

    @PluginMethod public void requestOverlay(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            // Result is NOT a grant: the user must turn on the switch in Android
            // Settings and return to Daymark, which checks getStatus() again.
            call.resolve(status());
        } catch (RuntimeException error) {
            call.reject("Could not open Android overlay permissions: " + error.getMessage());
        }
    }

    @PluginMethod public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(status());
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod public void preview(PluginCall call) {
        if (!IslandReminders.enabled(getContext())) {
            call.reject("Turn on Daymark Island in Personalize first.");
            return;
        }
        if (!Settings.canDrawOverlays(getContext())) {
            call.reject("Grant Display over other apps in Android Settings first.");
            return;
        }
        String title = IslandReminders.cleanTitle(call.getString("title", "Your next little win"));
        String id = "island-preview-" + System.currentTimeMillis();
        Intent show = new Intent(getContext(), DaymarkIslandService.class)
                .setAction(DaymarkIslandService.ACTION_SHOW)
                .putExtra("id", id)
                .putExtra("title", title);
        try {
            if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(show);
            else getContext().startService(show);
            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (RuntimeException denied) {
            call.reject("Android blocked the floating preview: " + denied.getMessage());
        }
    }

    @PluginMethod public void schedule(PluginCall call) {
        String id = call.getString("id");
        Long at = call.getLong("at");
        if (id == null || at == null) {
            call.reject("id and at timestamp are required");
            return;
        }
        try {
            IslandReminders.schedule(getContext(), id,
                    IslandReminders.cleanTitle(call.getString("title")), at);
            call.resolve(status());
        } catch (Exception error) {
            call.reject("Could not schedule reminder: " + error.getMessage());
        }
    }

    @PluginMethod public void cancel(PluginCall call) {
        String id = call.getString("id");
        if (id == null) { call.reject("id is required"); return; }
        try {
            IslandReminders.cancel(getContext(), id);
            call.resolve(status());
        } catch (RuntimeException invalid) { call.reject(invalid.getMessage()); }
    }
}
