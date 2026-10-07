import { useRef, useState } from 'react';
import { Upload, Trash2, FileText, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/contexts/ToastContext';
import type { Attachment, Inquiry } from '@/types';
import { uploadAttachment, deleteAttachment } from '@/services/inquiries';
import { Empty, Spinner, Confirm } from '@/components/ui';
import { fmtDateTime } from '@/utils/format';

export default function AttachmentsTab({ inq, attachments }: { inq: Inquiry; attachments: Attachment[] }) {
  const { user, can } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Attachment | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || !user) return; setBusy(true);
    try { for (const f of Array.from(files)) await uploadAttachment(inq, f, user); toast(t('common.saved')); }
    catch (e: any) { toast(e?.message || t('common.error'), 'error'); } finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  };
  const fmtSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <input ref={ref} type="file" multiple className="hidden" onChange={e => onFiles(e.target.files)} />
        <button className="btn-primary" onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Spinner className="text-white" /> : <Upload size={16} />}{t('common.upload')}</button>
      </div>
      {attachments.length === 0 && <Empty />}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {attachments.map(a => (
          <div key={a.id} className="card card-body flex items-center gap-3">
            <FileText className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={a.name}>{a.name}</div>
              <div className="text-[11px] text-muted">{fmtSize(a.size)} — {a.byName} — {fmtDateTime(a.at, lang)}</div>
            </div>
            <a href={a.url} target="_blank" rel="noreferrer" className="btn-ghost p-1"><Download size={16} /></a>
            {can('inquiries.edit') && <button className="btn-ghost p-1 text-danger" onClick={() => setDel(a)}><Trash2 size={16} /></button>}
          </div>
        ))}
      </div>
      <Confirm open={!!del} onClose={() => setDel(null)} danger onConfirm={async () => { if (del) { await deleteAttachment(inq, del); setDel(null); toast(t('common.deleted')); } }} />
    </div>
  );
}
