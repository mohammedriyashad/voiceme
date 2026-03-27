"""routes/symbols.py — ARASAAC symbol search + custom symbol upload"""
import os, shutil
from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import httpx
from sqlalchemy.orm import Session

from utils.database import get_db, CustomSymbol
from utils.state    import app_state
from utils.config   import config

router = APIRouter()

class SymbolItem(BaseModel):
    id:    str
    label: str
    url:   Optional[str] = None

# ── ARASAAC search proxy ──────────────────────────────────────
@router.get('/search/{keyword}')
async def search(keyword: str, limit: int = 6):
    """Proxy ARASAAC API — fixes CORS issue for browser"""
    url = f'{config.ARASAAC_API_URL}/pictograms/{config.ARASAAC_LANG}/search/{keyword}'
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r    = await client.get(url)
            data = r.json() if r.status_code == 200 else []
    except Exception as e:
        print(f'[ARASAAC] Error fetching {keyword}: {e}')
        data = []

    results = []
    for p in (data or [])[:limit]:
        pid = p.get('_id')
        if not pid:
            continue
        kws = p.get('keywords') or [{}]
        lbl = kws[0].get('keyword', keyword) if kws else keyword
        results.append({
            'id':    str(pid),
            'label': lbl,
            'url':   f'https://static.arasaac.org/pictograms/{pid}/500/arasaac_{pid}_500.png',
        })

    print(f'[ARASAAC] "{keyword}" → {len(results)} results')
    return {'results': results, 'keyword': keyword}

# ── Symbol board state ────────────────────────────────────────
@router.post('/add')
async def add(symbol: SymbolItem):
    app_state.symbols.append(symbol.dict())
    return {'symbols': app_state.symbols}

@router.delete('/remove/{index}')
async def remove(index: int):
    if 0 <= index < len(app_state.symbols):
        app_state.symbols.pop(index)
    return {'symbols': app_state.symbols}

@router.delete('/clear')
async def clear():
    app_state.symbols.clear()
    return {'symbols': []}

@router.get('/state')
async def state():
    return {'symbols': app_state.symbols}

# ── Custom symbol upload ──────────────────────────────────────
@router.post('/custom/upload')
async def upload_symbol(
    label: str,
    child_id: Optional[int] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ('.png', '.jpg', '.jpeg', '.gif', '.webp'):
        return {'error': 'Invalid file type. Use PNG/JPG/GIF/WEBP.'}
    fname = f"custom_{label.replace(' ','_')}_{os.urandom(4).hex()}{ext}"
    path  = os.path.join(config.UPLOAD_DIR, fname)
    with open(path, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    sym = CustomSymbol(child_id=child_id, label=label, file_path='/'+path)
    db.add(sym); db.commit(); db.refresh(sym)
    return {'id': sym.id, 'label': label, 'url': '/'+path}

@router.get('/custom/list')
def list_custom(child_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(CustomSymbol)
    if child_id:
        q = q.filter(CustomSymbol.child_id == child_id)
    syms = q.order_by(CustomSymbol.uploaded_at.desc()).all()
    return {'symbols': [{'id':s.id,'label':s.label,'url':s.file_path} for s in syms]}
