/**
 * Universal Academic Text Normalization, Stemming, and Acronym/Synonym Expansion
 * Supports cross-subject retrieval across DBMS, Java, Python, AI/ML, Data Structures,
 * Computer Networks, Operating Systems, Mathematics, and general academic documents.
 */

export const ACADEMIC_ACRONYM_MAP: Record<string, string[]> = {
  // DBMS
  '1nf': ['first normal form', 'atomic', 'repeating groups'],
  '2nf': ['second normal form', 'partial dependency', 'partial dependencies'],
  '3nf': ['third normal form', 'transitive dependency', 'transitive dependencies'],
  'bcnf': ['boyce codd normal form', 'superkey', 'super key'],
  '4nf': ['fourth normal form', 'multivalued dependency', 'multi valued dependency'],
  '5nf': ['fifth normal form', 'join dependency', 'project join normal form'],
  'dbms': ['database management system', 'relational database'],
  'rdbms': ['relational database management system', 'relational model'],
  'sql': ['structured query language', 'query language'],
  'ddl': ['data definition language', 'create alter drop'],
  'dml': ['data manipulation language', 'select insert update delete'],
  'dcl': ['data control language', 'grant revoke'],
  'tcl': ['transaction control language', 'commit rollback savepoint'],
  'acid': ['atomicity consistency isolation durability', 'atomicity', 'consistency', 'isolation', 'durability'],
  'fd': ['functional dependency', 'functional dependencies'],
  'pk': ['primary key', 'unique identifier'],
  'fk': ['foreign key', 'referential integrity'],
  'ck': ['candidate key', 'prime attribute'],
  'er': ['entity relationship', 'entity relationship diagram'],
  'erd': ['entity relationship diagram'],
  '2pl': ['two phase locking', 'shared lock', 'exclusive lock'],
  'mvcc': ['multiversion concurrency control', 'multi version concurrency control'],
  'wal': ['write ahead logging'],

  // Java & OOP
  'oop': ['object oriented programming', 'encapsulation inheritance polymorphism abstraction'],
  'jvm': ['java virtual machine', 'bytecode'],
  'jdk': ['java development kit'],
  'jre': ['java runtime environment'],
  'jit': ['just in time compiler', 'just in time'],
  'gc': ['garbage collection', 'garbage collector'],
  'jdbc': ['java database connectivity'],
  'api': ['application programming interface'],
  'io': ['input output', 'stream'],

  // Python & Data Science
  'gil': ['global interpreter lock'],
  'orm': ['object relational mapping'],
  'json': ['javascript object notation'],
  'csv': ['comma separated values'],

  // Artificial Intelligence & Machine Learning
  'ai': ['artificial intelligence', 'intelligent agent'],
  'ml': ['machine learning', 'supervised unsupervised learning'],
  'dl': ['deep learning', 'deep neural network'],
  'nn': ['neural network', 'neural networks'],
  'ann': ['artificial neural network'],
  'cnn': ['convolutional neural network'],
  'rnn': ['recurrent neural network'],
  'lstm': ['long short term memory'],
  'nlp': ['natural language processing'],
  'llm': ['large language model'],
  'rag': ['retrieval augmented generation'],
  'rl': ['reinforcement learning', 'reward policy'],
  'svm': ['support vector machine', 'hyperplane'],
  'knn': ['k nearest neighbors', 'nearest neighbor'],
  'pca': ['principal component analysis', 'dimensionality reduction'],

  // Data Structures & Algorithms
  'dsa': ['data structures and algorithms', 'data structure', 'algorithm'],
  'bst': ['binary search tree'],
  'avl': ['avl tree', 'height balanced binary search tree', 'balance factor'],
  'dfs': ['depth first search', 'stack traversal'],
  'bfs': ['breadth first search', 'queue traversal', 'level order'],
  'fifo': ['first in first out', 'queue'],
  'lifo': ['last in first out', 'stack'],
  'dp': ['dynamic programming', 'memoization tabulation', 'overlapping subproblems'],
  'mst': ['minimum spanning tree', 'kruskal prim'],
  'dag': ['directed acyclic graph', 'topological sort'],

  // Computer Networks & Operating Systems
  'osi': ['open systems interconnection', 'seven layers', '7 layers'],
  'tcp': ['transmission control protocol', 'three way handshake', 'reliable connection'],
  'udp': ['user datagram protocol', 'connectionless'],
  'ip': ['internet protocol', 'ip address', 'routing'],
  'http': ['hypertext transfer protocol'],
  'https': ['hypertext transfer protocol secure'],
  'dns': ['domain name system', 'domain resolution'],
  'dhcp': ['dynamic host configuration protocol'],
  'arp': ['address resolution protocol'],
  'icmp': ['internet control message protocol'],
  'mac': ['media access control', 'physical address'],
  'lan': ['local area network'],
  'wan': ['wide area network'],
  'nat': ['network address translation'],
  'tls': ['transport layer security'],
  'ssl': ['secure sockets layer'],
  'os': ['operating system'],
  'cpu': ['central processing unit'],
  'ram': ['random access memory'],
  'mmu': ['memory management unit'],
  'tlb': ['translation lookaside buffer'],
  'pcb': ['process control block'],
  'ipc': ['interprocess communication'],
  'fcfs': ['first come first served'],
  'sjf': ['shortest job first'],
  'rr': ['round robin'],

  // Mathematics
  'ode': ['ordinary differential equation'],
  'pde': ['partial differential equation'],
  'svd': ['singular value decomposition'],
  'gcd': ['greatest common divisor'],
  'lcm': ['least common multiple'],
  'pdf': ['probability density function'],
  'cdf': ['cumulative distribution function'],
  'pmf': ['probability mass function'],
};

// Reverse map: full phrase -> acronyms (e.g., "first normal form" -> ["1nf"])
const PHRASE_TO_ACRONYM: { phrase: string; acronyms: string[] }[] = [];
for (const [acronym, expansions] of Object.entries(ACADEMIC_ACRONYM_MAP)) {
  for (const exp of expansions) {
    if (exp.includes(' ')) {
      PHRASE_TO_ACRONYM.push({ phrase: exp.toLowerCase(), acronyms: [acronym] });
    }
  }
}

export const CONCEPT_SYNONYM_GROUPS: string[][] = [
  ['duplicate', 'duplication', 'redundancy', 'redundant', 'repeating'],
  ['anomaly', 'anomalies', 'inconsistency', 'inconsistencies'],
  ['advantage', 'advantages', 'benefit', 'benefits', 'pro', 'pros', 'merit', 'merits'],
  ['disadvantage', 'disadvantages', 'limitation', 'limitations', 'drawback', 'drawbacks', 'con', 'cons', 'demerit', 'demerits'],
  ['step', 'steps', 'phase', 'phases', 'stage', 'stages', 'procedure', 'process', 'workflow'],
  ['type', 'types', 'kind', 'kinds', 'category', 'categories', 'classification'],
  ['difference', 'differences', 'compare', 'comparison', 'versus', 'contrast', 'distinguish'],
  ['definition', 'define', 'meaning', 'overview', 'concept', 'introduction'],
  ['formula', 'formulas', 'equation', 'equations', 'expression'],
  ['complexity', 'efficiency', 'runtime', 'performance', 'asymptotic'],
  ['insert', 'insertion', 'add', 'adding'],
  ['update', 'updating', 'modify', 'modification'],
  ['delete', 'deletion', 'remove', 'removal'],
  ['atomic', 'atomicity', 'indivisible', 'simple'],
  ['concurrent', 'concurrency', 'parallel', 'simultaneous'],
  ['schedule', 'schedules', 'scheduling', 'serializability', 'serializable'],
  ['deadlock', 'deadlocks', 'starvation', 'livelock'],
  ['inherit', 'inheritance', 'extends', 'subclass', 'superclass'],
  ['polymorphism', 'overloading', 'overriding', 'dynamic dispatch'],
  ['encapsulation', 'data hiding', 'private', 'getter', 'setter'],
  ['abstraction', 'abstract', 'interface'],
];

const SYNONYM_LOOKUP = new Map<string, string[]>();
for (const group of CONCEPT_SYNONYM_GROUPS) {
  for (const word of group) {
    SYNONYM_LOOKUP.set(word, group.filter((w) => w !== word));
  }
}

/**
 * Clean and normalize extracted text while preserving structure, tables, lists, and formulas.
 */
export function normalizeExtractedText(raw: string): string {
  if (!raw) return '';
  return raw
    // Replace common Unicode ligatures
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    // Normalize smart quotes and dashes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // Replace non-breaking and zero-width spaces
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize bullet symbols to clean dash bullets when at line start
    .replace(/^[ \t]*[•▪▸►◦‣⁃]\s*/gm, '- ')
    // Collapse horizontal tabs and runs of 3+ spaces into single space
    .replace(/\t+/g, ' ')
    .replace(/ {3,}/g, ' ')
    // Normalize CRLF to LF and collapse 3+ blank lines to 2
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Deterministic lightweight morphological stemmer for English academic terms
 */
export function stemWord(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.length <= 3) return w;

  if (w.endsWith('ization') && w.length > 8) return w.slice(0, -7) + 'iz';
  if (w.endsWith('isation') && w.length > 8) return w.slice(0, -7) + 'is';
  if (w.endsWith('ational') && w.length > 8) return w.slice(0, -7) + 'at';
  if (w.endsWith('fulness') && w.length > 8) return w.slice(0, -7);
  if (w.endsWith('ousness') && w.length > 8) return w.slice(0, -7);
  if (w.endsWith('iveness') && w.length > 8) return w.slice(0, -7);
  if (w.endsWith('ation') && w.length > 6) return w.slice(0, -5);
  if (w.endsWith('ition') && w.length > 6) return w.slice(0, -5);
  if (w.endsWith('ement') && w.length > 6) return w.slice(0, -5);
  if (w.endsWith('ment') && w.length > 5) return w.slice(0, -4);
  if (w.endsWith('ness') && w.length > 5) return w.slice(0, -4);
  if (w.endsWith('able') && w.length > 5) return w.slice(0, -4);
  if (w.endsWith('ible') && w.length > 5) return w.slice(0, -4);
  if (w.endsWith('ities') && w.length > 6) return w.slice(0, -5) + 'y';
  if (w.endsWith('ity') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ied') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing') && w.length > 5) {
    const base = w.slice(0, -3);
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
      return base.slice(0, -1);
    }
    return base;
  }
  if (w.endsWith('ed') && w.length > 4) {
    const base = w.slice(0, -2);
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
      return base.slice(0, -1);
    }
    return base;
  }
  if (w.endsWith('ly') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.length > 3) {
    return w.slice(0, -1);
  }

  return w;
}

/**
 * Expand a query string or token list with morphological stems, singular/plural forms,
 * academic acronyms/expansions, and conceptual synonyms.
 */
export function expandAcademicQueryTerms(queryText: string, baseTerms: string[]): {
  expandedTerms: Set<string>;
  expandedPhrases: Set<string>;
  stemMap: Map<string, string>;
} {
  const expandedTerms = new Set<string>();
  const expandedPhrases = new Set<string>();
  const stemMap = new Map<string, string>();
  const lowerQuery = (queryText || '').toLowerCase();

  // Check phrase-level acronym reverse mappings (e.g., "first normal form" -> "1nf")
  for (const entry of PHRASE_TO_ACRONYM) {
    if (lowerQuery.includes(entry.phrase)) {
      for (const acr of entry.acronyms) {
        expandedTerms.add(acr);
      }
    }
  }

  for (const rawTerm of baseTerms) {
    const t = rawTerm.toLowerCase().trim();
    if (!t || t.length < 2) continue;

    expandedTerms.add(t);
    const stem = stemWord(t);
    if (stem.length >= 3) {
      stemMap.set(t, stem);
      expandedTerms.add(stem);
    }

    // Singular / plural
    if (t.endsWith('s') && t.length > 3) {
      expandedTerms.add(t.slice(0, -1));
    } else if (!t.endsWith('s') && t.length > 2) {
      expandedTerms.add(t + 's');
      expandedTerms.add(t + 'es');
    }

    // Acronym expansion (e.g. "1nf" -> "first normal form", "first", "normal", "form")
    const acronymExpansions = ACADEMIC_ACRONYM_MAP[t];
    if (acronymExpansions) {
      for (const exp of acronymExpansions) {
        const cleanExp = exp.toLowerCase();
        if (cleanExp.includes(' ')) {
          expandedPhrases.add(cleanExp);
        }
        for (const word of cleanExp.split(/\s+/)) {
          if (word.length > 2 && word !== 'and' && word !== 'for' && word !== 'the') {
            expandedTerms.add(word);
            const wStem = stemWord(word);
            if (wStem.length >= 3) expandedTerms.add(wStem);
          }
        }
      }
    }

    // Conceptual synonym expansion
    const synonyms = SYNONYM_LOOKUP.get(t);
    if (synonyms) {
      for (const syn of synonyms) {
        if (syn.includes(' ')) {
          expandedPhrases.add(syn);
        } else {
          expandedTerms.add(syn);
          const sStem = stemWord(syn);
          if (sStem.length >= 3) expandedTerms.add(sStem);
        }
      }
    }
  }

  return { expandedTerms, expandedPhrases, stemMap };
}

