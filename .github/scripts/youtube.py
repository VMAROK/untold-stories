"""Reads the public YouTube feed for the Tim Amarok channel and writes data/youtube.json for the site.
Sorting: any short or video with a hashtag containing "liminal" (#liminal, #liminalspaces, #liminalcore...) -> Liminal;
shorts with no hashtags -> General; other videos (e.g. with unrelated hashtags) are left off the site."""
import json, re, urllib.request, xml.etree.ElementTree as ET, datetime, os

CHANNEL = "UCTXSYfN_RQIS9svvXbZfeYg"
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL}"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "m": "http://search.yahoo.com/mrss/"}

import time, sys
# YouTube's feed sometimes answers "not found" for a moment, so try a few times, and also the
# channel's uploads-playlist feed (same videos). If both stay down, keep the last saved list.
FEEDS = [FEED, f"https://www.youtube.com/feeds/videos.xml?playlist_id=UU{CHANNEL[2:]}"]
xml = None
for attempt in range(10):   # up to ~7 minutes: the feed often comes back after a few tries
    for url in FEEDS:
        try:
            xml = urllib.request.urlopen(url, timeout=30).read(); break
        except Exception as err:
            print(f"try {attempt + 1}: {url} -> {err}")
    if xml: break
    time.sleep(40)
if not xml:
    print("YouTube feed unavailable right now; keeping the current list."); sys.exit(0)
root = ET.fromstring(xml)
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
        # liminal hashtag -> Liminal; a short with no hashtags -> General; anything else isn't shown
        # liminal hashtag -> Liminal; anything with no hashtags -> General; anything else is "other"
        # (the site still checks its hashtags, e.g. #poolrooms puts it in that collection location)
        "section": "liminal" if any("liminal" in t for t in tags) else ("general" if not tags else "other"),
    })
os.makedirs("data", exist_ok=True)
out = {"synced_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "videos": videos}
json.dump(out, open("data/youtube.json", "w"), indent=2, ensure_ascii=False)
print(f"{len(videos)} videos:", [(v["title"], v["section"]) for v in videos])
