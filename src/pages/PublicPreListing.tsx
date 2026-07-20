import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { BrandingContext } from '../contexts/BrandingContextDefinition';
import api, { resolveApiBaseUrl } from '../lib/api';

type Requirement = {
  id: string;
  type: string;
  name: string;
  description?: string;
  required: boolean;
  submitted: boolean;
  group?: string;
};
type SubmittedDoc = Requirement & { id?: string; fileUrl?: string; fileName?: string; fileSize?: number };

type TurnstileApi = {
  render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export default function PublicPreListing() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    gender: 'MALE',
    address: '',
    phoneNumber: '',
    remarks: ''
  });
  const [status, setStatus] = useState<string | null>(null);
  const [filesByReq, setFilesByReq] = useState<Record<string, File | null>>({});
  const [previewsByReq, setPreviewsByReq] = useState<Record<string, string>>({});
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  interface PreListingDetails {
    id: string;
    user?: { firstName?: string; lastName?: string; email?: string; username?: string };
    dateOfBirth?: string | Date;
    gender?: string;
    address?: string;
    phoneNumber?: string;
    remarks?: string;
    documentsRequired?: Requirement[];
    documentsSubmitted?: Array<Requirement & { fileUrl?: string; fileName?: string; fileSize?: number }>;
    createdAt?: string | Date;
  }
  const [details, setDetails] = useState<PreListingDetails | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const siteKey = (import.meta.env.VITE_TURNSTILE_SITEKEY || '') as string;
  const tsContainerRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const branding = useContext(BrandingContext);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/public/pre-listing/requirements');
        if (res.data?.success) setRequirements(res.data.data);
      } catch {
        setRequirements([
          {
            id: 'prelist-freshmen-grade',
            type: 'first_sem_grade_fresh_2025_2026',
            name: 'Photocopy of First Semester Report Card (S.Y. 2025–2026)',
            description: 'First Semester Report Card for S.Y. 2025–2026',
            required: true,
            submitted: false,
            group: 'freshmen'
          },
          {
            id: 'prelist-freshmen-coe',
            type: 'coe_second_sem_fresh_2025_2026',
            name: 'Certificate of Enrollment (CoE) for Second Semester (S.Y. 2025–2026)',
            description: 'Certificate of Enrollment (CoE) for the Second Semester of S.Y. 2025–2026',
            required: true,
            submitted: false,
            group: 'freshmen'
          },
          {
            id: 'prelist-grade12-card',
            type: 'grade12_report_card',
            name: 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
            description: 'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters',
            required: true,
            submitted: false,
            group: 'grade12'
          },
          {
            id: 'prelist-als-cert',
            type: 'als_certificate',
            name: 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
            description: 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test',
            required: true,
            submitted: false,
            group: 'als'
          },
          {
            id: 'prelist-transferee-tor',
            type: 'transferee_tor',
            name: 'Photocopy of Transcript of Records (TOR) or Informative Copy of Grades',
            description: 'Transcript of Records (TOR) or Informative Copy of Grades from previous school',
            required: true,
            submitted: false,
            group: 'transferee'
          },
          {
            id: 'prelist-transferee-hd',
            type: 'transferee_hd',
            name: 'Certificate of Transfer Credential / Honorable Dismissal',
            description: 'Certificate of Transfer Credential or Honorable Dismissal from previous school',
            required: false,
            submitted: false,
            group: 'transferee'
          }
        ]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    const existing = document.querySelector('script[data-turnstile]') as HTMLScriptElement | null;
    const render = () => {
      if (tsContainerRef.current && window.turnstile) {
        window.turnstile.render(tsContainerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => setTurnstileToken(token)
        });
      }
    };
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.setAttribute('data-turnstile', 'true');
      s.onload = render;
      document.body.appendChild(s);
    } else {
      render();
    }
  }, [siteKey]);

  const update = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  const getAssetBaseUrl = () => {
    const apiBaseUrl = resolveApiBaseUrl();
    if (apiBaseUrl.startsWith('http')) {
      try {
        return new URL(apiBaseUrl).origin;
      } catch {
        return 'http://localhost:3001';
      }
    }
    return 'http://localhost:3001';
  };

  const formatDate10 = (value: string | Date | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    try {
      return new Date(value).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  interface PreListingPayload {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    phoneNumber?: string;
    remarks?: string;
    'cf-turnstile-response'?: string;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const payload: PreListingPayload = { ...form };
      if (turnstileToken) payload['cf-turnstile-response'] = turnstileToken;
      const res = await api.post('/public/pre-listing', payload);
      if (res.data?.success) {
        let msg = 'Submitted successfully';
        const studentId = res.data?.data?.id;
        const uploads: Array<Promise<void>> = [];
        if (studentId) {
          Object.entries(filesByReq).forEach(([reqId, f]) => {
            if (f) {
              const fd = new FormData();
              fd.append('studentId', studentId);
              fd.append('requirementId', reqId);
              fd.append('screenshot', f);
              if (turnstileToken) fd.append('cf-turnstile-response', turnstileToken);
              uploads.push(
                api
                  .post('/public/pre-listing/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                  .then(() => {})
              );
            }
          });
        }
        if (uploads.length > 0) {
          try {
            await Promise.all(uploads);
            msg = 'Submitted and screenshots uploaded';
          } catch (err: unknown) {
            const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
            msg = message || 'Submitted but some uploads failed';
          }
        }
        setStatus(msg);
        setForm({ firstName: '', lastName: '', email: '', dateOfBirth: '', gender: 'MALE', address: '', phoneNumber: '', remarks: '' });
        setFilesByReq({});
        setPreviewsByReq({});
        setTurnstileToken('');
        if (res.data?.data?.id) {
          try {
            const d = await api.get(`/public/pre-listing/${res.data.data.id}`);
            setDetails(d.data?.data || null);
          } catch {
            setDetails(null);
          }
          setStep(3);
        } else {
          setStep(1);
        }
      } else {
        setStatus('Submission failed');
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setStatus(message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    const headerText = 'Benedict College, Alicia, Bohol, Philippines';

    if (branding?.logoUrl) {
      try {
        const logoBlob = await fetch(branding.logoUrl).then(r => r.blob());
        const logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(logoBlob);
        });
        const logoW = 24;
        const logoH = 24;
        doc.addImage(logoDataUrl, 'PNG', 14, y, logoW, logoH);
      } catch { /* noop */ }
    }

    doc.setFontSize(16);
    doc.text(headerText, pageWidth / 2, y + 8, { align: 'center' });
    y += 30;

    doc.setFontSize(14);
    doc.text('Student Pre-Listing Details', 14, y); y += 8;
    doc.setFontSize(11);
    if (details) {
      doc.text(`Name: ${details.user?.firstName} ${details.user?.lastName}`, 14, y); y += 6;
      doc.text(`Email: ${details.user?.email}`, 14, y); y += 6;
      doc.text(`Birth Date: ${formatDate10(details.dateOfBirth)}`, 14, y); y += 6;
      doc.text(`Gender: ${details.gender}`, 14, y); y += 6;
      if (details.address) {
        const addrLines = doc.splitTextToSize(`Address: ${details.address}`, 180);
        doc.text(addrLines, 14, y);
        y += addrLines.length * 6;
      }
      if (details.phoneNumber) { doc.text(`Phone: ${details.phoneNumber}`, 14, y); y += 6; }
      if (details.remarks) {
        doc.text(`Remarks:`, 14, y);
        y += 6;
        const lines = doc.splitTextToSize(details.remarks, 180);
        doc.text(lines, 14, y);
        y += (lines.length * 6) + 4;
      }
      y += 4;
      doc.text('Requirements:', 14, y); y += 6;
      for (const r of (details.documentsRequired || [])) {
        doc.text(`• ${r.name}${r.submitted ? ' (submitted)' : ''}`, 18, y); y += 6;
        const preview = previewsByReq[r.id];
        if (preview && filesByReq[r.id] && filesByReq[r.id]?.type !== 'application/pdf') {
          try {
            const imgBlob = await fetch(preview).then(res => res.blob());
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(imgBlob);
            });
            doc.addImage(dataUrl, 'PNG', 18, y, 40, 30);
            y += 34;
          } catch { void 0; }
        }
      }
    }
    if (details) {
      const assetBase = getAssetBaseUrl();
      for (const s of (details.documentsSubmitted || [])) {
        if (!s?.fileUrl) continue;
        let fullUrl = '';
        try { fullUrl = new URL(s.fileUrl || '', assetBase).toString(); } catch { fullUrl = `${assetBase}${s.fileUrl || ''}`; }
        try {
          const blob = await fetch(fullUrl).then(r => r.blob());
          if (blob.type && blob.type !== 'application/pdf') {
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(blob);
            });
            doc.text(`• ${s.name || s.fileName || 'Submitted file'}`, 18, y); y += 6;
            doc.addImage(dataUrl, 'PNG', 18, y, 40, 30);
            y += 34;
          } else {
            doc.text(`• ${s.name || s.fileName || 'Submitted file'} (PDF)`, 18, y); y += 6;
          }
        } catch { void 0; }
      }
    }
    doc.setFontSize(10);
    doc.text('info@benedictcollege.com', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.save('pre-listing.pdf');
  };


  const canProceed = useMemo(() => {
    // Basic form validation
    const isFormValid = form.firstName && form.lastName && form.email && form.dateOfBirth && form.gender && form.address;
    
    // Requirement validation: specific group must be selected and satisfied
    if (!selectedGroup) return false;

    const groupReqs = requirements.filter(r => r.group === selectedGroup);
    const allFilesUploaded = groupReqs.every(r => !r.required || filesByReq[r.id]);

    return isFormValid && allFilesUploaded && privacyAccepted;
  }, [form, filesByReq, selectedGroup, requirements, privacyAccepted]);

  const handleFileChange = (reqId: string, f: File | null) => {
    setFilesByReq(prev => ({ ...prev, [reqId]: f }));
    const prevUrl = previewsByReq[reqId];
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    const url = f ? URL.createObjectURL(f) : '';
    setPreviewsByReq(prev => ({ ...prev, [reqId]: url }));
  };

  const groups = useMemo(() => {
    return [
      { 
        id: 'freshmen', 
        label: 'For currently enrolled Grade 12 (SHS) students', 
        description: 'Please upload a photocopy of your First Semester Report Card for S.Y. 2025–2026 AND your Certificate of Enrollment (CoE) for the Second Semester of S.Y. 2025–2026.' 
      },
      { 
        id: 'grade12', 
        label: 'For SHS graduates from previous school years who have not yet enrolled in higher education', 
        description: 'Please upload a photocopy of your complete Grade 12 (SHS) Report Card for both the First and Second Semesters.' 
      },
      { 
        id: 'als', 
        label: 'For ALS (Alternative Learning System) Senior High School Level Passers', 
        description: 'Please upload a photocopy of your Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test.' 
      },
      {
        id: 'transferee',
        label: 'For Transferees / Returning Students',
        description: 'Please upload a photocopy of your Transcript of Records (TOR) / Informative Copy of Grades. (Certificate of Transfer Credential / Honorable Dismissal is optional).'
      }
    ];
  }, []);

  const visibleGroups = useMemo(() => {
    if (!selectedGroup) return groups;
    const groupReqs = requirements.filter(r => r.group === selectedGroup);
    // Check if any file is uploaded for the selected group
    const hasUploads = groupReqs.some(r => filesByReq[r.id]);
    
    if (hasUploads) {
      return groups.filter(g => g.id === selectedGroup);
    }
    return groups;
  }, [groups, selectedGroup, requirements, filesByReq]);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-md p-6">
        <h1 className="text-2xl font-semibold mb-4">Student Pre-Listing</h1>
        <p className="text-sm text-gray-600 mb-6">Provide your basic information. Initial requirements listed below.</p>

        {status && (
          <div className="mb-4 text-sm p-3 rounded bg-blue-50 text-blue-700">{status}</div>
        )}

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); if (canProceed) setStep(2); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="border p-2 rounded" placeholder="First Name" name="firstName" value={form.firstName} onChange={update} required />
              <input className="border p-2 rounded" placeholder="Last Name" name="lastName" value={form.lastName} onChange={update} required />
            </div>
            <input className="border p-2 rounded w-full" placeholder="Email" name="email" value={form.email} onChange={update} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Birth Date</label>
                <input className="border p-2 rounded w-full" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={update} required />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Gender</label>
                <select className="border p-2 rounded w-full" name="gender" value={form.gender} onChange={update} required>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Address</label>
              <input className="border p-2 rounded w-full" placeholder="Address" name="address" value={form.address} onChange={update} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Phone Number</label>
              <input className="border p-2 rounded w-full" placeholder="Phone Number" name="phoneNumber" value={form.phoneNumber} onChange={update} />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Remarks (Optional)</label>
              <textarea className="border p-2 rounded w-full h-24" placeholder="Additional information..." name="remarks" value={form.remarks} onChange={update} />
            </div>

            <div>
              <h2 className="text-lg font-medium mb-2">Initial Requirements</h2>
              <p className="text-sm text-gray-600 mb-4">Select your category and upload the required documents.</p>
              
              <div className="space-y-4">
                {visibleGroups.map(group => (
                  <div key={group.id} className={`border rounded p-4 cursor-pointer transition-colors ${selectedGroup === group.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`} onClick={() => setSelectedGroup(group.id)}>
                    <div className="flex items-center mb-2">
                      <input 
                        type="radio" 
                        name="requirementGroup" 
                        checked={selectedGroup === group.id} 
                        onChange={() => setSelectedGroup(group.id)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">{group.label}</div>
                        <div className="text-xs text-gray-500">{group.description}</div>
                      </div>
                    </div>
                    
                    {selectedGroup === group.id && (
                      <div className="mt-3 pl-7 space-y-3" onClick={e => e.stopPropagation()}>
                        {requirements.filter(r => r.group === group.id).map(r => (
                          <div key={r.id} className="bg-white p-3 rounded border">
                            <div className="font-medium text-sm mb-1">{r.name}</div>
                            {r.description && <div className="text-xs text-gray-500 mb-2">{r.description}</div>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="border p-2 rounded text-sm w-full"
                                onChange={(e) => handleFileChange(r.id, e.target.files?.[0] || null)}
                              />
                              {previewsByReq[r.id] && (
                                <div className="border rounded p-2">
                                  {filesByReq[r.id]?.type === 'application/pdf' ? (
                                    <div className="text-sm"><a href={previewsByReq[r.id]} target="_blank" rel="noreferrer">Preview PDF</a></div>
                                  ) : (
                                    <img src={previewsByReq[r.id]} alt={r.name} className="max-h-32 object-contain" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded p-4 bg-gray-50 text-sm text-gray-700 space-y-4 h-64 overflow-y-auto">
              <div className="font-bold text-center">COLEGIO DE ALICIA – PRE-LISTING OF POTENTIAL STUDENTS</div>
              <div className="font-bold text-center">DISCLAIMER & DATA PRIVACY NOTICE</div>
              
              <div>
                <div className="font-bold">Disclaimer</div>
                <p className="mt-1 text-justify">
                  This Pre-Listing Form is not an official application nor an official enrollment form for Colegio de Alicia. The information collected through this pre-listing activity is solely for planning, analytics, and projection purposes to help the institution estimate potential student interest for the upcoming academic year. Submission of information does not guarantee admission, does not create any obligation on the part of the applicant or the school, and is not part of the formal enrollment process.
                </p>
              </div>

              <div>
                <div className="font-bold">Data Privacy Notice</div>
                <p className="mt-1 text-justify">
                  Colegio de Alicia is committed to upholding the highest standards of data privacy and confidentiality in compliance with the Data Privacy Act of 2012 (RA 10173).
                </p>
                <p className="mt-2">By completing this Pre-Listing Form, you acknowledge and consent to the following:</p>
                <ol className="list-decimal list-outside ml-5 mt-2 space-y-2">
                  <li>
                    <strong>Purpose of Collection.</strong> All personal information requested and submitted shall be used exclusively for demographic analysis, student demand forecasting, and planning of Colegio de Alicia.
                  </li>
                  <li>
                    <strong>Scope of Data Collected.</strong> The form may collect basic personal information such as name, age, address, intended program, and related non-sensitive data necessary for institutional analytics.
                  </li>
                  <li>
                    <strong>Data Storage and Protection.</strong> All information received will be stored securely and accessed only by authorized personnel strictly for the above-stated purpose. Colegio de Alicia implements appropriate organizational, physical, and technical measures to protect your data.
                  </li>
                  <li>
                    <strong>Confidentiality Assurance.</strong> Your personal information will not be disclosed, shared, sold, or processed for any purpose other than internal analytics. No data will be released to external parties without your prior written consent, except as required by law.
                  </li>
                  <li>
                    <strong>Data Retention.</strong> Personal information gathered through this pre-listing will be kept only for as long as necessary for its intended purpose and will be disposed of securely thereafter.
                  </li>
                  <li>
                    <strong>Your Rights.</strong> In accordance with the Data Privacy Act, you have the right to access, correct, withdraw consent, or request deletion of your personal data by contacting the Colegio de Alicia Administration.
                  </li>
                </ol>
                <p className="mt-3 text-justify">
                  By proceeding and submitting your information, you confirm that you understand and voluntarily agree to the collection and processing of your personal information for the limited purpose of institutional planning and analytics.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2">
              <input 
                type="checkbox" 
                id="privacy-check" 
                checked={privacyAccepted} 
                onChange={e => setPrivacyAccepted(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="privacy-check" className="text-sm text-gray-700 cursor-pointer">
                I hereby confirm that I have read and understood the Disclaimer and Data Privacy Notice. I voluntarily consent to the collection and processing of my personal information for the sole purpose of Colegio de Alicia’s pre-listing analytics and institutional planning. I understand that this pre-listing is not an official application or enrollment.
              </label>
            </div>

            <button 
              type="submit" 
              className={`bg-blue-600 text-white px-4 py-2 rounded transition-opacity duration-200 ${!canProceed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`} 
              disabled={!canProceed}
            >
              Review
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border rounded">
                <div className="font-medium">Name</div>
                <div className="text-sm text-gray-700">{form.firstName} {form.lastName}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium">Email</div>
                <div className="text-sm text-gray-700">{form.email}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium">Birth Date</div>
                <div className="text-sm text-gray-700">{form.dateOfBirth}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium">Gender</div>
                <div className="text-sm text-gray-700">{form.gender}</div>
              </div>
              <div className="p-3 border rounded md:col-span-2">
                <div className="font-medium">Address</div>
                <div className="text-sm text-gray-700">{form.address}</div>
              </div>
              {form.phoneNumber && (
                <div className="p-3 border rounded md:col-span-2">
                  <div className="font-medium">Phone Number</div>
                  <div className="text-sm text-gray-700">{form.phoneNumber}</div>
                </div>
              )}
              {form.remarks && (
                <div className="p-3 border rounded md:col-span-2">
                  <div className="font-medium">Remarks</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{form.remarks}</div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-base font-medium mb-2">Selected Screenshots</h3>
              <ul className="space-y-3">
                {requirements.filter(r => r.group === selectedGroup).map(r => (
                  <li key={r.id} className="border rounded p-3">
                    <div className="font-medium mb-2">{r.name}</div>
                    {previewsByReq[r.id] ? (
                      filesByReq[r.id]?.type === 'application/pdf' ? (
                        <a href={previewsByReq[r.id]} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Preview PDF</a>
                      ) : (
                        <img src={previewsByReq[r.id]} alt={r.name} className="max-h-40 object-contain" />
                      )
                    ) : (
                      <div className="text-xs text-gray-500">No file selected</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {siteKey && (
              <div>
                <h3 className="text-base font-medium mb-2">Verification</h3>
                <div ref={tsContainerRef} className="inline-block" />
                {!turnstileToken && (
                  <p className="text-xs text-gray-500 mt-1">Complete verification to enable submission.</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button className={`border px-4 py-2 rounded ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => !submitting && setStep(1)} disabled={submitting}>Edit</button>
              <button className={`bg-blue-600 text-white px-4 py-2 rounded ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={submit} disabled={(!!siteKey && !turnstileToken) || submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
            </div>
          </div>
        )}

        {step === 3 && details && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Submission Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border rounded">
                <div className="font-medium">Name</div>
                <div className="text-sm text-gray-700">{details.user?.firstName} {details.user?.lastName}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium">Email</div>
                <div className="text-sm text-gray-700">{details.user?.email}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium">Birth Date</div>
                <div className="text-sm text-gray-700">{formatDate10(details.dateOfBirth)}</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium">Gender</div>
                <div className="text-sm text-gray-700">{details.gender}</div>
              </div>
              <div className="p-3 border rounded md:col-span-2">
                <div className="font-medium">Address</div>
                <div className="text-sm text-gray-700">{details.address}</div>
              </div>
              {details.phoneNumber && (
                <div className="p-3 border rounded md:col-span-2">
                  <div className="font-medium">Phone Number</div>
                  <div className="text-sm text-gray-700">{details.phoneNumber}</div>
                </div>
              )}
              {details.remarks && (
                <div className="p-3 border rounded md:col-span-2">
                  <div className="font-medium">Remarks</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{details.remarks}</div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-base font-medium mb-2">Screenshots</h3>
              <ul className="space-y-3">
                {(details.documentsRequired || []).map((r: Requirement) => (
                  <li key={r.id} className="border rounded p-3">
                    <div className="font-medium mb-2">{r.name}</div>
                    {previewsByReq[r.id] ? (
                      filesByReq[r.id]?.type === 'application/pdf' ? (
                        <a href={previewsByReq[r.id]} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Preview PDF</a>
                      ) : (
                        <img src={previewsByReq[r.id]} alt={r.name} className="max-h-40 object-contain" />
                      )
                    ) : (
                      <div className="text-xs text-gray-500">No file selected</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-base font-medium mb-2">Server-Verified Files</h3>
              <ul className="space-y-3">
                {(details.documentsSubmitted || []).map((s: SubmittedDoc) => {
                  const asset = getAssetBaseUrl();
                  let fullUrl = '';
                  try { fullUrl = new URL(s.fileUrl || '', asset).toString(); } catch { fullUrl = `${asset}${s.fileUrl || ''}`; }
                  const isPdf = (s.fileUrl || '').toLowerCase().endsWith('.pdf');
                  return (
                    <li key={s.id || `${s.type}-${s.fileUrl}`} className="border rounded p-3">
                      <div className="font-medium mb-2">{s.name || s.fileName || 'Submitted file'}</div>
                      {s.fileUrl ? (
                        isPdf ? (
                          <a href={fullUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Open PDF</a>
                        ) : (
                          <ServerImage url={fullUrl} alt={s.name || s.fileName} />
                        )
                      ) : (
                        <div className="text-xs text-gray-500">No server file</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex gap-3">
              <button className="border px-4 py-2 rounded" onClick={() => { setDetails(null); setStep(1); }}>New Submission</button>
              <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={downloadPDF}>Download PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ServerImage({ url, alt }: { url: string; alt?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="text-sm">
        <a href={url} target="_blank" rel="noreferrer" className="text-blue-600">Open Image</a>
      </div>
    );
  }
  return (
    <img src={url} alt={alt} className="max-h-40 object-contain" onError={() => setBroken(true)} crossOrigin="anonymous" />
  );
}
