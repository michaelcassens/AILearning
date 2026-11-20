import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

// Tap the watch face to switch palettes on the watch itself.
// This works even when the app was sideloaded and its settings do not show in the phone app.
class TrailheadDelegate extends WatchUi.WatchFaceDelegate {

    function initialize() {
        WatchFaceDelegate.initialize();
    }

    function onPress(clickEvent as WatchUi.ClickEvent) as Boolean {
        var idx = Application.Properties.getValue("Palette");
        if (idx == null || !(idx instanceof Number)) {
            idx = 0;
        }
        var next = (idx + 1) % PALETTES.size();
        Application.Properties.setValue("Palette", next);
        WatchUi.requestUpdate();
        return true;
    }
}
