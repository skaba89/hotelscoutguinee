#!/usr/bin/env python3
# HotelScout Guinea — Audit Production-Readiness Report Generator
# Uses ReportLab to generate a professional PDF audit report

import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.platypus.flowables import Flowable

# ─── Palette ──────────────────────────────────────────────────────────────────

PAGE_BG       = colors.HexColor('#f3f3f2')
SECTION_BG    = colors.HexColor('#ebeae8')
CARD_BG       = colors.HexColor('#e9e8e5')
TABLE_STRIPE  = colors.HexColor('#edece9')
HEADER_FILL   = colors.HexColor('#59523c')
COVER_BLOCK   = colors.HexColor('#71684c')
BORDER        = colors.HexColor('#cbc6b6')
ICON          = colors.HexColor('#7f7043')
ACCENT        = colors.HexColor('#6647c2')
ACCENT_2      = colors.HexColor('#54bd88')
TEXT_PRIMARY   = colors.HexColor('#262623')
TEXT_MUTED     = colors.HexColor('#8b8981')
SEM_SUCCESS   = colors.HexColor('#42925c')
SEM_WARNING   = colors.HexColor('#97783a')
SEM_ERROR     = colors.HexColor('#a0514a')
SEM_INFO      = colors.HexColor('#527da8')

# ─── Styles ───────────────────────────────────────────────────────────────────

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name='CoverTitle',
    fontName='Helvetica-Bold',
    fontSize=32,
    leading=38,
    textColor=colors.white,
    alignment=TA_LEFT,
    spaceAfter=6*mm,
))

styles.add(ParagraphStyle(
    name='CoverSubtitle',
    fontName='Helvetica',
    fontSize=16,
    leading=20,
    textColor=colors.HexColor('#d4d0c8'),
    alignment=TA_LEFT,
    spaceAfter=4*mm,
))

styles.add(ParagraphStyle(
    name='SectionTitle',
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=24,
    textColor=HEADER_FILL,
    spaceBefore=12*mm,
    spaceAfter=4*mm,
    borderWidth=0,
    borderPadding=0,
))

styles.add(ParagraphStyle(
    name='SubSection',
    fontName='Helvetica-Bold',
    fontSize=13,
    leading=17,
    textColor=COVER_BLOCK,
    spaceBefore=6*mm,
    spaceAfter=3*mm,
))

styles.add(ParagraphStyle(
    name='Body',
    fontName='Helvetica',
    fontSize=10,
    leading=14,
    textColor=TEXT_PRIMARY,
    alignment=TA_JUSTIFY,
    spaceAfter=3*mm,
))

styles.add(ParagraphStyle(
    name='BodySmall',
    fontName='Helvetica',
    fontSize=9,
    leading=12,
    textColor=TEXT_PRIMARY,
    alignment=TA_JUSTIFY,
    spaceAfter=2*mm,
))

styles.add(ParagraphStyle(
    name='BulletItem',
    fontName='Helvetica',
    fontSize=10,
    leading=14,
    textColor=TEXT_PRIMARY,
    leftIndent=12*mm,
    bulletIndent=6*mm,
    spaceAfter=1.5*mm,
))

styles.add(ParagraphStyle(
    name='Critical',
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=SEM_ERROR,
    spaceAfter=2*mm,
))

styles.add(ParagraphStyle(
    name='Warning',
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=SEM_WARNING,
    spaceAfter=2*mm,
))

styles.add(ParagraphStyle(
    name='Success',
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=SEM_SUCCESS,
    spaceAfter=2*mm,
))

styles.add(ParagraphStyle(
    name='CodeBlock',
    fontName='Courier',
    fontSize=8.5,
    leading=11,
    textColor=colors.HexColor('#444444'),
    backColor=colors.HexColor('#f0eeeb'),
    leftIndent=4*mm,
    rightIndent=4*mm,
    spaceBefore=2*mm,
    spaceAfter=2*mm,
    borderWidth=0.5,
    borderColor=BORDER,
    borderPadding=3,
))

styles.add(ParagraphStyle(
    name='TableHeader',
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=12,
    textColor=colors.white,
    alignment=TA_CENTER,
))

styles.add(ParagraphStyle(
    name='TableCell',
    fontName='Helvetica',
    fontSize=9,
    leading=12,
    textColor=TEXT_PRIMARY,
    alignment=TA_LEFT,
))

# ─── Custom Flowables ─────────────────────────────────────────────────────────

class SectionDivider(Flowable):
    def __init__(self, width=None, color=BORDER):
        Flowable.__init__(self)
        self._width = width or (A4[0] - 40*mm)
        self._color = color
        self.height = 1
    def wrap(self, availWidth, availHeight):
        self.width = min(self._width, availWidth)
        return (self.width, self.height)
    def draw(self):
        self.canv.setStrokeColor(self._color)
        self.canv.setLineWidth(0.5)
        self.canv.line(0, 0, self.width, 0)

# Track if we're on the cover page
_cover_page = [True]

def cover_page_bg(canvas, doc):
    """Draw background on cover page only"""
    if _cover_page[0]:
        canvas.saveState()
        canvas.setFillColor(HEADER_FILL)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        # Accent line
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(3)
        canvas.line(20*mm, A4[1] - 100*mm, 80*mm, A4[1] - 100*mm)
        canvas.restoreState()
        _cover_page[0] = False

# ─── Helper ───────────────────────────────────────────────────────────────────

def make_table(headers, rows, col_widths=None):
    """Create a styled table"""
    available = A4[0] - 40*mm
    if col_widths is None:
        col_widths = [available / len(headers)] * len(headers)
    else:
        total = sum(col_widths)
        col_widths = [w / total * available for w in col_widths]
    
    data = [[Paragraph(h, styles['TableHeader']) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), styles['TableCell']) for c in row])
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t

# ─── Report Content ───────────────────────────────────────────────────────────

def build_report():
    output_path = '/home/z/my-project/download/hotelscout-guinea-audit-e2e.pdf'
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
        title='HotelScout Guinea - Audit Production-Readiness',
        author='Z.ai',
        subject='Audit end-to-end et analyse production-readiness du projet HotelScout Guinea v7',
        onFirstPage=cover_page_bg,
    )
    
    story = []
    
    # ══════════════════════════════════════════════════════════════════════════
    # COVER (background drawn by onPage callback)
    story.append(Spacer(1, 40*mm))
    story.append(Paragraph('HotelScout Guinea v7', styles['CoverTitle']))
    story.append(Paragraph('Audit End-to-End et Analyse Production-Readiness', styles['CoverSubtitle']))
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(f'Date : {datetime.now().strftime("%d/%m/%Y")}', styles['CoverSubtitle']))
    story.append(Paragraph('Version : 7.0', styles['CoverSubtitle']))
    story.append(Paragraph('Technologie : Next.js 16 + Prisma + SQLite + Multi-IA', styles['CoverSubtitle']))
    story.append(Spacer(1, 25*mm))
    story.append(Paragraph(
        "Ce rapport presente les resultats de l'audit complet du projet HotelScout Guinea, "
        "incluant les tests end-to-end, l'analyse de securite, la robustesse des APIs, "
        "la qualite des donnees, et les recommandations pour la mise en production.",
        ParagraphStyle('CoverDesc', parent=styles['CoverSubtitle'], fontSize=11, leading=15, textColor=colors.HexColor('#b0aaa0'))
    ))
    story.append(PageBreak())
    
    # ══════════════════════════════════════════════════════════════════════════
    # TABLE DES MATIERES (simplified)
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('Table des matieres', styles['SectionTitle']))
    story.append(SectionDivider())
    toc_items = [
        ('1.', 'Resume executif'),
        ('2.', 'Resultats des tests end-to-end'),
        ('3.', 'Bugs critiques detectes et corriges'),
        ('4.', 'Audit de securite'),
        ('5.', 'Audit des donnees (sites web hotels)'),
        ('6.', 'Audit des performances et robustesse'),
        ('7.', 'Analyse production-readiness'),
        ('8.', 'Recommandations prioritaires'),
    ]
    for num, title in toc_items:
        story.append(Paragraph(f'<b>{num}</b>  {title}', styles['Body']))
    story.append(PageBreak())
    
    # ══════════════════════════════════════════════════════════════════════════
    # 1. RESUME EXECUTIF
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('1. Resume executif', styles['SectionTitle']))
    story.append(SectionDivider())
    
    story.append(Paragraph(
        "L'audit end-to-end du projet HotelScout Guinea v7 a revele plusieurs problemes critiques "
        "qui empechent la mise en production immediate. Sur les 16 API endpoints testes, 3 bugs "
        "critiques ont ete identifies et corriges lors de cette session. Le projet dispose d'une "
        "architecture solide avec un backend Next.js 16, une base SQLite via Prisma, et un systeme "
        "multi-IA avec 7 fournisseurs. Cependant, des lacunes importantes subsistent en matiere de "
        "securite (absence d'authentification, cles API en clair), de gestion des donnees "
        "(incoherence empty string vs null), et de robustesse (pas de rate limiting, pas de validation "
        "des entrees utilisateur).",
        styles['Body']
    ))
    
    story.append(Paragraph('Score global production-readiness', styles['SubSection']))
    story.append(make_table(
        ['Categorie', 'Score', 'Statut'],
        [
            ['Fonctionnalite', '75/100', 'Partiellement operationnel'],
            ['Securite', '25/100', 'CRITIQUE - Non production-ready'],
            ['Qualite des donnees', '70/100', 'Correct avec corrections'],
            ['Performance', '65/100', 'Acceptable pour MVP'],
            ['Robustesse', '45/100', 'Insuffisant pour production'],
            ['Maintenabilite', '60/100', 'Correct, a ameliorer'],
        ],
        [2, 1, 2]
    ))
    
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        '<b>Verdict :</b> Le projet n\'est <b>pas production-ready</b> dans son etat actuel. '
        'Les problemes de securite (absence d\'authentification, cles API non chiffrees) doivent '
        'etre resolus avant tout deploiement. Avec les corrections prioritaires, le projet pourrait '
        'atteindre un niveau production-ready en 2-3 semaines de developpement.',
        styles['Critical']
    ))
    
    # ══════════════════════════════════════════════════════════════════════════
    # 2. RESULTATS DES TESTS END-TO-END
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('2. Resultats des tests end-to-end', styles['SectionTitle']))
    story.append(SectionDivider())
    
    story.append(Paragraph(
        "L'ensemble des API endpoints a ete teste avec un serveur de production (standalone build). "
        "Le build Next.js reussit sans erreur. Le serveur demarre en 80ms et repond correctement "
        "aux requetes HTTP. Voici le detail des tests par endpoint.",
        styles['Body']
    ))
    
    story.append(Paragraph('2.1 Resultats par API', styles['SubSection']))
    story.append(make_table(
        ['Endpoint', 'Methode', 'Resultat', 'Notes'],
        [
            ['GET /api/stats', 'GET', 'OK', 'Stats correctes apres fix'],
            ['GET /api/hotels', 'GET', 'OK', 'Pagination, filtres OK'],
            ['GET /api/hotels?search=X', 'GET', 'FIXE', 'Bug SQLite mode:insensitive corrige'],
            ['POST /api/hotels', 'POST', 'OK', 'Creation hotel fonctionnelle'],
            ['GET /api/hotels/[id]', 'GET', 'OK', 'Detail hotel OK'],
            ['DELETE /api/hotels/[id]', 'DELETE', 'OK', 'Suppression OK'],
            ['POST /api/hotels/verify', 'POST', 'OK', 'Verification URL OK'],
            ['POST /api/hotels/enrich', 'POST', 'OK', 'Enrichissement via SDK'],
            ['POST /api/hotels/search', 'POST', 'OK', 'Recherche web OK'],
            ['GET /api/export', 'GET', 'OK', 'Export CSV fonctionnel'],
            ['GET /api/pipeline', 'GET', 'OK', 'Pipeline 5 stages OK'],
            ['GET /api/contacts', 'GET', 'OK', 'Liste contacts OK'],
            ['POST /api/contacts', 'POST', 'OK', 'Creation contact OK'],
            ['GET /api/ai/providers', 'GET', 'OK', '7 fournisseurs listes'],
            ['POST /api/ai/providers', 'POST', 'OK', 'Sauvegarde cle API OK'],
            ['POST /api/ai/chat', 'POST', 'OK', 'Multi-IA avec fallback OK'],
        ],
        [2, 1, 1, 3]
    ))
    
    story.append(Paragraph('2.2 Build et deploiement', styles['SubSection']))
    story.append(Paragraph(
        "Le build de production reussit en 5.4 secondes avec Turbopack. Le serveur standalone "
        "demarre en 80ms et consomme environ 120MB de RAM. Les 16 routes dynamiques sont "
        "correctement compilees. La page d'accueil est pre-rendue en contenu statique. "
        "Le fichier standalone server.js est genere dans .next/standalone/ et peut etre "
        "deploye independamment.",
        styles['Body']
    ))
    
    # ══════════════════════════════════════════════════════════════════════════
    # 3. BUGS CRITIQUES DETECTES ET CORRIGES
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('3. Bugs critiques detectes et corriges', styles['SectionTitle']))
    story.append(SectionDivider())
    
    story.append(Paragraph(
        "Trois bugs critiques ont ete identifies lors de l'audit et ont ete corriges immediatement. "
        "Ces bugs affectaient la precision des donnees, la fonctionnalite de recherche, et la "
        "fiabilite des statistiques affichees sur le tableau de bord.",
        styles['Body']
    ))
    
    story.append(Paragraph('3.1 Bug #1 : Stats API - Comptage incorrect des hotels avec site web', styles['SubSection']))
    story.append(Paragraph(
        '<b>Gravite :</b> CRITIQUE | <b>Statut :</b> CORRIGE',
        styles['Critical']
    ))
    story.append(Paragraph(
        "L'API /api/stats rapportait hotelsWithWebsite=33 alors que seulement 9 hotels avaient "
        "des sites web verifies. La cause est que les hotels sans site web utilisent une chaine "
        "vide '' au lieu de null pour le champ web. La requete Prisma { web: { not: null } } "
        "matche les chaines vides. Le correctif applique est de remplacer { not: null } par "
        "{ not: '' } dans les requetes de comptage. Le meme bug affectait hotelsWithPhone et "
        "hotelsWithEmail.",
        styles['Body']
    ))
    story.append(Paragraph(
        'Avant : hotelsWithWebsite=33, hotelsWithPhone=33, hotelsWithEmail=33',
        styles['CodeBlock']
    ))
    story.append(Paragraph(
        'Apres : hotelsWithWebsite=15, hotelsWithPhone=32, hotelsWithEmail=19',
        styles['CodeBlock']
    ))
    
    story.append(Paragraph('3.2 Bug #2 : Recherche hotel - Crash avec mode:insensitive', styles['SubSection']))
    story.append(Paragraph(
        '<b>Gravite :</b> CRITIQUE | <b>Statut :</b> CORRIGE',
        styles['Critical']
    ))
    story.append(Paragraph(
        "La recherche d'hotels (GET /api/hotels?search=X) echouait systematiquement avec une "
        "erreur Prisma : 'Unknown argument mode'. L'option mode: 'insensitive' est supportee "
        "uniquement par PostgreSQL et MySQL, pas par SQLite. Le correctif consiste a retirer "
        "l'option mode: 'insensitive' de toutes les requetes contains(), SQLite etant deja "
        "insensible a la casse par defaut. Ce bug affectait aussi l'API d'export CSV.",
        styles['Body']
    ))
    
    story.append(Paragraph('3.3 Bug #3 : Hotels sans site web - Donnees manquantes', styles['SubSection']))
    story.append(Paragraph(
        '<b>Gravite :</b> MAJEUR | <b>Statut :</b> CORRIGE',
        styles['Warning']
    ))
    story.append(Paragraph(
        "24 hotels sur 33 (73%) etaient listes sans site web. Apres recherche et verification "
        "HTTP, 6 hotels supplementaires ont ete identifies avec des sites web fonctionnels. "
        "Les donnees ont ete mises a jour dans la base et dans le fichier seed.ts. "
        "Hotel Millenium, signale par l'utilisateur, a ete corrige avec son site web "
        "https://milleniumsuites.com.",
        styles['Body']
    ))
    
    story.append(make_table(
        ['Hotel', 'Site web ajoute', 'HTTP Status', 'Confiance'],
        [
            ['Hotel Millenium', 'https://milleniumsuites.com', '403 (WAF, contenu OK)', 'Haute'],
            ['Hotel Petit Bateau', 'https://hotelpetitbateau.com', '200 OK', 'Haute'],
            ['Riviera Taouyah Hotel', 'https://www.rivierataouyahhotel.com', '200 OK', 'Haute'],
            ['Grand Hotel Central (GHC)', 'https://ghc-guinee.com', '200 OK', 'Haute'],
            ['Hotel Tata (Djamtum)', 'https://www.hoteltataguinea.com', '200 OK', 'Haute'],
            ['Hotel le Rocher', 'https://hotel-rocher.com', '200 OK', 'Haute'],
        ],
        [2, 2.5, 2, 1]
    ))
    
    # ══════════════════════════════════════════════════════════════════════════
    # 4. AUDIT DE SECURITE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('4. Audit de securite', styles['SectionTitle']))
    story.append(SectionDivider())
    
    story.append(Paragraph(
        "L'audit de securite revele des lacunes majeures qui empechent le deploiement en production. "
        "Aucune authentification n'est implementee, les cles API sont stockees en clair dans SQLite, "
        "et aucune protection contre les abus n'est en place. Ces problemes sont prioritaires.",
        styles['Body']
    ))
    
    story.append(make_table(
        ['Vulnerabilite', 'Gravite', 'Impact', 'Statut'],
        [
            ['Absence d\'authentification', 'CRITIQUE', 'Toute personne peut acceder aux APIs et modifier les donnees', 'Non corrige'],
            ['Cles API en clair dans SQLite', 'CRITIQUE', 'Vol de cles API si acces a la base', 'Non corrige'],
            ['Pas de rate limiting', 'MAJEUR', 'Risques de DoS et abus des APIs externes', 'Non corrige'],
            ['Pas de CORS configuration', 'MAJEUR', 'Requetes cross-origin non controlees', 'Non corrige'],
            ['Pas de validation des entrees (Zod)', 'MAJEUR', 'Injection de donnees malformees', 'Non corrige'],
            ['Pas de CSRF protection', 'MODERE', 'Attaques cross-site request forgery', 'Non corrige'],
            ['Pas de headers de securite', 'MODERE', 'Pas de HSTS, X-Frame-Options, CSP', 'Non corrige'],
            ['Database URL non chiffree', 'FAIBLE', 'Faible risque (SQLite local)', 'Non corrige'],
        ],
        [2, 1, 3, 1]
    ))
    
    story.append(Paragraph('4.1 Absence d\'authentification', styles['SubSection']))
    story.append(Paragraph(
        "Le projet n'a aucun systeme d'authentification. Tous les endpoints API sont accessibles "
        "sans identification, y compris les operations destructrices (DELETE /api/hotels/[id]), "
        "la gestion des cles API (POST /api/ai/providers), et l'execution de commandes "
        "d'automatisation (POST /api/cron/collect). En production, un attaquant pourrait "
        "supprimer toute la base de donnees, voler les cles API, ou utiliser les APIs IA "
        "a ses propres frais. Next-auth est deja installe comme dependance mais n'est pas "
        "configure.",
        styles['Body']
    ))
    
    story.append(Paragraph('4.2 Cles API stockees en clair', styles['SubSection']))
    story.append(Paragraph(
        "Les cles API des fournisseurs IA (Groq, Gemini, OpenRouter, etc.) sont stockees en "
        "texte clair dans la table AIProvider de SQLite. L'API GET /api/ai/providers masque "
        "judicieusement les cles (keyHint = 'gsk_****xxxx'), mais les cles completes sont "
        "accessibles via l'API de chat qui les lit directement depuis la base. Un chiffrement "
        "AES-256 au repos est indispensable avant tout deploiement en production.",
        styles['Body']
    ))
    
    # ══════════════════════════════════════════════════════════════════════════
    # 5. AUDIT DES DONNEES
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('5. Audit des donnees (sites web hotels)', styles['SectionTitle']))
    story.append(SectionDivider())
    
    story.append(Paragraph(
        "L'audit des donnees a porte sur la verification des sites web des 33 hotels repertories. "
        "Apres correction, 15 hotels disposent d'un site web verifie (45%), 16 ont une presence "
        "digitale partielle (Booking/TripAdvisor sans site propre), et 2 n'ont aucune presence "
        "digitale. 18 hotels restent sans site web officiel apres recherche exhaustive.",
        styles['Body']
    ))
    
    story.append(Paragraph('5.1 Repartition du statut digital', styles['SubSection']))
    story.append(make_table(
        ['Statut', 'Nombre', 'Pourcentage', 'Description'],
        [
            ['Complet (ok)', '15', '45%', 'Site web officiel verifie + plateformes OTA'],
            ['Partiel', '16', '49%', 'Booking/TripAdvisor mais pas de site propre'],
            ['Aucun (none)', '2', '6%', 'Aucune presence digitale significative'],
        ],
        [1, 1, 1, 3]
    ))
    
    story.append(Paragraph('5.2 Incoherence empty string vs null', styles['SubSection']))
    story.append(Paragraph(
        "Un probleme de conception recurrent est l'utilisation de chaines vides '' au lieu de "
        "null pour les champs manquants (web, phone, email, fb, wa, bookingUrl). Cela complexifie "
        "les requetes Prisma (not: null ne fonctionne pas correctement) et risque d'introduire "
        "d'autres bugs. La solution recommandee est de normaliser toutes les valeurs vides en "
        "null lors du seeding et d'ajouter une validation dans les API pour convertir les chaines "
        "vides en null avant l'insertion en base.",
        styles['Body']
    ))
    
    story.append(Paragraph('5.3 Hotels sans site web - Detail', styles['SubSection']))
    story.append(Paragraph(
        "Les 18 hotels suivants n'ont pas de site web officiel apres recherche exhaustive. "
        "Certains ont uniquement une page Facebook ou des annonces sur des plateformes OTA "
        "(Booking.com, TripAdvisor). Pour les hotels de l'interieur (Kankan, Kindia, Mamou), "
        "l'absence de site web est coherente avec le niveau de developpement digital de ces regions.",
        styles['Body']
    ))
    story.append(make_table(
        ['Hotel', 'Ville', 'Presence digitale'],
        [
            ['Hotel Mariador Palace', 'Conakry', 'Booking + TripAdvisor (site HS)'],
            ['Zambezi Inn Hotel', 'Conakry', 'Booking + TripAdvisor'],
            ['Sacha Hotel', 'Conakry', 'Booking + TripAdvisor + Facebook'],
            ['Hotel du Golfe de Guinee', 'Conakry', 'Booking + TripAdvisor (site 415)'],
            ['Oceano Hotel Conakry', 'Conakry', 'Booking + TripAdvisor'],
            ['Hotel Golden Plazza', 'Conakry', 'Booking + TripAdvisor'],
            ['Hotel M\'Lys', 'Conakry', 'TripAdvisor + Facebook'],
            ['Hotel Azur Conakry', 'Conakry', 'Booking + TripAdvisor (site HS)'],
            ['Setifana Sea View', 'Conakry', 'Booking + Expedia'],
            ['Hakaba', 'Conakry', 'Booking + TripAdvisor + Facebook'],
            ['Pension Les Palmiers', 'Conakry', 'TripAdvisor + Facebook (site HS)'],
            ['Chez Sophie', 'Conakry', 'TripAdvisor + Facebook'],
            ['Residence Hoteliere Miniere', 'Kamsar', 'Booking'],
            ['Hotel Particulier HP', 'Conakry', 'Booking'],
            ['Woro Ladia', 'Conakry', 'Booking + Facebook'],
            ['Grand Hotel de l\'Independance', 'Conakry', 'TripAdvisor (historique, pas de site)'],
            ['Kindia Palace Hotel', 'Kindia', 'Aucune presence significative'],
            ['Kankan Prestige Hotel', 'Kankan', 'Aucune presence significative'],
        ],
        [2, 1, 3]
    ))
    
    # ══════════════════════════════════════════════════════════════════════════
    # 6. AUDIT PERFORMANCE ET ROBUSTESSE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('6. Audit des performances et robustesse', styles['SectionTitle']))
    story.append(SectionDivider())
    
    story.append(make_table(
        ['Aspect', 'Evaluation', 'Details'],
        [
            ['Temps de build', 'Bon', '5.4s avec Turbopack'],
            ['Demarrage serveur', 'Excellent', '80ms pour standalone'],
            ['Reponse API stats', 'Bon', '~50ms (11 requetes parallelisees)'],
            ['Reponse API hotels', 'Bon', '~30ms avec pagination'],
            ['Recherche full-text', 'Moyen', 'SQLite LIKE, pas de FTS5'],
            ['Verification URL', 'Acceptable', '10s timeout, batch de 5'],
            ['Gestion erreurs', 'Insuffisant', 'Erreurs 500 generiques, pas de logging structure'],
            ['Rate limiting', 'Absent', 'Pas de protection contre les abus'],
            ['Retry/fallback IA', 'Bon', '7 fournisseurs avec fallback automatique'],
            ['Validation entrees', 'Insuffisant', 'Pas de schema Zod sur les API'],
        ],
        [2.5, 1, 3.5]
    ))
    
    story.append(Paragraph('6.1 Problemes de robustesse identifies', styles['SubSection']))
    story.append(Paragraph(
        "<b>Erreur 500 sur la recherche :</b> Avant correction, toute recherche avec le parametre "
        "search= echouait silencieusement avec une erreur 500. Le catch generique retournait "
        "'Failed to fetch hotels' sans detail sur l'erreur. Il est recommande d'ajouter un "
        "logging structure (Winston ou Pino) et de retourner des codes d'erreur specifiques "
        "avec des messages explicatifs pour le debugging.",
        styles['Body']
    ))
    story.append(Paragraph(
        "<b>Enrichissement sans verification :</b> L'API d'enrichissement (POST /api/hotels/enrich) "
        "utilise le SDK z-ai-web-dev-sdk pour rechercher des informations. Les donnees extraites "
        "par regex (telephone, email, site web) ne sont pas validees avant insertion en base. "
        "Un site web trouve par regex pourrait etre un domaine d'agregateur (booking.com, etc.) "
        "malgre le filtre existant. Il est recommande d'ajouter une verification HTTP HEAD "
        "avant d'enregistrer un site web trouve par enrichissement.",
        styles['Body']
    ))
    story.append(Paragraph(
        "<b>Automation sans queue :</b> L'automatisation runFullCollection() execute "
        "12 recherches web sequentielles avec enrichissement pour 30 hotels. Cette operation "
        "peut prendre plusieurs minutes et risque de timeout si appelee via l'API cron. "
        "Il est recommande d'implementer une queue de taches (BullMQ ou mecanisme similaire) "
        "pour les operations longues.",
        styles['Body']
    ))
    
    # ══════════════════════════════════════════════════════════════════════════
    # 7. ANALYSE PRODUCTION-READINESS
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('7. Analyse production-readiness', styles['SectionTitle']))
    story.append(SectionDivider())
    
    story.append(Paragraph(
        "L'analyse production-readiness evalue la capacite du projet a etre deploye dans un "
        "environnement de production avec des utilisateurs reels. Chaque dimension est evaluee "
        "sur une echelle de 0 a 5 (0 = absent, 5 = niveau production).",
        styles['Body']
    ))
    
    story.append(make_table(
        ['Dimension', 'Score /5', 'Commentaire'],
        [
            ['Authentification', '0/5', 'Aucun systeme d\'auth. Next-auth installe mais non configure'],
            ['Autorisation', '0/5', 'Pas de controle d\'acces par role'],
            ['Chiffrement donnees', '1/5', 'Cles API en clair, pas de chiffrement au repos'],
            ['Validation entrees', '1/5', 'Validation minimale (champs requis), pas de schema Zod'],
            ['Gestion erreurs', '2/5', 'Try/catch presents mais erreurs generiques'],
            ['Logging', '1/5', 'console.error uniquement, pas de logging structure'],
            ['Monitoring', '0/5', 'Pas de health check, pas de metriques'],
            ['Rate limiting', '0/5', 'Aucune protection'],
            ['Backup donnees', '1/5', 'Fichier SQLite, pas de strategie de backup'],
            ['Tests automatises', '0/5', 'Aucun test unitaire ou d\'integration'],
            ['CI/CD', '0/5', 'Pas de pipeline de deploiement'],
            ['Documentation API', '1/5', 'Commentaires dans le code, pas de doc generee'],
        ],
        [2, 0.7, 4.3]
    ))
    
    story.append(Paragraph('7.1 Points forts du projet', styles['SubSection']))
    story.append(Paragraph(
        "Malgre les lacunes identifiees, le projet presente des points forts significatifs qui "
        "forment une base solide pour atteindre le niveau production-ready. L'architecture "
        "Next.js App Router est moderne et bien structuree, avec une separation claire entre "
        "les API routes et le frontend SPA. Le systeme multi-IA avec fallback automatique sur "
        "7 fournisseurs est une fonctionnalite avancee qui apporte de la resilience. "
        "L'automatisation de la collecte et de la verification des donnees via le SDK "
        "z-ai-web-dev-sdk est un avantage concurrentiel. L'interface utilisateur avec "
        "shadcn/ui est professionnelle et responsive.",
        styles['Body']
    ))
    
    story.append(Paragraph('7.2 Points faibles critiques', styles['SubSection']))
    story.append(Paragraph(
        "Les points faibles les plus critiques sont l'absence totale d'authentification, "
        "le stockage des cles API en clair, et l'absence de tests automatises. Un projet "
        "en production sans authentification expose non seulement ses propres donnees mais "
        "aussi les cles API des fournisseurs IA, ce qui peut entrainer des couts financiers "
        "significatifs en cas d'utilisation abusive. L'absence de tests signifie que toute "
        "modification du code risque d'introduire des regressions non detectees.",
        styles['Body']
    ))
    
    # ══════════════════════════════════════════════════════════════════════════
    # 8. RECOMMANDATIONS PRIORITAIRES
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph('8. Recommandations prioritaires', styles['SectionTitle']))
    story.append(SectionDivider())
    
    story.append(Paragraph(
        "Les recommandations sont classees par priorite (P0 = bloquant production, P1 = important, "
        "P2 = amelioration). Les estimations de temps sont basees sur un developpeur senior.",
        styles['Body']
    ))
    
    story.append(make_table(
        ['Priorite', 'Recommandation', 'Temps estime', 'Impact'],
        [
            ['P0', 'Implementer l\'authentification (Next-auth)', '3-4 jours', 'Securise l\'acces a toutes les APIs'],
            ['P0', 'Chiffrer les cles API au repos (AES-256)', '1-2 jours', 'Protege les cles IA contre le vol'],
            ['P0', 'Ajouter un rate limiting (upstash/ratelimit)', '1 jour', 'Protege contre les abus'],
            ['P1', 'Normaliser les donnees : empty string vers null', '0.5 jour', 'Fiabilise les requetes Prisma'],
            ['P1', 'Ajouter la validation Zod sur toutes les APIs', '2-3 jours', 'Previent les injections de donnees'],
            ['P1', 'Implementer un logging structure (Pino)', '1 jour', 'Facilite le debugging en production'],
            ['P1', 'Ajouter un endpoint /api/health', '0.5 jour', 'Monitoring de base'],
            ['P1', 'Configurer CORS et headers de securite', '0.5 jour', 'Protection cross-origin'],
            ['P2', 'Ajouter des tests unitaires (Vitest)', '3-4 jours', 'Confiance dans les modifications'],
            ['P2', 'Ajouter des tests E2E (Playwright)', '2-3 jours', 'Validation des parcours utilisateur'],
            ['P2', 'Mettre en place une CI/CD (GitHub Actions)', '1-2 jours', 'Automatisation du deploiement'],
            ['P2', 'Implementer FTS5 pour la recherche', '1 jour', 'Recherche full-text performante'],
            ['P2', 'Ajouter une queue de taches (BullMQ)', '2 jours', 'Gestion des operations longues'],
            ['P2', 'Migrer vers PostgreSQL pour la production', '2-3 jours', 'Performance et concurrence'],
        ],
        [0.7, 3, 1, 2.3]
    ))
    
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(
        "Le temps total estime pour atteindre le niveau production-ready (P0 + P1) est de "
        "9-12 jours de developpement. Avec les ameliorations P2, le projet atteindrait un "
        "niveau professionnel complet en 15-20 jours.",
        styles['Body']
    ))
    
    # ─── Build PDF ──────────────────────────────────────────────────────────
    
    doc.build(story)
    print(f'PDF genere : {output_path}')
    return output_path

if __name__ == '__main__':
    build_report()
