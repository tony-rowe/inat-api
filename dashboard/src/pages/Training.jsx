import { useState, useEffect, useCallback } from 'react';
import { useApi, apiGet } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORY_ALL = 'all';

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#84cc16' : score >= 40 ? '#facc15' : '#f97316';
  return (
    <div className="flex items-center gap-1">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${color}30`, color }}>
        {score}
      </div>
    </div>
  );
}

function FactorDots({ value, max = 5, color = '#22c55e' }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < value ? color : '#1a2e1a' }} />
      ))}
    </div>
  );
}

// ──────────────── BROWSE MODE ────────────────
function BrowseMode({ species, categories, onSelectSpecies }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState(CATEGORY_ALL);
  const [sort, setSort] = useState('score');

  let filtered = [...species];
  if (cat !== CATEGORY_ALL) filtered = filtered.filter(s => s.category === cat);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s => s.commonName.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q));
  }
  if (sort === 'score') filtered.sort((a, b) => (b.foragerScore?.overall || 0) - (a.foragerScore?.overall || 0));
  else if (sort === 'name') filtered.sort((a, b) => a.commonName.localeCompare(b.commonName));
  else if (sort === 'safety') filtered.sort((a, b) => (a.foragerScore?.safetyRisk || 5) - (b.foragerScore?.safetyRisk || 5));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search species..."
          className="bg-green-950/40 border border-green-800/30 rounded-xl px-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-mushroom-gold/50 flex-1 min-w-[180px] max-w-xs" />
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setCat(CATEGORY_ALL)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${cat === CATEGORY_ALL ? 'bg-mushroom-gold text-black' : 'bg-green-100 text-green-800 hover:text-green-900'}`}>All</button>
          {Object.entries(categories).map(([key, c]) => (
            <button key={key} onClick={() => setCat(key)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 ${cat === key ? 'bg-mushroom-gold text-black' : 'bg-green-100 text-green-800 hover:text-green-900'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="bg-green-950/40 border border-green-800/30 rounded-xl px-2 py-1.5 text-xs text-gray-300">
          <option value="score">Sort: Forager Score</option>
          <option value="name">Sort: Name</option>
          <option value="safety">Sort: Safest First</option>
        </select>
      </div>
      <p className="text-[10px] text-green-700">{filtered.length} species</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(s => (
          <button key={s.id} onClick={() => onSelectSpecies(s)} className="glass-card-hover p-4 text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-100 text-green-900 text-xs font-semibold flex items-center justify-center">{(s.commonName || 'S').charAt(0)}</span>
                <div>
                  <p className="text-sm font-semibold text-green-900 leading-tight">{s.commonName}</p>
                  <p className="text-[10px] text-green-500/70 italic">{s.scientificName}</p>
                </div>
              </div>
              {s.foragerScore && <ScoreBadge score={s.foragerScore.overall} />}
            </div>
            <p className="text-[10px] text-green-700 line-clamp-2 mb-2">{s.description}</p>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: categories[s.category]?.color + '20', color: categories[s.category]?.color }}>
                {categories[s.category]?.label}
              </span>
              {s.foragerScore && (
                <span className={s.foragerScore.safetyRisk <= 2 ? 'text-green-500' : s.foragerScore.safetyRisk <= 3 ? 'text-yellow-500' : 'text-red-500'}>
                  {s.foragerScore.safetyRisk <= 2 ? 'Low Risk' : s.foragerScore.safetyRisk <= 3 ? 'Moderate Risk' : 'High Risk'}
                </span>
              )}
              {s.lookalikes?.length > 0 && <span className="text-red-400">{s.lookalikes.length} lookalike{s.lookalikes.length > 1 ? 's' : ''}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────── SPECIES DETAIL PANEL ────────────────
function SpeciesStudy({ species, onBack }) {
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    setLoadingPhotos(true);
    fetch(`/api/photos/${species.taxonId}?count=20`)
      .then(r => r.json())
      .then(d => { setPhotos(d.photos || []); setLoadingPhotos(false); })
      .catch(() => setLoadingPhotos(false));
  }, [species.taxonId]);

  const fs = species.foragerScore || {};

  return (
    <div className="space-y-5 fade-in max-w-5xl">
      <button onClick={onBack} className="text-xs text-green-700 hover:text-mushroom-gold">← Back to Field Guide</button>

      <div className="glass-card p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 flex-shrink-0">
            {loadingPhotos ? <LoadingSpinner message="Loading photos..." /> : photos.length > 0 ? (
              <div>
                <img src={photos[activePhoto]?.urlLarge || photos[activePhoto]?.url} alt={species.commonName}
                  className="w-full h-64 object-cover rounded-xl border border-green-800/30" />
                <p className="text-[9px] text-green-700 mt-1">{photos[activePhoto]?.attribution}</p>
                <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
                  {photos.slice(0, 12).map((p, i) => (
                    <img key={p.id} src={p.url} alt="" onClick={() => setActivePhoto(i)}
                      className={`w-12 h-12 rounded-lg object-cover cursor-pointer flex-shrink-0 border-2 transition-all ${i === activePhoto ? 'border-mushroom-gold' : 'border-transparent opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full h-64 rounded-xl bg-green-900/30 flex items-center justify-center text-4xl">{(species.commonName || 'S').charAt(0)}</div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-green-900">{species.commonName}</h2>
                <p className="text-green-500 italic">{species.scientificName}</p>
              </div>
              {fs.overall && <ScoreBadge score={fs.overall} />}
            </div>
            <p className="text-sm text-green-700 mt-3 leading-relaxed">{species.description}</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <InfoBox label="Edibility" value={species.edibility} />
              <InfoBox label="Habitat" value={species.habitat} />
              <InfoBox label="Season" value={species.season ? `${monthName(species.season.start)} – ${monthName(species.season.end)}` : 'Varies'} />
              <InfoBox label="Category" value={species.category} />
            </div>

            {fs.overall && (
              <div className="mt-4 glass-card p-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-green-600 mb-2">Forager Usefulness</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <FactorRow label="Easy to ID" value={fs.identification} color="#22c55e" />
                  <FactorRow label="Abundance" value={fs.abundance} color="#3b82f6" />
                  <FactorRow label="Culinary Value" value={fs.culinaryValue} color="#f59e0b" />
                  <FactorRow label="Season Length" value={fs.seasonLength} color="#8b5cf6" />
                  <FactorRow label="Preservation" value={fs.preservation} color="#06b6d4" />
                  <FactorRow label="Safety Risk" value={fs.safetyRisk} color="#ef4444" inverted />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold text-green-900 mb-3">Identification Tips</h3>
        <p className="text-sm text-green-800 leading-relaxed">{species.idTips}</p>
      </div>

      {species.lookalikes?.length > 0 && (
        <div className="glass-card p-5 border-red-900/30">
          <h3 className="text-lg font-semibold text-red-400 mb-3">Dangerous Lookalikes</h3>
          {species.lookalikes.map((la, i) => (
            <div key={i} className="p-3 rounded-xl bg-red-950/20 border border-red-900/20 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${la.danger === 'deadly' ? 'bg-red-900/50 text-red-300' : la.danger === 'toxic' ? 'bg-orange-900/50 text-orange-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                  {la.danger.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-green-900">{la.name}</span>
              </div>
              <p className="text-xs text-green-800">{la.tip}</p>
            </div>
          ))}
        </div>
      )}

      {photos.length > 4 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold text-green-900 mb-3">Study Photos ({photos.length})</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {photos.map((p, i) => (
              <div key={p.id} className="relative group cursor-pointer" onClick={() => setActivePhoto(i)}>
                <img src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-1">
                  <p className="text-[8px] text-gray-300 truncate">{p.placeGuess}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────── QUIZ MODE ────────────────
function QuizMode({ categories }) {
  const [cat, setCat] = useState(CATEGORY_ALL);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const loadQuiz = useCallback(async (category) => {
    setLoading(true);
    setCurrent(0); setSelected(null); setShowHint(false);
    setScore({ correct: 0, total: 0 }); setDone(false);
    try {
      const data = await apiGet(`/quiz?category=${category}&count=10`);
      setQuestions(data.questions || []);
    } catch { setQuestions([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadQuiz(cat); }, [cat, loadQuiz]);

  const q = questions[current];
  const isCorrect = selected === q?.correctId;

  const handleAnswer = (id) => {
    if (selected) return;
    setSelected(id);
    setScore(prev => ({ correct: prev.correct + (id === q.correctId ? 1 : 0), total: prev.total + 1 }));
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) { setDone(true); return; }
    setCurrent(c => c + 1); setSelected(null); setShowHint(false);
  };

  if (loading) return <LoadingSpinner message="Loading quiz photos from iNaturalist..." />;
  if (questions.length === 0) return <p className="text-green-700 text-center py-12">No quiz questions available. Try a different category or wait for photos to load.</p>;

  if (done) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="max-w-lg mx-auto text-center py-12 fade-in">
        <h2 className="text-2xl font-bold text-green-900 mb-2">Quiz Complete!</h2>
        <p className="text-4xl font-bold mb-2" style={{ color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#facc15' : '#f97316' }}>
          {score.correct} / {score.total}
        </p>
        <p className="text-green-700 mb-6">{pct}% correct</p>
        <button onClick={() => loadQuiz(cat)} className="btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button onClick={() => setCat(CATEGORY_ALL)} className={`px-2 py-1 rounded text-[10px] font-medium ${cat === CATEGORY_ALL ? 'bg-mushroom-gold text-black' : 'bg-green-100 text-green-800'}`}>All</button>
          {Object.entries(categories).map(([key, c]) => (
            <button key={key} onClick={() => setCat(key)} className={`px-2 py-1 rounded text-[10px] font-medium ${cat === key ? 'bg-mushroom-gold text-black' : 'bg-green-100 text-green-800'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-700">{current + 1} / {questions.length}</span>
          <span className="text-xs text-green-400 font-bold">{score.correct}</span>
        </div>
      </div>

      {q && (
        <div className="max-w-2xl mx-auto fade-in" key={current}>
          <div className="glass-card overflow-hidden">
            <img src={q.photo.urlLarge || q.photo.url} alt="Identify this species"
              className="w-full h-72 md:h-96 object-cover" />
            <div className="p-5">
              <p className="text-sm text-green-800 mb-1">What species is this?</p>
              {q.photo.placeGuess && <p className="text-[10px] text-green-700 mb-3">{q.photo.placeGuess} · {q.photo.observedOn}</p>}

              <div className="grid grid-cols-2 gap-2 mb-4">
                {q.options.map(opt => {
                  let bg = 'bg-green-950/40 border-green-800/30 hover:border-mushroom-gold/50';
                  if (selected) {
                    if (opt.id === q.correctId) bg = 'bg-green-900/50 border-green-500';
                    else if (opt.id === selected) bg = 'bg-red-900/30 border-red-500';
                    else bg = 'bg-green-950/20 border-green-900/20 opacity-50';
                  }
                  return (
                    <button key={opt.id} onClick={() => handleAnswer(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${bg}`} disabled={!!selected}>
                      <span className="text-sm text-green-900">{opt.commonName}</span>
                      <p className="text-[10px] text-green-700 italic mt-0.5">{opt.scientificName}</p>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="fade-in space-y-2">
                  <p className={`text-sm font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {isCorrect ? 'Correct' : `Incorrect — ${q.correctName}`}
                  </p>
                  {q.hint && <p className="text-xs text-green-700"><strong>ID tip:</strong> {q.hint}</p>}
                  {q.lookalikes?.length > 0 && q.lookalikes.map((la, i) => (
                    <p key={i} className="text-[10px] text-red-400/80">Watch out for: {la.name} ({la.danger}) — {la.tip}</p>
                  ))}
                  <button onClick={handleNext} className="btn-primary mt-2 text-sm">
                    {current + 1 >= questions.length ? 'See Results' : 'Next →'}
                  </button>
                </div>
              )}

              {!selected && !showHint && <button onClick={() => setShowHint(true)} className="btn-ghost text-xs">Show Hint</button>}
              {showHint && !selected && <p className="text-xs text-yellow-500/80 mt-1">{q.hint}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────── MAIN PAGE ────────────────
export default function Training() {
  const [mode, setMode] = useState('browse');
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const { data, loading } = useApi('/field-guide');

  const species = data?.species || [];
  const categories = data?.categories || {};

  if (loading) return <LoadingSpinner message="Loading field guide..." />;

  if (selectedSpecies) {
    return <SpeciesStudy species={selectedSpecies} onBack={() => setSelectedSpecies(null)} />;
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-900 mb-1">Field Guide and Training</h1>
          <p className="text-green-700 text-sm">{species.length} edible PNW species — fungi, berries, plants, fish, marine & more</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'browse', label: 'Browse', desc: 'Field Guide' },
            { id: 'quiz', label: 'Quiz', desc: 'Photo ID' }
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === m.id ? 'bg-mushroom-gold text-black' : 'bg-green-100 text-green-800 hover:text-green-900'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'browse' && <BrowseMode species={species} categories={categories} onSelectSpecies={setSelectedSpecies} />}
      {mode === 'quiz' && <QuizMode categories={categories} />}
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="bg-green-950/40 rounded-lg px-3 py-2 border border-green-800/20">
      <p className="text-[9px] text-green-700 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-green-900 mt-0.5 capitalize">{value}</p>
    </div>
  );
}

function FactorRow({ label, value, color, inverted }) {
  const display = inverted ? `${value}/5 risk` : `${value}/5`;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-green-700">{label}</span>
      <div className="flex items-center gap-1.5">
        <FactorDots value={inverted ? 6 - value : value} max={5} color={color} />
        <span className="text-[10px] text-green-700 w-10 text-right">{display}</span>
      </div>
    </div>
  );
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthName(m) { return MONTH_NAMES[(m - 1) % 12]; }
