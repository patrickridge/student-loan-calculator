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
    "King's College London": "King's College London (KCL)",
    "Queen Mary University of London": "Queen Mary University of London (QMUL)",
    "The University of East Anglia": "University of East Anglia (UEA)",
    "University of The West of England, Bristol": "University of the West of England (UWE Bristol)",
    "The Manchester Metropolitan University": "Manchester Metropolitan University (MMU)",
    "University of Central Lancashire": "University of Central Lancashire (UCLan)",
    "The Nottingham Trent University": "Nottingham Trent University (NTU)",
    "Liverpool John Moores University": "Liverpool John Moores University (LJMU)",
    "The Open University": "The Open University",
    "Roehampton University": "University of Roehampton",
    "Leeds College of Art": "Leeds Arts University",
    "University of St Mark and St John": "Plymouth Marjon University",
    "Ravensbourne": "Ravensbourne University London",
    "NCG": "Newcastle College Group (NCG)",
    "Queen Margaret University, Edinburgh": "Queen Margaret University",
    "The University of St andrews": "University of St Andrews",
    "The Royal Veterinary College": "Royal Veterinary College (RVC)",
    "University of Wales Trinity Saint David": "University of Wales Trinity Saint David (UWTSD)",
}


def tidy(name: str) -> str:
    if name in RENAMED:
        return RENAMED[name]
    name = re.sub(r"^The ", "", name)
    name = re.sub(r"\b(The|Of|For|At|And)\b", lambda m: m.group(1).lower() if m.start() else m.group(1), name)
    name = re.sub(r" Limited$", "", name)
    return name.replace("St andrews", "St Andrews")
