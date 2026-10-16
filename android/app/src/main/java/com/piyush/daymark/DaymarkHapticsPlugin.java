package com.piyush.daymark;

import android.Manifest;
import android.content.Context;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.HapticFeedbackConstants;
import android.view.View;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pixel-first touch haptics: let Android / OEM tune the actuator.
 *
 * View.performHapticFeedback honors system touch settings without permission.
 * Only strong, deliberate actions optionally use an OEM-optimized, predefined
 * HEAVY_CLICK if the vibrator explicitly reports native support. No timed
 * on/off waveforms, one-shots, or synthetic double buzz patterns.
 */
@CapacitorPlugin(name = "DaymarkHaptics")
public class DaymarkHapticsPlugin extends Plugin {
    private static final long MIN_INTERVAL_MS = 55L;
    private long lastPlayed = 0L;

    @PluginMethod
    public void play(PluginCall call) {
        final String kind = call.getString("kind", "selection");
        final String level = call.getString("level", "balanced");

        getActivity().runOnUiThread(() -> {
            boolean played = perform(kind, level);
            JSObject result = new JSObject();
            result.put("played", played);
            call.resolve(result);
        });
    }

    private boolean perform(String kind, String level) {
        if ("off".equals(level) || !getActivity().hasWindowFocus()) return false;

        // Also protect strong-mode Vibrator calls; those do not automatically
        // follow View.performHapticFeedback's global touch setting.
        if (Settings.System.getInt(getContext().getContentResolver(),
                Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) == 0) return false;

        final View target = getBridge().getWebView();
        if (target == null || !target.isAttachedToWindow() || !target.isHapticFeedbackEnabled()) return false;

        long now = SystemClock.uptimeMillis();
        if (now - lastPlayed < MIN_INTERVAL_MS) return false;

        boolean played = false;
        if ("strong".equals(level) && isImportant(kind)) {
            played = strongTunedClick();
        }
        if (!played) {
            int code = feedbackConstant(kind, level);
            played = target.performHapticFeedback(code);
        }
        if (played) lastPlayed = now;
        return played;
    }

    private static boolean isImportant(String kind) {
        return "action".equals(kind) || "success".equals(kind) || "complete".equals(kind);
    }

    /**
     * Do not play a generic heavy vibration if the OEM did not explicitly
     * implement this effect. Silent or system feedback is better than buzz.
     */
    private boolean strongTunedClick() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return false;
        try {
            Vibrator vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return false;
            if (vibrator.areEffectsSupported(VibrationEffect.EFFECT_HEAVY_CLICK)
                    != Vibrator.VIBRATION_EFFECT_SUPPORT_YES) return false;

            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            vibrator.vibrate(
                    VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK),
                    attrs);
            return true;
        } catch (SecurityException | IllegalArgumentException ex) {
            return false;
        }
    }

    private static int feedbackConstant(String kind, String level) {
        boolean subtle = "subtle".equals(level);
        boolean strong = "strong".equals(level);
        boolean modern = Build.VERSION.SDK_INT >= 34;

        switch (kind) {
            case "selection":
                if (modern) return subtle
                        ? HapticFeedbackConstants.SEGMENT_FREQUENT_TICK
                        : strong ? HapticFeedbackConstants.VIRTUAL_KEY
                                 : HapticFeedbackConstants.SEGMENT_TICK;
                return subtle ? HapticFeedbackConstants.CLOCK_TICK : HapticFeedbackConstants.VIRTUAL_KEY;

            case "action":
                if (subtle) return modern ? HapticFeedbackConstants.SEGMENT_TICK : HapticFeedbackConstants.CLOCK_TICK;
                return strong ? HapticFeedbackConstants.CONTEXT_CLICK : HapticFeedbackConstants.VIRTUAL_KEY;

            case "success":
            case "complete":
                if (subtle) return modern ? HapticFeedbackConstants.TOGGLE_ON : HapticFeedbackConstants.VIRTUAL_KEY;
                return Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.CONTEXT_CLICK;

            case "warning":
                return subtle ? HapticFeedbackConstants.CLOCK_TICK : HapticFeedbackConstants.CONTEXT_CLICK;

            case "error":
                return Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS;

            default:
                return subtle && modern ? HapticFeedbackConstants.SEGMENT_FREQUENT_TICK
                        : HapticFeedbackConstants.VIRTUAL_KEY;
        }
    }
}
