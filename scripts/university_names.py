"""The names people use for universities, from the official names in the DfE data."""

import re

# Where the official name isn't what anyone calls it.
RENAMED = {
    "BIMM Limited": "BIMM",
    "BPP University Limited": "BPP University",
    "Birkbeck College": "Birkbeck, University of London",
    "GSM London Limited": "GSM London",
    "Glyndwr University": "Wrexham University",
    "Goldsmiths College": "Goldsmiths, University of London",
    "Imperial College of Science, Technology and Medicine": "Imperial College London",
    "London School of Economics and Political Science": "London School of Economics (LSE)",
    "Royal Holloway and Bedford New College": "Royal Holloway, University of London",
    "Southampton Solent University": "Solent University",
    "St George's Hospital Medical School": "St George's, University of London",
    "The City University": "City, University of London",
    "The School of Oriental and African Studies": "SOAS University of London",
    "The University of Keele": "Keele University",
    "The University of Lancaster": "Lancaster University",
    "University Campus Suffolk": "University of Suffolk",
    "University College London": "University College London (UCL)",
    "University of Abertay Dundee": "Abertay University",
    "University of Durham": "Durham University",
    "University of Newcastle-Upon-Tyne": "Newcastle University",
    "University of Northumbria At Newcastle": "Northumbria University",
    "University of The Arts, London": "University of the Arts London",
}


def tidy(name: str) -> str:
    if name in RENAMED:
        return RENAMED[name]
    name = re.sub(r"^The ", "", name)
    name = re.sub(r"\b(The|Of|For|At|And)\b", lambda m: m.group(1).lower() if m.start() else m.group(1), name)
    name = re.sub(r" Limited$", "", name)
    return name.replace("St andrews", "St Andrews")
