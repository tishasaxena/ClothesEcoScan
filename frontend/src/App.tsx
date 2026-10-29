import { useCallback, useEffect, useRef, useState } from 'react';
import { HistoryView } from './components/HistoryView';
import { ResultView } from './components/ResultView';
import { RewardsView } from './components/RewardsView';
import { ScanView } from './components/ScanView';
import { Icon, type IconName } from './components/Icon';
import { Welcome, shouldShowWelcome } from './components/Welcome';
import { api, connect } from './lib/api';
import { CountUp } from './lib/motion';
import { openPicker, useIsTouchDevice, usePickerWatch } from './lib/picker';
import { OfferSheet } from './components/OfferSheet';
import { PickerToast } from './components/PickerToast';
import { useHashRoute, type Route } from './lib/router';
import { getThumb } from './lib/thumbs';
import type { Me, Offer, Redemption, Reference, ScanResponse } from './lib/types';

type Tab = 'scan' | 'rewards' | 'history';

export default function App() {
  const { route, navigate, back } = useHashRoute();
  const tab: Tab = route.name === 'rewards' ? 'rewards' : route.name === 'wardrobe' ? 'history' : 'scan';
  const [me, setMe] = useState<Me>();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reference, setReference] = useState<Reference>();
  const [recognizer, setRecognizer] = useState<string>();
  const [result, setResult] = useState<{ data: ScanResponse; photos: string[] }>();
  const [welcome, setWelcome] = useState(shouldShowWelcome);
  const [incoming, setIncoming] = useState<{ blob: Blob; name: string }>();
  const isTouch = useIsTouchDevice();
  const tabCamera = usePickerWatch();
  const [redeeming, setRedeeming] = useState<{ offer: Offer; redemption?: Redemption; error?: string; busy?: boolean }>();
  const [loadError, setLoadError] = useState<string>();

  const refreshMe = useCallback(() => api.me().then(setMe), []);

  useEffect(() => {
    // Connect first: if the backend can't be reached, the API client switches to its in-browser fallback.
    connect()
      .then(({ recognizer }) => {
        setRecognizer(recognizer);
        return Promise.all([refreshMe(), api.offers().then(setOffers), api.reference().then(setReference)]);
      })
      .catch(() => setLoadError('Something went wrong while loading EcoScan. Please reload the page.'));
  }, [refreshMe]);

  const go = (t: Tab) =>
    navigate(t === 'rewards' ? { name: 'rewards' } : t === 'history' ? { name: 'wardrobe' } : { name: 'scan' });

  const openScan = (id: string) => navigate({ name: 'result', id });

  // Keep the shown result in step with the route: load it when arriving at a result URL (e.g. via Back/Forward).
  const resultRef = useRef(result);
  resultRef.current = result;
  useEffect(() => {
    setRedeeming(undefined);
    if (route.name !== 'result') return;
    if (resultRef.current?.data.scan.id === route.id) return;
    let cancelled = false;
    api
      .getScan(route.id)
      .then((data) => {
        if (cancelled) return;
        const thumb = getThumb(route.id);
        setResult({ data, photos: thumb ? [thumb] : [] });
      })
      .catch(() => !cancelled && navigate({ name: 'scan' }, { replace: true }));
    return () => {
      cancelled = true;
    };
  }, [route, navigate]);

  const showResult = route.name === 'result' && result?.data.scan.id === route.id;
  const backLabel: Record<Route['name'], string> = { scan: '', result: 'Back', rewards: 'Back', wardrobe: 'Back' };

  const confirmRedeem = async () => {
    if (!redeeming) return;
    setRedeeming({ ...redeeming, busy: true, error: undefined });
    try {
      const { redemption, user } = await api.redeem(redeeming.offer.id);
      setMe(user);
      setRedeeming({ offer: redeeming.offer, redemption });
    } catch (err) {
      setRedeeming({ ...redeeming, busy: false, error: (err as Error).message });
    }
  };

  return (
    <div className="app">
      <div className="rail">
        <header className="topbar">
          <button className="brand" onClick={() => go('scan')}>
            <span className="brand-mark" aria-hidden>
              <Icon name="leaf" size={18} />
            </span>
            EcoScan
          </button>
          <button className="balance" onClick={() => go('rewards')} aria-label={`${me?.points ?? 0} eco points`}>
            <Icon name="spark" size={16} />
            <span key={me?.points ?? 0} className="bump">
              <CountUp value={me?.points ?? 0} />
            </span>
            <span className="balance-unit">pts</span>
          </button>
        </header>

        <nav className="tabbar" aria-label="Sections">
          {/* Scan sits in the middle on phones (raised); CSS moves it to the top of the desktop rail. */}
          {(
            [
              ['rewards', 'gift', 'Rewards'],
              ['scan', 'scan', 'Scan'],
              ['history', 'hanger', 'Wardrobe'],
            ] as [Tab, IconName, string][]
          ).map(([id, icon, label]) => {
            const content = (
              <>
                <span className="tab-icon">
                  <Icon name={icon} size={id === 'scan' ? 26 : 22} />
                </span>
                {label}
              </>
            );
            // On phones, Scan opens the camera straight away.
            if (id === 'scan' && isTouch) {
              return (
                <button
                  key={id}
                  className={`tab-btn tab-${id} ${tab === id ? 'active' : ''}`}
                  aria-label="Scan: open the camera"
                  onClick={() => {
                    if (tabCamera.watch('camera')) openPicker('tab-camera-input');
                    go('scan');
                  }}
                >
                  {content}
                </button>
              );
            }
            return (
              <button
                key={id}
                className={`tab-btn tab-${id} ${tab === id ? 'active' : ''}`}
                onClick={() => go(id)}
                aria-current={tab === id ? 'page' : undefined}
              >
                {content}
              </button>
            );
          })}
        </nav>
        <PickerToast kind={tabCamera.opening} />
        <input
          id="tab-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          tabIndex={-1}
          onChange={(e) => {
            tabCamera.clear();
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setIncoming({ blob: file, name: file.name });
            go('scan');
          }}
        />

        <p className="rail-note">
          Scores use average emission factors from public textile LCA data. They’re estimates, good for comparing choices.
        </p>
      </div>

      <main key={routeKey(route)} className="view">
        {route.name !== 'scan' && (
          <button className="back-btn" onClick={back}>
            <Icon name="arrow" size={18} className="back-icon" /> {backLabel[route.name]}
          </button>
        )}
        {loadError && <p className="banner error">{loadError}</p>}
        {(recognizer === 'mock' || recognizer === 'demo' || recognizer === 'offline') && route.name === 'scan' && (
          <p className="banner subtle">
            {recognizer === 'offline'
              ? 'Offline mode: the EcoScan server isn’t reachable, so the app is running entirely in your browser. Scoring, points and rewards all work, photos are matched to sample garments, and data stays on this device.'
              : recognizer === 'demo'
                ? 'Photos you take or upload are identified by Claude, which asks your permission first. The sample buttons use built-in examples.'
                : 'Demo mode: photos are matched to sample garments. Add a Gemini, Anthropic or OpenAI API key to backend/.env for real recognition.'}
          </p>
        )}

        {route.name === 'result' && !showResult && <p className="muted center-text">Loading scan…</p>}
        {(route.name === 'scan' || route.name === 'result') &&
          (showResult && result ? (
            <ResultView
              result={result.data}
              photos={result.photos}
              reference={reference}
              me={me}
              onChange={(data) => setResult({ ...result, data })}
              onClaimed={(scan, user) => {
                setMe(user);
                setResult({ ...result, data: { ...result.data, scan } });
              }}
              onRedeem={(offer) => setRedeeming({ offer })}
              onScanAgain={() => go('scan')}
            />
          ) : route.name === 'scan' ? (
            <ScanView
              me={me}
              incoming={incoming}
              onIncomingUsed={() => setIncoming(undefined)}
              externalPickerBlocked={tabCamera.blocked}
              onOpenScan={openScan}
              onSeeWardrobe={() => go('history')}
              onResult={(data, photos) => {
                setResult({ data, photos });
                refreshMe();
                navigate({ name: 'result', id: data.scan.id });
              }}
            />
          ) : null)}
        {tab === 'rewards' && (
          <RewardsView me={me} offers={offers} onRedeem={(offer) => setRedeeming({ offer })} onScan={() => go('scan')} />
        )}
        {tab === 'history' && <HistoryView me={me} onScan={() => go('scan')} onOpen={openScan} onGo={(to) => go(to)} />}
      </main>

      {welcome && <Welcome onDone={() => setWelcome(false)} />}

      {redeeming && (
        <OfferSheet
          offer={redeeming.offer}
          balance={me?.points ?? 0}
          redemption={redeeming.redemption}
          error={redeeming.error}
          busy={redeeming.busy}
          onClose={() => setRedeeming(undefined)}
          onRedeem={confirmRedeem}
          onEarnMore={() => {
            setRedeeming(undefined);
            go('scan');
          }}
        />
      )}
    </div>
  );
}

function routeKey(route: Route) {
  return route.name === 'result' ? `result-${route.id}` : route.name;
}
