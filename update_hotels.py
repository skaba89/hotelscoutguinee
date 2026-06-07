#!/usr/bin/env python3
"""
Update HotelScout Guinea v5 HTML file:
1. Fix verified hotel web URLs (correct domains)
2. Remove unverified/fake web URLs
3. Update status_digital accordingly
4. Remove BOOKING_HOTELS section (fabricated data)
5. Update JS references to BOOKING_HOTELS
"""

import re

INPUT = '/home/z/my-project/download/hotelscout-guinea-v5.html'
OUTPUT = '/home/z/my-project/download/hotelscout-guinea-v6.html'

with open(INPUT, 'r', encoding='utf-8') as f:
    html = f.read()

# ============================================================
# 1. Fix REAL_HOTELS web URLs based on verification results
# ============================================================

# Hotels with CONFIRMED working websites - keep/correct their URLs
url_fixes = {
    # r004: Wrong domain (rivierapalace.com → rivieraroyalhotel.com)
    'r004': {
        'web': 'https://www.rivieraroyalhotel.com',
        'email': '',  # contact@rivierapalace.com is fake
        'status_digital': 'ok'
    },
    # r005: atlanticviewhotel.com CONFIRMED
    # r006: onomohotels.com CONFIRMED
    # r008: Wrong domain (hotelkaloum.com → primushotelkaloum.com) 
    'r008': {
        'web': 'https://primushotelkaloum.com',
        'email': '',  # reservation@hotelkaloum.com is fake
        'status_digital': 'ok'
    },
    # r009: souarepremiumhotel.com CONFIRMED
    'r009': {
        'web': 'https://souarepremiumhotel.com',
        'status_digital': 'ok'
    },
}

# Hotels with UNVERIFIED/FAKE web URLs - remove the fake URL
fake_url_hotels = {
    'r007': {'reason': 'hotelspetitbateau.com not found', 'new_status': 'partial'},
    'r010': {'reason': 'hotelsmariador.com not found', 'new_status': 'partial'},
    'r011': {'reason': 'ghc-conakry.com not found', 'new_status': 'partial'},
    'r012': {'reason': 'hotelrivierataouyah.com not found', 'new_status': 'partial'},
    'r013': {'reason': 'zambeziinnconakry.com not found', 'new_status': 'partial'},
    'r014': {'reason': 'hotelgolfeguinee.com not found', 'new_status': 'partial'},
    'r015': {'reason': 'oceanohotelconakry.com not found', 'new_status': 'partial'},
    'r016': {'reason': 'sachahotelconakry.com not found', 'new_status': 'partial'},
    'r017': {'reason': 'goldenplazzaconakry.com not found', 'new_status': 'partial'},
    'r018': {'reason': 'hotelmilleniumconakry.com not found', 'new_status': 'partial'},
    'r019': {'reason': 'hotelmlys.com not found', 'new_status': 'partial'},
    'r020': {'reason': 'hotelazurconakry.com not found', 'new_status': 'partial'},
    'r021': {'reason': 'setifanaseaview.com not found', 'new_status': 'partial'},
    'r022': {'reason': 'hakaba-conakry.com not found', 'new_status': 'partial'},
    'r052': {'reason': 'hotelsogue.com not confirmed', 'new_status': 'partial'},
    'r082': {'reason': 'mont-nimba.com not found (zalymerveille.com is the parent site)', 'new_status': 'partial'},
}

# Also fix fake emails that use fake domains
fake_email_hotels = {
    'r007': 'contact@hotelspetitbateau.com',
    'r009': 'info@souarepremiumhotel.com',  # KEEP - domain confirmed
    'r011': 'reservation@ghc-conakry.com',
    'r012': 'taouyah@rivierapalace.com',
    'r013': 'info@zambeziinnconakry.com',
    'r014': 'contact@hotelgolfeguinee.com',
    'r015': 'info@oceanohotelconakry.com',
    'r016': 'reservation@sachahotelconakry.com',
}

def fix_hotel_entry(html, hotel_id, changes):
    """Apply fixes to a specific hotel entry in the HTML."""
    # Find the hotel entry by its id
    pattern = r'(id:"' + hotel_id + r'",name:"[^"]*"[^}]+)'
    
    match = re.search(pattern, html)
    if not match:
        print(f"  WARNING: Could not find hotel {hotel_id}")
        return html
    
    entry = match.group(1)
    original = entry
    
    for key, value in changes.items():
        if key == 'status_digital':
            # Replace status_digital value
            entry = re.sub(r'status_digital:"[^"]*"', f'status_digital:"{value}"', entry)
        elif key == 'web':
            # Replace web URL
            entry = re.sub(r'web:"[^"]*"', f'web:"{value}"', entry)
        elif key == 'email':
            if value == '':
                # Remove fake email
                entry = re.sub(r',email:"[^"]*"', ',email:""', entry)
            else:
                entry = re.sub(r',email:"[^"]*"', f',email:"{value}"', entry)
    
    if entry != original:
        html = html[:match.start()] + entry + html[match.end():]
        print(f"  Fixed {hotel_id}")
    
    return html

# Apply URL fixes for hotels with correct domains
print("Fixing verified hotel URLs...")
for hotel_id, changes in url_fixes.items():
    html = fix_hotel_entry(html, hotel_id, changes)

# Remove fake URLs and update status
print("Removing unverified web URLs...")
for hotel_id, info in fake_url_hotels.items():
    changes = {'web': '', 'status_digital': info['new_status']}
    html = fix_hotel_entry(html, hotel_id, changes)

# Remove fake emails
print("Removing unverified email addresses...")
for hotel_id, fake_email in fake_email_hotels.items():
    if hotel_id in url_fixes or hotel_id == 'r009':
        continue  # Skip hotels with confirmed domains
    html = fix_hotel_entry(html, hotel_id, {'email': ''})

# ============================================================
# 2. Remove BOOKING_HOTELS section entirely
# ============================================================
print("\nRemoving BOOKING_HOTELS section...")

# Find and remove the BOOKING_HOTELS const
bk_pattern = r'// 35 hôtels guinéens réels sur plateformes de réservation\nconst BOOKING_HOTELS = \[[\s\S]*?\];\n'
bk_match = re.search(bk_pattern, html)
if bk_match:
    html = html[:bk_match.start()] + html[bk_match.end():]
    print("  Removed BOOKING_HOTELS array")
else:
    # Try alternate pattern
    bk_pattern2 = r'const BOOKING_HOTELS = \[[\s\S]*?\];\n'
    bk_match2 = re.search(bk_pattern2, html)
    if bk_match2:
        html = html[:bk_match2.start()] + html[bk_match2.end():]
        print("  Removed BOOKING_HOTELS array (pattern 2)")

# ============================================================
# 3. Update JS code that references BOOKING_HOTELS
# ============================================================
print("\nUpdating JavaScript references...")

# Remove the line that merges BOOKING_HOTELS
html = re.sub(
    r'\s*\.\.\.BOOKING_HOTELS\.map\(h=>normalizeHotel\(\{\.+?\}\)\),',
    '',
    html
)

# Replace BOOKING_HOTELS references in plateformes page with REAL_HOTELS
html = html.replace('badge(\'badge-plateformes\', BOOKING_HOTELS.length)', 
                    'badge(\'badge-plateformes\', REAL_HOTELS.length)')
html = html.replace('const total=BOOKING_HOTELS.length', 
                    'const total=REAL_HOTELS.length')
html = html.replace('const onBooking=BOOKING_HOTELS.filter(h=>h.has_booking).length', 
                    'const onBooking=REAL_HOTELS.filter(h=>h.has_booking).length')
html = html.replace('const onTA=BOOKING_HOTELS.filter(h=>h.has_tripadvisor).length', 
                    'const onTA=REAL_HOTELS.filter(h=>h.has_tripadvisor).length')
html = html.replace('const noWeb=BOOKING_HOTELS.filter(h=>!h.web).length', 
                    'const noWeb=REAL_HOTELS.filter(h=>!h.web).length')

# Fix the regions line
html = html.replace(
    "const regions=[...new Set(BOOKING_HOTELS.map(h=>h.region))].sort()",
    "const regions=[...new Set(REAL_HOTELS.map(h=>h.region))].sort()"
)

# Fix filter line
html = re.sub(
    r'const data=BOOKING_HOTELS\.filter',
    'const data=REAL_HOTELS.filter',
    html
)

# Fix find line  
html = re.sub(
    r'const h=BOOKING_HOTELS\.find',
    'const h=REAL_HOTELS.find',
    html
)

# Fix export line
html = html.replace(
    "const rows=BOOKING_HOTELS.map(h=>({...h, amenities:(h.amenities||[]).join(' | ')}))",
    "const rows=REAL_HOTELS.map(h=>({...h, amenities:(h.amenities||[]).join(' | ')}))"
)
html = html.replace(
    "showToast(BOOKING_HOTELS.length+' hôtels exportés avec URLs plateformes','success')",
    "showToast(REAL_HOTELS.length+' hôtels exportés avec URLs plateformes','success')"
)

print("  Updated all BOOKING_HOTELS references")

# ============================================================
# 4. Update version number
# ============================================================
html = html.replace('HotelScout Guinea v5', 'HotelScout Guinea v6')
html = html.replace('>v5<', '>v6<')

# ============================================================
# 5. Save the updated file
# ============================================================
with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nDone! Updated file saved to: {OUTPUT}")
print(f"File size: {len(html)} bytes")

# Quick stats
import json
ok_count = html.count('status_digital:"ok"')
partial_count = html.count('status_digital:"partial"')
none_count = html.count('status_digital:"none"')
web_count = len(re.findall(r'web:"https?://', html))
print(f"\nStats after update:")
print(f"  status_digital ok: {ok_count}")
print(f"  status_digital partial: {partial_count}")
print(f"  status_digital none: {none_count}")
print(f"  Hotels with web URLs: {web_count}")
