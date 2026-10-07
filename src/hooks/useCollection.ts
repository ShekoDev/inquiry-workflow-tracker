import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, type QueryConstraint, type DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';

/** Live collection subscription. `deps` re-subscribes; pass constraints built inside useMemo. */
export function useCollection<T = DocumentData>(path: string | null, constraints: QueryConstraint[] = [], deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setData([]); setLoading(false); return; }
    setLoading(true);
    const off = onSnapshot(query(collection(db, path), ...constraints), (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...(d.data() as object) })) as T[]);
      setLoading(false); setError(null);
    }, (e) => {
      // A missing composite index or a rules rejection lands here — make it visible instead of showing an empty list.
      console.error(`[PIQCS] query failed on "${path}":`, e.message);
      setError(e.message); setLoading(false);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  return { data, loading, error };
}

export function useDoc<T = DocumentData>(path: string | null, id: string | null | undefined) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!(path && id));
  useEffect(() => {
    if (!path || !id) { setData(null); setLoading(false); return; }
    setLoading(true);
    const off = onSnapshot(doc(db, path, id), (s) => { setData(s.exists() ? ({ id: s.id, ...(s.data() as object) } as T) : null); setLoading(false); }, () => setLoading(false));
    return off;
  }, [path, id]);
  return { data, loading };
}
