from fastapi import APIRouter, Request, HTTPException, Body
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from database import SessionLocal
from models.models import RunnerSiteLog

templates = Jinja2Templates(directory="templates")
CONFIG_PATH = "data/config.json"

router = APIRouter(
    prefix="",
    tags=["home"]
)

def read_config() -> Dict[str, Any]:
    """Read the configuration from the JSON file."""
    try:
        with open(CONFIG_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading config: {str(e)}")

def write_config(config: Dict[str, Any]) -> None:
    """Write the configuration to the JSON file."""
    try:
        with open(CONFIG_PATH, 'w') as f:
            json.dump(config, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing config: {str(e)}")

def format_duration(seconds):
    """Format a duration in seconds to a human-readable string."""
    if seconds < 60:
        return f"{int(seconds)} seconds"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{int(minutes)} minutes"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{int(hours)} hours"
    else:
        days = seconds // 86400
        return f"{int(days)} days"

def format_time_ago(dt):
    """Format a datetime as a human-readable 'time ago' string."""
    now = datetime.now()
    diff = now - dt
    seconds = diff.total_seconds()
    
    return format_duration(seconds) + " ago"

@router.get("/")
async def get_home(request: Request):
    """Render the home page with the current configuration."""
    config = read_config()
    
    # Get site data from database
    db = SessionLocal()
    try:
        # Get the latest status for each site by name
        site_names = {site['name'] for site in config["sites"]}
        all_site_logs = []
        unknown_sites_data = []  # To store sites with no logs yet
        
        for name in site_names:
            # Get the most recent log for this site
            latest_log = db.query(RunnerSiteLog).filter(
                RunnerSiteLog.name == name
            ).order_by(
                RunnerSiteLog.last_scan_time.desc()
            ).first()
            
            # Include all sites, even with unknown status
            if latest_log:
                all_site_logs.append(latest_log)
            else:
                # If no log exists yet, create a temporary dictionary with default values
                # to represent an unknown status site
                site_url = ""
                for site in config["sites"]:
                    if site["name"] == name:
                        site_url = site["url"]
                        break
                
                # Create a dummy log entry for display purposes only
                unknown_sites_data.append({
                    "id": "temp_" + name,
                    "name": name,
                    "url": site_url,
                    "status": "unknown",
                    "response_time": "0.00s",
                    "created_at": "Just added",
                    "last_scan": "Pending scan",
                    "duration": "Pending scan",
                    "ssl_days_remaining": None
                })
        
        # Create stats for the status summary
        total_sites = len(site_names)  # Use all sites from config
        down_sites = sum(1 for log in all_site_logs if log.status == "down")
        slow_sites = sum(1 for log in all_site_logs if log.status == "slow") 
        token_alert_sites = sum(1 for log in all_site_logs if log.status == "token_alert")
        healthy_sites = sum(1 for log in all_site_logs if log.status == "up" or log.status == "healthy")
        unknown_sites = total_sites - down_sites - slow_sites - token_alert_sites - healthy_sites
        
        # Prepare site logs for display
        display_logs = []
        for log in all_site_logs:
            # Calculate duration
            duration_seconds = (log.last_scan_time - log.created_at).total_seconds()
            human_duration = format_duration(duration_seconds)
            
            # Format times for display
            created_at_display = format_time_ago(log.created_at)
            last_scan_display = format_time_ago(log.last_scan_time)
            
            # Get the URL from the config for this site
            site_url = ""
            for site in config["sites"]:
                if site["name"] == log.name:
                    site_url = site["url"]
                    break
            
            display_logs.append({
                "id": str(log.id),
                "name": log.name,
                "url": site_url,
                "status": log.status,
                "response_time": f"{log.response_time:.2f}s",
                "created_at": created_at_display,
                "last_scan": last_scan_display,
                "duration": human_duration,
                "ssl_days_remaining": log.ssl_days_remaining
            })
        
        # Add the unknown sites to the display logs
        display_logs.extend(unknown_sites_data)
        
        # Sort by status priority (healthy, down, slow, token_alert, unknown)
        def status_priority(log):
            if log["status"] == "up" or log["status"] == "healthy":
                return 0  # Healthy sites first
            elif log["status"] == "down":
                return 1
            elif log["status"] == "slow":
                return 2
            elif log["status"] == "token_alert":
                return 3
            elif log["status"] == "unknown":
                return 4  # Unknown sites last
            else:
                return 0  # Default to healthy for any other status
                
        display_logs.sort(key=status_priority)
        
        return templates.TemplateResponse(
            "home.html", 
            {
                "request": request, 
                "config": config,
                "logs": display_logs,
                "stats": {
                    "total": total_sites,
                    "down": down_sites,
                    "slow": slow_sites,
                    "expiring": token_alert_sites,
                    "healthy": healthy_sites,
                    "unknown": unknown_sites
                }
            }
        )
    finally:
        db.close()

@router.get("/sites")
async def get_sites_page(request: Request):
    """Render the sites page with the current configuration."""
    config = read_config()
    return templates.TemplateResponse("sites.html", {"request": request, "config": config})

@router.get("/settings")
async def get_settings(request: Request):
    """Render the settings page with the current configuration."""
    config = read_config()
    return templates.TemplateResponse("settings.html", {"request": request, "config": config})

@router.get("/api/sites")
async def get_sites():
    """Get all monitored sites."""
    config = read_config()
    return JSONResponse(content=config["sites"])

@router.get("/api/sites/{site_index}")
async def get_site(site_index: int):
    """Get a specific site by index."""
    try:
        # Logging to debug
        print(f"Get site request for index: {site_index}, type: {type(site_index)}")
        
        config = read_config()
        total_sites = len(config["sites"])
        print(f"Total sites in config: {total_sites}")
        
        if site_index < 0 or site_index >= len(config["sites"]):
            print(f"Site index out of range: {site_index}")
            raise HTTPException(status_code=404, detail=f"Site not found. Index {site_index} is out of range (0-{total_sites-1})")
        
        site_data = config["sites"][site_index]
        print(f"Returning site data for index {site_index}: {site_data}")
        return JSONResponse(content=site_data)
    except ValueError as e:
        print(f"Value error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid site index: {site_index}. Must be an integer.")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving site: {str(e)}")

@router.post("/api/sites")
async def add_site(site: Dict[str, Any] = Body(...)):
    """Add a new site to monitor."""
    config = read_config()
    
    # Validate required fields
    if not all(key in site for key in ["name", "url", "trigger"]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Add the new site
    config["sites"].append(site)
    write_config(config)
    
    return JSONResponse(content={"message": "Site added successfully"})

@router.put("/api/sites/{site_index}")
async def update_site(site_index: int, site: Dict[str, Any] = Body(...)):
    """Update an existing site."""
    config = read_config()
    
    if site_index < 0 or site_index >= len(config["sites"]):
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Validate required fields
    if not all(key in site for key in ["name", "url", "trigger"]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Update the site
    config["sites"][site_index] = site
    write_config(config)
    
    return JSONResponse(content={"message": "Site updated successfully"})

@router.delete("/api/sites/{site_index}")
async def delete_site(site_index: int):
    """Delete a site from monitoring."""
    config = read_config()
    
    if site_index < 0 or site_index >= len(config["sites"]):
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Remove the site
    config["sites"].pop(site_index)
    write_config(config)
    
    return JSONResponse(content={"message": "Site deleted successfully"})

@router.post("/api/settings")
async def update_settings(settings: Dict[str, Any] = Body(...)):
    """Update global settings."""
    print("Received settings update:", settings)
    config = read_config()
    print("Current config:", config)
    
    # Update settings
    if "default_scan_interval" in settings:
        config["default_scan_interval"] = settings["default_scan_interval"]
    if "default_timeout" in settings:
        config["default_timeout"] = settings["default_timeout"]
    if "default_slow_threshold" in settings:
        config["default_slow_threshold"] = settings["default_slow_threshold"]
    if "expiring_token_threshold" in settings:
        config["expiring_token_threshold"] = settings["expiring_token_threshold"]
    if "attempt_before_trigger" in settings:
        config["attempt_before_trigger"] = settings["attempt_before_trigger"]
    if "include_error_debugging" in settings:
        config["include_error_debugging"] = settings["include_error_debugging"]
        print("Updated include_error_debugging to:", config["include_error_debugging"])
    
    write_config(config)
    print("Updated config:", config)
    
    return JSONResponse(content={"message": "Settings updated successfully"})

@router.get("/api/webhooks")
async def get_webhooks():
    """Get all webhooks."""
    config = read_config()
    return JSONResponse(content=config["webhooks"])

@router.get("/api/webhooks/{webhook_index}")
async def get_webhook(webhook_index: int):
    """Get a specific webhook by index."""
    config = read_config()
    
    # Since webhooks is now a single object, not an array
    if webhook_index != 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    return JSONResponse(content=config["webhooks"])

@router.post("/api/webhooks")
async def add_webhook(webhook: Dict[str, Any] = Body(...)):
    """Add a new webhook."""
    config = read_config()
    
    # Validate required fields
    if not all(key in webhook for key in ["type", "url"]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Ensure there's an 'enabled' field
    if "enabled" not in webhook:
        webhook["enabled"] = True
    
    # Replace the existing webhook with the new one
    config["webhooks"] = webhook
    write_config(config)
    
    return JSONResponse(content={"message": "Webhook added successfully"})

@router.put("/api/webhooks/{webhook_index}")
async def update_webhook(webhook_index: int, webhook: Dict[str, Any] = Body(...)):
    """Update an existing webhook."""
    config = read_config()
    
    # Since webhooks is now a single object, not an array
    if webhook_index != 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Validate required fields
    if not all(key in webhook for key in ["type", "url"]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Update the webhook
    config["webhooks"] = webhook
    write_config(config)
    
    return JSONResponse(content={"message": "Webhook updated successfully"})

@router.delete("/api/webhooks/{webhook_index}")
async def delete_webhook(webhook_index: int):
    """Delete a webhook."""
    config = read_config()
    
    # Since webhooks is now a single object, not an array
    if webhook_index != 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Clear webhook by setting to empty dict
    config["webhooks"] = {"type": "", "url": "", "enabled": False}
    write_config(config)
    
    return JSONResponse(content={"message": "Webhook deleted successfully"})