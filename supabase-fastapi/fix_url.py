import urllib.parse

# --- PUT YOUR DETAILS HERE ---
password = "Z9w2FkA2abLp4eGC"
project_id = "vnxchslacwzoxtlsnqqj"
# -----------------------------

import urllib.parse

# --- PUT YOUR DETAILS HERE ---
password = "PASTE_YOUR_NEW_PASSWORD_HERE"
project_id = "vnxchslacwzoxtlsnqqj"
# -----------------------------

encoded_password = urllib.parse.quote_plus(password)

# 1. Use the POOLER Host (aws-1...) because you don't have IPv4 addon.
# 2. Use Port 6543.
# 3. Add '?gssencmode=disable' to stop the SASL error.
pooler_url = f"postgresql+psycopg2://postgres.{project_id}:{encoded_password}@aws-1-us-east-1.pooler.supabase.com:6543/postgres?gssencmode=disable"

print("\n--- COPY THIS LINE BELOW INTO YOUR .env FILE ---")
print(f"DATABASE_URL={pooler_url}")
print("------------------------------------------------\n")