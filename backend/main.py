import os
import io
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, PlainTextResponse, StreamingResponse
from pydantic import BaseModel

from backend.services.brightwind_service import BrightwindService, UPLOAD_DIR

app = FastAPI(
    title="Wind Resource Editor API",
    description="Engineered backend powered by brightwind for wind resource analysis",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = BrightwindService()

# --- Request Models ---
class LoadDatasetRequest(BaseModel):
    dataset_id: str

class QCRulesRequest(BaseModel):
    speed_col: str
    min_speed: float = 0.0
    max_speed: float = 45.0
    direction_col: Optional[str] = None
    shadow_sector_start: Optional[float] = None
    shadow_sector_end: Optional[float] = None
    temp_col: Optional[str] = None
    min_temp_icing: Optional[float] = None
    std_col: Optional[str] = None
    min_std_frozen: Optional[float] = None

class AnemometerConfig(BaseModel):
    column: str
    height: float

class WindShearRequest(BaseModel):
    anemometers: List[AnemometerConfig]
    hub_heights: List[float] = [100, 120, 140, 160]
    min_speed: float = 3.0
    apply_qc: bool = True

class WaspExportRequest(BaseModel):
    speed_col: str
    direction_col: str
    height: float
    lat: float = -5.0
    lon: float = -38.0
    mast_name: str = "MetMast"

# --- Endpoints ---

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Wind Resource Editor", "engine": "brightwind"}

@app.get("/api/datasets")
def list_datasets():
    return service.list_datasets()

@app.post("/api/datasets/load")
def load_dataset(req: LoadDatasetRequest):
    try:
        return service.load_dataset(req.dataset_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.txt', '.dat', '.tim')):
        raise HTTPException(status_code=400, detail="Only .csv, .txt, .dat, .tim files are supported.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    
    return {
        "status": "success",
        "dataset_id": f"upload_{file.filename}",
        "filename": file.filename,
        "size_bytes": len(contents)
    }

@app.get("/api/timeseries")
def get_timeseries(
    columns: str = Query(..., description="Comma separated list of column names"),
    max_points: int = Query(1500, ge=100, le=10000),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    try:
        col_list = [c.strip() for c in columns.split(",") if c.strip()]
        return service.get_timeseries(col_list, max_points=max_points, start_date=start_date, end_date=end_date)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/qc/apply")
def apply_qc(req: QCRulesRequest):
    try:
        return service.apply_qc_rules(
            speed_col=req.speed_col,
            min_speed=req.min_speed,
            max_speed=req.max_speed,
            direction_col=req.direction_col,
            shadow_sector_start=req.shadow_sector_start,
            shadow_sector_end=req.shadow_sector_end,
            temp_col=req.temp_col,
            min_temp_icing=req.min_temp_icing,
            std_col=req.std_col,
            min_std_frozen=req.min_std_frozen
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/analysis/wind-rose")
def get_wind_rose(
    speed_col: str,
    direction_col: str,
    sectors: int = 16,
    apply_qc: bool = True
):
    try:
        return service.calculate_wind_rose(
            speed_col=speed_col,
            direction_col=direction_col,
            sectors=sectors,
            apply_qc=apply_qc
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analysis/wind-shear")
def get_wind_shear(req: WindShearRequest):
    try:
        anem_dicts = [{"column": a.column, "height": a.height} for a in req.anemometers]
        return service.calculate_wind_shear(
            anemometers=anem_dicts,
            hub_heights=req.hub_heights,
            min_speed=req.min_speed,
            apply_qc=req.apply_qc
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/analysis/turbulence")
def get_turbulence(
    speed_col: str,
    std_col: str,
    min_speed: float = 3.0,
    apply_qc: bool = True
):
    try:
        return service.calculate_turbulence(
            speed_col=speed_col,
            std_col=std_col,
            min_speed=min_speed,
            apply_qc=apply_qc
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/analysis/12x24")
def get_12x24(
    speed_col: str,
    apply_qc: bool = True
):
    try:
        return service.calculate_12x24(speed_col=speed_col, apply_qc=apply_qc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/analysis/weibull")
def get_weibull(
    speed_col: str,
    apply_qc: bool = True
):
    try:
        return service.calculate_weibull(speed_col=speed_col, apply_qc=apply_qc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/export/wasp-tab")
def export_wasp_tab(req: WaspExportRequest):
    try:
        tab_content = service.export_wasp_tab(
            speed_col=req.speed_col,
            direction_col=req.direction_col,
            height=req.height,
            lat=req.lat,
            lon=req.lon,
            mast_name=req.mast_name
        )
        return PlainTextResponse(
            content=tab_content,
            headers={
                "Content-Disposition": f"attachment; filename={req.mast_name}_{int(req.height)}m.tab"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/export/clean-csv")
def export_clean_csv(apply_qc: bool = True):
    if service.current_df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded.")
    
    df = service.current_df
    if apply_qc and service.flags_mask is not None:
        df = df[service.flags_mask]
    
    output = io.StringIO()
    df.to_csv(output)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cleaned_wind_data.csv"}
    )

# --- Mount Static Frontend (Single Executable / Desktop Mode) ---
from fastapi.staticfiles import StaticFiles

DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

