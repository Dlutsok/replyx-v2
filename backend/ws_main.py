"""
WebSocket Gateway Main Entry Point
Optimized for single-worker WebSocket connections
"""

import os
import logging
import logging.handlers
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from core.dynamic_cors_middleware import DynamicCORSMiddleware
from core.dynamic_csp_middleware import DynamicCSPMiddleware
from database.connection import engine, Base, SessionLocal, get_db
from database import models
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env")

from core.app_config import (
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, CORS_ORIGINS
)
from core.security_headers import security_headers_middleware

# Setup logging optimized for WebSocket service
os.makedirs('logs', exist_ok=True)
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
for h in list(root_logger.handlers):
    root_logger.removeHandler(h)
formatter = logging.Formatter('%(asctime)s - [WS-GATEWAY] %(name)s - %(levelname)s - %(message)s')
file_handler = logging.handlers.TimedRotatingFileHandler('logs/ws_gateway.log', when='midnight', backupCount=7, encoding='utf-8')
file_handler.setFormatter(formatter)
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
root_logger.addHandler(file_handler)
root_logger.addHandler(stream_handler)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 WebSocket Gateway Starting up...")
    
    # Create database tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables synchronized")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    # Initialize WebSocket manager
    try:
        from services.websocket_manager import (
            ws_connections, ws_site_connections,
            ws_meta, ws_site_meta
        )
        logger.info("✅ WebSocket connection pools initialized")
        logger.info(f"📊 Initial state - Admin connections: {len(ws_connections)}, Site connections: {len(ws_site_connections)}")
    except Exception as e:
        logger.error(f"❌ WebSocket manager initialization failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 WebSocket Gateway Shutting down...")
    
    # Cleanup WebSocket connections
    try:
        from services.websocket_manager import cleanup_all_connections
        await cleanup_all_connections()
        logger.info("✅ All WebSocket connections cleaned up")
    except Exception as e:
        logger.error(f"❌ WebSocket cleanup error: {e}")

# Create FastAPI app optimized for WebSocket
app = FastAPI(
    title="ReplyX WebSocket Gateway",
    description="Dedicated WebSocket service for stable real-time connections",
    version="1.0.0",
    lifespan=lifespan
)

# Add middleware with WebSocket-specific configuration
app.add_middleware(
    DynamicCORSMiddleware,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Add security headers
app.middleware("http")(security_headers_middleware)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check for ws-gateway service"""
    try:
        # Quick database connectivity check
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        
        # WebSocket pools status
        from services.websocket_manager import ws_connections, ws_site_connections
        total_connections = sum(len(conns) for conns in ws_connections.values()) + \
                          sum(len(conns) for conns in ws_site_connections.values())
        
        return {
            "status": "healthy",
            "service": "ws-gateway",
            "database": "connected",
            "websocket_connections": {
                "admin_pools": len(ws_connections),
                "site_pools": len(ws_site_connections),
                "total_connections": total_connections
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return Response(
            content=f"Unhealthy: {e}",
            status_code=503,
            media_type="text/plain"
        )

# Include only WebSocket-related routes
from api.websockets import router as websocket_router
app.include_router(websocket_router)

# WebSocket debug endpoints for monitoring
@app.get("/api/debug/websocket/status")
async def websocket_status():
    """Debug endpoint to check WebSocket connection status"""
    try:
        from services.websocket_manager import (
            ws_connections, ws_site_connections,
            ws_meta, ws_site_meta
        )
        
        admin_stats = {}
        for dialog_id, connections in ws_connections.items():
            admin_stats[dialog_id] = {
                "connection_count": len(connections),
                "meta_count": len(ws_meta.get(dialog_id, {}))
            }
        
        site_stats = {}
        for dialog_id, connections in ws_site_connections.items():
            site_stats[dialog_id] = {
                "connection_count": len(connections),
                "meta_count": len(ws_site_meta.get(dialog_id, {}))
            }
        
        return {
            "service": "ws-gateway",
            "admin_pools": admin_stats,
            "site_pools": site_stats,
            "total_admin_connections": sum(len(conns) for conns in ws_connections.values()),
            "total_site_connections": sum(len(conns) for conns in ws_site_connections.values())
        }
    except Exception as e:
        logger.error(f"WebSocket status check failed: {e}")
        return {"error": str(e)}

@app.get("/api/debug/websocket/sync")
async def websocket_sync_check(dialog_id: int):
    """Debug endpoint to check specific dialog synchronization"""
    try:
        from services.websocket_manager import (
            ws_connections, ws_site_connections,
            ws_meta, ws_site_meta
        )
        
        admin_conns = len(ws_connections.get(dialog_id, set()))
        site_conns = len(ws_site_connections.get(dialog_id, set()))
        admin_meta = len(ws_meta.get(dialog_id, {}))
        site_meta = len(ws_site_meta.get(dialog_id, {}))
        
        return {
            "dialog_id": dialog_id,
            "admin_connections": admin_conns,
            "site_connections": site_conns,
            "admin_metadata": admin_meta,
            "site_metadata": site_meta,
            "synchronized": admin_conns == admin_meta and site_conns == site_meta
        }
    except Exception as e:
        logger.error(f"WebSocket sync check failed for dialog {dialog_id}: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment
    port = int(os.getenv("UVICORN_PORT", 8001))
    workers = int(os.getenv("UVICORN_WORKERS", 1))  # Force single worker
    
    logger.info(f"🚀 Starting WebSocket Gateway on port {port} with {workers} worker(s)")
    
    uvicorn.run(
        "ws_main:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        loop="uvloop",
        http="httptools",
        log_level="info",
        access_log=True,
        reload=False  # Disable reload for production
    )