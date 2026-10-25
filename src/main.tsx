import { installChunkRecovery } from './router/chunkRecovery';
import { isDemoSessionActive } from './demo/mode';

installChunkRecovery();

// Demo Account runs inside this same SPA and router. Choose the module graph
// before importing the app: the demo graph swaps every backend transport for
// local adapters, so live Firebase/session modules never load in demo mode and
// the demo can never touch a real session.
if (isDemoSessionActive()) void import('./demo/bootstrap');
else void import('./liveApp');
