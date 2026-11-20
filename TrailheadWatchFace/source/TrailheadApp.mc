import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

class TrailheadApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [new TrailheadView(), new TrailheadDelegate()];
    }

    // Called when the palette is changed in Garmin Connect / Connect IQ settings.
    function onSettingsChanged() as Void {
        WatchUi.requestUpdate();
    }
}
