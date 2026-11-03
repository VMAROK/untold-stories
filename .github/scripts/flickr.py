"""Reads your public Flickr albums and writes data/flickr.json for the site.
Add more albums to ALBUMS as  "album id": "site category"  (general, liminal, psy)."""
import json, re, time, html, urllib.request, os

USER = "205100593@N02"
ALBUMS = {"72177720336837184": "general"}   # General

def get(url):
    for i in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "untold-stories-sync"})
            return urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
        except Exception as e:
            print("retry", i, e); time.sleep(20)
    raise SystemExit("Flickr feed unreachable")

photos = []
for sid, cat in ALBUMS.items():
    raw = get(f"https://www.flickr.com/services/feeds/photoset.gne?set={sid}&nsid={USER}&format=json&nojsoncallback=1&lang=en-us")
    feed = json.loads(raw.replace("\\'", "'"))     # Flickr escapes single quotes, which JSON doesn't allow
    for it in feed.get("items", []):
        m = (it.get("media") or {}).get("m", "")
        if not m:
            continue
        desc = it.get("description", "")
        w = re.search(r'width="(\d+)"', desc); h = re.search(r'height="(\d+)"', desc)
        paras = re.findall(r"<p>(.*?)</p>", desc, re.S)
        text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", p)).strip() for p in paras[2:])
        photos.append({
            "title": html.unescape(it.get("title", "")).strip(),
            "url": it.get("link", ""),
            "m": m,
            "w": int(w.group(1)) if w else 4, "h": int(h.group(1)) if h else 3,
            "taken": it.get("date_taken", ""), "published": it.get("published", ""),
            "description": re.sub(r"\s+", " ", text).strip(),
            "tags": (it.get("tags") or "").split(), "category": cat,
        })
photos.sort(key=lambda p: p["published"], reverse=True)
os.makedirs("data", exist_ok=True)
with open("data/flickr.json", "w") as f:
    json.dump({"photos": photos}, f, indent=1, ensure_ascii=False)
print(len(photos), "photos")
