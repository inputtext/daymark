package com.piyush.daymark;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
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
import android.view.MotionEvent;

import android.view.View;
import android.view.WindowManager;
import android.view.ViewGroup;

import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Ephemeral, user-enabled, Material Expressive-inspired island.
 *
 * It does NOT control the system status bar or physical camera cutout. In
 * camera-aligned mode it requests a full-screen layout, which Android may
 * restrict; safe mode stays below the status bar. It auto-closes after 14s,
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
    private boolean closing;
    private float swipeStartX;
    private float swipeStartY;
    private GradientDrawable islandShape;
    private ValueAnimator morphAnimator;
    private ValueAnimator entryAnimator;
    private ValueAnimator exitAnimator;
    private TextView islandGlyph;
    private String currentId;
    private String currentTitle;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !ACTION_SHOW.equals(intent.getAction())) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        if (!IslandReminders.enabled(this) || !Settings.canDrawOverlays(this)) {
            IslandReminders.recordOverlay(this,
                    !IslandReminders.enabled(this) ? "Floating Island switched off"
                            : "Display over other apps permission missing");
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
            // Record actual WindowManager success, not merely a service-start
            // request. Helpful when users see only the normal notification.
            IslandReminders.recordOverlay(this, "Floating Island displayed successfully");
        } catch (RuntimeException denied) {
            // The normal reminder notification is independent and remains.
            IslandReminders.recordOverlay(this,
                    "Floating Island failed to display: " + denied.getClass().getSimpleName());
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
            touchFeedback(view, false);
            click.run();
        });
        return button;
    }

    private void showOverlay(String title) {
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (windowManager == null) throw new IllegalStateException("WindowManager unavailable");

        int maxWidth = getResources().getDisplayMetrics().widthPixels - dp(28);
        int compactWidth = Math.min(dp(IslandReminders.placementWidth(this)), maxWidth);
        boolean cameraMode = "camera".equals(IslandReminders.placementMode(this));
        int flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL;
        if (cameraMode) {
            // Best-effort edge-to-edge window coordinates. Android draws its
            // actual status bar above application overlays, so cutout coverage
            // cannot be guaranteed by any ordinary third-party application.
            flags |= WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                    | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
        }
        params = new WindowManager.LayoutParams(
                compactWidth, WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                flags, PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.x = dp(IslandReminders.placementX(this));
        params.y = dp(IslandReminders.placementY(this) + (cameraMode ? 0 : 15));
        if (cameraMode && Build.VERSION.SDK_INT >= 28) {
            params.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        params.windowAnimations = 0; // Our native spring controls motion, not system window animations.

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(17), dp(13), dp(17), dp(13));
        islandShape = rounded(Color.rgb(27, 24, 39), 27);
        root.setBackground(islandShape);
        root.setElevation(dp(13));
        root.setContentDescription("Daymark reminder: " + title);
        root.setClickable(true);
        root.setOnClickListener(view -> {
            if (expanded) collapse();
            else expand();
        });
        // Native touch handling: horizontal swipes dismiss the compact or
        // expanded island; taps retain normal accessibility click behavior.
        root.setOnTouchListener((view, event) -> {
            if (closing) return true;
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    swipeStartX = event.getRawX();
                    swipeStartY = event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE:
                    float dx = event.getRawX() - swipeStartX;
                    float dy = event.getRawY() - swipeStartY;
                    if (Math.abs(dx) > dp(12) && Math.abs(dx) > Math.abs(dy) * 1.25f) {
                        view.setTranslationX(dx * .82f);
                        view.setAlpha(Math.max(.45f, 1f - Math.abs(dx) / dp(320f)));
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                    float travelX = event.getRawX() - swipeStartX;
                    float travelY = event.getRawY() - swipeStartY;
                    if (Math.abs(travelX) > dp(76)
                            && Math.abs(travelX) > Math.abs(travelY) * 1.25f) {
                        touchFeedback(view, false);
                        animateDismiss(travelX >= 0 ? 1 : -1);
                    } else {
                        view.animate().translationX(0).alpha(1f).setDuration(170).start();
                        if (Math.abs(travelX) < dp(12) && Math.abs(travelY) < dp(12))
                            view.performClick();
                    }
                    return true;
                case MotionEvent.ACTION_CANCEL:
                    view.animate().translationX(0).alpha(1f).setDuration(170).start();
                    return true;
                default:
                    return true;
            }
        });

        LinearLayout compact = new LinearLayout(this);
        compact.setOrientation(LinearLayout.HORIZONTAL);
        compact.setGravity(Gravity.CENTER_VERTICAL);

        TextView icon = label("✦", 21, Color.rgb(192, 171, 255), true);
        islandGlyph = icon;
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
        root.setPivotY(0f);
        root.setPivotX(compactWidth * .5f);
        expanded = false;
        closing = false;
        animateEntrance();
        scheduleTimeout();
    }

    private void scheduleTimeout() {
        if (dismissLater != null) handler.removeCallbacks(dismissLater);
        dismissLater = this::dismiss;
        handler.postDelayed(dismissLater, TIMEOUT_MS);
    }

    private void touchFeedback(View view, boolean expanding) {
        String level = IslandReminders.hapticLevel(this);
        if ("off".equals(level)) return;
        int effect;
        if ("subtle".equals(level)) {
            effect = Build.VERSION.SDK_INT >= 34
                    ? HapticFeedbackConstants.SEGMENT_FREQUENT_TICK
                    : HapticFeedbackConstants.CLOCK_TICK;
        } else {
            effect = expanding || "strong".equals(level)
                    ? HapticFeedbackConstants.CONTEXT_CLICK
                    : HapticFeedbackConstants.VIRTUAL_KEY;
        }
        // This honors Android's global touch-feedback setting. No waveform.
        view.performHapticFeedback(effect);
    }

    private IslandMotion.Profile profile() {
        return IslandMotion.forStyle(IslandReminders.motionStyle(this));
    }

    private boolean reduced() {
        return IslandMotion.reduceMotion(this);
    }

    private int maximumWidth() {
        // Keep native overlay content inside its device's usable display,
        // independent of camera cutout shape or phone manufacturer.
        return Math.max(dp(180), getResources().getDisplayMetrics().widthPixels - dp(28));
    }

    private int fitWidth(int width) {
        return Math.min(maximumWidth(), Math.max(dp(180), width));
    }

    private void updateOverlayWidth(int width) {
        if (root == null || params == null || windowManager == null) return;
        int fitted = fitWidth(width);
        if (params.width == fitted) return;
        params.width = fitted;
        try { windowManager.updateViewLayout(root, params); }
        catch (IllegalArgumentException ignored) { /* already dismissed */ }
    }

    private int measureDetails(int width) {
        if (expandedDetails == null || root == null) return 0;
        ViewGroup.LayoutParams layout = expandedDetails.getLayoutParams();
        int original = layout.height;
        layout.height = ViewGroup.LayoutParams.WRAP_CONTENT;
        expandedDetails.setLayoutParams(layout);
        int contentWidth = Math.max(dp(120),
                fitWidth(width) - root.getPaddingLeft() - root.getPaddingRight());
        expandedDetails.measure(
                View.MeasureSpec.makeMeasureSpec(contentWidth, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED));
        int measured = expandedDetails.getMeasuredHeight();
        layout.height = original;
        expandedDetails.setLayoutParams(layout);
        return measured;
    }

    private void detailsHeight(int height) {
        if (expandedDetails == null) return;
        ViewGroup.LayoutParams layout = expandedDetails.getLayoutParams();
        int next = Math.max(0, height);
        if (layout.height == next) return;
        layout.height = next;
        expandedDetails.setLayoutParams(layout);
    }

    private void animateEntrance() {
        if (root == null) return;
        final IslandMotion.Profile motion = profile();
        if (entryAnimator != null) entryAnimator.cancel();
        if (reduced()) {
            root.setScaleX(1f);
            root.setScaleY(1f);
            root.setAlpha(1f);
            root.setTranslationY(0f);
            return;
        }
        root.setAlpha(0f);
        root.setScaleX(motion.openingX);
        root.setScaleY(motion.openingY);
        root.setTranslationY(-dp(9));
        final float radiusStart = dp(motion.openingRadius);
        final float radiusEnd = dp(27);
        islandShape.setCornerRadius(radiusStart);
        if (islandGlyph != null) islandGlyph.setRotation(-18f);
        entryAnimator = ValueAnimator.ofFloat(0f, 1f);
        entryAnimator.setDuration(motion.appearMs);
        entryAnimator.addUpdateListener(animation -> {
            if (root == null || islandShape == null) return;
            float t = (float) animation.getAnimatedValue();
            float spring = IslandMotion.spring(t, motion);
            root.setScaleX(motion.openingX + (1f - motion.openingX) * spring);
            root.setScaleY(motion.openingY + (1f - motion.openingY) * spring);
            root.setAlpha(IslandMotion.clamp(t * 3.3f, 0f, 1f));
            root.setTranslationY(-dp(9) * (1f - spring));
            islandShape.setCornerRadius(Math.max(dp(12),
                    radiusStart + (radiusEnd - radiusStart) * spring));
            if (islandGlyph != null) islandGlyph.setRotation(-18f * (1f - spring));
        });
        entryAnimator.addListener(new AnimatorListenerAdapter() {
            boolean canceled;
            @Override public void onAnimationCancel(Animator animation) { canceled = true; }
            @Override public void onAnimationEnd(Animator animation) {
                if (canceled || root == null || closing) return;
                root.setScaleX(1f);
                root.setScaleY(1f);
                root.setAlpha(1f);
                root.setTranslationY(0f);
                if (islandShape != null) islandShape.setCornerRadius(dp(27));
                if (islandGlyph != null) islandGlyph.setRotation(0f);
            }
        });
        entryAnimator.start();
    }

    private void animateMorph(int targetWidth, int targetRadius, boolean opening) {
        if (root == null || windowManager == null || params == null
                || expandedDetails == null || islandShape == null) return;
        if (entryAnimator != null) {
            entryAnimator.cancel();
            entryAnimator = null;
            // Settle entrance before starting the next spring, so transforms
            // never stack and unexpectedly shrink the tap targets.
            root.setScaleX(1f);
            root.setScaleY(1f);
            root.setAlpha(1f);
            root.setTranslationY(0f);
            if (islandGlyph != null) islandGlyph.setRotation(0f);
        }
        if (morphAnimator != null) morphAnimator.cancel();

        final IslandMotion.Profile motion = profile();
        final int widthTo = fitWidth(targetWidth);
        final int widthFrom = params.width;
        final float radiusFrom = islandShape.getCornerRadius();
        final float radiusTo = dp(targetRadius);
        final boolean wasVisible = expandedDetails.getVisibility() == View.VISIBLE;
        final int fromHeight = wasVisible ? Math.max(0, expandedDetails.getHeight()) : 0;
        final float fromAlpha = wasVisible ? expandedDetails.getAlpha() : 0f;

        if (opening) expandedDetails.setVisibility(View.VISIBLE);
        int targetHeight = opening ? measureDetails(widthTo) : 0;

        if (reduced()) {
            expandedDetails.setAlpha(opening ? 1f : 0f);
            if (opening) {
                expandedDetails.getLayoutParams().height = ViewGroup.LayoutParams.WRAP_CONTENT;
                expandedDetails.setLayoutParams(expandedDetails.getLayoutParams());
            } else {
                detailsHeight(0);
                expandedDetails.setVisibility(View.GONE);
            }
            islandShape.setCornerRadius(radiusTo);
            updateOverlayWidth(widthTo);
            root.setScaleX(1f);
            root.setScaleY(1f);
            return;
        }

        detailsHeight(fromHeight);
        morphAnimator = ValueAnimator.ofFloat(0f, 1f);
        morphAnimator.setDuration(opening ? motion.expandMs : motion.collapseMs);
        morphAnimator.addUpdateListener(animation -> {
            if (root == null || expandedDetails == null || islandShape == null) return;
            float t = (float) animation.getAnimatedValue();
            float spring = IslandMotion.spring(t, motion);
            int width = Math.round(widthFrom + (widthTo - widthFrom) * spring);
            updateOverlayWidth(width);
            islandShape.setCornerRadius(Math.max(dp(12),
                    radiusFrom + (radiusTo - radiusFrom) * spring));
            int height = Math.round(fromHeight + (targetHeight - fromHeight) * spring);
            detailsHeight(Math.max(0, height));
            // The fruit-like profile briefly changes aspect ratio during
            // expansion before releasing back into a balanced pill.
            float squash = motion.squash * (float) Math.sin(Math.PI * t);
            root.setScaleX(1f + squash * (opening ? 1f : -.6f));
            root.setScaleY(1f - squash * (opening ? .75f : -.4f));
            expandedDetails.setAlpha(IslandMotion.clamp(
                    fromAlpha + ((opening ? 1f : 0f) - fromAlpha)
                            * IslandMotion.clamp(spring, 0f, 1f), 0f, 1f));
            expandedDetails.setTranslationY(-dp(9) * (1f - IslandMotion.clamp(spring, 0f, 1f))
                    * (opening ? 1f : -1f));
            if (islandGlyph != null) islandGlyph.setRotation((opening ? 9f : -9f)
                    * (float) Math.sin(Math.PI * t));
        });
        morphAnimator.addListener(new AnimatorListenerAdapter() {
            boolean canceled;
            @Override public void onAnimationCancel(Animator animation) { canceled = true; }
            @Override public void onAnimationEnd(Animator animation) {
                if (canceled || root == null || closing || expandedDetails == null) return;
                updateOverlayWidth(widthTo);
                if (islandShape != null) islandShape.setCornerRadius(radiusTo);
                root.setScaleX(1f);
                root.setScaleY(1f);
                if (islandGlyph != null) islandGlyph.setRotation(0f);
                expandedDetails.setTranslationY(0f);
                expandedDetails.setAlpha(opening ? 1f : 0f);
                if (opening) {
                    ViewGroup.LayoutParams layout = expandedDetails.getLayoutParams();
                    layout.height = ViewGroup.LayoutParams.WRAP_CONTENT;
                    expandedDetails.setLayoutParams(layout);
                } else {
                    detailsHeight(0);
                    expandedDetails.setVisibility(View.GONE);
                }
            }
        });
        morphAnimator.start();
    }

    private void expand() {
        if (expanded || closing || root == null || windowManager == null) return;
        expanded = true;
        touchFeedback(root, true);
        int target = fitWidth(dp(Math.max(346, IslandReminders.placementWidth(this) + 36)));
        animateMorph(target, 22, true);
        scheduleTimeout();
    }

    private void collapse() {
        if (!expanded || closing || root == null || windowManager == null) return;
        expanded = false;
        touchFeedback(root, false);
        int compactWidth = fitWidth(dp(IslandReminders.placementWidth(this)));
        animateMorph(compactWidth, 27, false);
        scheduleTimeout();
    }

    private void animateExit(int direction) {
        if (closing || root == null) return;
        closing = true;
        if (dismissLater != null) handler.removeCallbacks(dismissLater);
        dismissLater = null;
        if (entryAnimator != null) entryAnimator.cancel();
        if (morphAnimator != null) morphAnimator.cancel();
        if (exitAnimator != null) exitAnimator.cancel();
        if (reduced()) { stopSelf(); return; }

        final LinearLayout view = root;
        final IslandMotion.Profile motion = profile();
        final float fromX = view.getTranslationX();
        final float fromY = view.getTranslationY();
        final float fromAlpha = view.getAlpha();
        final float fromScaleX = view.getScaleX();
        final float fromScaleY = view.getScaleY();
        final float offset = direction == 0 ? 0f : dp(420) * direction;
        exitAnimator = ValueAnimator.ofFloat(0f, 1f);
        exitAnimator.setDuration(motion.exitMs);
        exitAnimator.addUpdateListener(animation -> {
            if (root != view) return;
            float t = (float) animation.getAnimatedValue();
            float smooth = t*t*(3f-2f*t);
            view.setAlpha(IslandMotion.clamp(fromAlpha * (1f-smooth*1.35f),0f,1f));
            view.setScaleX(fromScaleX + (.78f - fromScaleX)*smooth);
            view.setScaleY(fromScaleY + (.65f - fromScaleY)*smooth);
            view.setTranslationX(fromX + offset*smooth);
            view.setTranslationY(fromY - (direction == 0 ? dp(13)*smooth : 0f));
        });
        exitAnimator.addListener(new AnimatorListenerAdapter() {
            boolean canceled;
            @Override public void onAnimationCancel(Animator animation) { canceled = true; }
            @Override public void onAnimationEnd(Animator animation) {
                if (!canceled && root == view) stopSelf();
            }
        });
        exitAnimator.start();
    }

    private void animateDismiss(int direction) {
        animateExit(direction);
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

    private void dismiss() { animateExit(0); }

    private void removeOverlay() {
        if (morphAnimator != null) {
            morphAnimator.cancel();
            morphAnimator = null;
        }
        if (entryAnimator != null) {
            entryAnimator.cancel();
            entryAnimator = null;
        }
        if (exitAnimator != null) {
            exitAnimator.cancel();
            exitAnimator = null;
        }
        if (root != null) root.animate().cancel();
        if (expandedDetails != null) expandedDetails.animate().cancel();
        if (dismissLater != null) handler.removeCallbacks(dismissLater);
        dismissLater = null;
        if (root != null && windowManager != null) {
            try { windowManager.removeViewImmediate(root); }
            catch (RuntimeException ignored) { /* already removed by Android */ }
        }
        root = null;
        expandedDetails = null;
        islandShape = null;
        islandGlyph = null;
        expanded = false;
        closing = false;
    }

    @Override public void onDestroy() {
        removeOverlay();
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
