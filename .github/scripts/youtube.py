"""Reads the public YouTube feed for the Tim Amarok channel and writes data/youtube.json for the site.
Sorting: any hashtag containing "liminal" (#liminal, #liminalspaces, #liminalcore...) -> liminal; everything else -> general."""
import json, re, urllib.request, xml.etree.ElementTree as ET, datetime, os

CHANNEL = "UCTXSYfN_RQIS9svvXbZfeYg"
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL}"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "m": "http://search.yahoo.com/mrss/"}

root = ET.fromstring(urllib.request.urlopen(FEED, timeout=30).read())
videos = []
for e in root.findall("a:entry", NS):
    vid = e.findtext("yt:videoId", default="", namespaces=NS)
    title = e.findtext("a:title", default="", namespaces=NS)
    link = e.find("a:link", NS).get("href", "")
    group = e.find("m:group", NS)
    desc = group.findtext("m:description", default="", namespaces=NS) if group is not None else ""
    th = group.find("m:thumbnail", NS) if group is not None else None
    tags = sorted({t.lower() for t in re.findall(r"#(\w+)", f"{title} {desc}")})
    videos.append({
        "id": vid, "title": re.sub(r"\s*#\w+", "", title).strip() or title,
        "url": link, "short": "/shorts/" in link,
        "published": e.findtext("a:published", default="", namespaces=NS),
        "description": re.sub(r"(^|\s)#\w+", "", desc).strip(),
        "thumb": th.get("url", "") if th is not None else "", "hashtags": tags,
        "section": "liminal" if any("liminal" in t for t in tags) else "general",
    })
os.makedirs("data", exist_ok=True)
out = {"synced_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "videos": videos}
json.dump(out, open("data/youtube.json", "w"), indent=2, ensure_ascii=False)
print(f"{len(videos)} videos:", [(v["title"], v["section"]) for v in videos])
