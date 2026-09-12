import logging
import asyncio
from typing import Optional

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False

from scripts.fetch_argo_ftp import fetch_argo_data
from scripts.fetch_glider_ftp import fetch_glider_data

logger = logging.getLogger("triton.scheduler")
scheduler: Optional[Any] = None if not APSCHEDULER_AVAILABLE else AsyncIOScheduler()


def sync_ocean_observation_datasets():
    """
    Periodic job to fetch the latest Argo float and Glider datasets
    from IFREMER FTP servers.
    """
    logger.info("Starting automated ocean observation data sync...")
    try:
        fetch_argo_data()
        fetch_glider_data()
        logger.info("Ocean observation data sync completed successfully.")
    except Exception as e:
        logger.error(f"Error syncing observation datasets: {e}")


def start_scheduler():
    """Starts the background data acquisition scheduler."""
    if not APSCHEDULER_AVAILABLE or scheduler is None:
        logger.warning("apscheduler package not installed. Automated background data sync disabled.")
        return

    if not scheduler.running:
        # Schedule dataset sync every 12 hours
        scheduler.add_job(sync_ocean_observation_datasets, "interval", hours=12, id="obs_sync_job")
        scheduler.start()
        logger.info("Automated observation data acquisition scheduler started.")
