package com.piyush.daymark;

import android.animation.ValueAnimator;
import android.content.Context;
import android.os.Build;
import android.provider.Settings;

/**
 * Damped-harmonic-oscillator motion curves used by the native floating
 * WindowManager Island. There are no animation libraries or background loops.
 *
 * Natural frequency and damping ratio describe the actual underdamped spring:
 * x(t) = 1 - exp(-zeta*w*t) * [cos(wd*t) + zeta/sqrt(1-zeta^2)*sin(wd*t)].
 * Endpoints snap to exact values to avoid accumulated overlay layout drift.
 */
final class IslandMotion {
    static final String SPRING = "spring";
    static final String BLOOM = "bloom";
    static final String ELASTIC = "elastic";
    static final String GLIDE = "glide";

    private IslandMotion() {}

    static String validate(String style) {
        if (!SPRING.equals(style) && !BLOOM.equals(style)
                && !ELASTIC.equals(style) && !GLIDE.equals(style))
            throw new IllegalArgumentException("Unknown Island motion style");
        return style;
    }

    static final class Profile {
        final int appearMs;
        final int expandMs;
        final int collapseMs;
        final int exitMs;
        final float damping;
        final float frequency;
        final float openingX;
        final float openingY;
        final float squash;
        final int openingRadius;
        Profile(int appearMs, int expandMs, int collapseMs, int exitMs,
                float damping, float frequency, float openingX, float openingY,
                float squash, int openingRadius) {
            this.appearMs = appearMs;
            this.expandMs = expandMs;
            this.collapseMs = collapseMs;
            this.exitMs = exitMs;
            this.damping = damping;
            this.frequency = frequency;
            this.openingX = openingX;
            this.openingY = openingY;
            this.squash = squash;
            this.openingRadius = openingRadius;
        }
    }

    static Profile forStyle(String style) {
        switch (validate(style)) {
            case BLOOM:
                // Rounded fruit bud unfurls, with a little squish and rebound.
                return new Profile(570, 600, 450, 305, .38f, 13.2f,
                        .67f, .53f, .060f, 42);
            case ELASTIC:
                // High-energy, playful pop with two gently decaying rebounds.
                return new Profile(510, 555, 400, 280, .27f, 17.5f,
                        .80f, .68f, .038f, 34);
            case GLIDE:
                // Almost critically damped; calm, smooth and discreet.
                return new Profile(320, 365, 295, 220, .86f, 14.5f,
                        .93f, .84f, .012f, 30);
            default:
                // Balanced default, suitable for the broadest range of devices.
                return new Profile(440, 475, 360, 250, .59f, 15f,
                        .84f, .76f, .027f, 33);
        }
    }

    static float spring(float t, Profile profile) {
        if (t <= 0f) return 0f;
        if (t >= 1f) return 1f;
        double z = Math.max(.01d, Math.min(.98d, profile.damping));
        double w = profile.frequency;
        double wd = w * Math.sqrt(1d - z*z);
        double value = 1d - Math.exp(-z*w*t)
                * (Math.cos(wd*t) + z / Math.sqrt(1d-z*z) * Math.sin(wd*t));
        return (float) value;
    }

    static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    static boolean reduceMotion(Context context) {
        if (IslandReminders.motionReduced(context)) return true;
        // Respects Android system animation / accessibility preferences.
        if (Build.VERSION.SDK_INT >= 26) return !ValueAnimator.areAnimatorsEnabled();
        try {
            return Settings.Global.getFloat(context.getContentResolver(),
                    Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f;
        } catch (RuntimeException denied) {
            return false;
        }
    }
}
