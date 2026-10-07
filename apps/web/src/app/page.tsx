'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Property = {
  _id: string;
  title: string;
  description: string;
  type: 'house' | 'land' | 'apartment';
  listingType: 'sale' | 'rent';
  price: number;
  currency?: string;
  address: string;
  city: string;
  country: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit?: string;
  status: string;
  agent: { firstName: string; lastName: string; phone: string } | string;
};

type Category = 'all' | Property['type'];
type Account = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'agent' | 'admin';
};

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const imageByType: Record<Property['type'], string> = {
  house:
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85',
  land:
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85',
  apartment:
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85',
};

const formatPrice = (price: number, currency = 'USD') =>
  `${currency.toUpperCase()} ${new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
  }).format(price)}`;

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [listingType, setListingType] = useState<'all' | 'sale' | 'rent'>(
    'all',
  );
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/properties`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`The listings service returned ${response.status}.`);
        }
        return (await response.json()) as Property[];
      })
      .then((data) => {
        if (active) setProperties(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Listings could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/auth/me`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as Account;
      })
      .then((user) => {
        if (active && user) setAccount(user);
      })
      .catch(() => {
        if (active) setAccount(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredProperties = useMemo(() => {
    const query = search.trim().toLowerCase();
    return properties.filter((property) => {
      const matchesCategory = category === 'all' || property.type === category;
      const matchesListing =
        listingType === 'all' || property.listingType === listingType;
      const matchesQuery =
        !query ||
        `${property.title} ${property.city} ${property.country} ${property.address}`
          .toLowerCase()
          .includes(query);
      return (
        property.status === 'available' &&
        matchesCategory &&
        matchesListing &&
        matchesQuery
      );
    });
  }, [properties, category, listingType, search]);

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProperty) return;
    setSubmitting(true);
    setInquiryMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${apiUrl}/requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: selectedProperty._id,
          phone: form.get('phone'),
          message: form.get('message'),
        }),
      });
      if (!response.ok) {
        const details = (await response.json()) as { message?: string };
        throw new Error(
          Array.isArray(details.message)
            ? details.message.join(', ')
            : details.message ?? `Request failed (${response.status}).`,
        );
      }
      setSelectedProperty(null);
      setInquiryMessage('Your request is with the agent. They will be in touch.');
    } catch (error) {
      setInquiryMessage(
        error instanceof Error ? error.message : 'Your inquiry could not be sent.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');
    const form = new FormData(event.currentTarget);
    const isSignup = authMode === 'signup';
    const body = {
      ...(isSignup
        ? {
            firstName: form.get('firstName'),
            lastName: form.get('lastName'),
          }
        : {}),
      email: form.get('email'),
      password: form.get('password'),
    };
    try {
      const response = await fetch(
        `${apiUrl}/auth/${isSignup ? 'signup' : 'signin'}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json()) as {
        user?: Account;
        message?: string | string[];
      };
      if (!response.ok || !result.user) {
        throw new Error(
          Array.isArray(result.message)
            ? result.message.join(', ')
            : result.message ?? 'Could not sign in.',
        );
      }
      setAccount(result.user);
      setShowAuth(false);
      if (result.user.role !== 'client') {
        setSelectedProperty(null);
        window.location.href = '/agent';
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function signOut() {
    await fetch(`${apiUrl}/auth/signout`, {
      method: 'POST',
      credentials: 'include',
    });
    setAccount(null);
    setSelectedProperty(null);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Haven home">
          <span className="brand-mark">h</span>
          haven<span className="brand-period">.</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="active" href="#discover">Discover</a>
          <a href="#listings">Properties</a>
          <a href="#about">About us</a>
        </nav>
        <div className="account-actions">
          {account ? (
            <>
              {account.role !== 'client' ? <a className="agent-link" href="/agent">Agent workspace</a> : <a className="signin-link" href="/account">My requests</a>}
              <span className="account-name">{account.firstName}</span>
              <button className="signout-link" type="button" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <button className="signin-link" type="button" onClick={() => { setAuthMode('signin'); setShowAuth(true); }}>
                Sign in
              </button>
              <button className="agent-link" type="button" onClick={() => { setAuthMode('signup'); setShowAuth(true); }}>
                Create account <span aria-hidden="true">↗</span>
              </button>
            </>
          )}
        </div>
      </header>

      <section className="hero" id="discover">
        <div className="hero-copy">
          <p className="eyebrow"><span /> A more thoughtful way home</p>
          <h1>Find your place<br />in the <em>world.</em></h1>
          <p className="hero-description">
            From the first patch of land to the keys to your next home,
            discover spaces that feel like they were made for you.
          </p>
          <a href="#listings" className="hero-cta">
            Explore properties <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="hero-image" role="img" aria-label="Modern home nestled in a green landscape">
          <div className="hero-image-note">
            <span className="note-icon">✳</span>
            <span><strong>Good things grow here.</strong><small>Find a space for what’s next.</small></span>
          </div>
          <span className="hero-image-index">01 — 03</span>
        </div>
        <div className="hero-side-label">PLACES WITH A LITTLE MORE SOUL</div>
      </section>

      <section className="search-panel" aria-label="Search properties">
        <label className="search-location">
          <span className="field-label">LOCATION</span>
          <span className="search-input-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="City, neighborhood, or address"
              aria-label="Search by city, neighborhood, or address"
            />
          </span>
        </label>
        <label className="search-select">
          <span className="field-label">I’M LOOKING TO</span>
          <select
            value={listingType}
            onChange={(event) =>
              setListingType(event.target.value as 'all' | 'sale' | 'rent')
            }
            aria-label="Sale or rent"
          >
            <option value="all">Buy or rent</option>
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </label>
        <a className="search-button" href="#listings">Find my place <span>→</span></a>
      </section>

      <section className="listings-section" id="listings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED FOR YOU</p>
            <h2>Spaces to <em>settle into.</em></h2>
          </div>
          <p className="section-note">Good spaces, good people, and a little<br />help finding the one.</p>
        </div>

        <div className="listing-toolbar">
          <div className="category-tabs" role="group" aria-label="Filter by property type">
            {([
              ['all', 'All spaces'],
              ['house', 'Houses'],
              ['apartment', 'Apartments'],
              ['land', 'Land'],
            ] as [Category, string][]).map(([value, label]) => (
              <button
                className={category === value ? 'category-tab selected' : 'category-tab'}
                key={value}
                onClick={() => setCategory(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <span className="results-count">
            {loading ? 'Finding spaces…' : `${filteredProperties.length} spaces`}
          </span>
        </div>

        {loadError ? (
          <div className="notice" role="alert">
            <strong>We couldn’t load the listings.</strong>
            <span>{loadError} Check that the API is running at {apiUrl}.</span>
          </div>
        ) : loading ? (
          <div className="empty-state">A moment while we find your next place…</div>
        ) : filteredProperties.length === 0 ? (
          <div className="empty-state">
            <span className="empty-flower">✳</span>
            <h3>No spaces found just yet.</h3>
            <p>Try another search or check back soon for new listings.</p>
          </div>
        ) : (
          <div className="property-grid">
            {filteredProperties.map((property, index) => {
              const agent =
                typeof property.agent === 'object' ? property.agent : null;
              return (
                <article className="property-card" key={property._id}>
                  <div
                    className={`property-image property-image-${property.type}`}
                    style={{ backgroundImage: `url("${imageByType[property.type]}")` }}
                  >
                    <span className="property-kind">
                      {property.type === 'land' ? 'LAND' : property.type.toUpperCase()}
                    </span>
                    <button
                      className={favorites.includes(property._id) ? 'favorite is-favorite' : 'favorite'}
                      aria-label={favorites.includes(property._id) ? 'Remove from saved properties' : 'Save property'}
                      aria-pressed={favorites.includes(property._id)}
                      onClick={() =>
                        setFavorites((current) =>
                          current.includes(property._id)
                            ? current.filter((id) => id !== property._id)
                            : [...current, property._id],
                        )
                      }
                      type="button"
                    >
                      {favorites.includes(property._id) ? '♥' : '♡'}
                    </button>
                    <span className="photo-number">0{index + 1} / {filteredProperties.length}</span>
                  </div>
                  <div className="property-details">
                    <div className="property-price-row">
                      <p className="property-price">
                        {formatPrice(property.price, property.currency)}
                        <span> / {property.listingType === 'rent' ? 'month' : 'total'}</span>
                      </p>
                      <span className="listing-badge">{property.listingType === 'rent' ? 'FOR RENT' : 'FOR SALE'}</span>
                    </div>
                    <h3>{property.title}</h3>
                    <p className="property-location">{property.city}, {property.country}</p>
                    <div className="property-meta">
                      {property.bedrooms !== undefined && <span><b>⌂</b> {property.bedrooms} beds</span>}
                      {property.bathrooms !== undefined && <span><b>◌</b> {property.bathrooms} baths</span>}
                      {property.area !== undefined && <span><b>↗</b> {property.area} {property.areaUnit ?? 'sqm'}</span>}
                    </div>
                    <div className="card-footer">
                      <span className="agent-name">
                        <span className="agent-avatar">{agent?.firstName.charAt(0) ?? 'H'}</span>
                        {agent ? `${agent.firstName} ${agent.lastName}` : 'Local agent'}
                      </span>
                      <button
                        className="contact-agent"
                        onClick={() => {
                          setInquiryMessage('');
                          setSelectedProperty(property);
                          if (account?.role !== 'client') {
                            setAuthMode('signin');
                            setAuthError(
                              account
                                ? 'Sign out of the agent account and sign in as a client to request a property.'
                                : '',
                            );
                            setShowAuth(true);
                          }
                        }}
                        type="button"
                      >
                        {property.listingType === 'rent' ? 'Request to rent' : 'Request to buy'} <span>↗</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="closing-banner" id="about">
        <span className="closing-mark">✳</span>
        <div>
          <p className="eyebrow">A GOOD MOVE STARTS HERE</p>
          <h2>Every place has a story.<br /><em>Let’s find yours.</em></h2>
        </div>
        <a href="#listings">Explore the collection <span>↗</span></a>
      </section>

      <footer className="footer">
        <a className="brand" href="#" aria-label="Haven home"><span className="brand-mark">h</span>haven<span className="brand-period">.</span></a>
        <p>Good spaces. Good people. A place to begin.</p>
        <span>© 2026 Haven Realty</span>
      </footer>

      {selectedProperty && account?.role === 'client' && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedProperty(null);
        }}>
          <section className="inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title">
            <button className="modal-close" onClick={() => setSelectedProperty(null)} type="button" aria-label="Close">×</button>
            <p className="eyebrow">LET’S GET YOU CLOSER</p>
            <h2 id="inquiry-title">Ask about <em>{selectedProperty.title}</em></h2>
            <p className="modal-intro">Your request will go to the agent. They’ll follow up to discuss next steps.</p>
            <form onSubmit={submitInquiry}>
              <label>Phone number<input name="phone" required minLength={1} /></label>
              <label>Message to the agent<textarea name="message" required minLength={1} defaultValue={`Hi, I’m interested in ${selectedProperty.listingType === 'rent' ? 'renting' : 'buying'} this property. Please contact me with the next steps.`} /></label>
              {inquiryMessage && <p className="form-message" role="alert">{inquiryMessage}</p>}
              <button className="submit-inquiry" type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send inquiry'} <span>→</span>
              </button>
            </form>
          </section>
        </div>
      )}
      {showAuth && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowAuth(false);
        }}>
          <section className="inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="modal-close" onClick={() => setShowAuth(false)} type="button" aria-label="Close">×</button>
            <p className="eyebrow">{authMode === 'signup' ? 'A PLACE TO BEGIN' : 'WELCOME BACK'}</p>
            <h2 id="auth-title">{authMode === 'signup' ? <>Make yourself <em>at home.</em></> : <>Good to see <em>you again.</em></>}</h2>
            <p className="modal-intro">Clients can save their details and send property requests to local agents.</p>
            <form onSubmit={submitAuth}>
              {authMode === 'signup' && (
                <div className="name-fields">
                  <label>First name<input name="firstName" autoComplete="given-name" required minLength={1} /></label>
                  <label>Last name<input name="lastName" autoComplete="family-name" required minLength={1} /></label>
                </div>
              )}
              <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} /></label>
              {authError && <p className="form-message" role="alert">{authError}</p>}
              <button className="submit-inquiry" type="submit" disabled={authSubmitting}>
                {authSubmitting ? 'Please wait…' : authMode === 'signup' ? 'Create client account' : 'Sign in'} <span>→</span>
              </button>
            </form>
            <p className="auth-switch">
              {authMode === 'signup' ? 'Already have an account?' : 'New to Haven?'}
              <button type="button" onClick={() => { setAuthError(''); setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); }}>
                {authMode === 'signup' ? 'Sign in' : 'Create a client account'}
              </button>
            </p>
          </section>
        </div>
      )}
      {inquiryMessage && !selectedProperty && (
        <div className="toast" role="status">{inquiryMessage}</div>
      )}
    </main>
  );
}
