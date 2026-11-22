# Membuat potongan subtitle per kalimat/frasa dari timing kata ElevenLabs Scribe.
import json, re
OFF = 3.0      # voiceover mulai di detik ke-3 video
MAXC = 80      # maksimal karakter per subtitle (dibagi jadi 2 baris saat render)
words = [w for w in json.load(open('words.json'))['words'] if w['type'] == 'word' and not w['text'].startswith('[')]
chunks, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    txt = ' '.join(x['text'] for x in cur)
    nxt = words[i + 1]['text'] if i + 1 < len(words) else ''
    end_sentence = re.search(r'[.?!]$', w['text'])
    soft = re.search(r'[,:]$', w['text']) and len(txt) >= 40
    too_long = len(txt) + 1 + len(nxt) > MAXC
    if too_long and not end_sentence:
        # potong di koma terakhir kalau ada, supaya frasa tetap utuh
        cut = next((k for k, x in enumerate(cur[:-1]) if x['text'].endswith(',') and len(' '.join(y['text'] for y in cur[:k + 1])) >= 25), None)
        if cut is not None:
            chunks.append(cur[:cut + 1]); cur = cur[cut + 1:]
            continue
    if end_sentence or soft or too_long or not nxt:
        chunks.append(cur); cur = []
caps = [{'start': round(c[0]['start'] + OFF, 3), 'end': round(c[-1]['end'] + OFF, 3),
         'words': [{'t': w['text'], 's': round(w['start'] + OFF, 3), 'e': round(w['end'] + OFF, 3)} for w in c]} for c in chunks]
# perpanjang tampilan sampai potongan berikutnya (maks 0.6 dtk jeda) agar tidak berkedip
for a, b in zip(caps, caps[1:]):
    a['end'] = round(min(b['start'], a['end'] + 0.6), 3)
caps[-1]['end'] = round(caps[-1]['end'] + 1.0, 3)
open('captions.js', 'w').write('window.CAPTIONS = ' + json.dumps(caps, ensure_ascii=False) + ';\n')
def ts(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{sec:02},{ms:03}'
with open('gula_obesitas_diabetes.id.srt', 'w') as f:
    for i, c in enumerate(caps, 1):
        f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{' '.join(w['t'] for w in c['words'])}\n\n")
for c in caps: print(f"{c['start']:6.2f} {' '.join(w['t'] for w in c['words'])}")
