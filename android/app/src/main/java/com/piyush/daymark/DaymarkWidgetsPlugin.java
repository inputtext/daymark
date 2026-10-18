package com.piyush.daymark;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/** No added Android permissions; task snapshot stays inside app-private SharedPreferences. */
@CapacitorPlugin(name = "DaymarkWidgets")
public class DaymarkWidgetsPlugin extends Plugin {
    private static final int MAX_BYTES = 512 * 1024;

    @PluginMethod
    public void syncSnapshot(PluginCall call) {
        String payload = call.getString("payload");
        if (payload == null || payload.length() > MAX_BYTES) {
            call.reject("Widget task snapshot is missing or too large.");
            return;
        }
        try {
            JSONObject snapshot = new JSONObject(payload);
            JSONArray tasks = snapshot.getJSONArray("tasks");
            if (tasks.length() > 2000) {
                call.reject("Too many tasks for the launcher snapshot.");
                return;
            }
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.getJSONObject(i);
                if (!task.has("title") || !task.has("is_complete")) {
                    call.reject("Invalid widget task entry.");
                    return;
                }
            }
            getContext().getSharedPreferences(DaymarkWidgetProvider.PREFS, Context.MODE_PRIVATE)
                    .edit().putString(DaymarkWidgetProvider.KEY_SNAPSHOT, payload).apply();
            DaymarkWidgetProvider.refreshAll(getContext());
            JSObject response = new JSObject();
            response.put("synced", tasks.length());
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Invalid widget snapshot: " + error.getMessage());
        }
    }

    @PluginMethod
    public void clearSnapshot(PluginCall call) {
        getContext().getSharedPreferences(DaymarkWidgetProvider.PREFS, Context.MODE_PRIVATE)
                .edit().remove(DaymarkWidgetProvider.KEY_SNAPSHOT).apply();
        DaymarkWidgetProvider.refreshAll(getContext());
        call.resolve();
    }
}
