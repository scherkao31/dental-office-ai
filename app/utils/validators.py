import re
from datetime import datetime

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone):
    """Validate phone number (Swiss format)"""
    # Remove spaces and special characters
    phone = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Swiss phone patterns
    patterns = [
        r'^\+41[0-9]{9}$',  # +41 XX XXX XX XX
        r'^0[0-9]{9}$',     # 0XX XXX XX XX
        r'^[0-9]{10}$'      # XXXXXXXXXX
    ]
    
    return any(re.match(pattern, phone) for pattern in patterns)

def validate_date(date_string):
    """Validate date string in ISO format"""
    try:
        datetime.fromisoformat(date_string)
        return True
    except:
        return False