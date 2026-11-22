# Subtitle gaya Shorts: potongan pendek (2-4 kata), dari timing kata ElevenLabs Scribe.
import json, re
OFF = 0.8
MAXC = 22
words = [w for w in json.load(open('words.json'))['words'] if w['type'] == 'word' and not w['text'].startswith('[')]
chunks, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    txt = ' '.join(x['text'] for x in cur)
    nxt = words[i + 1]['text'] if i + 1 < len(words) else ''
    tail_ok = re.search(r'[.?!,]$', nxt) and len(txt) + 1 + len(nxt) <= MAXC + 8  # jangan sisakan 1 kata yatim
    if re.search(r'[.?!,]$', w['text']) or (len(txt) + 1 + len(nxt) > MAXC and not tail_ok) or not nxt:
        chunks.append(cur); cur = []
caps = [{'start': round(c[0]['start'] + OFF, 3), 'end': round(c[-1]['end'] + OFF, 3),
         'words': [{'t': w['text'].rstrip('.,'), 's': round(w['start'] + OFF, 3), 'e': round(w['end'] + OFF, 3)} for w in c]} for c in chunks]
for a, b in zip(caps, caps[1:]):
    a['end'] = round(min(b['start'], a['end'] + 0.4), 3)
caps[-1]['end'] += 1.2
open('captions.js', 'w').write('window.CAPTIONS = ' + json.dumps(caps, ensure_ascii=False) + ';\n')
def ts(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{sec:02},{ms:03}'
with open('gula_3d_shorts.id.srt', 'w') as f:
    for i, c in enumerate(caps, 1):
        f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{' '.join(w['t'] for w in c['words'])}\n\n")
print(len(caps), [' '.join(w['t'] for w in c['words']) for c in caps[:8]])
