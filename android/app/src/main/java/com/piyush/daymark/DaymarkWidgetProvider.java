package com.piyush.daymark;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Fully native launcher widgets. Never fetches the network or exposes a WebView.
 * A signed-in/unlocked app explicitly mirrors a minimal task snapshot via Capacitor;
 * logout and biometric lock remove it. Launcher updates work without opening Daymark.
 */
public class DaymarkWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "daymark.widgets.v1";
    static final String KEY_SNAPSHOT = "snapshot";
    static final String TYPE_TODAY = "today";
    static final String TYPE_UPCOMING = "upcoming";
    static final String TYPE_PROGRESS = "progress";

    private final String type;

    protected DaymarkWidgetProvider(String type) {
        this.type = type;
    }

    public static class Today extends DaymarkWidgetProvider {
        public Today() { super(TYPE_TODAY); }
    }
    public static class Upcoming extends DaymarkWidgetProvider {
        public Upcoming() { super(TYPE_UPCOMING); }
    }
    public static class Progress extends DaymarkWidgetProvider {
        public Progress() { super(TYPE_PROGRESS); }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id, type);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        super.onAppWidgetOptionsChanged(context, manager, id, options);
        render(context, manager, id, type);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent == null ? null : intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            refreshAll(context);
        }
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        refresh(context, manager, Today.class, TYPE_TODAY);
        refresh(context, manager, Upcoming.class, TYPE_UPCOMING);
        refresh(context, manager, Progress.class, TYPE_PROGRESS);
    }

    private static void refresh(Context context, AppWidgetManager manager,
                                Class<?> provider, String type) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, provider));
        for (int id : ids) render(context, manager, id, type);
    }

    private static JSONArray tasks(Context context) {
        String serialized = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_SNAPSHOT, null);
        if (serialized == null) return null;
        try { return new JSONObject(serialized).getJSONArray("tasks"); }
        catch (Exception ignored) { return null; }
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static String dayDisplay(String iso) {
        try {
            Date date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(iso);
            if (date != null) return new SimpleDateFormat("MMM d", Locale.getDefault()).format(date);
        } catch (Exception ignored) { /* Keep original date if invalid */ }
        return iso;
    }

    private static String timeDisplay(String hhmm) {
        try {
            Date date = new SimpleDateFormat("HH:mm", Locale.US).parse(hhmm);
            if (date != null) return new SimpleDateFormat("h:mm a", Locale.getDefault()).format(date);
        } catch (Exception ignored) { /* Hide unrecognized times */ }
        return "";
    }

    private static void setPalette(Context context, RemoteViews views, boolean progress) {
        if (Build.VERSION.SDK_INT < 31) return;
        boolean dark = (context.getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int surface = context.getColor(dark ? android.R.color.system_neutral1_800
                : android.R.color.system_neutral1_50);
        int ink = context.getColor(dark ? android.R.color.system_neutral1_50
                : android.R.color.system_neutral1_900);
        int subtle = context.getColor(dark ? android.R.color.system_neutral2_200
                : android.R.color.system_neutral2_700);
        int accent = context.getColor(dark ? android.R.color.system_accent1_200
                : android.R.color.system_accent1_600);
        views.setColorStateList(R.id.widget_root, "setBackgroundTintList", ColorStateList.valueOf(surface));
        views.setTextColor(R.id.widget_heading, ink);
        if (progress) {
            views.setTextColor(R.id.widget_progress_percent, accent);
            views.setTextColor(R.id.widget_progress_detail, subtle);
            views.setColorStateList(R.id.widget_progress_bar, "setProgressTintList", ColorStateList.valueOf(accent));
        } else {
            views.setTextColor(R.id.widget_subheading, subtle);
            views.setTextColor(R.id.widget_footer, accent);
            for (int id : ROW_IDS) views.setTextColor(id, ink);
        }
    }

    private static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static final int[] ROW_IDS = {
        R.id.widget_row_1, R.id.widget_row_2, R.id.widget_row_3, R.id.widget_row_4
    };

    private static void render(Context context, AppWidgetManager manager, int id, String type) {
        boolean progress = TYPE_PROGRESS.equals(type);
        RemoteViews views = new RemoteViews(context.getPackageName(), progress
                ? R.layout.daymark_widget_progress : R.layout.daymark_widget_tasks);
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context));
        setPalette(context, views, progress);

        JSONArray stored = tasks(context);
        boolean available = stored != null;
        String today = today();
        List<JSONObject> items = new ArrayList<>();
        int openToday = 0, completedToday = 0;
        if (available) {
            for (int i = 0; i < stored.length(); i++) {
                JSONObject task = stored.optJSONObject(i);
                if (task == null) continue;
                boolean done = task.optBoolean("is_complete", false);
                String due = task.optString("due_date", "");
                if ("null".equals(due)) due = "";
                String completedOn = task.optString("completed_on", "");
                if (done && today.equals(completedOn)) completedToday++;
                if (!done && !due.isEmpty() && due.compareTo(today) <= 0) openToday += 1;
                if (progress || done || due.isEmpty()) continue;
                if (TYPE_TODAY.equals(type) && due.compareTo(today) <= 0) items.add(task);
                if (TYPE_UPCOMING.equals(type) && due.compareTo(today) > 0) items.add(task);
            }
        }
        if (progress) {
            int total = openToday + completedToday;
            int percent = total == 0 ? 0 : Math.round(100f * completedToday / total);
            views.setTextViewText(R.id.widget_progress_percent, available ? percent + "%" : "—");
            views.setProgressBar(R.id.widget_progress_bar, 100, percent, false);
            views.setTextViewText(R.id.widget_progress_detail, !available
                    ? "Open Daymark to view progress"
                    : total == 0 ? "Nothing planned for today"
                    : completedToday + " done · " + openToday + " to go");
        } else {
            Collections.sort(items, new Comparator<JSONObject>() {
                @Override public int compare(JSONObject a, JSONObject b) {
                    String ad = a.optString("due_date", "") + a.optString("due_time", "");
                    String bd = b.optString("due_date", "") + b.optString("due_time", "");
                    return ad.compareTo(bd);
                }
            });
            views.setTextViewText(R.id.widget_heading, TYPE_TODAY.equals(type)
                    ? "Today's tasks" : "Upcoming reminders");
            views.setTextViewText(R.id.widget_subheading, !available
                    ? "Unlock Daymark to sync"
                    : items.size() == 1 ? "1 task" : items.size() + " tasks");

            Bundle size = manager.getAppWidgetOptions(id);
            int height = size == null ? 160 : size.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 160);
            int maxRows = height < 145 ? 1 : height < 200 ? 2 : height < 250 ? 3 : 4;
            for (int i = 0; i < ROW_IDS.length; i++) {
                int rowId = ROW_IDS[i];
                if (i >= maxRows || i >= items.size()) {
                    views.setViewVisibility(rowId, View.GONE);
                } else {
                    JSONObject task = items.get(i);
                    String title = task.optString("title", "Untitled").trim();
                    String due = task.optString("due_date", "");
                    String time = task.optString("due_time", "");
                    String label = TYPE_TODAY.equals(type)
                            ? (due.compareTo(today) < 0 ? "Overdue · " : "") + timeDisplay(time)
                            : dayDisplay(due) + (timeDisplay(time).isEmpty() ? "" : " · " + timeDisplay(time));
                    views.setTextViewText(rowId, "○  " + title + (label.isEmpty() ? "" : "  •  " + label));
                    views.setViewVisibility(rowId, View.VISIBLE);
                }
            }
            String empty = !available ? "Open Daymark to sync"
                    : TYPE_TODAY.equals(type) ? "Nothing due today" : "No upcoming tasks";
            views.setTextViewText(R.id.widget_footer, !available || items.isEmpty()
                    ? empty : Math.max(0, items.size() - Math.min(maxRows, ROW_IDS.length))
                    + " more · Open Daymark →");
        }
        manager.updateAppWidget(id, views);
    }
}
