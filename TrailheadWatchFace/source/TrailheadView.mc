import Toybox.Activity;
import Toybox.ActivityMonitor;
import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.SensorHistory;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Weather;
import Toybox.WatchUi;

// Trailhead: digital + analog mountain biking face for Fenix 8 Pro (454 x 454 AMOLED).
// All coordinates below are authored on a 454 x 454 grid and scaled to the real screen.

// Palette order: bg, glow, far ridge, mid ridge, lit peak face, shade peak face,
//                near ridge/trees, text, muted text, accent, trail, snow
const PALETTES = [
    // 0: Stone and Larch
    [0x1A1917, 0x52493B, 0x3A3731, 0x4D483F, 0x8C8270, 0x5D5649, 0x22201D, 0xECE6D8, 0xA39A89, 0xC8B48F, 0xEADFC8, 0xD9CFBB],
    // 1: Maroon and Silver
    [0x161214, 0x432830, 0x2D2427, 0x472D34, 0xA2A0A5, 0x6A2D38, 0x1D1517, 0xECE8E8, 0xA8A0A2, 0x9A4452, 0xE0DDE0, 0xCFCDD2]
];

class TrailheadView extends WatchUi.WatchFace {

    private var _s as Float = 1.0;
    private var _sleeping as Boolean = false;

    private var _far as Array = [];
    private var _mid as Array = [];
    private var _near as Array = [];
    private var _trees as Array = [];

    private var _fTime = Graphics.FONT_NUMBER_HOT;
    private var _fAmpm = Graphics.FONT_SMALL;
    private var _fData = Graphics.FONT_MEDIUM;
    private var _fUnit = Graphics.FONT_XTINY;
    private var _fDate = Graphics.FONT_XTINY;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc as Dc) as Void {
        _s = dc.getWidth() / 454.0;

        if (Graphics has :getVectorFont) {
            var face = ["RobotoCondensedBold", "RobotoCondensedRegular", "RobotoRegular"];
            var fTime = Graphics.getVectorFont({:face => face, :size => px(140)});
            var fAmpm = Graphics.getVectorFont({:face => face, :size => px(34)});
            var fData = Graphics.getVectorFont({:face => face, :size => px(38)});
            var fUnit = Graphics.getVectorFont({:face => face, :size => px(23)});
            var fDate = Graphics.getVectorFont({:face => face, :size => px(21)});
            if (fTime != null) { _fTime = fTime; }
            if (fAmpm != null) { _fAmpm = fAmpm; }
            if (fData != null) { _fData = fData; }
            if (fUnit != null) { _fUnit = fUnit; }
            if (fDate != null) { _fDate = fDate; }
        }

        _far = ridge(1.2, 300.0, 70.0);
        _mid = ridge(3.7, 322.0, 46.0);
        _near = ridge(5.1, 352.0, 8.0);

        // Larch silhouettes along the near ridge.
        _trees = [];
        var xs = [360, 380, 398, 418];
        for (var i = 0; i < xs.size(); i++) {
            var h = 24.0 + 16.0 * Math.sin(i * 2.1 + 0.6).abs();
            var w = h * 0.16;
            var x = xs[i];
            _trees.add([pt(x - w, 352), pt(x, 352.0 - h), pt(x + w, 352), pt(x, 352)]);
        }
    }

    function onEnterSleep() as Void {
        _sleeping = true;
        WatchUi.requestUpdate();
    }

    function onExitSleep() as Void {
        _sleeping = false;
        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Dc) as Void {
        var idx = Application.Properties.getValue("Palette");
        if (idx == null || !(idx instanceof Number) || idx < 0 || idx >= PALETTES.size()) {
            idx = 0;
        }
        var p = PALETTES[idx] as Array;

        var clock = System.getClockTime();
        var h12 = clock.hour % 12;
        if (h12 == 0) { h12 = 12; }
        var timeStr = Lang.format("$1$:$2$", [h12.format("%02d"), clock.min.format("%02d")]);
        var ampm = clock.hour < 12 ? "AM" : "PM";

        if (_sleeping) {
            drawSleep(dc, p, clock, timeStr);
            return;
        }

        dc.setColor(p[0], p[0]);
        dc.clear();
        drawScene(dc, p);
        drawBezel(dc, p);
        drawTime(dc, p, timeStr, ampm);
        drawData(dc, p);
    }

    // ---------------------------------------------------------------- helpers

    private function px(v as Numeric) as Number {
        return (v * _s).toNumber();
    }

    private function pt(x as Numeric, y as Numeric) as Array {
        return [px(x), px(y)];
    }

    private function poly(flat as Array) as Array {
        var out = [];
        for (var i = 0; i < flat.size(); i += 2) {
            out.add(pt(flat[i], flat[i + 1]));
        }
        return out;
    }

    private function ridge(seed as Float, base as Float, amp as Float) as Array {
        var pts = [];
        for (var x = 0; x <= 456; x += 6) {
            var n = 0.55 * (1.0 - Math.sin(x * 0.012 + seed).abs())
                + 0.3 * Math.sin(x * 0.031 + seed * 2.3)
                + 0.15 * Math.sin(x * 0.067 + seed * 4.1);
            pts.add(pt(x, base - amp * n));
        }
        pts.add(pt(456, 454));
        pts.add(pt(0, 454));
        return pts;
    }

    private function lerpColor(a as Number, b as Number, t as Float) as Number {
        var ar = (a >> 16) & 0xFF; var ag = (a >> 8) & 0xFF; var ab = a & 0xFF;
        var br = (b >> 16) & 0xFF; var bg = (b >> 8) & 0xFF; var bb = b & 0xFF;
        var r = (ar + (br - ar) * t).toNumber();
        var g = (ag + (bg - ag) * t).toNumber();
        var bl = (ab + (bb - ab) * t).toNumber();
        return (r << 16) | (g << 8) | bl;
    }

    // Text with a 2px outline in the background color so it reads over the hands.
    private function drawOutlined(dc as Dc, x as Number, y as Number, text as String, font, color as Number, edge as Number, just as Number) as Void {
        var o = px(2);
        dc.setColor(edge, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x - o, y - o, font, text, just);
        dc.drawText(x + o, y - o, font, text, just);
        dc.drawText(x - o, y + o, font, text, just);
        dc.drawText(x + o, y + o, font, text, just);
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, font, text, just);
    }

    // ------------------------------------------------------------------ scene

    private function drawScene(dc as Dc, p as Array) as Void {
        // Horizon glow: stacked circles stepping from background to glow color.
        for (var i = 0; i < 7; i++) {
            var t = i / 6.0;
            dc.setColor(lerpColor(p[0], p[1], t), Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(px(227), px(280), px(230 - i * 30));
        }

        dc.setColor(p[2], Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon(_far);
        dc.setColor(p[3], Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon(_mid);

        // Main peak: lit face (left) and shade face (right).
        dc.setColor(p[4], Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon(poly([228, 348, 300, 262, 322, 246, 345, 214, 338, 300, 338, 348]));
        dc.setColor(p[5], Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon(poly([345, 214, 372, 252, 395, 266, 430, 310, 454, 330, 454, 348, 338, 348, 338, 300]));
        dc.setColor(p[11], Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon(poly([345, 214, 333, 234, 341, 230, 346, 240, 353, 229, 360, 236]));

        // Switchback trail (dashed) with a summit flag.
        var trail = [270, 336, 326, 320, 292, 306, 328, 292, 304, 278, 330, 264, 337, 248];
        dc.setColor(p[10], Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(px(2) < 2 ? 2 : px(2));
        for (var i = 0; i + 3 < trail.size(); i += 2) {
            dashedLine(dc, trail[i], trail[i + 1], trail[i + 2], trail[i + 3]);
        }
        dc.setPenWidth(1);
        dc.setColor(p[9], Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon(poly([337, 248, 337, 234, 347, 239, 337, 244]));

        // Foreground ridge and larches.
        dc.setColor(p[6], Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon(_near);
        for (var i = 0; i < _trees.size(); i++) {
            dc.fillPolygon(_trees[i] as Array);
        }
        dc.fillRectangle(0, px(350), dc.getWidth(), dc.getHeight() - px(350));
    }

    private function dashedLine(dc as Dc, x1 as Numeric, y1 as Numeric, x2 as Numeric, y2 as Numeric) as Void {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var len = Math.sqrt(dx * dx + dy * dy);
        var dash = 5.0;
        var gap = 4.0;
        var d = 0.0;
        while (d < len) {
            var e = d + dash;
            if (e > len) { e = len; }
            dc.drawLine(px(x1 + dx * d / len), px(y1 + dy * d / len), px(x1 + dx * e / len), px(y1 + dy * e / len));
            d += dash + gap;
        }
    }

    // ----------------------------------------------------------------- bezel

    private function drawBezel(dc as Dc, p as Array) as Void {
        var c = px(227);
        for (var k = 0; k < 60; k++) {
            var a = k * 6 * Math.PI / 180.0;
            var major = (k % 5 == 0);
            var r1 = major ? 203 : 212;
            var r2 = 218;
            var col = (k == 0) ? p[9] : (major ? p[7] : p[8]);
            var sa = Math.sin(a);
            var ca = Math.cos(a);
            dc.setColor(col, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(major ? 3 : 1);
            dc.drawLine(c + px(r1 * sa), c - px(r1 * ca), c + px(r2 * sa), c - px(r2 * ca));
        }
        dc.setPenWidth(1);
    }

    // ------------------------------------------------------------- digital time

    private function drawTime(dc as Dc, p as Array, timeStr as String, ampm as String) as Void {
        var cx = px(227);
        var J = Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER;

        // Date: SAT  14 NOV
        var info = Gregorian.info(Time.now(), Time.FORMAT_MEDIUM);
        var dateStr = Lang.format("$1$  $2$ $3$", [info.day_of_week, info.day.format("%d"), info.month]).toUpper();
        drawOutlined(dc, cx, px(66), dateStr, _fDate, p[8], p[0], Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Time with leading zero, AM/PM to the right.
        var wT = dc.getTextWidthInPixels(timeStr, _fTime);
        var wA = dc.getTextWidthInPixels(ampm, _fAmpm);
        var gap = px(8);
        var x0 = cx - (wT + gap + wA) / 2;
        drawOutlined(dc, x0, px(135), timeStr, _fTime, p[7], p[0], J);
        drawOutlined(dc, x0 + wT + gap, px(165), ampm, _fAmpm, p[9], p[0], J);
    }

    // ---------------------------------------------------------------- data

    // Four readouts stacked in a column to the left of the peak.
    private function drawData(dc as Dc, p as Array) as Void {
        var J = Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER;
        var tx = px(110);
        var r0 = 238;
        var r1 = 282;
        var r2 = 326;
        var r3 = 370;

        // Battery
        var bat = System.getSystemStats().battery.toNumber();
        dc.setColor(p[9], Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        dc.drawRoundedRectangle(px(64), px(r0 - 8), px(28), px(16), px(3));
        dc.drawLine(px(94), px(r0 - 3), px(94), px(r0 + 3));
        dc.setPenWidth(1);
        dc.fillRectangle(px(67), px(r0 - 5), px(22.0 * bat / 100.0) + 1, px(10));
        valueWithUnit(dc, tx, px(r0), bat.format("%d"), "%", p, J);

        // Steps
        var steps = ActivityMonitor.getInfo().steps;
        dc.setColor(p[9], Graphics.COLOR_TRANSPARENT);
        dc.fillEllipse(px(72), px(r1 + 4), px(4), px(6));
        dc.fillEllipse(px(72), px(r1 - 6.4), px(2.8), px(3));
        dc.fillEllipse(px(84), px(r1 + 0.5), px(4), px(6));
        dc.fillEllipse(px(84), px(r1 - 9.6), px(2.8), px(3));
        valueWithUnit(dc, tx, px(r1), steps == null ? "--" : withCommas(steps), "", p, J);

        // Elevation (feet)
        var alt = elevationFeet();
        dc.setColor(p[9], Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        var ex = 62;
        var ey = r2 + 8;
        dc.drawLine(px(ex), px(ey), px(ex + 10), px(ey - 15));
        dc.drawLine(px(ex + 10), px(ey - 15), px(ex + 15), px(ey - 8));
        dc.drawLine(px(ex + 15), px(ey - 8), px(ex + 20), px(ey - 14));
        dc.drawLine(px(ex + 20), px(ey - 14), px(ex + 31), px(ey));
        dc.drawLine(px(ex), px(ey), px(ex + 31), px(ey));
        dc.setPenWidth(1);
        valueWithUnit(dc, tx, px(r2), alt == null ? "--" : withCommas(alt), " ft", p, J);

        // Temperature (Fahrenheit)
        var temp = temperatureF();
        dc.setColor(p[9], Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        dc.drawRoundedRectangle(px(75), px(r3 - 12), px(6), px(17), px(3));
        dc.setPenWidth(1);
        dc.fillCircle(px(78), px(r3 + 6), px(5.4));
        valueWithUnit(dc, tx, px(r3), temp == null ? "--" : temp.format("%d"), "°F", p, J);
    }

    private function valueWithUnit(dc as Dc, x as Number, y as Number, value as String, unit as String, p as Array, just as Number) as Void {
        drawOutlined(dc, x, y, value, _fData, p[7], p[0], just);
        if (unit.length() > 0) {
            var w = dc.getTextWidthInPixels(value, _fData);
            drawOutlined(dc, x + w + px(3), y + px(3), unit, _fUnit, p[8], p[0], just);
        }
    }

    private function withCommas(n as Number) as String {
        var s = n.abs().format("%d");
        var out = "";
        var cnt = 0;
        for (var i = s.length() - 1; i >= 0; i--) {
            out = s.substring(i, i + 1) + out;
            cnt++;
            if (cnt % 3 == 0 && i > 0) { out = "," + out; }
        }
        return n < 0 ? "-" + out : out;
    }

    private function elevationFeet() as Number or Null {
        var meters = null;
        var ai = Activity.getActivityInfo();
        if (ai != null && ai.altitude != null) {
            meters = ai.altitude;
        } else if ((Toybox has :SensorHistory) && (SensorHistory has :getElevationHistory)) {
            var it = SensorHistory.getElevationHistory({:period => 1, :order => SensorHistory.ORDER_NEWEST_FIRST});
            if (it != null) {
                var sample = it.next();
                if (sample != null && sample.data != null) {
                    meters = sample.data;
                }
            }
        }
        if (meters == null) { return null; }
        return Math.round(meters * 3.28084).toNumber();
    }

    private function temperatureF() as Number or Null {
        if (Toybox has :Weather) {
            var cc = Weather.getCurrentConditions();
            if (cc != null && cc.temperature != null) {
                return Math.round(cc.temperature * 9.0 / 5.0 + 32.0).toNumber();
            }
        }
        return null;
    }

    // ------------------------------------------------------- low power (AMOLED)

    // Only a dim outline of the time and hands, to protect the AMOLED and save battery.
    private function drawSleep(dc as Dc, p as Array, clock as System.ClockTime, timeStr as String) as Void {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        dc.setColor(p[8], Graphics.COLOR_TRANSPARENT);
        dc.drawText(px(227), px(190), _fTime, timeStr, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}
