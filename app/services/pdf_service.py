import os
import tempfile
from datetime import datetime
from typing import Dict, Optional
from fpdf import FPDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

class PDFService:
    """Service for generating PDF documents"""
    
    def generate_invoice_pdf(self, invoice_data: Dict) -> str:
        """Generate PDF for an invoice"""
        filename = f"invoice_{invoice_data['invoice_number']}.pdf"
        filepath = os.path.join(tempfile.gettempdir(), filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Header
        story.append(Paragraph("FACTURE", styles['Title']))
        story.append(Spacer(1, 0.2*inch))
        
        # Invoice details
        details = f"""
        <b>Numéro de facture:</b> {invoice_data['invoice_number']}<br/>
        <b>Date:</b> {invoice_data['issue_date']}<br/>
        <b>Date d'échéance:</b> {invoice_data['due_date']}<br/>
        <b>Patient:</b> {invoice_data['patient_name']}<br/>
        """
        story.append(Paragraph(details, styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # Items table
        data = [['Description', 'Code TARMED', 'Quantité', 'Prix unitaire', 'Total']]
        
        for item in invoice_data['items']:
            data.append([
                item['description'],
                item.get('tarmed_code', ''),
                str(item['quantity']),
                f"{item['unit_price']:.2f} CHF",
                f"{item['total_price']:.2f} CHF"
            ])
        
        # Totals
        data.extend([
            ['', '', '', 'Sous-total:', f"{invoice_data['subtotal']:.2f} CHF"],
            ['', '', '', 'TVA (7.7%):', f"{invoice_data['tax_amount']:.2f} CHF"],
            ['', '', '', 'Total:', f"{invoice_data['total_amount']:.2f} CHF"],
            ['', '', '', 'Payé:', f"{invoice_data['paid_amount']:.2f} CHF"],
            ['', '', '', 'Solde dû:', f"{invoice_data['balance_due']:.2f} CHF"]
        ])
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        
        # Build PDF
        doc.build(story)
        return filepath
    
    def generate_devis_pdf(self, devis_data: Dict) -> str:
        """Generate PDF for a devis (quote)"""
        filename = f"devis_{devis_data['devis_number']}.pdf"
        filepath = os.path.join(tempfile.gettempdir(), filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Header
        story.append(Paragraph("DEVIS", styles['Title']))
        story.append(Spacer(1, 0.2*inch))
        
        # Devis details
        details = f"""
        <b>Numéro de devis:</b> {devis_data['devis_number']}<br/>
        <b>Date:</b> {devis_data['issue_date']}<br/>
        <b>Valide jusqu'au:</b> {devis_data['validity_date']}<br/>
        <b>Patient:</b> {devis_data['patient_name']}<br/>
        """
        story.append(Paragraph(details, styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # Items table
        data = [['Description', 'Code TARMED', 'Quantité', 'Prix unitaire', 'Total']]
        
        for item in devis_data['items']:
            data.append([
                item['description'],
                item.get('tarmed_code', ''),
                str(item['quantity']),
                f"{item['unit_price']:.2f} CHF",
                f"{item['total_price']:.2f} CHF"
            ])
        
        # Totals
        data.extend([
            ['', '', '', 'Sous-total:', f"{devis_data['subtotal']:.2f} CHF"],
            ['', '', '', 'TVA (7.7%):', f"{devis_data['tax_amount']:.2f} CHF"],
            ['', '', '', 'Total:', f"{devis_data['total_amount']:.2f} CHF"]
        ])
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        
        # Notes
        if devis_data.get('notes'):
            story.append(Spacer(1, 0.3*inch))
            story.append(Paragraph("<b>Notes:</b>", styles['Heading2']))
            story.append(Paragraph(devis_data['notes'], styles['Normal']))
        
        # Build PDF
        doc.build(story)
        return filepath
    
    def generate_treatment_plan_pdf(self, treatment_data: Dict) -> str:
        """Generate PDF for a treatment plan"""
        filename = f"treatment_plan_{treatment_data['patient_name'].replace(' ', '_')}.pdf"
        filepath = os.path.join(tempfile.gettempdir(), filename)
        
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        
        # Title
        pdf.cell(0, 10, "Plan de Traitement", 0, 1, 'C')
        pdf.ln(10)
        
        # Patient info
        pdf.set_font("Arial", '', 12)
        pdf.cell(0, 10, f"Patient: {treatment_data['patient_name']}", 0, 1)
        pdf.cell(0, 10, f"Date: {datetime.now().strftime('%d/%m/%Y')}", 0, 1)
        pdf.ln(10)
        
        # Treatment sequences
        for sequence in treatment_data['sequences']:
            pdf.set_font("Arial", 'B', 14)
            pdf.cell(0, 10, f"Séquence {sequence['sequence']}: {sequence['title']}", 0, 1)
            
            pdf.set_font("Arial", '', 10)
            for treatment in sequence['treatments']:
                pdf.cell(10, 8, '', 0, 0)  # Indent
                pdf.multi_cell(0, 8, f"• {treatment['description']} - {treatment.get('cost', 0)} CHF")
            
            pdf.ln(5)
        
        # Total cost
        if 'total_cost' in treatment_data:
            pdf.ln(10)
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(0, 10, f"Coût total estimé: {treatment_data['total_cost']} CHF", 0, 1)
        
        pdf.output(filepath)
        return filepath
    
    def generate_patient_education_pdf(self, content: str, title: str, patient_name: str) -> str:
        """Generate patient education PDF"""
        filename = f"education_{patient_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
        filepath = os.path.join(tempfile.gettempdir(), filename)
        
        pdf = FPDF()
        pdf.add_page()
        
        # Title
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(0, 10, title, 0, 1, 'C')
        pdf.ln(5)
        
        # Patient name
        pdf.set_font("Arial", '', 12)
        pdf.cell(0, 10, f"Pour: {patient_name}", 0, 1)
        pdf.cell(0, 10, f"Date: {datetime.now().strftime('%d/%m/%Y')}", 0, 1)
        pdf.ln(10)
        
        # Content
        pdf.set_font("Arial", '', 11)
        # Split content into lines to handle long text
        lines = content.split('\n')
        for line in lines:
            if line.strip():
                pdf.multi_cell(0, 8, line.strip())
                pdf.ln(2)
        
        pdf.output(filepath)
        return filepath