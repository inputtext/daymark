package com.piyush.daymark;

import android.animation.ValueAnimator;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.OvershootInterpolator;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Ephemeral, user-enabled, Material Expressive-inspired island.
 *
 * It does NOT impersonate the status bar or obstruct the camera cutout. It is
 * always a touchable window BELOW Android system bars, auto-closes after 14s,
 * has an accessible dismiss button and never requests accessibility access.
 * A brief specialUse FGS keeps the overlay alive while visible; background
 * starts can still be denied on Android 15/16.
 */
public class DaymarkIslandService extends Service {
    public static final String ACTION_SHOW = "com.piyush.daymark.island.SHOW";
    private static final int FOREGROUND_ID = 810042;
    private static final long TIMEOUT_MS = 14_000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private LinearLayout root;
    private LinearLayout expandedDetails;
    private Runnable dismissLater;
    private boolean expanded;
    private String currentId;
    private String currentTitle;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !ACTION_SHOW.equals(intent.getAction())) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        if (!IslandReminders.enabled(this) || !Settings.canDrawOverlays(this)) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        String id = intent.getStringExtra("id");
        try { currentId = IslandReminders.cleanId(id); }
        catch (IllegalArgumentException invalid) { stopSelf(startId); return START_NOT_STICKY; }
        currentTitle = IslandReminders.cleanTitle(intent.getStringExtra("title"));
        try {
            startForegroundNotification(currentId, currentTitle);
            removeOverlay();
            showOverlay(currentTitle);
        } catch (RuntimeException denied) {
            // Runtime overlay/FGS restrictions are not fatal; the receiver posts
            // the standard reminder notification independently.
            stopSelf(startId);
        }
        return START_NOT_STICKY;
    }

    private void startForegroundNotification(String id, String title) {
        IslandReminders.ensureChannels(this);
        Notification notification = IslandReminders.notification(this, IslandReminders.CHANNEL_OVERLAY)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle("Daymark Island is showing")
                .setContentText(title)
                .setContentIntent(IslandReminders.openApp(this, id))
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setPriority(Notification.PRIORITY_LOW)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .build();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(FOREGROUND_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(FOREGROUND_ID, notification);
        }
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private GradientDrawable rounded(int background, int radius) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(background);
        shape.setCornerRadius(dp(radius));
        return shape;
    }

    private TextView label(String text, int sp, int color, boolean bold) {
        TextView value = new TextView(this);
        value.setText(text);
        value.setTextSize(sp);
        value.setTextColor(color);
        value.setGravity(Gravity.CENTER_VERTICAL);
        value.setMaxLines(1);
        value.setEllipsize(TextUtils.TruncateAt.END);
        if (bold) value.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return value;
    }

    private TextView action(String text, int background, int color, Runnable click) {
        TextView button = label(text, 13, color, true);
        button.setGravity(Gravity.CENTER);
        button.setBackground(rounded(background, 17));
        button.setMinHeight(dp(48));
        button.setPadding(dp(15), dp(10), dp(15), dp(10));
        button.setClickable(true);
        button.setContentDescription(text);
        button.setOnClickListener(view -> {
            view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            click.run();
        });
        return button;
    }

    private void showOverlay(String title) {
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (windowManager == null) throw new IllegalStateException("WindowManager unavailable");

        int maxWidth = getResources().getDisplayMetrics().widthPixels - dp(28);
        int compactWidth = Math.min(dp(280), maxWidth);
        params = new WindowManager.LayoutParams(
                compactWidth, WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.y = dp(15); // Overlay area starts below the actual system bar.
        params.windowAnimations = 0;

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(17), dp(13), dp(17), dp(13));
        root.setBackground(rounded(Color.rgb(27, 24, 39), 27));
        root.setElevation(dp(13));
        root.setContentDescription("Daymark reminder: " + title);
        root.setClickable(true);
        root.setOnClickListener(view -> expand());

        LinearLayout compact = new LinearLayout(this);
        compact.setOrientation(LinearLayout.HORIZONTAL);
        compact.setGravity(Gravity.CENTER_VERTICAL);

        TextView icon = label("✦", 21, Color.rgb(192, 171, 255), true);
        icon.setGravity(Gravity.CENTER);
        icon.setBackground(rounded(Color.rgb(56, 46, 80), 13));
        compact.addView(icon, new LinearLayout.LayoutParams(dp(40), dp(40)));

        LinearLayout text = new LinearLayout(this);
        text.setOrientation(LinearLayout.VERTICAL);
        text.setPadding(dp(11), 0, 0, 0);
        TextView kicker = label("DAYMARK  ·  REMINDER", 9, Color.rgb(183, 164, 232), true);
        TextView taskTitle = label(title, 14, Color.WHITE, true);
        text.addView(kicker);
        text.addView(taskTitle);
        compact.addView(text, new LinearLayout.LayoutParams(0, WindowManager.LayoutParams.WRAP_CONTENT, 1));
        root.addView(compact);

        expandedDetails = new LinearLayout(this);
        expandedDetails.setOrientation(LinearLayout.VERTICAL);
        expandedDetails.setVisibility(View.GONE);
        expandedDetails.setPadding(0, dp(13), 0, 0);

        TextView details = label("A little reminder to keep moving ✨", 12,
                Color.rgb(199, 196, 215), false);
        details.setPadding(dp(3), 0, 0, dp(12));
        expandedDetails.addView(details);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        TextView snooze = action("Snooze 10m", Color.rgb(70, 65, 88),
                Color.WHITE, this::snooze);
        TextView open = action("Open task", Color.rgb(191, 169, 255),
                Color.rgb(34, 24, 49), this::openDaymark);
        LinearLayout.LayoutParams first = new LinearLayout.LayoutParams(0, dp(48), 1);
        first.rightMargin = dp(8);
        actions.addView(snooze, first);
        actions.addView(open, new LinearLayout.LayoutParams(0, dp(48), 1));
        expandedDetails.addView(actions);

        TextView dismiss = action("Dismiss  ×", Color.TRANSPARENT,
                Color.rgb(199, 196, 215), this::dismiss);
        LinearLayout.LayoutParams dismissParams = new LinearLayout.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT, dp(44));
        dismissParams.topMargin = dp(2);
        expandedDetails.addView(dismiss, dismissParams);
        root.addView(expandedDetails);

        windowManager.addView(root, params);
        root.setScaleX(.93f);
        root.setScaleY(.93f);
        root.setAlpha(0f);
        root.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(260)
                .setInterpolator(new OvershootInterpolator(.7f)).start();
        expanded = false;
        scheduleTimeout();
    }

    private void scheduleTimeout() {
        if (dismissLater != null) handler.removeCallbacks(dismissLater);
        dismissLater = this::dismiss;
        handler.postDelayed(dismissLater, TIMEOUT_MS);
    }

    private void expand() {
        if (expanded || root == null || windowManager == null) return;
        expanded = true;
        root.performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK);
        expandedDetails.setVisibility(View.VISIBLE);
        expandedDetails.setAlpha(0f);
        expandedDetails.animate().alpha(1f).setDuration(210).start();
        final int from = params.width;
        final int to = Math.min(dp(346),
                getResources().getDisplayMetrics().widthPixels - dp(28));
        ValueAnimator spring = ValueAnimator.ofInt(from, to);
        spring.setDuration(290);
        spring.setInterpolator(new OvershootInterpolator(.65f));
        spring.addUpdateListener(value -> {
            if (root != null && windowManager != null) {
                params.width = (int) value.getAnimatedValue();
                try { windowManager.updateViewLayout(root, params); }
                catch (IllegalArgumentException ignored) { /* window was dismissed */ }
            }
        });
        spring.start();
        scheduleTimeout();
    }

    private void snooze() {
        try {
            IslandReminders.schedule(this, currentId, currentTitle,
                    System.currentTimeMillis() + 600_000L);
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) manager.cancel(IslandReminders.notificationId(currentId));
        } catch (Exception ignored) { /* scheduling errors must not keep overlay on screen */ }
        dismiss();
    }

    private void openDaymark() {
        Intent open = new Intent(this, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("daymark_reminder_id", currentId);
        try { startActivity(open); }
        catch (RuntimeException restricted) { /* Android may forbid background launch */ }
        dismiss();
    }

    private void dismiss() { stopSelf(); }

    private void removeOverlay() {
        if (dismissLater != null) handler.removeCallbacks(dismissLater);
        dismissLater = null;
        if (root != null && windowManager != null) {
            try { windowManager.removeViewImmediate(root); }
            catch (RuntimeException ignored) { /* already removed by Android */ }
        }
        root = null;
        expandedDetails = null;
    }

    @Override public void onDestroy() {
        removeOverlay();
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
