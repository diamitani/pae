import { useState, type ChangeEvent } from 'react';
import {
  Check,
  Database,
  FileText,
  Loader2,
  LogIn,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { CampaignDocType, WorkspaceAccount } from '../types/harness';
import {
  GoogleAuthProvider,
  OperationType,
  auth,
  db,
  doc,
  handleFirestoreError,
  setDoc,
  signInWithPopup,
} from '../firebase';

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: WorkspaceAccount;
  onAccountUpdated: (nextAccount: WorkspaceAccount) => void;
  onUploadDocument: (
    name: string,
    docType: CampaignDocType,
    content: string
  ) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  isUploadingDoc: boolean;
}

export function AuthPortalModal({
  isOpen,
  onClose,
  account,
  onAccountUpdated,
  onUploadDocument,
  onDeleteDocument,
  isUploadingDoc,
}: AuthPortalModalProps) {
  const [emailInput, setEmailInput] = useState(account.email);
  const [workspaceInput, setWorkspaceInput] = useState(account.workspaceName);
  const [domainInput, setDomainInput] = useState(account.companyDomain);
  const [docType, setDocType] = useState<CampaignDocType>('pitch_deck');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePortalSignIn = async () => {
    if (!emailInput.trim()) return;
    setIsSigningIn(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          workspaceName: workspaceInput.trim(),
          companyDomain: domainInput.trim(),
          authProvider: 'workspace_portal',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to sign in.');
      onAccountUpdated(data.account);
      setFeedback(`Signed in to ${data.account.workspaceName} (${data.account.email}).`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleFirebaseSignIn = async () => {
    setIsSigningIn(true);
    setFeedback(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;
      const email = user.email || emailInput;
      const domain = email.includes('@') ? email.split('@')[1] : domainInput;

      // Sync to Firestore workspace document
      const wsPath = `workspaces/${user.uid}`;
      try {
        await setDoc(
          doc(db, 'workspaces', user.uid),
          {
            ownerId: user.uid,
            email,
            workspaceName: workspaceInput || `${user.displayName || 'GTM'} Workspace`,
            companyDomain: domain,
            activeWorkflowName: 'SalesGency Campaign',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.WRITE, wsPath);
      }

      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          workspaceName: workspaceInput || `${user.displayName || 'GTM'} Workspace`,
          companyDomain: domain,
          authProvider: 'google_firebase',
        }),
      });
      const data = await res.json();
      if (res.ok && data.account) {
        onAccountUpdated(data.account);
        setEmailInput(data.account.email);
        setWorkspaceInput(data.account.workspaceName);
        setDomainInput(data.account.companyDomain);
      }
      setFeedback(`Authenticated via Google & synced workspace (${email}).`);
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or blocked by popup settings.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await onUploadDocument(file.name, docType, text);
    e.target.value = '';
    setFeedback(`Uploaded "${file.name}" and synced to ${account.email}.`);
  };

  const handleSavePastedDoc = async () => {
    if (!pasteContent.trim()) return;
    const name = pasteTitle.trim() || `${docType}_${Date.now()}.md`;
    await onUploadDocument(name, docType, pasteContent);
    setPasteTitle('');
    setPasteContent('');
    setFeedback(`Saved "${name}" to ${account.email}.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/60">
          <div>
            <div className="text-xs font-mono text-sky-600">
              Sign-In Portal · Persistent GTM Account Vault
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
              {account.workspaceName} ({account.email})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {feedback && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Account Credentials & Workspace Binding */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Account Email
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Workspace Name
              </label>
              <input
                type="text"
                value={workspaceInput}
                onChange={(e) => setWorkspaceInput(e.target.value)}
                placeholder="Acme GTM Workspace"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Company Domain
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="acme.com"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Database className="w-3.5 h-3.5 text-sky-600" />
                <span>
                  Documents & campaigns sync to your workspace account + Firestore/Supabase schema.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGoogleFirebaseSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-600" />
                  <span>Google Cloud Auth</span>
                </button>

                <button
                  type="button"
                  onClick={handlePortalSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSigningIn ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Switch / Save Account</span>
                </button>
              </div>
            </div>
          </div>

          {/* Document Vault Uploader */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Account Document Vault ({account.documents.length} uploaded)
                </h3>
                <p className="text-xs text-slate-500">
                  Upload pitch decks, ICP briefs, CSV lead lists, case studies, or API docs to ground Enably & all 6 steps.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as CampaignDocType)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="pitch_deck">Pitch Deck / Offer</option>
                  <option value="icp_brief">ICP / Persona Doc</option>
                  <option value="case_study">Case Study / Proof</option>
                  <option value="lead_csv">CSV Lead List</option>
                  <option value="api_spec">Tool / API Spec</option>
                </select>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 cursor-pointer">
                  {isUploadingDoc ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".md,.txt,.csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Paste Note / Doc Option */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="Document title (e.g. Q4_Enterprise_Deck.md)"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleSavePastedDoc}
                  disabled={isUploadingDoc || !pasteContent.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                >
                  Save Note to Account
                </button>
              </div>
              <textarea
                rows={2}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Or paste raw pitch deck notes, sales call transcripts, ICP criteria, or custom API docs here..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            {/* Uploaded Documents List */}
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
              {account.documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No documents uploaded yet. Upload a file or paste notes above to ground your campaign.
                </div>
              ) : (
                account.documents.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 flex items-start justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="font-semibold text-slate-900">{d.name}</span>
                        <span className="font-mono text-[11px] text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                          {d.docType}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{d.extractedSummary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(d.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                      title="Remove document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Workspace ID: {account.id}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
