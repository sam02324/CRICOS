/**
 * Template store — saved match rule-sets.
 *
 * Templates already live in `historyStore` (persisted via AsyncStorage under
 * `cricos:templates`). To avoid two competing copies of the same persisted
 * state, this hook is a thin, focused adapter over that store: components that
 * only care about templates can use `useTemplateStore()` without pulling in the
 * whole history surface. The underlying data and persistence are unchanged.
 */
import { MatchTemplate } from '@/types/cricket';
import { useHistoryStore } from '@/store/historyStore';

export interface TemplateStore {
  templates: MatchTemplate[];
  /** Persist a new template built from a match's rule-set. */
  addTemplate: (t: Omit<MatchTemplate, 'id'>) => Promise<void>;
  /** Remove a saved template by id. */
  deleteTemplate: (id: string) => Promise<void>;
  /** Reload templates (and history) from storage. */
  refresh: () => Promise<void>;
}

/** Convenience selector-hook scoped to templates only. */
export function useTemplateStore(): TemplateStore {
  const templates = useHistoryStore((s) => s.templates);
  const addTemplate = useHistoryStore((s) => s.addTemplate);
  const deleteTemplate = useHistoryStore((s) => s.deleteTemplate);
  const refresh = useHistoryStore((s) => s.refresh);
  return { templates, addTemplate, deleteTemplate, refresh };
}

/** Build a template payload from a full match (no id — the store assigns one). */
export function templateFromMatch(name: string, m: {
  format: MatchTemplate['format'];
  totalOvers: number;
  playersPerSide: number;
  rules: MatchTemplate['rules'];
}): Omit<MatchTemplate, 'id'> {
  return { name, format: m.format, totalOvers: m.totalOvers, playersPerSide: m.playersPerSide, rules: m.rules };
}
