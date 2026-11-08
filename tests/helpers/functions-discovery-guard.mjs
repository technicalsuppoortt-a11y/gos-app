// Manifest generation is build work. Fail if it tries to call a network or
// load request-only audio decoders; never fall back to production services.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { registerHooks } from 'node:module';

const blocked = () => { throw new Error('Network access is forbidden during Functions discovery.'); };
globalThis.fetch = blocked;
http.request = http.get = https.request = https.get = blocked;
net.Socket.prototype.connect = blocked;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'music-metadata') throw new Error('Audio decoders must load only when handling a voice request.');
    return nextResolve(specifier, context);
  },
});
