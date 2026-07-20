# Handover Forms — Fillable PDF Instructions

## Purpose
Provide fillable, signable forms for the Project Completion Certificate (PCC) and the Sign-Off & Acceptance Form (PSAF).

## Files
- Project Completion Certificate (HTML form): `project-completion-certificate.html`
- Sign-Off & Acceptance (HTML form): `sign-off-acceptance.html`
- Field Map (JSON): `form-fields.json`

## How to Generate Fillable PDFs
1. Open the HTML file in a modern browser.
2. Print to PDF for a static version (not fillable) if urgently needed.
3. For truly fillable PDFs with embedded form fields, import the HTML into Adobe Acrobat or create a new PDF and add form fields using the Field Map below:
   - Use the `form-fields.json` names to create corresponding text, date, and signature fields.
   - Set signature fields as digital signature fields.
4. Save as PDF and distribute for signature.

## Field Map Summary
- PCC: `project_name`, `client_org`, `vendor_org`, `environment`, `release_tag`, `completion_date`, `client_rep_name`, `client_rep_title`, `client_rep_signature`, `client_rep_date`, `pm_signature`, `pm_date`, `tech_lead_name`, `tech_lead_title`, `tech_lead_signature`, `tech_lead_date`
- PSAF: `acceptance_date`, `support_end_date`, `client_rep_name`, `client_rep_title`, `client_rep_signature`, `client_rep_date`, `vendor_rep_name`, `vendor_rep_title`, `vendor_rep_signature`, `vendor_rep_date`, `pm_signature`, `pm_date`

## Notes
- Store signed PDFs under `docs/handovers/signed/<YYYY-MM-DD>/` with unique document IDs.
- Never embed credentials or secrets in these forms.

