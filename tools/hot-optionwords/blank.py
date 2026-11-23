import re
def variants(w):
    v=[(w,'')]
    v.append((w+'ing','ing'))
    if w.endswith('e'): v.append((w+'d','d'))
    else: v.append((w+'ed','d'))
    v.append((w+'s','s')); v.append((w+'es','es'))
    return v
def blank(sentence, word):
    """Return sentence with the target word blanked so app.js fillSentence() restores it, or None."""
    for form,suf in sorted(variants(word),key=lambda x:-len(x[0])):
        m=re.search(r'(?<![A-Za-z-])'+re.escape(form)+r'(?![A-Za-z])',sentence,re.I)
        if m:
            rep='__________'+suf
            if m.group(0)[0].isupper() and m.start()==0: pass
            return sentence[:m.start()]+rep+sentence[m.end():]
    return None
