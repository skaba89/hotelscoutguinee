#!/usr/bin/env python3
"""HotelScout Guinea — Rapport d'audit QA complet"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.flowables import Flowable
from datetime import datetime

# Colors
GUINEA_GREEN = HexColor('#0D5C3A')
GUINEA_GOLD = HexColor('#C8973A')
GUINEA_RED = HexColor('#CE1126')
GUINEA_CREAM = HexColor('#FAF7F2')
DARK = HexColor('#12180F')
MUTED = HexColor('#6B7280')
LIGHT_BG = HexColor('#F0EBE3')
GREEN_OK = HexColor('#059669')
AMBER_WARN = HexColor('#D97706')
RED_FAIL = HexColor('#DC2626')
BLUE_INFO = HexColor('#2563EB')

W, H = A4

# Styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=28, textColor=GUINEA_GREEN, spaceAfter=6, fontName='Helvetica-Bold')
subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=14, textColor=MUTED, spaceAfter=20, fontName='Helvetica')
h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=18, textColor=GUINEA_GREEN, spaceBefore=20, spaceAfter=10, fontName='Helvetica-Bold')
h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=DARK, spaceBefore=14, spaceAfter=8, fontName='Helvetica-Bold')
h3_style = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=12, textColor=DARK, spaceBefore=10, spaceAfter=6, fontName='Helvetica-Bold')
body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, textColor=DARK, leading=14, spaceAfter=6, fontName='Helvetica', alignment=TA_JUSTIFY)
body_bold = ParagraphStyle('BodyBold', parent=body_style, fontName='Helvetica-Bold')
small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=MUTED, fontName='Helvetica')
badge_ok = ParagraphStyle('BadgeOK', parent=styles['Normal'], fontSize=9, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)
badge_warn = ParagraphStyle('BadgeWarn', parent=styles['Normal'], fontSize=9, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)
badge_fail = ParagraphStyle('BadgeFail', parent=styles['Normal'], fontSize=9, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)

def badge(text, status):
    """Create a colored badge paragraph"""
    if status == 'ok':
        return Paragraph(text, badge_ok)
    elif status == 'warn':
        return Paragraph(text, badge_warn)
    else:
        return Paragraph(text, badge_fail)

def section_table(data, col_widths=None):
    """Create a styled data table"""
    if col_widths is None:
        col_widths = [W*0.35, W*0.15, W*0.50]
    
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GUINEA_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E5DDD3')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ])
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(style)
    return t

def build_report():
    output_path = '/home/z/my-project/download/rapport_qa_hotelscout_guinea.pdf'
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=2*cm,
        rightMargin=2*cm,
        topMargin=2.5*cm,
        bottomMargin=2*cm,
        title='Rapport QA - HotelScout Guinea',
        author='QA Expert - Z.ai',
    )
    
    story = []
    
    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 3*cm))
    
    # Guinea flag stripe
    flag_data = [['', '', '']]
    flag_table = Table(flag_data, colWidths=[W*0.28, W*0.28, W*0.28])
    flag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), GUINEA_RED),
        ('BACKGROUND', (1, 0), (1, 0), GUINEA_GOLD),
        ('BACKGROUND', (2, 0), (2, 0), GUINEA_GREEN),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LINEBELOW', (0, 0), (-1, -1), 4, GUINEA_GREEN),
    ]))
    story.append(flag_table)
    story.append(Spacer(1, 2*cm))
    
    story.append(Paragraph('RAPPORT D\'AUDIT QA', title_style))
    story.append(Paragraph('HotelScout Guinea v7', ParagraphStyle('BigTitle', parent=title_style, fontSize=22, textColor=GUINEA_GOLD)))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph('Test End-to-End Complet', subtitle_style))
    story.append(Paragraph('Frontend + Backend API', subtitle_style))
    story.append(Spacer(1, 2*cm))
    
    # Info box
    info_data = [
        ['Date', datetime.now().strftime('%d/%m/%Y')],
        ['Environnement', 'Dev local (SQLite), Next.js 16.1.3 + Turbopack'],
        ['Testeur', 'Expert QA - 25 ans d\'experience'],
        ['Portee', '8 pages frontend + 23 endpoints API'],
    ]
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GUINEA_GREEN),
        ('TEXTCOLOR', (1, 0), (1, -1), DARK),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, HexColor('#E5DDD3')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(info_table)
    
    story.append(PageBreak())
    
    # =========================================================================
    # EXECUTIVE SUMMARY
    # =========================================================================
    story.append(Paragraph('RESUME EXECUTIF', h1_style))
    story.append(HRFlowable(width='100%', thickness=2, color=GUINEA_GREEN))
    story.append(Spacer(1, 8))
    
    # Summary stats
    summary_data = [
        ['Indicateur', 'Valeur'],
        ['Pages frontend testees', '8'],
        ['Endpoints API testes', '23'],
        ['Tests executes', '68+'],
        ['Bugs critiques', '4'],
        ['Bugs majeurs', '9'],
        ['Bugs mineurs', '6'],
        ['Vulnerabilites securite', '4'],
    ]
    story.append(section_table(summary_data))
    story.append(Spacer(1, 12))
    
    # Score
    story.append(Paragraph('Score global : <b>60/100 - INSUFFISANT</b>', ParagraphStyle('Score', parent=body_style, fontSize=12, textColor=AMBER_WARN, fontName='Helvetica-Bold')))
    story.append(Paragraph('L\'application presente des fonctionnalites solides mais souffre de problemes de validation des donnees, de securite (XSS stocke), et de bugs fonctionnels sur la page d\'accueil. Les corrections prioritaires sont identifiees dans ce rapport.', body_style))
    
    story.append(PageBreak())
    
    # =========================================================================
    # FRONTEND AUDIT
    # =========================================================================
    story.append(Paragraph('AUDIT FRONTEND - PAGE PAR PAGE', h1_style))
    story.append(HRFlowable(width='100%', thickness=2, color=GUINEA_GREEN))
    story.append(Spacer(1, 8))
    
    # Page 1: Menu Reservation
    story.append(Paragraph('1. Menu Reservation (Page d\'accueil)', h2_style))
    story.append(badge('PARTIEL', 'warn'))
    story.append(Spacer(1, 6))
    
    menu_data = [
        ['Test', 'Resultat', 'Details'],
        ['Rendu initial', badge('PASS', 'ok'), 'Page s\'affiche correctement, hero, stats, hotels'],
        ['Barre de recherche', badge('PARTIEL', 'warn'), 'Le bouton Rechercher scroll vers les hotels au lieu de filtrer'],
        ['Filtre region', badge('FAIL', 'fail'), 'Le filtre region ne filtre pas les hotels en vedette'],
        ['Bouton Reserver', badge('FAIL', 'fail'), 'Ne fonctionne pas - aucun dialogue ne s\'ouvre'],
        ['Mes reservations', badge('PASS', 'ok'), 'Dialogue s\'ouvre, planning fonctionnel'],
        ['Planning etapes', badge('PASS', 'ok'), 'Timeline verticale, marquage completed, ajout etapes'],
        ['Donnees dynamiques', badge('PASS', 'ok'), 'Hotels et stats viennent de l\'API'],
        ['Responsive mobile', badge('PASS', 'ok'), 'Adaptation correcte sur mobile'],
    ]
    story.append(section_table(menu_data))
    story.append(Spacer(1, 8))
    
    # Page 2: Dashboard
    story.append(Paragraph('2. Tableau de bord (Dashboard)', h2_style))
    story.append(badge('PASS', 'ok'))
    story.append(Spacer(1, 6))
    
    dash_data = [
        ['Test', 'Resultat', 'Details'],
        ['Rendu initial', badge('PASS', 'ok'), 'Stats, pipeline, regions - tout s\'affiche'],
        ['Navigation', badge('PASS', 'ok'), 'Liens vers Prospects et Pipeline fonctionnels'],
        ['Donnees dynamiques', badge('PASS', 'ok'), 'Stats depuis /api/stats'],
    ]
    story.append(section_table(dash_data))
    story.append(Spacer(1, 8))
    
    # Page 3: Base Hotels
    story.append(Paragraph('3. Base Hotels', h2_style))
    story.append(badge('PARTIEL', 'warn'))
    story.append(Spacer(1, 6))
    
    hotels_data = [
        ['Test', 'Resultat', 'Details'],
        ['Rendu initial', badge('PASS', 'ok'), 'Tableau avec pagination'],
        ['Recherche', badge('PASS', 'ok'), 'Filtre par texte fonctionnel'],
        ['Filtres (region, statut)', badge('PASS', 'ok'), 'Tous les filtres fonctionnent'],
        ['Tri colonnes', badge('PASS', 'ok'), 'Tri par nom, region, score'],
        ['Detail hotel', badge('PASS', 'ok'), 'Dialogue avec infos completes'],
        ['Export CSV', badge('PASS', 'ok'), 'Telechargement fonctionnel'],
        ['Entrees XSS visibles', badge('FAIL', 'fail'), 'Donnees malveillantes dans le tableau'],
    ]
    story.append(section_table(hotels_data))
    story.append(Spacer(1, 8))
    
    # Page 4: Agent de Collecte
    story.append(Paragraph('4. Agent de Collecte', h2_style))
    story.append(badge('FAIL', 'fail'))
    story.append(Spacer(1, 6))
    
    collecte_data = [
        ['Test', 'Resultat', 'Details'],
        ['Rendu initial', badge('PASS', 'ok'), 'Page s\'affiche'],
        ['Lancer la collecte', badge('PASS', 'ok'), 'Bouton avec loading state'],
        ['Verifier les URLs', badge('FAIL', 'fail'), 'CRASH complet de l\'application'],
        ['Recherche', badge('PARTIEL', 'warn'), 'Pas de resultat visible'],
    ]
    story.append(section_table(collecte_data))
    story.append(Spacer(1, 8))
    
    # Page 5-8
    for idx, (name, status_text, status_key, tests) in enumerate([
        ('5. Prospects HOT', 'PARTIEL', 'warn', [
            ('Rendu', 'ok', 'Page s\'affiche avec erreurs console'),
            ('Bouton Actualiser', 'ok', 'Recharge les donnees'),
            ('Checkbox selection', 'warn', 'Premier clic ne toggle pas visuellement'),
            ('Qualite des donnees', 'fail', 'Entrees malveillantes et doublons'),
        ]),
        ('6. Pipeline CRM', 'PARTIEL', 'warn', [
            ('Rendu', 'ok', 'Liste plate des hotels'),
            ('Stages pipeline', 'fail', 'Pas de vue Kanban ni colonnes'),
            ('Changement de stage', 'warn', 'Pas de feedback visible'),
            ('Doublons', 'fail', 'Hotels dupliques dans la liste'),
        ]),
        ('7. Analyse IA', 'PARTIEL', 'warn', [
            ('Onglets providers', 'ok', '7 providers IA affiches'),
            ('Chat sans cle API', 'warn', 'Erreur "No AI providers configured"'),
            ('Templates prompts', 'ok', '3 templates disponibles'),
            ('Dropdown hotels', 'fail', 'Contient des entrees XSS/poubelle'),
        ]),
        ('8. Parametres', 'PASS', 'ok', [
            ('Onglets', 'ok', 'IA, Agence, Base de donnees'),
            ('Sauvegarde cles API', 'ok', 'Entree, sauvegarde, suppression'),
            ('Export CSV', 'ok', 'Telechargement fonctionnel'),
            ('Feedback actions', 'warn', 'Pas de feedback pour enrichir/collecter'),
        ]),
    ], start=5):
        story.append(Paragraph(name, h2_style))
        story.append(badge(status_text, status_key))
        story.append(Spacer(1, 6))
        t_data = [['Test', 'Resultat', 'Details']]
        for test_name, test_status, test_detail in tests:
            t_data.append([test_name, badge(test_status.upper(), test_status), test_detail])
        story.append(section_table(t_data))
        story.append(Spacer(1, 8))
    
    story.append(PageBreak())
    
    # =========================================================================
    # BACKEND API AUDIT
    # =========================================================================
    story.append(Paragraph('AUDIT BACKEND - API PAR API', h1_style))
    story.append(HRFlowable(width='100%', thickness=2, color=GUINEA_GREEN))
    story.append(Spacer(1, 8))
    
    api_pages = [
        ('1. GET /api/stats', 'ok', [
            ['Appel sans params', badge('PASS', 'ok'), '200 - Structure complete et coherente'],
            ['Performance', badge('PASS', 'ok'), '~13ms apres warm-up'],
        ]),
        ('2. GET /api/hotels', 'ok', [
            ['Sans filtre', badge('PASS', 'ok'), '20 hotels, pagination correcte'],
            ['Filtres (search, region, stars)', badge('PASS', 'ok'), 'Tous fonctionnels'],
            ['Protection injection', badge('PASS', 'ok'), 'Prisma parametrise, safeParseInt'],
            ['Tri (sortBy)', badge('PASS', 'ok'), 'Whitelist des champs, defaut sur invalide'],
        ]),
        ('3. POST /api/hotels', 'fail', [
            ['Creation valide', badge('PASS', 'ok'), '201 - Hotel cree correctement'],
            ['XSS stocke', badge('FAIL', 'fail'), '<script> accepte et stocke sans sanitiser'],
            ['Validation stars', badge('FAIL', 'fail'), 'Stars negatif ou >5 accepte'],
            ['Validation longueur', badge('FAIL', 'fail'), '10000 caracteres accepte'],
        ]),
        ('4. PATCH /api/hotels/[id]', 'fail', [
            ['Methode PATCH', badge('FAIL', 'fail'), '405 - Seul PUT est implemente'],
            ['PUT fonctionne', badge('PASS', 'ok'), 'Mise a jour partielle OK'],
        ]),
        ('5. GET/POST /api/contacts', 'ok', [
            ['Validation channel/direction', badge('PASS', 'ok'), 'Enumere, 400 si invalide'],
            ['Transaction atomique', badge('PASS', 'ok'), 'contactCount et lastContactAt maj'],
        ]),
        ('6. POST /api/reservations', 'warn', [
            ['Creation valide', badge('PASS', 'ok'), '201 avec 7 PlanningSteps auto'],
            ['Validation dates', badge('PASS', 'ok'), 'Passe et checkout<checkin rejetes'],
            ['Validation email', badge('FAIL', 'fail'), '"not-an-email" accepte'],
            ['Validation guests', badge('FAIL', 'fail'), '0 ou negatif accepte'],
        ]),
        ('7. PATCH /api/reservations/[id]', 'fail', [
            ['Status valide', badge('PASS', 'ok'), 'Mise a jour fonctionne'],
            ['Status invalide', badge('FAIL', 'fail'), '"invalid_status" accepte sans validation'],
            ['ID inexistant', badge('FAIL', 'fail'), '500 au lieu de 404'],
        ]),
        ('8. PATCH /api/planning', 'warn', [
            ['Marquer completed', badge('PASS', 'ok'), 'Auto-complete reservation si toutes faites'],
            ['stepId inexistant', badge('FAIL', 'fail'), '500 au lieu de 404'],
        ]),
        ('9. POST /api/ai/chat', 'ok', [
            ['Rate limiting', badge('PASS', 'ok'), '10 req/min avec headers X-RateLimit'],
            ['Validation prompt', badge('PASS', 'ok'), 'Max 10000 caracteres'],
        ]),
    ]
    
    for name, status_key, rows in api_pages:
        story.append(Paragraph(name, h2_style))
        if status_key == 'ok':
            story.append(badge('PASS', 'ok'))
        elif status_key == 'warn':
            story.append(badge('PARTIEL', 'warn'))
        else:
            story.append(badge('FAIL', 'fail'))
        story.append(Spacer(1, 6))
        
        t_data = [['Test', 'Resultat', 'Details']] + rows
        story.append(section_table(t_data))
        story.append(Spacer(1, 8))
    
    story.append(PageBreak())
    
    # =========================================================================
    # SECURITY ANALYSIS
    # =========================================================================
    story.append(Paragraph('ANALYSE DE SECURITE', h1_style))
    story.append(HRFlowable(width='100%', thickness=2, color=GUINEA_RED))
    story.append(Spacer(1, 8))
    
    sec_data = [
        ['Vulnerabilite', 'Severite', 'Endpoint', 'Details'],
        ['XSS stocke', badge('HAUTE', 'fail'), 'POST /api/hotels', 'HTML/JS non sanitisé, stocke tel quel'],
        ['CORS wildcard', badge('MOYENNE', 'warn'), 'Tous', 'Access-Control-Allow-Origin: * par defaut'],
        ['CRON_SECRET optionnel', badge('MOYENNE', 'warn'), 'POST /api/cron/*', 'Accessible sans auth si CRON_SECRET absent'],
        ['Cle chiffrement defaut', badge('BASSE', 'warn'), 'security.ts', 'Cle codee en dur si ENCRYPTION_KEY absent'],
    ]
    sec_table = Table(sec_data, colWidths=[3.5*cm, 2.5*cm, 4*cm, 6*cm])
    sec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GUINEA_RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#FEF2F2')]),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E5DDD3')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sec_table)
    story.append(Spacer(1, 12))
    
    story.append(Paragraph('Recommandation principale : Implementer une sanitisation HTML cote serveur (DOMPurify ou equivalent) sur tous les champs texte avant insertion en base. Restreindre CORS a l\'origine du frontend uniquement.', body_style))
    
    story.append(PageBreak())
    
    # =========================================================================
    # BUGS COMPLETE LIST
    # =========================================================================
    story.append(Paragraph('LISTE COMPLETE DES BUGS', h1_style))
    story.append(HRFlowable(width='100%', thickness=2, color=GUINEA_GREEN))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('Bugs critiques (P0)', h2_style))
    crit_data = [
        ['ID', 'Bug', 'Localisation'],
        ['C1', '"Verifier les URLs" crash l\'application', 'Agent de Collecte'],
        ['C2', 'XSS stocke - entrees <script> dans la base', 'POST /api/hotels'],
        ['C3', 'Donnees malveillantes polluent toutes les pages', 'Base de donnees'],
        ['C4', 'Cle de chiffrement par defaut codée en dur', 'security.ts'],
    ]
    story.append(section_table(crit_data))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('Bugs majeurs (P1)', h2_style))
    major_data = [
        ['ID', 'Bug', 'Localisation'],
        ['M1', 'Bouton "Reserver" non fonctionnel', 'Menu Reservation'],
        ['M2', 'Filtre region ne filtre pas les hotels', 'Menu Reservation'],
        ['M3', 'PATCH /api/hotels retourne 405', 'API Hotels'],
        ['M4', 'Pas de validation status reservation', 'PATCH /api/reservations'],
        ['M5', 'ID inexistant retourne 500 au lieu de 404', 'API Reservations/Planning'],
        ['M6', 'Pas de validation email', 'POST /api/reservations'],
        ['M7', 'Pas de validation stars [0-5]', 'POST /api/hotels'],
        ['M8', 'Pas de validation longueur champs', 'POST /api/hotels'],
        ['M9', 'Pipeline CRM sans vue Kanban', 'Pipeline CRM'],
    ]
    story.append(section_table(major_data))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('Bugs mineurs (P2)', h2_style))
    minor_data = [
        ['ID', 'Bug', 'Localisation'],
        ['m1', 'Checkbox Prospects ne toggle pas au 1er clic', 'Prospects HOT'],
        ['m2', 'Footer incomplet (4/8 pages)', 'Menu Reservation'],
        ['m3', 'Pas de pagination GET /api/reservations', 'API Reservations'],
        ['m4', 'Messages erreur fr/en melanges', 'Toutes les APIs'],
        ['m5', 'Pas de feedback pour actions en arriere-plan', 'Parametres/Collecte'],
        ['m6', 'Recherche n\'affiche pas de resultats', 'Agent de Collecte'],
    ]
    story.append(section_table(minor_data))
    
    story.append(PageBreak())
    
    # =========================================================================
    # CORRECTIONS APPORTEES
    # =========================================================================
    story.append(Paragraph('CORRECTIONS APPORTEES', h1_style))
    story.append(HRFlowable(width='100%', thickness=2, color=GREEN_OK))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('Les corrections suivantes ont ete appliquees suite a l\'audit :', body_style))
    story.append(Spacer(1, 6))
    
    fixes = [
        ['ID', 'Correction', 'Statut'],
        ['C1', 'ErrorBoundary autour de CollectePage + gestion erreurs verify', badge('FIXE', 'ok')],
        ['C2', 'stripHtml() ajoutee - suppression tags HTML/JS', badge('FIXE', 'ok')],
        ['C3', 'Purge donnees malveillantes de la base', badge('FIXE', 'ok')],
        ['M1', 'type="button" sur boutons Reserver + etat Dialog verifie', badge('FIXE', 'ok')],
        ['M2', 'Filtre region applique sur tous les hotels (limit 100)', badge('FIXE', 'ok')],
        ['M3', 'PATCH handler ajoute qui delegue a PUT', badge('FIXE', 'ok')],
        ['M4', 'Validation status contre ALLOWED_STATUSES', badge('FIXE', 'ok')],
        ['M5', 'Prisma P2025 catche specifiquement -> 404', badge('FIXE', 'ok')],
        ['M6', 'Validation email par regex', badge('FIXE', 'ok')],
        ['M7', 'Validation stars 0-5 avec message erreur', badge('FIXE', 'ok')],
        ['M8', 'Validation longueur (name<=200, city<=100, region<=100)', badge('FIXE', 'ok')],
        ['M2b', 'Recherche scroll vers hotels au lieu de naviguer', badge('FIXE', 'ok')],
    ]
    
    fix_table = Table(fixes, colWidths=[1.5*cm, 11*cm, 3*cm])
    fix_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN_OK),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#F0FDF4')]),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E5DDD3')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(fix_table)
    
    story.append(PageBreak())
    
    # =========================================================================
    # POINTS POSITIFS
    # =========================================================================
    story.append(Paragraph('POINTS POSITIFS', h1_style))
    story.append(HRFlowable(width='100%', thickness=2, color=GREEN_OK))
    story.append(Spacer(1, 8))
    
    positives = [
        'Protection SQL injection : Prisma ORM parametrise toutes les requetes - aucune injection possible',
        'SSRF Protection : Module validateUrl() bloque les IPs internes',
        'Rate limiting : Implemente sur les endpoints sensibles (AI chat, providers, export)',
        'Chiffrement des cles API : AES-256-GCM avec keyHint masque',
        'safeParseInt : Protection NaN et bornes sur les parametres de pagination',
        'Whitelist sortBy : Previent injection via le tri',
        'Transactions atomiques : Contacts et pipeline utilisent des transactions Prisma',
        'CSV export avec BOM : Compatibilite Excel UTF-8',
        'Auto-complete planning : Logique correcte de passage a "completed"',
        'Security headers : X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy',
        'Donnees 100% dynamiques : Plus aucune donnee statique/hardcodee',
        'Planning de bout en bout : 7 etapes automatiques, personnalisation, timeline visuelle',
    ]
    
    for p in positives:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {p}', body_style))
    
    story.append(Spacer(1, 1*cm))
    
    # =========================================================================
    # PRIORISATION RESTANTE
    # =========================================================================
    story.append(Paragraph('CORRECTIONS RESTANTES A EFFECTUER', h1_style))
    story.append(HRFlowable(width='100%', thickness=2, color=AMBER_WARN))
    story.append(Spacer(1, 8))
    
    remaining = [
        ['Priorite', 'Correction', 'Effort'],
        ['P2', 'CORS restrictif (origines autorisees)', 'Faible'],
        ['P2', 'CRON_SECRET obligatoire en production', 'Faible'],
        ['P2', 'Pagination GET /api/reservations', 'Faible'],
        ['P2', 'Pipeline CRM - vue Kanban avec colonnes', 'Moyen'],
        ['P2', 'Deduplication des hotels (contrainte unique)', 'Moyen'],
        ['P3', 'Cohérence linguistique des erreurs (fr/en)', 'Faible'],
        ['P3', 'Validation guests > 0', 'Faible'],
        ['P3', 'ENCRYPTION_KEY obligatoire', 'Faible'],
        ['P3', 'Footer navigation complet (8 pages)', 'Faible'],
        ['P3', 'Feedback utilisateur pour actions en arriere-plan', 'Moyen'],
    ]
    
    rem_table = Table(remaining, colWidths=[2*cm, 11*cm, 3*cm])
    rem_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), AMBER_WARN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#FFFBEB')]),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E5DDD3')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(rem_table)
    
    # Build PDF
    doc.build(story)
    print(f'PDF generated: {output_path}')
    return output_path

if __name__ == '__main__':
    build_report()
