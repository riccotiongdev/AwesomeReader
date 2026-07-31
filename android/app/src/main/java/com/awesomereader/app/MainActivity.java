package com.awesomereader.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NavigationBarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
