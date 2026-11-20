# Trailhead (Garmin Fenix 8 Pro watch face)

Mountain biking watch face: large 12-hour digital time with a leading zero (08:42 AM),
a ridgeline with a switchback trail, and battery %, steps, elevation (ft) and temperature (°F) on a trail sign panel to the left of the peak.

## Palettes
Tap the watch face to cycle palettes on the watch. If the app was installed from the Connect IQ store you can also pick one in the phone app (Settings > Color palette). Sideloaded copies usually don't show settings in the phone app, so use the tap:
- **Stone and Larch** (beige, warm gray, off-white on light black)
- **Maroon and Silver** (maroon shadows, silver highlights)
- **Maroon and Black** (black mountain and ridges, with maroon glow, summit, trail and accents)

To add a palette, append a 12-color row to `PALETTES` in `source/TrailheadView.mc`
(order is documented above it) and a `listEntry` in `resources/settings/settings.xml`.

## Build and install
1. Install the [Connect IQ SDK](https://developer.garmin.com/connect-iq/sdk/) with the SDK Manager, and download the
   **fenix 8 Pro 47mm / 51mm** device files. VS Code with the "Monkey C" extension is the easiest route.
2. Open this folder, run **Monkey C: Build for Device** (or **Run** to try it in the simulator).
3. To sideload: connect the watch by USB and copy the generated `.prg` into `GARMIN/APPS` on the watch.

## Notes
- Written without access to the SDK, so it has not been compiled yet. If the build reports an error,
  send it over and I'll fix it. Check that the product IDs in `manifest.xml` match the names the SDK Manager lists.
- Temperature comes from Garmin Weather (needs a recent phone sync). Elevation uses the activity altitude, falling back to the last barometric elevation sample. Missing data shows `--`.
- Low-power (AMOLED sleep) mode draws only a dim time.
