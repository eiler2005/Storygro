// Bundle entry: Storygro's real scene module + kit, unmodified (read-only imports from the repo root).
import * as kit from '../../../runtime/kit.js';
import hook from '../../../scenes/headline.js';
export const mountHook = (root, ctx) => hook.mount(root, { ...ctx, kit });
