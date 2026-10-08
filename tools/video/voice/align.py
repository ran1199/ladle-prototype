# Forced alignment: the known narration of each scene against its recording,
# giving a start and end time for every word of the script (PocketSphinx).
import json, re, sys, wave
from pocketsphinx import Decoder

NARR, WAVDIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TAKES = {1: 7, 2: 8, 3: 9, 4: 12, 6: 11, 7: 14, 8: 13, 9: 15}
NUMBERS = {
    "870": "eight hundred and seventy", "240": "two hundred and forty", "533": "five hundred thirty three",
    "530": "five hundred thirty", "120": "a hundred and twenty", "30": "thirty", "200": "two hundred",
}
EXTRA = {"barcode": "B AA R K OW D", "matcha": "M AA CH AH", "myfitnesspal": "M AY F IH T N AH S P AE L"}

def spoken(token):
    t = token.lower().replace("-", " ")
    t = re.sub(r"[^a-z0-9' ]", "", t)
    out = []
    for w in t.split():
        w = w.strip("'")
        out += NUMBERS.get(w, w).split()
    return out

result = {}
for s in json.load(open(NARR)):
    n = s["n"]
    if n not in TAKES:
        continue
    tokens = s["narration"].split()
    words, owner = [], []
    for i, tok in enumerate(tokens):
        for w in spoken(tok):
            words.append(w); owner.append(i)
    d = Decoder(beam=1e-80, wbeam=1e-60, pbeam=1e-80)
    for w, ph in EXTRA.items():
        d.add_word(w, ph, True)
    with wave.open(f"{WAVDIR}/julian-{TAKES[n]}.wav", "rb") as w:
        audio = w.readframes(w.getnframes())
    d.set_align_text(" ".join(words))
    d.start_utt(); d.process_raw(audio, full_utt=True)
    try:
        d.end_utt()
        seq = [(re.sub(r"\(\d+\)$", "", g.word), g.start_frame / 100, (g.end_frame + 1) / 100) for g in d.seg()
               if not g.word.startswith(("<", "["))]
    except RuntimeError:
        seq = []
    ok = len(seq) == len(words)
    times = [None] * len(tokens)
    if ok:
        for (name, a, b), i in zip(seq, owner):
            times[i] = [a, b] if times[i] is None else [times[i][0], b]
    result[n] = {"take": f"julian-{TAKES[n]}", "ok": ok, "words": [{"text": t, "start": tt[0] if tt else None, "end": tt[1] if tt else None} for t, tt in zip(tokens, times)]}
    first = next((x for x in times if x), None); last = next((x for x in reversed(times) if x), None)
    print(f"scene {n} (julian-{TAKES[n]}): aligned={ok} words={len(seq)}/{len(words)} speech {first[0] if first else '?'}–{last[1] if last else '?'} s", flush=True)
json.dump(result, open(OUT, "w"), indent=1)
