"""Run veraPDF (PDF/UA-1) and print failed rules.  Usage: vera_summary.py <pdf> [...]
Set VERAPDF_CP to a classpath glob containing the veraPDF jars."""
import os, subprocess, sys, xml.etree.ElementTree as ET

CP = os.environ.get("VERAPDF_CP", "")
def run(pdf):
    out = subprocess.run(["java", "-cp", CP, "org.verapdf.apps.GreenfieldCliWrapper", "--flavour", "ua1", "--format", "xml", pdf],
                         capture_output=True, text=True).stdout
    root = ET.fromstring(out[out.index("<?xml"):])
    res = []
    for r in root.iter():
        if r.tag.endswith("rule") and r.attrib.get("status") == "failed":
            d = next((c.text for c in r if c.tag.endswith("description")), "")
            res.append((r.attrib.get("clause"), r.attrib.get("testNumber"), int(r.attrib.get("failedChecks", "0")), d))
    return res
if __name__ == "__main__":
    for p in sys.argv[1:]:
        print("==", os.path.basename(p))
        for c, t, n, d in run(p):
            print(f"  {c}-{t} x{n}: {d[:140]}")
