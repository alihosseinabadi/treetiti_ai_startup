import os, sys, tempfile
sys.path.insert(0, r"C:\Users\ali hosseinabadi\our_company\treetiti_partners\findii")
import config
config.CRM_PASSWORD = ""
from core.db import LeadStore
from core.models import Lead
from crm.app import create_app
import asyncio

store = LeadStore(os.path.join(tempfile.mkdtemp(), "demo.db"))
demo = [
    Lead(source_chat_id=1, message_id=1, source="telegram", source_title="msk arenda",
         is_real_estate=True, deal_type="rent", property_type="apartment",
         city="Moscow", district="Tverskoy", price=80000, currency="RUB",
         rooms=2, contact="+7 916 111-22-33", geo_status="Confirmed",
         matched_address="Tverskaya 1", latitude=55.7558, longitude=37.6173,
         summary="2br near center, owner", score=95),
    Lead(source_chat_id=1, message_id=2, source="avito", source_title="msk sale",
         source_url="https://avito.ru/x", is_real_estate=True, deal_type="sell",
         property_type="apartment", city="Moscow", district="Arbat",
         price=15000000, currency="RUB", rooms=1, area_sqm=38,
         contact="+7 925 000-00-00", geo_status="Probable",
         matched_address="Arbat", latitude=55.7495, longitude=37.5911,
         summary="1br, renovated", score=82),
    Lead(source_chat_id=2, message_id=3, source="telegram", source_title="msk sale",
         is_real_estate=True, deal_type="sell", property_type="house",
         city="Moscow", price=30000000, currency="RUB",
         summary="house, call for details", score=45),
]
async def seed():
    for l in demo:
        await store.save_lead(l)
asyncio.run(seed())
app = create_app(store)
