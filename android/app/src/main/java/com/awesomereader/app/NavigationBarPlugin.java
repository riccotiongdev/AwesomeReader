package com.awesomereader.app;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NavigationBar")
public class NavigationBarPlugin extends Plugin {
    @PluginMethod
    public void setColor(PluginCall call) {
        String colorHex = call.getString("color", "#000000");
        Boolean darkButtons = call.getBoolean("darkButtons", false);

        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Window window = getActivity().getWindow();
                try {
                    window.setNavigationBarColor(Color.parseColor(colorHex));

                    View decorView = window.getDecorView();
                    int flags = decorView.getSystemUiVisibility();
                    if (darkButtons != null && darkButtons) {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    } else {
                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                    decorView.setSystemUiVisibility(flags);

                    call.resolve();
                } catch (Exception e) {
                    call.reject("Failed to set navigation bar color: " + e.getMessage());
                }
            } else {
                call.resolve();
            }
        });
    }
}
