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

# The public album feed only lists the newest 20 photos. With your own Flickr API key
# (repo secret FLICKR_KEY) the whole album is read; without it, photos from earlier
# syncs that the feed no longer shows are kept, so nothing drops off the site.
KEY = os.environ.get("FLICKR_KEY", "").strip() or None

def full_album(sid, key):
    out, page_n = [], 1
    while True:
        r = json.loads(get("https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos"
            f"&api_key={key}&photoset_id={sid}&user_id={USER}&extras=description,date_taken,date_upload,url_m"
            f"&per_page=500&page={page_n}&format=json&nojsoncallback=1"))
        if r.get("stat") != "ok":
            raise ValueError(r.get("message"))
        ps = r["photoset"]; out += ps.get("photo", [])
        if page_n >= int(ps.get("pages", 1)): return out
        page_n += 1

print("api key:", ("set, " + str(len(KEY)) + " characters") if KEY else "not set")
try:
    old = json.load(open("data/flickr.json"))["photos"]
except Exception:
    old = []
pid = lambda url: (re.search(r"/photos/[^/]+/(\d+)", url or "") or [None, None])[1]

albums, photos = [], []
for sid in ids:
    raw = get(f"https://www.flickr.com/services/feeds/photoset.gne?set={sid}&nsid={USER}&format=json&nojsoncallback=1&lang=en-us")
    feed = json.loads(raw.replace("\\'", "'"))
    title = re.sub(r"^Content from\s+", "", html.unescape(feed.get("title", ""))).strip()
    adesc = text(feed.get("description", ""))
    kind = "story" if re.search(r"type\s*:?\s*story", adesc, re.I) else "standard"
    albums.append({"id": sid, "title": title, "type": kind, "description": adesc})
    fed = []
    for it in feed.get("items", []):
        m = (it.get("media") or {}).get("m", "")
        if not m:
            continue
        desc = it.get("description", "")
        w = re.search(r'width="(\d+)"', desc); h = re.search(r'height="(\d+)"', desc)
        paras = re.findall(r"<p>(.*?)</p>", desc, re.S)
        own = "\n".join(text(p) for p in paras[2:]).strip()
        fed.append({
            "title": html.unescape(it.get("title", "")).strip(), "url": it.get("link", ""), "m": m,
            "w": int(w.group(1)) if w else 4, "h": int(h.group(1)) if h else 3,
            "taken": it.get("date_taken", ""), "published": it.get("published", ""),
            "description": re.sub(r"[ \t]+", " ", own), "tags": (it.get("tags") or "").split(),
            "album": sid, "category": "general",
        })
    full = None
    if KEY:
        try:
            full = full_album(sid, KEY)
        except Exception as e:
            print("full album failed", sid, e)
    if full is not None:
        byid = {pid(p["url"]): p for p in fed}
        for x in full:
            f = byid.get(x["id"])
            if f:
                photos.append(f); continue
            photos.append({
                "title": (x.get("title") or "").strip(),
                "url": f"https://www.flickr.com/photos/{USER}/{x['id']}/in/set-{sid}/",
                "m": f"https://live.staticflickr.com/{x['server']}/{x['id']}_{x['secret']}_m.jpg",
                "w": int(x.get("width_m") or 4), "h": int(x.get("height_m") or 3),
                "taken": (x.get("datetaken") or "").replace(" ", "T"),
                "published": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(x.get("dateupload") or 0))),
                "description": re.sub(r"[ \t]+", " ", text((x.get("description") or {}).get("_content", ""))),
                "tags": [], "album": sid, "category": "general",
            })
        print(title, len(full), "photos (full album)")
    else:
        seen = {pid(p["url"]) for p in fed}
        # keep only photos older than everything the feed shows: those just fell off its 20-photo list.
        # One newer than that and missing from the feed was deleted on Flickr, so it goes.
        oldest = min((p.get("published", "") for p in fed), default="")
        keep = [p for p in old if p.get("album") == sid and pid(p["url"]) not in seen and p.get("published", "") <= oldest] if len(fed) >= 20 else []   # <=: photos uploaded together share a timestamp
        photos += fed + keep
        print(title, len(fed), "from feed +", len(keep), "kept from last sync")
photos.sort(key=lambda p: p["published"], reverse=True)
os.makedirs("data", exist_ok=True)
with open("data/flickr.json", "w") as f:
    json.dump({"albums": albums, "photos": photos}, f, indent=1, ensure_ascii=False)
print(len(albums), "albums,", len(photos), "photos")
