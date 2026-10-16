package com.piyush.daymark;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DaymarkHapticsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
