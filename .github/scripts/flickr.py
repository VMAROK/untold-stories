"""Reads all your public Flickr albums and writes data/flickr.json for the site.
New albums are found automatically from your albums page.
An album whose description says "Type: Story" is a story album (photos grouped by SCENE);
any other album is a standard album (photos grouped by name / VERSION)."""
import json, re, time, html, urllib.request, os

USER = "205100593@N02"

def get(url):
    for i in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (untold-stories-sync)"})
            return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        except Exception as e:
            print("retry", i, e); time.sleep(20)
    raise SystemExit("Flickr unreachable: " + url)

def text(h):
    h = re.sub(r"<br\s*/?>", "\n", h or "")
    return html.unescape(re.sub(r"<[^>]+>", "", h)).strip()

# every album on the albums page (newest first, as Flickr lists them)
page = get(f"https://www.flickr.com/photos/{USER}/albums")
ids = []
for m in re.finditer(r"/photos/%s/albums/(\d{6,})" % re.escape(USER), page):
    if m.group(1) not in ids:
        ids.append(m.group(1))
if not ids:
    ids = ["72177720336837184"]            # General, as a fallback
print("albums:", ids)

albums, photos = [], []
for sid in ids:
    raw = get(f"https://www.flickr.com/services/feeds/photoset.gne?set={sid}&nsid={USER}&format=json&nojsoncallback=1&lang=en-us")
    feed = json.loads(raw.replace("\\'", "'"))
    title = re.sub(r"^Content from\s+", "", html.unescape(feed.get("title", ""))).strip()
    adesc = text(feed.get("description", ""))
    kind = "story" if re.search(r"type\s*:?\s*story", adesc, re.I) else "standard"
    albums.append({"id": sid, "title": title, "type": kind, "description": adesc})
    for it in feed.get("items", []):
        m = (it.get("media") or {}).get("m", "")
        if not m:
            continue
        desc = it.get("description", "")
        w = re.search(r'width="(\d+)"', desc); h = re.search(r'height="(\d+)"', desc)
        paras = re.findall(r"<p>(.*?)</p>", desc, re.S)
        own = "\n".join(text(p) for p in paras[2:]).strip()
        photos.append({
            "title": html.unescape(it.get("title", "")).strip(), "url": it.get("link", ""), "m": m,
            "w": int(w.group(1)) if w else 4, "h": int(h.group(1)) if h else 3,
            "taken": it.get("date_taken", ""), "published": it.get("published", ""),
            "description": re.sub(r"[ \t]+", " ", own), "tags": (it.get("tags") or "").split(),
            "album": sid, "category": "general",
        })
photos.sort(key=lambda p: p["published"], reverse=True)
os.makedirs("data", exist_ok=True)
with open("data/flickr.json", "w") as f:
    json.dump({"albums": albums, "photos": photos}, f, indent=1, ensure_ascii=False)
print(len(albums), "albums,", len(photos), "photos")
