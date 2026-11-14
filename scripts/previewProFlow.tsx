/** Standalone local UI preview. Not imported by index.ts or shipped in the app. */
import { useRef, useState } from 'react';
import { AppRegistry, Text, View } from 'react-native';
import ProPaywallView from '../src/components/proPaywallView';
import { createProActionGuard } from '../src/lib/proActionGuard';
import { sceneForIntent, type ProIntent, type ProScene, type PurchasePhase } from '../src/lib/proFlow';
import { useTheme } from '../src/theme';
import { PRODUCT_NAME } from '../src/seo/brand';

const states = ['ready', 'loading', 'purchasing', 'pending', 'purchased', 'restored', 'cancelled', 'unavailable', 'error'] as const;
type PreviewState = typeof states[number];
const tasks: Record<string, ProIntent> = {
  calibration: { kind: 'calibration' }, feasibility: { kind: 'feasibility', screen: 'Offset' },
  history: { kind: 'history' }, export: { kind: 'export' }, bender: { kind: 'bender' },
};
const params = new URLSearchParams(window.location.search);
const initial = states.includes(params.get('state') as PreviewState) ? params.get('state') as PreviewState : 'ready';
const initialTask = tasks[params.get('task') ?? 'calibration'] ?? tasks.calibration;

function Preview() {
  const theme = useTheme();
  const [state, setState] = useState<PreviewState>(initial);
  const [intent, setIntent] = useState<ProIntent>(initialTask);
  const [scene, setScene] = useState<ProScene>(() => sceneForIntent(initialTask));
  const [message, setMessage] = useState('');
  const guard = useRef(createProActionGuard());
  const phase: PurchasePhase = state === 'ready' || state === 'unavailable' ? 'idle' : state;
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <View style={{ padding: 4, gap: 4, backgroundColor: theme.colors.primary }}>
      <Text style={{ color: theme.colors.onPrimary, fontSize: 14 }}>{PRODUCT_NAME} · preview (no purchase) {message}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <select aria-label="Preview state" value={state} onChange={(event) => { setState(event.target.value as PreviewState); setMessage(''); guard.current = createProActionGuard(); }} style={{ minHeight: 36, flex: 1 }}>
          {states.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Preview task" value={intent.kind} onChange={(event) => { const next = tasks[event.target.value]; setIntent(next); setScene(sceneForIntent(next)); guard.current = createProActionGuard(); }} style={{ minHeight: 36, flex: 1 }}>
          {Object.keys(tasks).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </View>
    </View>
    <ProPaywallView
      phase={phase} intent={intent} scene={scene}
      unlocked={state === 'purchased' || state === 'restored'}
      available={state !== 'unavailable'} price={state === 'unavailable' ? null : 'US$4.99'}
      error={state === 'error' ? 'Store connection failed. Your free calculators still work.' : state === 'cancelled' ? 'Purchase cancelled.' : null}
      onSceneChange={setScene}
      onBuy={() => { setState('purchasing'); setMessage(''); }}
      onRetry={() => { if (state === 'unavailable' || state === 'error') setState('ready'); setMessage('Status checked (simulation)'); }}
      onRestore={() => setState('restored')}
      onClose={() => setMessage('Would return to your original screen')}
      onContinue={() => {
        if (!guard.current.begin('continue')) return;
        setMessage(`Next action: ${intent.kind}`);
        guard.current.end('continue');
      }}
    />
  </View>;
}

AppRegistry.registerComponent('ProFlowPreview', () => Preview);
AppRegistry.runApplication('ProFlowPreview', { rootTag: document.getElementById('root') });
