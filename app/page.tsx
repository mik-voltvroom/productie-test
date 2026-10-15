const mobiloxPhotos = [
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
];

const studioActions = [
  { label: "Foto's uploaden", icon: "⬆" },
  { label: "Fotosessie starten", icon: "◉" },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="media-panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">VVOS / VOERTUIG / MEDIA</p>
            <h1>Fotobeheer</h1>
          </div>
          <div className="icon-badge">🖼</div>
        </header>

        <div className="module module-external">
          <div className="module-head">
            <div className="module-title">
              <span className="module-icon">🖼</span>
              <strong>Mobilox Foto's</strong>
            </div>
            <span className="tag">Externe bron</span>
          </div>

          <p className="muted">Bestaande voertuigfoto's vanuit de Mobilox-koppeling.</p>

          <div className="thumb-row">
            {mobiloxPhotos.map((photo, index) => (
              <div key={index} className="thumb-card">
                <img src={photo} alt={`Mobilox foto ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="module module-local">
          <div className="module-head">
            <div className="module-title">
              <span className="module-icon">⟳</span>
              <strong>VV 360° Studio</strong>
            </div>
            <span className="tag success">Eigen media</span>
          </div>

          <p className="muted">Beheer rechtstreeks geüploade foto's, 360°-sessies, AI-bewerking en publicatie.</p>

          <div className="action-grid">
            {studioActions.map((action) => (
              <button key={action.label} className="action-card" type="button">
                <span className="action-icon">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <div className="session-row">
            <span className="muted small">360°-sessie</span>
            <span className="tag">Niet gestart</span>
          </div>
        </div>

        <p className="caption">Conceptuele indeling van de twee onafhankelijke fotomodules in VVOS.</p>
      </section>
    </main>
  );
}
